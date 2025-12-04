const { EmbedBuilder, WebhookClient } = require('discord.js');
const fs = require('fs');
const path = require('path');
class WebhookLogger {
    constructor() {
        this.webhookClient = null;
        this.loadWebhook();
    }
    loadWebhook() {
        try {
            const configPath = path.join(__dirname, '..', 'config.json');
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                if (config.errorWebhookUrl) {
                    this.webhookClient = new WebhookClient({ url: config.errorWebhookUrl });
                }
            }
        } catch (error) {
            console.error('Error loading webhook:', error);
        }
    }
    async sendError(error, context = {}) {
        if (!this.webhookClient) {
            console.log('[WEBHOOK] No webhook configured, skipping error report');
            return;
        }
        try {
            const errorEmbed = new EmbedBuilder()
                .setTitle('🚨 Bot Error Report')
                .setColor(0xFF0000)
                .setTimestamp()
                .addFields(
                    {
                        name: '🔴 Error Type',
                        value: `\`\`\`${error.name || 'Unknown Error'}\`\`\``,
                        inline: true
                    },
                    {
                        name: '📝 Error Message',
                        value: `\`\`\`${error.message || 'No message'}\`\`\``,
                        inline: false
                    },
                    {
                        name: '📍 Location',
                        value: `\`\`\`${context.location || 'Unknown'}\`\`\``,
                        inline: true
                    },
                    {
                        name: '⏰ Time',
                        value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
                        inline: true
                    }
                );
            if (error.stack) {
                const stackLines = error.stack.split('\n').slice(0, 5).join('\n');
                errorEmbed.addFields({
                    name: '📋 Stack Trace',
                    value: `\`\`\`${stackLines}\`\`\``,
                    inline: false
                });
            }
            if (Object.keys(context).length > 1) {
                const additionalInfo = Object.entries(context)
                    .filter(([key]) => key !== 'location')
                    .map(([key, value]) => `**${key}:** ${value}`)
                    .join('\n');
                if (additionalInfo) {
                    errorEmbed.addFields({
                        name: '📊 Additional Info',
                        value: additionalInfo,
                        inline: false
                    });
                }
            }
            errorEmbed.setFooter({
                text: 'ProBot Error Logger',
                iconURL: 'https:
            });
            await this.webhookClient.send({
                embeds: [errorEmbed],
                username: 'ProBot Error Logger',
                avatarURL: 'https:
            });
            console.log('[WEBHOOK] Error report sent successfully');
        } catch (webhookError) {
            console.error('[WEBHOOK] Failed to send error report:', webhookError);
        }
    }
    async sendInfo(message, title = 'Bot Info', color = 0x3498DB) {
        if (!this.webhookClient) {
            console.log('[WEBHOOK] No webhook configured, skipping info message');
            return;
        }
        try {
            const infoEmbed = new EmbedBuilder()
                .setTitle(`ℹ️ ${title}`)
                .setDescription(message)
                .setColor(color)
                .setTimestamp()
                .setFooter({
                    text: 'ProBot Info Logger',
                    iconURL: 'https:
                });
            await this.webhookClient.send({
                embeds: [infoEmbed],
                username: 'ProBot Info Logger',
                avatarURL: 'https:
            });
            console.log('[WEBHOOK] Info message sent successfully');
        } catch (webhookError) {
            console.error('[WEBHOOK] Failed to send info message:', webhookError);
        }
    }
    updateWebhook(url) {
        try {
            if (url) {
                this.webhookClient = new WebhookClient({ url });
                console.log('[WEBHOOK] Webhook updated successfully');
            } else {
                this.webhookClient = null;
                console.log('[WEBHOOK] Webhook disabled');
            }
        } catch (error) {
            console.error('[WEBHOOK] Failed to update webhook:', error);
        }
    }
}
const webhookLogger = new WebhookLogger();
module.exports = webhookLogger;
