const express = require('express');
const router = express.Router();
const Auction = require('../models/Auction');
const Artwork = require('../models/Artwork');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { check, validationResult } = require('express-validator');

// @route   POST /api/auctions
// @desc    Create a new auction
// @access  Private
router.post('/', [
  auth,
  check('artwork', 'Artwork ID is required').not().isEmpty(),
  check('startingPrice.usd', 'Starting price in USD is required').isNumeric(),
  check('endTime', 'End time is required').not().isEmpty(),
  check('minBidIncrement', 'Minimum bid increment must be between 0 and 1').isFloat({ min: 0, max: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const artwork = await Artwork.findById(req.body.artwork).populate('owner');
    if (!artwork) {
      return res.status(404).json({ msg: 'Artwork not found' });
    }

    if (artwork.owner.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    const auction = new Auction({
      ...req.body,
      seller: req.user.id,
      currentPrice: req.body.startingPrice
    });

    await auction.save();

    // Update artwork status
    artwork.status = 'auction';
    await artwork.save();

    res.json(auction);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/auctions
// @desc    Get all auctions with filters
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { status, seller, artwork, sort, limit = 10, page = 1 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (seller) query.seller = seller;
    if (artwork) query.artwork = artwork;

    const auctions = await Auction.find(query)
      .populate('artwork')
      .populate('seller', 'username profileImage')
      .populate('winner', 'username profileImage')
      .sort(sort ? { [sort]: -1 } : { createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Auction.countDocuments(query);

    res.json({
      auctions,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/auctions/:id
// @desc    Get auction by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id)
      .populate('artwork')
      .populate('seller', 'username profileImage')
      .populate('winner', 'username profileImage')
      .populate('bids.bidder', 'username profileImage');

    if (!auction) {
      return res.status(404).json({ msg: 'Auction not found' });
    }

    res.json(auction);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Auction not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   POST /api/auctions/:id/bid
// @desc    Place a bid on an auction
// @access  Private
router.post('/:id/bid', [
  auth,
  check('amount.usd', 'Bid amount in USD is required').isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const auction = await Auction.findById(req.params.id);
    if (!auction) {
      return res.status(404).json({ msg: 'Auction not found' });
    }

    // Validate auction status
    if (auction.status !== 'active') {
      return res.status(400).json({ msg: 'Auction is not active' });
    }

    if (new Date() > auction.endTime) {
      return res.status(400).json({ msg: 'Auction has ended' });
    }

    // Validate bid amount
    const minBidAmount = auction.currentPrice.usd * (1 + auction.minBidIncrement);
    if (req.body.amount.usd < minBidAmount) {
      return res.status(400).json({ msg: `Bid must be at least ${minBidAmount} USD` });
    }

    // Check if user has sufficient balance
    const bidder = await User.findById(req.user.id);
    if (bidder.wallets.spot < req.body.amount.usd) {
      return res.status(400).json({ msg: 'Insufficient balance' });
    }

    // Return funds to previous bidder if exists
    if (auction.bids.length > 0) {
      const previousBidder = await User.findById(auction.bids[auction.bids.length - 1].bidder);
      previousBidder.wallets.spot += auction.currentPrice.usd;
      await previousBidder.save();
    }

    // Lock bid amount
    bidder.wallets.spot -= req.body.amount.usd;
    await bidder.save();

    // Update auction
    auction.currentPrice = req.body.amount;
    auction.bids.push({
      bidder: req.user.id,
      amount: req.body.amount,
      timestamp: new Date()
    });

    // Add notification for the seller
    const seller = await User.findById(auction.seller);
    seller.notifications.push({
      type: 'bid',
      message: `New bid placed on your auction for ${auction.artwork.title}`
    });
    await seller.save();

    res.json(auction);
  } catch (err) {
    console.error(err.message);
    res.status(400).json({ msg: err.message });
  }
});

// @route   PUT /api/auctions/:id/end
// @desc    End an auction
// @access  Private
router.put('/:id/end', auth, async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id);
    if (!auction) {
      return res.status(404).json({ msg: 'Auction not found' });
    }

    if (auction.seller.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    if (auction.status !== 'active') {
      return res.status(400).json({ msg: 'Auction is not in active state' });
    }

    if (new Date() < auction.endTime && !req.body.forceEnd) {
      return res.status(400).json({ msg: 'Auction has not reached end time' });
    }

    // Set auction status to ended
    auction.status = 'ended';

    // Determine winner if there are bids
    if (auction.bids.length > 0) {
      const winningBid = auction.bids[auction.bids.length - 1];
      auction.winner = winningBid.bidder;

      // Transfer funds to seller
      const seller = await User.findById(auction.seller);
      seller.wallets.spot += winningBid.amount.usd;
      await seller.save();
    } else {
      // No bids, return artwork to listed status
      const artwork = await Artwork.findById(auction.artwork);
      artwork.status = 'listed';
      await artwork.save();
    }

    await auction.save();

    // Update artwork ownership if there's a winner
    if (auction.winner) {
      const artwork = await Artwork.findById(auction.artwork);
      artwork.owner = auction.winner;
      artwork.status = 'sold';
      await artwork.save();

      // Add notifications
      const winner = await User.findById(auction.winner);
      winner.notifications.push({
        type: 'sale',
        message: `You won the auction for ${artwork.title}`
      });
      await winner.save();
    }

    res.json(auction);
  } catch (err) {
    console.error(err.message);
    res.status(400).json({ msg: err.message });
  }
});

// @route   PUT /api/auctions/:id/cancel
// @desc    Cancel an auction
// @access  Private
router.put('/:id/cancel', auth, async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id);
    if (!auction) {
      return res.status(404).json({ msg: 'Auction not found' });
    }

    if (auction.seller.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    if (auction.status !== 'pending' && auction.status !== 'active') {
      return res.status(400).json({ msg: 'Cannot cancel auction in current state' });
    }

    auction.status = 'cancelled';
    await auction.save();

    // Update artwork status
    const artwork = await Artwork.findById(auction.artwork);
    artwork.status = 'listed';
    await artwork.save();

    res.json(auction);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT /api/auctions/:id/update-prices
// @desc    Update ETH prices for an auction
// @access  Private
router.put('/:id/update-prices', auth, async (req, res) => {
  try {
    const { ethUsdPrice } = req.body;
    if (!ethUsdPrice || ethUsdPrice <= 0) {
      return res.status(400).json({ msg: 'Valid ETH/USD price is required' });
    }

    const auction = await Auction.findById(req.params.id);
    if (!auction) {
      return res.status(404).json({ msg: 'Auction not found' });
    }

    await auction.updateEthPrices(ethUsdPrice);
    res.json(auction);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;