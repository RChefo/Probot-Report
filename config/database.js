const mongoose = require('mongoose');

// MongoDB connection
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/probot_blacklist';

        await mongoose.connect(mongoURI);

        console.log('[DATABASE] MongoDB Connected Successfully');
    } catch (error) {
        console.error('[DATABASE] MongoDB Connection Error:', error);
        console.log('[DATABASE] Please check:');
        console.log('1. MongoDB Atlas IP whitelist includes your IP');
        console.log('2. MongoDB connection string is correct');
        console.log('3. Internet connection is stable');
        process.exit(1);
    }
};

module.exports = connectDB;
