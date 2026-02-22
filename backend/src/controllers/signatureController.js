const Signature = require('../models/Signature');

exports.createSignature = async (req, res) => {
    try {
        const signature = await Signature.create(req.body);
        res.status(201).json(signature);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.getSignatures = async (req, res) => {
    try {
        const signatures = await Signature.find();
        res.json(signatures);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
