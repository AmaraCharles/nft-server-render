const mongoose = require('mongoose');

const auctionSchema = new mongoose.Schema({
  artwork: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Artwork',
    required: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startingPrice: {
    usd: {
      type: Number,
      required: true,
      min: 0
    },
    eth: {
      type: Number,
      required: true,
      min: 0
    }
  },
  currentPrice: {
    usd: {
      type: Number,
      required: true,
      min: 0
    },
    eth: {
      type: Number,
      required: true,
      min: 0
    }
  },
  minBidIncrement: {
    type: Number,
    required: true,
    default: 0.1
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  endTime: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'ended', 'cancelled'],
    default: 'pending'
  },
  bids: [{
    bidder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    amount: {
      usd: {
        type: Number,
        required: true
      },
      eth: {
        type: Number,
        required: true
      }
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reservePrice: {
    usd: {
      type: Number,
      min: 0
    },
    eth: {
      type: Number,
      min: 0
    }
  },
  automaticExtension: {
    type: Boolean,
    default: true
  },
  extensionTime: {
    type: Number,
    default: 300 // 5 minutes in seconds
  },
  notifications: [{
    type: String,
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Method to place a bid
auctionSchema.methods.placeBid = async function(bidder, bidAmount) {
  if (this.status !== 'active') {
    throw new Error('Auction is not active');
  }

  if (Date.now() >= this.endTime) {
    throw new Error('Auction has ended');
  }

  if (bidAmount.usd <= this.currentPrice.usd) {
    throw new Error('Bid amount must be higher than current price');
  }

  const minRequiredBid = this.currentPrice.usd + (this.currentPrice.usd * this.minBidIncrement);
  if (bidAmount.usd < minRequiredBid) {
    throw new Error(`Minimum bid increment is ${this.minBidIncrement * 100}%`);
  }

  // Add the new bid
  this.bids.push({
    bidder,
    amount: bidAmount
  });

  // Update current price
  this.currentPrice = bidAmount;

  // Extend auction if bid is placed near the end
  if (this.automaticExtension) {
    const timeLeft = this.endTime.getTime() - Date.now();
    if (timeLeft < this.extensionTime * 1000) {
      this.endTime = new Date(Date.now() + (this.extensionTime * 1000));
    }
  }

  await this.save();
  return this;
};

// Method to end auction
auctionSchema.methods.endAuction = async function() {
  if (this.status !== 'active') {
    throw new Error('Auction is not active');
  }

  if (Date.now() < this.endTime) {
    throw new Error('Auction has not ended yet');
  }

  this.status = 'ended';

  // Set winner if there were any bids
  if (this.bids.length > 0) {
    const winningBid = this.bids[this.bids.length - 1];
    this.winner = winningBid.bidder;
  }

  await this.save();
  return this;
};

// Method to update ETH prices
auctionSchema.methods.updateEthPrices = async function(ethUsdPrice) {
  this.startingPrice.eth = this.startingPrice.usd / ethUsdPrice;
  this.currentPrice.eth = this.currentPrice.usd / ethUsdPrice;
  if (this.reservePrice) {
    this.reservePrice.eth = this.reservePrice.usd / ethUsdPrice;
  }
  
  // Update bid history
  this.bids.forEach(bid => {
    bid.amount.eth = bid.amount.usd / ethUsdPrice;
  });

  await this.save();
  return this;
};

const Auction = mongoose.model('Auction', auctionSchema);

module.exports = Auction;