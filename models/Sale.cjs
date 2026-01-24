const mongoose = require('mongoose');

const SaleSchema = new mongoose.Schema({
    tableId: { type: String, required: true },
    items: [{
        name: String,
        qty: Number,
        price: Number
    }],
    total: { type: Number, required: true },
    settledAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Sale', SaleSchema);
