const express = require('express');
const router = express.Router();
const Artwork = require('../models/Artwork');
const jwt = require('jsonwebtoken');

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

// Create artwork
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      title,
      description,
      imageUrl,
      category,
      price,
      royaltyPercentage,
      metadata,
      tags
    } = req.body;

    const artwork = new Artwork({
      title,
      description,
      imageUrl,
      category,
      creator: req.user.id,
      owner: req.user.id,
      price,
      royaltyPercentage,
      metadata,
      tags
    });

    await artwork.save();
    res.status(201).json({ message: 'Artwork created successfully', artwork });
  } catch (error) {
    console.error('Error creating artwork:', error);
    res.status(500).json({ message: 'Error creating artwork' });
  }
});

// Edit artwork
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const artworkId = req.params.id;
    const {
      title,
      description,
      category,
      price,
      royaltyPercentage,
      metadata,
      tags
    } = req.body;

    const artwork = await Artwork.findById(artworkId);
    if (!artwork) {
      return res.status(404).json({ message: 'Artwork not found' });
    }

    // Check if user is the creator
    if (artwork.creator.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to edit this artwork' });
    }

    // Update fields if provided
    if (title) artwork.title = title;
    if (description) artwork.description = description;
    if (category) artwork.category = category;
    if (price) {
      artwork.price = price;
      // Update ETH price if USD price changes
      if (price.usd) {
        const ethUsdPrice = 2000; // This should come from an external price feed
        await artwork.updateEthPrice(ethUsdPrice);
      }
    }
    if (royaltyPercentage) artwork.royaltyPercentage = royaltyPercentage;
    if (metadata) artwork.metadata = metadata;
    if (tags) artwork.tags = tags;

    await artwork.save();
    res.json({ message: 'Artwork updated successfully', artwork });
  } catch (error) {
    console.error('Error updating artwork:', error);
    res.status(500).json({ message: 'Error updating artwork' });
  }
});

// Get artwork
router.get('/:id', async (req, res) => {
  try {
    const artwork = await Artwork.findById(req.params.id)
      .populate('creator', 'username profileImage')
      .populate('owner', 'username profileImage');

    if (!artwork) {
      return res.status(404).json({ message: 'Artwork not found' });
    }

    // Increment views
    artwork.views += 1;
    await artwork.save();

    res.json(artwork);
  } catch (error) {
    console.error('Error fetching artwork:', error);
    res.status(500).json({ message: 'Error fetching artwork' });
  }
});

// List artworks
router.get('/', async (req, res) => {
  try {
    const { category, creator, owner, status } = req.query;
    const query = {};

    if (category) query.category = category;
    if (creator) query.creator = creator;
    if (owner) query.owner = owner;
    if (status) query.status = status;

    const artworks = await Artwork.find(query)
      .populate('creator', 'username profileImage')
      .populate('owner', 'username profileImage')
      .sort({ createdAt: -1 });

    res.json(artworks);
  } catch (error) {
    console.error('Error listing artworks:', error);
    res.status(500).json({ message: 'Error listing artworks' });
  }
});

module.exports = router;