const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images publicly
// Access via: http://YOUR_IP:5000/uploads/scans/filename.jpg
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/scans', require('./routes/scanRoutes'));
app.use('/api/recommendations', require('./routes/recommendationRoutes'));
app.use('/api/blogs', require('./routes/blogRoutes'));
app.use('/api/dermatologists', require('./routes/dermatologistRoutes'));
app.use('/api/products', require('./routes/productRoutes'));

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Skin Sense AI API is running 🌸' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🌸 Skin Sense AI Server running on port ${PORT}`);
});
