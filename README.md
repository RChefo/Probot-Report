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

### تحديث التقارير التلقائي:
- **عدم التكرار**: إذا كان هناك تقرير موجود للمستخدم، يتم تحديثه بدلاً من إنشاء تقرير جديد
- **سجل شامل**: حفظ جميع التعديلات مع التواريخ والأشخاص الذين قاموا بالتعديل
- **تحديث فوري**: الإيمبد يتحدث تلقائياً عند تعديل التقرير

### نظام المراقبة والأخطاء (Webhook):
- **تسجيل الأخطاء**: جميع الأخطاء ترسل تلقائياً إلى Discord عبر webhook
- **تفاصيل شاملة**: اسم الخطأ، الموقع، Stack trace، والمعلومات الإضافية
- **تنبيهات فورية**: إشعار فوري عند حدوث أي خطأ في البوت
- **أمان عالي**: webhook محمي ولا يمكن الوصول إليه إلا من البوت

### ⚠️ تحذيرات مهمة:
### ⚠️ **Danger Zone (!clearreports CONFIRM)**
- **Permanently deletes** all reports - cannot be undone
- Requires `CONFIRM` in uppercase before execution
- Resets all statistics and panels

### 📈 **Auto-Statistics (!stats)**
- **Real-time Updates**: Statistics update when reports are added or resolved
- **Comprehensive Stats**: Shows report count, users, active and resolved cases
- **Persistent Message**: Stays in channel and updates automatically

### 🎛️ **Persistent Control Panel (!panel)**
- **Visible to All**: Everyone can see the buttons
- **Auto-Updates**: Statistics update when changed
- **No Recreation Needed**: Stays until manually deleted

## Adding New Commands

Create a new file in the `commands/` folder with this format:

```javascript
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('command_name')
        .setDescription('Command description'),

    async execute(interaction) {
        // Command code here
        await interaction.reply('Command response');
    },
};
```

Then run `node deploy-commands.js` to register the new command.

## Usage Guide

### For Admins:
1. Use `/setup #report-channel` to set the report channel
2. Use `/panel` to create the management panel
3. Click buttons to create reports or unblacklist users

### Key Features:
- 🚫 **Report User**: Enter user ID, reason, and image proof link
- ✅ **Unblacklist User**: Enter user ID to remove from blacklist
- 📊 **Live Statistics**: Shows report counts and statuses
- 🔄 **Auto-Updates**: Messages update when unblacklisting occurs
- 🛡️ **High Security**: Admin permissions only

## Technical Features

- ⚡ Fast performance with Discord.js v14
- 🔄 Slash Commands and Modal dialogs support
- 📁 Excellent code organization (MVC pattern)
- 🛡️ Advanced error handling
- 💾 JSON data persistence
- 🌍 Professional English interface

## Support

If you encounter any issues or need help, please check the error logs or contact the developer.

---

**Enjoy your bot! 🤖✨**
