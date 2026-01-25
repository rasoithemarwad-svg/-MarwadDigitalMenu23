const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
    item: { type: String, required: true },
    amount: { type: Number, required: true },
    paidBy: String,
    description: String,
    paymentMode: { type: String, enum: ['CASH', 'ONLINE'], default: 'CASH' }, // Updated 2026-01-25
    date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Expense', ExpenseSchema);
