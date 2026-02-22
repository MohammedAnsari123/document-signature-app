const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/authMiddleware');
const {
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
} = require('../controllers/documentController');

const upload = require('../middleware/uploadMiddleware');

router.post('/upload', protect, upload.single('file'), uploadDocument);
router.get('/', protect, getDocuments);
router.get('/shared', protect, getSharedDocuments);
router.get('/:id', protect, getDocumentById);
router.post('/:id/sign', protect, finalizeDocument);
router.get('/:id/audit', protect, getDocumentAudit);
router.post('/:id/share', protect, shareDocument);
router.put('/:id/reject', protect, rejectDocument);
router.delete('/:id', protect, deleteDocument);
router.delete('/:id/signatures', protect, resetSignatures);

// Public Routes (No protect middleware, token validated in controller)
router.get('/public/:token', getSharedDocument);
router.post('/public/:token/sign', signSharedDocument);

module.exports = router;
