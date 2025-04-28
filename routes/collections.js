const express = require('express');
const router = express.Router();
const Collection = require('../models/Collection');
const auth = require('../middleware/auth');
const { check, validationResult } = require('express-validator');

// @route   POST /api/collections
// @desc    Create a new collection
// @access  Private
router.post('/', [
  auth,
  check('name', 'Name is required').not().isEmpty(),
  check('description', 'Description is required').not().isEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const collection = new Collection({
      ...req.body,
      creator: req.user.id
    });

    await collection.save();

    // Add collection to user's collections
    const user = await User.findById(req.user.id);
    user.collections.push(collection._id);
    await user.save();

    res.json(collection);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/collections
// @desc    Get all collections with filters
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { creator, featured, sort, limit = 10, page = 1 } = req.query;
    const query = {};

    if (creator) query.creator = creator;
    if (featured) query.featured = featured === 'true';

    const collections = await Collection.find(query)
      .populate('creator', 'username profileImage')
      .populate('artworks')
      .sort(sort ? { [sort]: -1 } : { createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Collection.countDocuments(query);

    res.json({
      collections,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/collections/:id
// @desc    Get collection by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id)
      .populate('creator', 'username profileImage bio socialLinks')
      .populate({
        path: 'artworks',
        populate: {
          path: 'creator owner',
          select: 'username profileImage'
        }
      });

    if (!collection) {
      return res.status(404).json({ msg: 'Collection not found' });
    }

    res.json(collection);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Collection not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   PUT /api/collections/:id
// @desc    Update collection
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    let collection = await Collection.findById(req.params.id);

    if (!collection) {
      return res.status(404).json({ msg: 'Collection not found' });
    }

    // Check ownership
    if (collection.creator.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    // Update allowed fields
    const { name, description, featured, banner } = req.body;
    if (name) collection.name = name;
    if (description) collection.description = description;
    if (featured !== undefined) collection.featured = featured;
    if (banner) collection.banner = banner;

    await collection.save();
    res.json(collection);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Collection not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   DELETE /api/collections/:id
// @desc    Delete collection
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);

    if (!collection) {
      return res.status(404).json({ msg: 'Collection not found' });
    }

    // Check ownership
    if (collection.creator.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    await collection.remove();

    // Remove from user's collections
    const user = await User.findById(req.user.id);
    user.collections = user.collections.filter(
      id => id.toString() !== req.params.id
    );
    await user.save();

    // Update artworks to remove collection reference
    await Artwork.updateMany(
      { collection: req.params.id },
      { $unset: { collection: 1 } }
    );

    res.json({ msg: 'Collection removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Collection not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   PUT /api/collections/:id/artworks
// @desc    Add/remove artwork to/from collection
// @access  Private
router.put('/:id/artworks', auth, async (req, res) => {
  try {
    const { artworkId, action } = req.body;
    if (!['add', 'remove'].includes(action)) {
      return res.status(400).json({ msg: 'Invalid action' });
    }

    const collection = await Collection.findById(req.params.id);
    if (!collection) {
      return res.status(404).json({ msg: 'Collection not found' });
    }

    // Check ownership
    if (collection.creator.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    const artwork = await Artwork.findById(artworkId);
    if (!artwork) {
      return res.status(404).json({ msg: 'Artwork not found' });
    }

    if (action === 'add') {
      if (!collection.artworks.includes(artworkId)) {
        collection.artworks.push(artworkId);
        artwork.collection = collection._id;
      }
    } else {
      collection.artworks = collection.artworks.filter(
        id => id.toString() !== artworkId
      );
      artwork.collection = undefined;
    }

    await Promise.all([collection.save(), artwork.save()]);
    res.json(collection);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Collection or artwork not found' });
    }
    res.status(500).send('Server error');
  }
});

module.exports = router;