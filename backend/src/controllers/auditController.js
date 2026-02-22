const Audit = require('../models/Audit');

exports.getAuditLogs = async (req, res) => {
    try {
        const logs = await Audit.find({ document: req.params.documentId });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
