const express = require('express');
const router = express.Router();
const { createSignature, getSignatures } = require('../controllers/signatureController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createSignature);
router.get('/', protect, getSignatures);

module.exports = router;
