const mongoose = require('mongoose');

const artworkSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    maxLength: 1000
  },
  imageUrl: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['art', 'photography', 'music', 'video', 'collectibles', 'sports', 'utility', 'other']
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
  price: {
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
  royaltyPercentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  cloudinaryUrl: {
    type: String,
    required: true
  },
  cloudinaryPublicId: {
    type: String,
    required: true
  },
  metadata: {
    attributes: [{
      name: String,
      value: String
    }],
    fileType: {
      type: String,
      enum: ['image', 'video', 'audio'],
      required: true
    },
    fileSize: Number,
    dimensions: {
      width: Number,
      height: Number
    }
  },
  status: {
    type: String,
    enum: ['draft', 'listed', 'sold', 'auction'],
    default: 'draft'
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  views: {
    type: Number,
    default: 0
  },
  collection: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Collection'
  },
  tags: [String],
  isVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Method to update price in ETH based on current USD price
artworkSchema.methods.updateEthPrice = async function(ethUsdPrice) {
  this.price.eth = this.price.usd / ethUsdPrice;
  await this.save();
  return this.price.eth;
};

// Method to calculate royalty amount
artworkSchema.methods.calculateRoyalty = function(salePrice) {
  return (salePrice * this.royaltyPercentage) / 100;
};

// Virtual for formatted creation date
artworkSchema.virtual('formattedCreatedAt').get(function() {
  return this.createdAt.toLocaleDateString();
});

// Ensure virtuals are included in JSON output
artworkSchema.set('toJSON', { virtuals: true });
artworkSchema.set('toObject', { virtuals: true });

const Artwork = mongoose.model('Artwork', artworkSchema);

module.exports = Artwork;