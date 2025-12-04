module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        console.log(`Bot is ready! Logged in as ${client.user.tag}`);
        console.log(`Bot is in ${client.guilds.cache.size} servers`);

        client.user.setPresence({
            activities: [{ name: ' !', type: 0 }],
            status: 'online',
        });
    },
};
