require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const socketIo = require('socket.io');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nft_marketplace', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('MongoDB connection error:', err);
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Routes
// Handle user authentication (login, signup, password reset)
app.use('/api/auth', require('./routes/auth/index'));

// Handle user profile operations (create, update, fetch profiles)
app.use('/api/users', require('./routes/users'));

// Handle artwork operations (create, update, list, buy/sell NFTs)
app.use('/api/artworks', require('./routes/artworks'));

// Handle auction operations (create, bid, end auctions)
app.use('/api/auctions', require('./routes/auctions'));

// Handle transaction operations (deposits, withdrawals, transfers)
app.use('/api/transactions', require('./routes/transactions'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Socket.io setup for real-time auction updates
const io = socketIo(server);

io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('joinAuction', (auctionId) => {
    socket.join(`auction-${auctionId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

module.exports = { app, io };