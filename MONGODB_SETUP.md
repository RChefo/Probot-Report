# MongoDB Setup Guide

## 📋 Prerequisites

1. **MongoDB Account**: Create a free account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. **Database Cluster**: Create a free cluster (M0 tier is sufficient)

## 🔧 Setup Steps

### 1. Create MongoDB Atlas Cluster
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free account and cluster
3. Choose "FREE" tier (M0)
4. Select your cloud provider and region
5. Create cluster (takes ~5-10 minutes)

### 2. Create Database User
1. Go to "Database Access" in the left sidebar
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Set username and password
5. Set user privileges to "Read and write to any database"

### 3. Whitelist Your IP
1. Go to "Network Access" in the left sidebar
2. Click "Add IP Address"
3. Choose "Allow Access from Anywhere" (0.0.0.0/0)

### 4. Get Connection String
1. Go to "Clusters" and click "Connect"
2. Choose "Connect your application"
3. Copy the connection string

### 5. Update Environment Variables
Create a `.env` file in your project root:

```env
DISCORD_TOKEN=your_discord_bot_token_here
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/probot_blacklist
WEBHOOK_URL=your_webhook_url_here
```

Replace:
- `username` with your database user
- `password` with your database password
- `cluster.mongodb.net` with your cluster URL

## 🚀 Migration

After setting up MongoDB:

1. **Run Migration Script**:
   ```bash
   node migrate-to-mongo.js
   ```

2. **Start Bot**:
   ```bash
   node index.js
   ```

## 📁 File Structure

```
├── config/
│   └── database.js          # MongoDB connection
├── models/
│   └── Report.js            # Report schema
├── migrate-to-mongo.js      # Migration script
├── .env                     # Environment variables (create this)
└── MONGODB_SETUP.md         # This setup guide
```

## 🔄 Migration Details

The migration script will:
- ✅ Read existing JSON data from `data/reports.json`
- ✅ Transform data to MongoDB format
- ✅ Insert all reports into MongoDB
- ✅ Create backup of JSON file
- ✅ Skip migration if data already exists

## 🛠 Troubleshooting

### Connection Issues
- Verify MongoDB URI is correct
- Check if IP is whitelisted
- Ensure database user has correct permissions

### Migration Issues
- Check if `data/reports.json` exists
- Verify JSON format is valid
- Check MongoDB connection

### Bot Issues
- Ensure `.env` file exists with correct variables
- Check bot has necessary Discord permissions
- Verify MongoDB connection before starting bot

## 📞 Support

If you encounter issues:
1. Check the console logs for detailed error messages
2. Verify all environment variables are set
3. Ensure MongoDB Atlas cluster is running
4. Test connection with MongoDB Compass if needed
