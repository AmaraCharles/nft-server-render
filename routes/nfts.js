const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const NFT = require('../models/NFT');
const User = require('../models/User');
const authenticateToken = require('../middleware/auth');

// Configure Cloudinary
cloudinary.config({
    cloud_name: 'dsyjlantq',
    api_key: '284558829695174',
    api_secret: 'MaULadaPC17bgEHAGjBffD0R2qM'
});

// Configure multer for file upload
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error('Only JPEG, PNG and GIF files are allowed'));
        }
        cb(null, true);
    }
});

// Helper function to upload to Cloudinary
const uploadToCloudinary = (buffer) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'nft-marketplace' },
            (error, result) => {
                if (error) return reject(error);
                resolve(result.secure_url);
            }
        );
        uploadStream.end(buffer);
    });
};

// Upload single artwork
router.post('/upload', upload.single('artwork'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Upload to Cloudinary
        const imageUrl = await uploadToCloudinary(req.file.buffer);

        const nft = new NFT({
            title: req.body.title,
            description: req.body.description,
            creator: req.user.id,
            owner: req.user.id,
            image: imageUrl,
            fileType: req.file.mimetype,
            fileSize: req.file.size,
            price: {
                amount: parseFloat(req.body.price),
                currency: 'ETH'
            }
        });

        await nft.save();
        res.status(201).json({ message: 'Artwork uploaded successfully', nft });
    } catch (error) {
        console.error('Error uploading artwork:', error);
        res.status(500).json({ message: 'Error uploading artwork' });
    }
});

// Upload collection
router.post('/upload-collection', authenticateToken, upload.array('artworks', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        const nfts = await Promise.all(req.files.map(async (file) => {
            const nft = new NFT({
                title: `${req.body.name} #${file.filename}`,
                description: req.body.description,
                creator: req.user.id,
                owner: req.user.id,
                image: `/uploads/${file.filename}`,
                fileType: file.mimetype,
                fileSize: file.size,
                collection: {
                    name: req.body.name,
                    description: req.body.description,
                    isPartOfCollection: true
                },
                price: {
                    amount: 0, // Set default price or get from request
                    currency: 'ETH'
                }
            });
            return await nft.save();
        }));

        res.status(201).json({ message: 'Collection uploaded successfully', nfts });
    } catch (error) {
        console.error('Error uploading collection:', error);
        res.status(500).json({ message: 'Error uploading collection' });
    }
});

// Create new NFT listing
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { title, description, image, price, currency } = req.body;
        const userId = req.user.id;

        const nft = new NFT({
            title,
            description,
            image,
            creator: userId,
            owner: userId,
            price: {
                amount: price,
                currency: currency || 'ETH'
            }
        });

        await nft.save();
        res.status(201).json({ message: 'NFT created successfully', nft });
    } catch (error) {
        console.error('Error creating NFT:', error);
        res.status(500).json({ message: 'Error creating NFT' });
    }
});

// Purchase NFT
router.post('/:id/purchase', authenticateToken, async (req, res) => {
    try {
        const nftId = req.params.id;
        const buyerId = req.user.id;

        const nft = await NFT.findById(nftId);
        if (!nft) {
            return res.status(404).json({ message: 'NFT not found' });
        }

        const buyer = await User.findById(buyerId);
        if (!buyer) {
            return res.status(404).json({ message: 'Buyer not found' });
        }

        // Check if buyer has sufficient balance
        if (buyer.wallets.spot < nft.price.amount) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }

        // Process the transaction
        const seller = await User.findById(nft.owner);
        
        // Update buyer's balance
        buyer.wallets.spot -= nft.price.amount;
        await buyer.save();

        // Update seller's balance
        seller.wallets.spot += nft.price.amount;
        await seller.save();

        // Update NFT ownership and status
        nft.owner = buyerId;
        nft.status = 'sold';
        nft.transactionHistory.push({
            from: seller._id,
            to: buyer._id,
            price: nft.price.amount,
            transactionType: 'sale'
        });

        await nft.save();

        res.json({ message: 'NFT purchased successfully', nft });
    } catch (error) {
        console.error('Error purchasing NFT:', error);
        res.status(500).json({ message: 'Error purchasing NFT' });
    }
});

