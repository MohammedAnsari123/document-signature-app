const Audit = require('../models/Audit');

const logAudit = async (action, documentId, userId, details) => {
    try {
        await Audit.create({
            action,
            documentId,
            userId,
            details
        });
    } catch (error) {
        console.error('Audit Log Error:', error);
    }
};

module.exports = logAudit;
