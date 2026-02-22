const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();

// Connect to Database
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/docs', require('./routes/documentRoutes'));
app.use('/api/signatures', require('./routes/signatureRoutes'));
app.use('/api/audit', require('./routes/auditRoutes'));

// Make uploads folder static
app.use('/uploads', express.static('uploads'));

app.get('/', (req, res) => {
  res.send('Document Signature App Backend Running');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
