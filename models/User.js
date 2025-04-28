const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  profileImage: {
    type: String,
    default: 'default-profile.png'
  },
  bio: {
    type: String,
    maxLength: 500
  },
  wallets: {
    funded: {
      type: Number,
      default: 0,
      min: 0
    },
    spot: {
      type: Number,
      default: 0,
      min: 0
    },
    pending: {
      type: Number,
      default: 0,
      min: 0
    },
    totalEarnings: {
      usd: {
        type: Number,
        default: 0,
        min: 0
      },
      eth: {
        type: Number,
        default: 0,
        min: 0
      }
    }
  },
  withdrawals: [{
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  socialLinks: {
    twitter: String,
    instagram: String,
    website: String
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  createdArtworks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Artwork'
  }],
  collections: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Collection'
  }],
  favorites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Artwork'
  }],
  notifications: [{
    type: {
      type: String,
      enum: ['bid', 'sale', 'offer', 'follow', 'system']
    },
    message: String,
    read: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  royaltyPercentage: {
    type: Number,
    default: 10,
    min: 0,
    max: 100
  },
  soldArtworks: [{
    artwork: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Artwork'
    },
    salePrice: {
      usd: {
        type: Number,
        required: true
      },
      eth: {
        type: Number,
        required: true
      }
    },
    royaltyEarned: {
      usd: {
        type: Number,
        required: true
      },
      eth: {
        type: Number,
        required: true
      }
    },
    soldAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to update wallet balance
userSchema.methods.updateBalance = async function(amount, walletType, operation) {
  if (!['funded', 'spot'].includes(walletType)) {
    throw new Error('Invalid wallet type');
  }

  if (operation === 'add') {
    this.wallets[walletType] += amount;
  } else if (operation === 'subtract') {
    if (this.wallets[walletType] < amount) {
      throw new Error('Insufficient balance');
    }
    this.wallets[walletType] -= amount;
  }

  await this.save();
  return this.wallets[walletType];
};

// Method to request withdrawal
userSchema.methods.requestWithdrawal = async function(amount) {
  if (this.wallets.spot < amount) {
    throw new Error('Insufficient spot balance');
  }

  // Create withdrawal request
  this.withdrawals.push({
    amount,
    status: 'pending',
    timestamp: new Date()
  });

  // Update spot balance
  await this.updateBalance(amount, 'spot', 'subtract');

  await this.save();
  return this.withdrawals[this.withdrawals.length - 1];
};

const User = mongoose.model('User', userSchema);

module.exports = User;