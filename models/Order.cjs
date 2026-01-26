const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    tableId: String,
    items: Array,
    total: Number,
    status: {
        type: String,
        default: 'pending',
        enum: ['pending', 'preparing', 'out_for_delivery', 'delivered', 'completed', 'cancelled']
    },
    timestamp: { type: Date, default: Date.now },
    paymentMode: String,

    // Delivery-specific fields
    isDelivery: { type: Boolean, default: false },
    deliveryDetails: {
        customerName: String,
        customerPhone: String,
        deliveryAddress: String,
        location: {
            lat: Number,
            lng: Number
        },
        distance: Number // Distance from restaurant in km
    },
    deliveryPartnerId: String,
    deliveredAt: Date
});

module.exports = mongoose.model('Order', OrderSchema);