// Start auction
router.post('/:id/auction/start', authenticateToken, async (req, res) => {
    try {
        const { startPrice, endTime } = req.body;
        const nftId = req.params.id;
        const userId = req.user.id;

        const nft = await NFT.findById(nftId);
        if (!nft || nft.owner.toString() !== userId) {
            return res.status(404).json({ message: 'NFT not found or not owned by user' });
        }

        nft.status = 'auction';
        nft.auction = {
            isActive: true,
            startPrice,
            currentBid: startPrice,
            endTime: new Date(endTime)
        };

        await nft.save();
        res.json({ message: 'Auction started successfully', nft });
    } catch (error) {
        console.error('Error starting auction:', error);
        res.status(500).json({ message: 'Error starting auction' });
    }
});

// Place bid
router.post('/:id/auction/bid', authenticateToken, async (req, res) => {
    try {
        const { bidAmount } = req.body;
        const nftId = req.params.id;
        const bidderId = req.user.id;

        const nft = await NFT.findById(nftId);
        if (!nft || !nft.auction.isActive) {
            return res.status(404).json({ message: 'NFT not found or auction not active' });
        }

        if (new Date() > nft.auction.endTime) {
            return res.status(400).json({ message: 'Auction has ended' });
        }

        if (bidAmount <= nft.auction.currentBid) {
            return res.status(400).json({ message: 'Bid must be higher than current bid' });
        }

        const bidder = await User.findById(bidderId);
        if (bidder.wallets.spot < bidAmount) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }

        // Return funds to previous bidder if exists
        if (nft.auction.currentBidder) {
            const previousBidder = await User.findById(nft.auction.currentBidder);
            previousBidder.wallets.spot += nft.auction.currentBid;
            await previousBidder.save();
        }

        // Lock bid amount from bidder's balance
        bidder.wallets.spot -= bidAmount;
        await bidder.save();

        // Update auction details
        nft.auction.currentBid = bidAmount;
        nft.auction.currentBidder = bidderId;
        nft.auction.bids.push({
            bidder: bidderId,
            amount: bidAmount
        });

        await nft.save();
        res.json({ message: 'Bid placed successfully', nft });
    } catch (error) {
        console.error('Error placing bid:', error);
        res.status(500).json({ message: 'Error placing bid' });
    }
});

// End auction
router.post('/:id/auction/end', authenticateToken, async (req, res) => {
    try {
        const nftId = req.params.id;
        const nft = await NFT.findById(nftId);

        if (!nft || !nft.auction.isActive) {
            return res.status(404).json({ message: 'NFT not found or auction not active' });
        }

        if (new Date() < nft.auction.endTime) {
            return res.status(400).json({ message: 'Auction has not ended yet' });
        }

        // Process auction end
        if (nft.auction.currentBidder) {
            const winner = await User.findById(nft.auction.currentBidder);
            const seller = await User.findById(nft.owner);

            // Transfer winning bid amount to seller
            seller.wallets.spot += nft.auction.currentBid;
            await seller.save();

            // Update NFT ownership
            nft.owner = winner._id;
            nft.status = 'sold';
            nft.transactionHistory.push({
                from: seller._id,
                to: winner._id,
                price: nft.auction.currentBid,
                transactionType: 'auction_won'
            });
        } else {
            nft.status = 'listed';
        }

        // Reset auction data
        nft.auction.isActive = false;
        await nft.save();

        res.json({ message: 'Auction ended successfully', nft });
    } catch (error) {
        console.error('Error ending auction:', error);
        res.status(500).json({ message: 'Error ending auction' });
    }
});

// Get NFT details
router.get('/:id', async (req, res) => {
    try {
        const nft = await NFT.findById(req.params.id)
            .populate('creator', 'username profileImage')
            .populate('owner', 'username profileImage')
            .populate('auction.currentBidder', 'username profileImage')
            .populate('auction.bids.bidder', 'username profileImage');

        if (!nft) {
            return res.status(404).json({ message: 'NFT not found' });
        }

        res.json(nft);
    } catch (error) {
        console.error('Error fetching NFT:', error);
        res.status(500).json({ message: 'Error fetching NFT' });
    }
});

module.exports = router;