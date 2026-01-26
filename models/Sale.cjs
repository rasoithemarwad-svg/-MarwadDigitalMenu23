const mongoose = require('mongoose');

const SaleSchema = new mongoose.Schema({
    tableId: { type: String, required: true },
    items: [{
        name: String,
        qty: Number,
        price: Number
    }],
    total: { type: Number, required: true },
    paymentMode: { type: String, enum: ['CASH', 'ONLINE'], default: 'CASH' },
    settledAt: { type: Date, default: Date.now }
}, { timestamps: true });

// PRODUCTION PERFORMANCE: Index for sales reports
SaleSchema.index({ settledAt: -1 }); // For date-range queries
SaleSchema.index({ paymentMode: 1, settledAt: -1 }); // For payment mode reports

module.exports = mongoose.model('Sale', SaleSchema);
