const webhookLogger = require('../utils/webhookLogger');

module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        try {
            console.log(`Bot is ready! Logged in as ${client.user.tag}`);
            console.log(`Bot is in ${client.guilds.cache.size} servers`);

            client.user.setPresence({
                activities: [{ name: ' !', type: 0 }],
                status: 'online',
            });
        } catch (error) {
            console.error('Error in ready event:', error);
            webhookLogger.sendError(error, {
                location: 'ready event',
                action: 'bot_ready_initialization'
            });
        }
    },
};
