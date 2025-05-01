const mongoose = require('mongoose');

const nftSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    author: {
        type: String,
        ref: 'User',
        required: true
    },
    image: {
        type: String,
        required: true
    },
    collection: {
        name: String,
        description: String,
        isPartOfCollection: {
            type: Boolean,
            default: false
        }
    },
    fileType: {
        type: String,
        required: true,
        enum: ['image/jpeg', 'image/png', 'image/gif']
    },
    fileSize: {
        type: Number,
        required: true
    },
    uploadDate: {
        type: Date,
        default: Date.now
    },
    price: {
        amount: {
            type: Number,
            required: true,
            min: 0
        },
        currency: {
            type: String,
            enum: ['ETH', 'USD'],
            default: 'ETH'
        }
    },
    status: {
        type: String,
        enum: ['listed', 'sold', 'auction', 'unlisted'],
        default: 'unlisted'
    },
    auction: {
        isActive: {
            type: Boolean,
            default: false
        },
        startPrice: {
            type: Number,
            min: 0
        },
        currentBid: {
            type: Number,
            min: 0
        },
        currentBidder: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        endTime: Date,
        bids: [{
            bidder: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            amount: {
                type: Number,
                required: true
            },
            timestamp: {
                type: Date,
                default: Date.now
            }
        }]
    },
    transactionHistory: [{
        from: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        to: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        price: {
            type: Number,
            required: true
        },
        transactionType: {
            type: String,
            enum: ['mint', 'sale', 'auction_won'],
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    metadata: {
        attributes: [{
            trait_type: String,
            value: String
        }],
        collection: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Collection'
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt timestamp before saving
nftSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

module.exports = mongoose.model('NFT', nftSchema);