const { SlashCommandBuilder } = require('discord.js');
const webhookLogger = require('../utils/webhookLogger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!'),

    async execute(interaction) {
        try {
            const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
            const latency = sent.createdTimestamp - interaction.createdTimestamp;
            const apiLatency = Math.round(interaction.client.ws.ping);

            await interaction.editReply(`🏓 Pong! Latency: ${latency}ms | API Latency: ${apiLatency}ms`);
        } catch (error) {
            console.error('Error executing ping command:', error);
            webhookLogger.sendError(error, {
                location: 'ping command',
                userId: interaction.user.id,
                action: 'ping_command'
            });
            await interaction.reply({
                content: '❌ An error occurred while executing the ping command!',
                ephemeral: true
            }).catch(console.error);
        }
    },
};
