const mongoose = require('mongoose');

// MongoDB connection
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/probot_blacklist';

        await mongoose.connect(mongoURI);

        console.log('[DATABASE] MongoDB Connected Successfully');
    } catch (error) {
        console.error('[DATABASE] MongoDB Connection Error:', error);
        process.exit(1);
    }
};

module.exports = connectDB;
