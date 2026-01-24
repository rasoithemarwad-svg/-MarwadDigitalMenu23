const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    tableId: { type: String, required: true },
    items: [{
        name: String,
        price: Number,
        qty: Number,
        category: String,
        portion: String
    }],
    total: { type: Number, required: true }, // Changed from totalAmount to total
    status: { type: String, default: 'pending' },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);
