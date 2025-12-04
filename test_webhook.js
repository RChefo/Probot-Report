const { WebhookClient, EmbedBuilder } = require('discord.js');
const webhook = new WebhookClient({
    url: 'https:
});
const embed = new EmbedBuilder()
    .setTitle('🟢 Webhook Test')
    .setDescription('Monitoring system is working successfully!')
    .setColor(0x00FF00)
    .setTimestamp();
webhook.send({
    embeds: [embed],
    username: 'ProBot Test',
    avatarURL: 'https:
}).then(() => {
    console.log('✅ Test message sent successfully!');
    process.exit(0);
}).catch((error) => {
    console.error('❌ Failed to send test message:', error);
    process.exit(1);
});
