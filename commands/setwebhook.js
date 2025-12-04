const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');
const webhookLogger = require('../utils/webhookLogger');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('setwebhook')
        .setDescription('Set the error logging webhook URL (Admin only)')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addStringOption(option =>
            option.setName('url')
                .setDescription('The webhook URL (leave empty to disable)')
                .setRequired(false)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return await interaction.reply({
                content: '❌ This command is for administrators only!',
                ephemeral: true
            });
        }
        const webhookUrl = interaction.options.getString('url');
        try {
            const configPath = path.join(__dirname, '..', 'config.json');
            let config = {};
            if (fs.existsSync(configPath)) {
                config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            }
            config.errorWebhookUrl = webhookUrl || null;
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            webhookLogger.updateWebhook(webhookUrl);
            const status = webhookUrl ? 'enabled' : 'disabled';
            await interaction.reply({
                content: `✅ Error logging webhook has been ${status}!\n${webhookUrl ? `📎 Webhook URL: \`${webhookUrl}\`` : ''}`,
                ephemeral: true
            });
            if (webhookUrl) {
                setTimeout(async () => {
                    try {
                        await webhookLogger.sendInfo(
                            '🟢 **Webhook Test**\nError logging system has been successfully configured!',
                            'Webhook Connected',
                            0x00FF00
                        );
                    } catch (error) {
                        console.error('Webhook test failed:', error);
                    }
                }, 1000);
            }
        } catch (error) {
            console.error('Error setting webhook:', error);
            await webhookLogger.sendError(error, {
                location: 'setwebhook command',
                userId: interaction.user.id,
                webhookUrl: webhookUrl ? '[REDACTED]' : 'null',
                action: 'set_webhook_url'
            });
            await interaction.reply({
                content: '❌ An error occurred while setting the webhook!',
                ephemeral: true
            });
        }
    },
};
