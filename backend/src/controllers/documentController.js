const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');
const Document = require('../models/Document');
const sendEmail = require('../services/emailService');
const jwt = require('jsonwebtoken');
const cloudinary = require('../config/cloudinary');
const axios = require('axios');

// @desc    Upload a PDF document
// @route   POST /api/docs/upload
// @access  Private
const uploadDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Upload the file to Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
            resource_type: 'raw',
            folder: 'docsign_uploads',
            use_filename: true,
            unique_filename: true
        });

        const doc = await Document.create({
            fileName: req.file.originalname,
            filePath: result.secure_url,
            cloudinaryId: result.public_id,
            ownerId: req.user._id,
        });

        // Delete local temp file
        try {
            fs.unlinkSync(req.file.path);
        } catch (e) {
            console.warn('Could not delete temp file:', e.message);
        }

        // Log audit
        await require('../middleware/auditMiddleware')('Uploaded', doc._id, req.user._id, `Uploaded from ${req.ip}`);

        res.status(201).json(doc);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get all documents for logged in user
// @route   GET /api/docs
// @access  Private
const getDocuments = async (req, res) => {
    try {
        const docs = await Document.find({ ownerId: req.user._id }).sort({ createdAt: -1 });
        res.json(docs);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get audit log for a document
// @route   GET /api/docs/:id/audit
// @access  Private
const getDocumentAudit = async (req, res) => {
    try {
        const doc = await Document.findById(req.params.id);

        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }

        if (doc.ownerId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const logs = await require('../models/Audit').find({ documentId: doc._id }).populate('userId', 'name email');
        res.json(logs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Finalize and sign a document
// @route   POST /api/docs/:id/sign
// @access  Private
const finalizeDocument = async (req, res) => {
    const { position, annotations } = req.body;
    // `annotations` is the new multi-item array: [{id, type, content, x, y, page}, ...]
    // `position` is kept for backward compatibility

    // Build the list of items to render: prefer `annotations`, fall back to single `position`
    const items = annotations && annotations.length > 0
        ? annotations
        : (position ? [{ type: position.image ? 'image' : 'text', content: position.image || position.text, x: position.x, y: position.y, page: position.page }] : []);

    try {
        const doc = await Document.findById(req.params.id);

        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }

        if (doc.ownerId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        // Fetch the PDF from Cloudinary URL instead of local disk
        const response = await axios.get(doc.filePath, { responseType: 'arraybuffer' });
        const existingPdfBytes = response.data;
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const pages = pdfDoc.getPages();

        // Render each annotation item onto the PDF
        for (const item of items) {
            const pageIndex = (item.page || 1) - 1;
            const page = pages[pageIndex];
            if (!page) continue;

            const { height } = page.getSize();
            const pdfY = height - item.y; // Flip Y: PDF origin is bottom-left

            if (item.type === 'image' && item.content) {
                try {
                    const imageBytes = Buffer.from(item.content.split(',')[1], 'base64');
                    let embeddedImage;
                    if (item.content.startsWith('data:image/png')) {
                        embeddedImage = await pdfDoc.embedPng(imageBytes);
                    } else {
                        embeddedImage = await pdfDoc.embedJpg(imageBytes);
                    }
                    const { width: imgW, height: imgH } = embeddedImage.scale(0.5);
                    page.drawImage(embeddedImage, {
                        x: item.x,
                        y: pdfY - imgH,
                        width: imgW,
                        height: imgH,
                    });
                } catch (imgErr) {
                    console.error('Failed to embed image:', imgErr.message);
                }
            } else if (item.type === 'text' && item.content) {
                page.drawText(item.content, {
                    x: item.x,
                    y: pdfY - 20,
                    size: 20,
                    color: rgb(0, 0, 1),
                });
                page.drawText(`Date: ${new Date().toLocaleDateString()}`, {
                    x: item.x,
                    y: pdfY - 40,
                    size: 10,
                    color: rgb(0, 0, 1),
                });
            }
        }

        // Save the modified PDF locally first
        const pdfBytes = await pdfDoc.save();
        const signedFilename = `signed-${doc._id}.pdf`;
        const tempSignedPath = path.join('uploads', signedFilename);
        fs.writeFileSync(tempSignedPath, pdfBytes);

        // Upload signed version to Cloudinary
        const result = await cloudinary.uploader.upload(tempSignedPath, {
            resource_type: 'raw',
            folder: 'docsign_signed',
            use_filename: true,
            unique_filename: true
        });

        doc.status = 'Signed';
        doc.signedPath = result.secure_url;
        doc.signedCloudinaryId = result.public_id;
        doc.signatureConfig = position || (items[0] || {});

        await doc.save();

        // Cleanup local signed copy
        try {
            fs.unlinkSync(tempSignedPath);
        } catch (e) {
            console.warn('Could not delete temp signed file:', e.message);
        }

        await doc.save();

        await require('../middleware/auditMiddleware')('Signed', doc._id, req.user._id, `Signed by owner. IP: ${req.ip}`);

        res.json(doc);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};


// @desc    Share document via email
// @route   POST /api/docs/:id/share
// @access  Private
const shareDocument = async (req, res) => {
    const { email, message, permission = 'view' } = req.body;

    if (!email) return res.status(400).json({ message: 'Email is required' });

    try {
        const doc = await Document.findById(req.params.id);

        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }

        if (doc.ownerId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        // ── 1. Save sharing info to DB first (don't depend on email success) ──
        const alreadyShared = doc.sharedWith.some(s => s.email === email);
        if (!alreadyShared) {
            doc.sharedWith.push({ email, permission });
        } else {
            const entry = doc.sharedWith.find(s => s.email === email);
            if (entry) entry.permission = permission;
        }
        await doc.save();

        await require('../middleware/auditMiddleware')('Shared', doc._id, req.user._id, `Shared with ${email} (${permission})`);

        // ── 2. Generate share link ────────────────────────────────────────────
        const shareToken = jwt.sign(
            { documentId: doc._id, email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Define frontend URL for the email link
        // Uses origin header if available (production frontend), otherwise defaults to localhost:5173
        const frontendUrl = 'https://document-signature-app-eight.vercel.app';
        const shareLink = `${frontendUrl}/share/${shareToken}`;

        // ── 3. Try to send email (non-blocking — failure is logged, not thrown) ─
        let emailSent = false;
        try {
            const senderName = req.user.name || 'A user';
            const senderEmail = req.user.email;
            const customMessageHtml = message ? `<p><strong>Message from sender:</strong><br/>"${message}"</p>` : '';
            const customMessageText = message ? `Message from sender: "${message}"\n` : '';

            await sendEmail({
                to: email,
                subject: `Document Signature Request from ${senderName}`,
                text: `Hello,\n\n${senderName} (${senderEmail}) has requested you to sign the document "${doc.fileName}".\n\n${customMessageText}\nPlease click the link below to view and sign the document:\n${shareLink}\n\nThank you,\nDocSign App`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
                        <h2 style="color: #333;">Document Signature Request</h2>
                        <p>Hello,</p>
                        <p><strong>${senderName}</strong> (<a href="mailto:${senderEmail}">${senderEmail}</a>) has requested you to sign the document <strong>"${doc.fileName}"</strong>.</p>
                        ${customMessageHtml}
                        <div style="margin: 30px 0;">
                            <a href="${shareLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Review and Sign Document</a>
                        </div>
                        <p style="color: #666; font-size: 14px;">Share link: ${shareLink}</p>
                    </div>
                `,
            });
            emailSent = true;
        } catch (emailErr) {
            console.warn('Email sending failed (SMTP not configured?):', emailErr.message);
        }

        res.json({
            message: emailSent ? 'Invitation sent successfully!' : 'Document shared (email delivery unavailable)',
            link: shareLink,
            emailSent
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get documents shared with the logged-in user
// @route   GET /api/docs/shared
// @access  Private
const getSharedDocuments = async (req, res) => {
    try {
        const docs = await Document.find({ 'sharedWith.email': req.user.email }).sort({ createdAt: -1 });
        res.json(docs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Reject a document
// @route   PUT /api/docs/:id/reject
// @access  Private
const rejectDocument = async (req, res) => {
    const { reason } = req.body;
    try {
        const doc = await Document.findById(req.params.id);

        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }

        if (doc.ownerId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        doc.status = 'Rejected';
        await doc.save();

        const auditMessage = reason ? `Rejected by owner. Reason: ${reason}` : `Rejected by owner. IP: ${req.ip}`;
        await require('../middleware/auditMiddleware')('Rejected', doc._id, req.user._id, auditMessage);

        res.json(doc);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get shared document info
// @route   GET /api/docs/public/:token
// @access  Public
const getSharedDocument = async (req, res) => {
    try {
        const decoded = jwt.verify(req.params.token, process.env.JWT_SECRET);
        const doc = await Document.findById(decoded.documentId).select('-auditLog'); // Don't expose audit log to public

        if (!doc) return res.status(404).json({ message: 'Document not found' });

        res.json(doc);
    } catch (error) {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
};

// @desc    Sign shared document
// @route   POST /api/docs/public/:token/sign
// @access  Public
const signSharedDocument = async (req, res) => {
    const { position } = req.body;
    try {
        const decoded = jwt.verify(req.params.token, process.env.JWT_SECRET);
        const doc = await Document.findById(decoded.documentId);

        if (!doc) return res.status(404).json({ message: 'Document not found' });

        // Reuse signing logic (duplicate for now to avoid refactor complexity, but better to extract)
        const inputPath = path.resolve(doc.filePath);
        const existingPdfBytes = fs.readFileSync(inputPath);
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const pages = pdfDoc.getPages();
        const firstPage = pages[position.page - 1];
        const { height } = firstPage.getSize();

        // Draw the signature
        if (position.image) {
            // Handle Image Signature
            const imageBytes = Buffer.from(position.image.split(',')[1], 'base64');
            let embeddedImage;

            if (position.image.startsWith('data:image/png')) {
                embeddedImage = await pdfDoc.embedPng(imageBytes);
            } else {
                embeddedImage = await pdfDoc.embedJpg(imageBytes);
            }

            const { width, height: imgHeight } = embeddedImage.scale(0.5); // Scale down if needed

            firstPage.drawImage(embeddedImage, {
                x: position.x,
                y: height - position.y - imgHeight, // Adjust Y for bottom-left origin
                width: width,
                height: imgHeight,
            });

        } else {
            firstPage.drawText(`Signed by Guest (${decoded.email})`, {
                x: position.x,
                y: height - position.y - 20,
                size: 20,
                color: rgb(0, 0, 1),
            });

            firstPage.drawText(`Date: ${new Date().toLocaleDateString()}`, {
                x: position.x,
                y: height - position.y - 40,
                size: 12,
                color: rgb(0, 0, 1),
            });
        }

        const pdfBytes = await pdfDoc.save();
        const signedFilename = `signed-${doc.fileName}`;
        const signedPath = path.join('uploads', signedFilename);
        fs.writeFileSync(signedPath, pdfBytes);

        doc.status = 'Signed';
        doc.signedPath = signedPath;
        doc.signatureConfig = position;

        await doc.save();

        await require('../middleware/auditMiddleware')('Signed (Public)', doc._id, null, `Signed by Guest ${decoded.email}. IP: ${req.ip}`);

        res.json(doc);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Reset signed document (clear signatures, back to Pending)
// @route   DELETE /api/docs/:id/signatures
// @access  Private
const resetSignatures = async (req, res) => {
    try {
        const doc = await Document.findById(req.params.id);

        if (!doc) return res.status(404).json({ message: 'Document not found' });

        if (doc.ownerId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        // Delete the signed PDF file from Cloudinary and local (if any)
        if (doc.signedCloudinaryId) {
            try {
                await cloudinary.uploader.destroy(doc.signedCloudinaryId, { resource_type: 'raw' });
            } catch (e) {
                console.warn('Could not remove signed file from Cloudinary:', e.message);
            }
        }
        if (doc.signedPath && !doc.signedPath.startsWith('http')) {
            try {
                const abs = path.resolve(doc.signedPath);
                if (fs.existsSync(abs)) fs.unlinkSync(abs);
            } catch (e) {
                console.warn('Could not remove local signed file:', e.message);
            }
        }

        // Reset doc back to Pending
        doc.signedPath = null;
        doc.signedCloudinaryId = undefined;
        doc.signatureConfig = null;
        doc.status = 'Pending';
        await doc.save();

        await require('../middleware/auditMiddleware')('Reset', doc._id, req.user._id, 'Signatures cleared by owner.');

        res.json({ message: 'Signatures cleared. Document reset to Pending.', doc });
    } catch (error) {
        console.error('Reset error:', error.message);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @route   DELETE /api/docs/:id
// @access  Private
const deleteDocument = async (req, res) => {
    try {
        // Use lean() to bypass Mongoose schema validation when loading
        // (avoids crashes on documents with old sharedWith string format)
        const doc = await Document.findById(req.params.id).lean();

        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }

        // Check ownership
        if (doc.ownerId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        // Delete original file from Cloudinary
        if (doc.cloudinaryId) {
            try {
                await cloudinary.uploader.destroy(doc.cloudinaryId, { resource_type: 'raw' });
            } catch (e) {
                console.warn('Could not remove original file from Cloudinary:', e.message);
            }
        } else if (doc.filePath && !doc.filePath.startsWith('http')) {
            // Fallback for old local files
            try {
                const filePath = path.resolve(doc.filePath);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            } catch (fileErr) {
                console.warn('Could not delete original file:', fileErr.message);
            }
        }

        // Delete signed version from Cloudinary
        if (doc.signedCloudinaryId) {
            try {
                await cloudinary.uploader.destroy(doc.signedCloudinaryId, { resource_type: 'raw' });
            } catch (e) {
                console.warn('Could not remove signed file from Cloudinary:', e.message);
            }
        } else if (doc.signedPath && !doc.signedPath.startsWith('http')) {
            // Fallback for old local files
            try {
                const signedPath = path.resolve(doc.signedPath);
                if (fs.existsSync(signedPath)) fs.unlinkSync(signedPath);
            } catch (fileErr) {
                console.warn('Could not delete signed file:', fileErr.message);
            }
        }

        // Delete from DB directly by ID (avoids re-loading the doc)
        await Document.deleteOne({ _id: doc._id });

        res.json({ message: 'Document removed' });
    } catch (error) {
        console.error('Delete error:', error.message);
        res.status(500).json({ message: 'Server Error', detail: error.message });
    }
};

// @desc    Get single document by ID
// @route   GET /api/docs/:id
// @access  Private
const getDocumentById = async (req, res) => {
    try {
        const doc = await Document.findById(req.params.id);

        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }

        // Check if user is owner OR is in shared list
        const isOwner = doc.ownerId.toString() === req.user._id.toString();
        const isShared = doc.sharedWith.some(shared => shared.email === req.user.email);

        if (!isOwner && !isShared) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        res.json(doc);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    uploadDocument,
    getDocuments,
    getDocumentById,
    getSharedDocuments,
    finalizeDocument,
    getDocumentAudit,
    shareDocument,
    rejectDocument,
    getSharedDocument,
    signSharedDocument,
    deleteDocument,
    resetSignatures
};

