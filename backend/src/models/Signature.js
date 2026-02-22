const mongoose = require('mongoose');

const signatureSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    documentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
        required: true
    },
    signatureData: { // Keeping this as it's needed for the image data
        type: String,
        required: true
    },
    x: Number,
    y: Number,
    page: Number,
    status: {
        type: String,
        default: 'Valid'
    },
    ipAddress: String,
    signedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Signature', signatureSchema);
