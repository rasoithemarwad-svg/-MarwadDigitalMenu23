const mongoose = require('mongoose');

const MenuItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: Number,
    category: { type: String, enum: ['HUT', 'RESTAURANT', 'CAFE'], required: true },
    subCategory: String,
    isAvailable: { type: Boolean, default: true },
    image: String,
    description: String,
    usePortions: { type: Boolean, default: false },
    portions: [{
        label: String,
        price: Number
    }]
}, { timestamps: true });

module.exports = mongoose.model('MenuItem', MenuItemSchema);
