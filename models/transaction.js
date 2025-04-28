const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['purchase', 'auction_bid', 'auction_settlement', 'withdrawal'],
        required: true
    },
    nftId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'NFT',
        required: true
    },
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    },
    auctionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Auction'
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

transactionSchema.pre('save', async function(next) {
    if (this.isNew) {
        try {
            const buyer = await mongoose.model('User').findById(this.buyer);
            if (!buyer || buyer.balance < this.amount) {
                throw new Error('Insufficient balance');
            }
            
            // Deduct balance from buyer
            await mongoose.model('User').findByIdAndUpdate(
                this.buyer,
                { $inc: { balance: -this.amount } }
            );

            // Add balance to seller
            await mongoose.model('User').findByIdAndUpdate(
                this.seller,
                { $inc: { balance: this.amount } }
            );

            // Update NFT ownership
            await mongoose.model('NFT').findByIdAndUpdate(
                this.nftId,
                { owner: this.buyer }
            );

            this.status = 'completed';
        } catch (error) {
            this.status = 'failed';
            throw error;
        }
    }
    next();
});

module.exports = mongoose.model('Transaction', transactionSchema);