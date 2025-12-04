# ProBot Blacklist Report System 🚫



## Setup

1. **Create `.env` file:**
   ```env
   DISCORD_TOKEN=your_bot_token_here
   CLIENT_ID=your_client_id_here
   WEBHOOK_URL=your_webhook_url_here
   ```
2. **Setup Error Monitoring (Optional):**
   - Create a webhook in a separate error logging channel
   - Copy the webhook URL
   - Use `/setwebhook [webhook-url]` command to enable error logging system

## Installation & Running

```bash
# Install dependencies
npm install

# Register slash commands
node deploy-commands.js

# Start the bot
npm start
```

## Available Commands

### Slash Commands
- `/setup [channel] [admin_role]` - Setup bot for the server
- `/panel` - Create blacklist management panel
- `/check [user]` - Check all reports for a specific user
- `/setwebhook [url]` - Set error logging webhook
- `/ping` - Test bot latency

### Prefix Commands
- `!stats` - Display/update statistics message
- `!panel` - Create/update management panel
- `!clearreports CONFIRM` - Clear all reports (dangerous)

## Features

### 🔧 **Report System**
- **Report Users**: Click "Report User" button to report users to blacklist
- **Unblacklist Users**: Click "Unblacklist User" button to remove users from blacklist
- **Update Reports**: System allows updating existing reports instead of creating duplicates
- **Persistent Storage**: All reports are saved in JSON format

### 📊 **Statistics & Monitoring**
- **Real-time Statistics**: Auto-updating stats messages
- **Persistent Panels**: Always-available management panels
- **Error Logging**: Webhook integration for error monitoring
- **Comprehensive Logs**: Detailed logging for all bot actions

### 🔍 **Advanced Search (/check)**
- **User Report Lookup**: Search all reports for any user
- **Complete Statistics**: Show active vs resolved reports count
- **Full Details**: Display report date, status, and modification history
- **Easy Navigation**: Buttons to navigate between multiple reports
- **Status Indicators**: Clear visual indicators (Active/Resolved)
- **Color Coding**: Green for resolved, Red for active
- **Admin Only**: Secure access for administrators only

