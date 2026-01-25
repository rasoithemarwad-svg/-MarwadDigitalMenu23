const mongoose = require('mongoose');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const MenuItem = require('./models/MenuItem.cjs');

async function cleanSync() {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined in .env');
        }

        console.log('🔗 Connecting to MongoDB Atlas...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected successfully!');

        const DATA_FILE = path.join(__dirname, 'menu_data.json');
        if (!fs.existsSync(DATA_FILE)) {
            throw new Error('menu_data.json not found in the project root');
        }

        const menuData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        console.log(`📄 Found ${menuData.length} items in local JSON file.`);

        console.log('🧹 Clearing existing menu items from database...');
        const deleteResult = await MenuItem.deleteMany({});
        console.log(`🗑️ Removed ${deleteResult.deletedCount} old items.`);

        console.log('🚀 Importing fresh menu data...');

        // Remove 'id' field from each item as MongoDB uses its own '_id'
        const cleanedData = menuData.map(({ id, ...rest }) => rest);

        const insertResult = await MenuItem.insertMany(cleanedData);
        console.log(`✅ Successfully imported ${insertResult.length} items into your live menu!`);

        console.log('\n✨ ALL DONE! Your menu is now perfectly synced.');
        console.log('👉 Please refresh your Admin/Customer pages to see the changes.');

        await mongoose.disconnect();
    } catch (err) {
        console.error('\n❌ SYNC FAILED!');
        console.error('Error Details:', err.message);
        console.log('\n💡 Possible fix: Ensure your IP address is whitelisted in MongoDB Atlas.');
        process.exit(1);
    }
}

cleanSync();
