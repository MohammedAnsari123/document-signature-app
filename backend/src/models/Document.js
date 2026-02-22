const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
    fileName: {
        type: String,
        required: true,
    },
    filePath: {
        type: String,
        required: true,
    },
    cloudinaryId: {
        type: String,
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    status: {
        type: String,
        enum: ['Pending', 'Signed', 'Rejected'],
        default: 'Pending',
    },
    sharedWith: [{
        email: { type: String, required: true },
        permission: {
            type: String,
            enum: ['view', 'edit'],
            default: 'view'
        }
    }],
    signedPath: {
        type: String,
    },
    signedCloudinaryId: {
        type: String,
    },
    signatureConfig: {
        x: Number,
        y: Number,
        page: Number,
    },
}, { timestamps: true });

module.exports = mongoose.model('Document', DocumentSchema);
