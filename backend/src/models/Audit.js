const mongoose = require('mongoose');

const auditSchema = new mongoose.Schema({
    documentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
        required: true
    },
    action: {
        type: String,
        required: true
    },
    userId: { // Renamed from performedBy
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    details: String, // Keeping details as it's useful
    ipAddress: String, // Added ipAddress
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Audit', auditSchema);
