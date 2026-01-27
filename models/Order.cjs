const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    tableId: String,
    items: Array,
    total: Number,
    subtotal: Number,
    discount: { type: Number, default: 0 },
    status: {
        type: String,
        default: 'pending',
        enum: ['pending_approval', 'pending', 'preparing', 'out_for_delivery', 'delivered', 'completed', 'cancelled']
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

// PRODUCTION PERFORMANCE: Add indexes for frequently queried fields
OrderSchema.index({ status: 1, timestamp: -1 }); // For order list queries
OrderSchema.index({ tableId: 1, status: 1 }); // For table-specific queries
OrderSchema.index({ isDelivery: 1, status: 1 }); // For delivery partner queries
OrderSchema.index({ timestamp: -1 }); // For recent orders

module.exports = mongoose.model('Order', OrderSchema);
