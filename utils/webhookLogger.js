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
            const webhookUrl = 'https://discord.com/api/webhooks/1446181688823775293/sb-330drPhCOmlI1k-30uceU7duJ9ry2l-f-OI0BKNVGw6DkStTFSLgQcjFk-HdD1I1X';
            this.webhookClient = new WebhookClient({ url: webhookUrl });
            console.log('[WEBHOOK] Webhook initialized successfully');
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
            let message = `**Error Type:** ${error.name || 'Unknown Error'}\n`;
            message += `**Error Message:** ${error.message || 'No message'}\n`;
            message += `**Location:** ${context.location || 'Unknown'}\n`;

            if (error.stack) {
                const stackLines = error.stack.split('\n').slice(0, 5).join('\n');
                message += `\n**ERORR:**\n\`\`\`\n${stackLines}\n\`\`\`\n`;
            }

            await this.webhookClient.send({
                content: message
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
;
            await this.webhookClient.send({
                embeds: [infoEmbed]
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
