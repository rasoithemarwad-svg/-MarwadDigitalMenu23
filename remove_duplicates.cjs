const mongoose = require('mongoose');
require('dotenv').config();
const MenuItem = require('./models/MenuItem.cjs');

async function removeDuplicates() {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined in .env');
        }

        console.log('🔗 Connecting to MongoDB Atlas...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected successfully!');

        console.log('🔍 Identifying duplicate menu items...');

        // Aggregate to find duplicates based on name
        const duplicates = await MenuItem.aggregate([
            {
                $group: {
                    _id: "$name",
                    count: { $sum: 1 },
                    ids: { $push: "$_id" }
                }
            },
            {
                $match: {
                    count: { $gt: 1 }
                }
            }
        ]);

        if (duplicates.length === 0) {
            console.log('✨ No duplicates found. Your menu is clean!');
        } else {
            console.log(`🧹 Found ${duplicates.length} items with duplicates.`);

            let totalDeleted = 0;
            for (const item of duplicates) {
                // Keep the first ID, delete the rest
                const idsToDelete = item.ids.slice(1);
                const result = await MenuItem.deleteMany({ _id: { $in: idsToDelete } });
                totalDeleted += result.deletedCount;
                console.log(`- Removed ${result.deletedCount} duplicates of "${item._id}"`);
            }

            console.log(`\n✅ SUCCESSFULLY DELETED ${totalDeleted} DUPLICATE ITEMS!`);
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error('\n❌ REMOVAL FAILED!');
        console.error('Error Details:', err.message);
        process.exit(1);
    }
}

removeDuplicates();
