const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
    item: { type: String, required: true },
    amount: { type: Number, required: true },
    paidBy: String,
    description: String,
    date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Expense', ExpenseSchema);
