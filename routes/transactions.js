const express = require('express');
const router = express.Router();
const Transaction = require('../models/transaction');
const NFT = require('../models/NFT');
const User = require('../models/User');
const Auction = require('../models/auction');

// Get user's transaction history
router.get('/history/:userId', async (req, res) => {
    try {
        const transactions = await Transaction.find({
            $or: [{ buyer: req.params.userId }, { seller: req.params.userId }]
        })
        .populate('nftId')
        .populate('buyer', 'username')
        .populate('seller', 'username')
        .sort({ timestamp: -1 });

        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Purchase NFT
router.post('/purchase', async (req, res) => {
    try {
        const { nftId, buyerId, price } = req.body;

        const nft = await NFT.findById(nftId);
        if (!nft) {
            return res.status(404).json({ error: 'NFT not found' });
        }

        const transaction = new Transaction({
            type: 'purchase',
            nftId: nft._id,
            seller: nft.owner,
            buyer: buyerId,
            amount: price
        });

        await transaction.save();
        res.json(transaction);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Place bid in auction
router.post('/bid', async (req, res) => {
    try {
        const { auctionId, userId, bidAmount } = req.body;

        const auction = await Auction.findById(auctionId);
        if (!auction) {
            return res.status(404).json({ error: 'Auction not found' });
        }

        await auction.placeBid(userId, bidAmount);
        res.json(auction);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Settle auction
router.post('/settle-auction/:auctionId', async (req, res) => {
    try {
        const auction = await Auction.findById(req.params.auctionId);
        if (!auction) {
            return res.status(404).json({ error: 'Auction not found' });
        }

        await auction.settle();
        res.json({ message: 'Auction settled successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Endpoint to handle withdrawal requests
router.post('/withdraw', async (req, res) => {
    try {
        const { userId, amount, walletAddress, network } = req.body;

        // Fetch user details
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if user has sufficient balance
        if (user.spotBalance < amount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Create a new withdrawal request
        const withdrawalRequest = new Transaction({
            type: 'withdrawal',
            buyer: userId, // User requesting withdrawal
            amount,
            status: 'pending',
            walletAddress,
            network
        });

        await withdrawalRequest.save();
        res.json({ message: 'Withdrawal request submitted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;