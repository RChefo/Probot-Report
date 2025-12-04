const { Events, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isButton()) return;
        const configPath = path.join(__dirname, '..', 'config.json');
        if (!fs.existsSync(configPath)) return;
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const isAdmin = interaction.member.permissions.has('Administrator') ||
                       (config.adminRoleId && interaction.member.roles.cache.has(config.adminRoleId)) ||
                       (config.adminUserIds && config.adminUserIds.includes(interaction.user.id));
        if (!isAdmin) {
            return await interaction.reply({
                content: '❌ This command is for administrators only!',
                ephemeral: true
            });
        }
        if (interaction.customId === 'report_user') {
            const modal = new ModalBuilder()
                .setCustomId('report_modal')
                .setTitle('🚫 Report User');
            const userIdInput = new TextInputBuilder()
                .setCustomId('user_id')
                .setLabel('User ID')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Enter user ID')
                .setRequired(true)
                .setMinLength(15)
                .setMaxLength(20);
            const reasonInput = new TextInputBuilder()
                .setCustomId('reason')
                .setLabel('Blacklist Reason')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Write the blacklist reason')
                .setRequired(true)
                .setMinLength(10)
                .setMaxLength(1000);
            const proofInput = new TextInputBuilder()
                .setCustomId('proof')
                .setLabel('Image Proof Link (Optional)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('https:
                .setRequired(false);
            const firstActionRow = new ActionRowBuilder().addComponents(userIdInput);
            const secondActionRow = new ActionRowBuilder().addComponents(reasonInput);
            const thirdActionRow = new ActionRowBuilder().addComponents(proofInput);
            modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);
            await interaction.showModal(modal);
        } else if (interaction.customId === 'unblacklist_user') {
            const modal = new ModalBuilder()
                .setCustomId('unblacklist_modal')
                .setTitle('✅ Unblacklist User');
            const userIdInput = new TextInputBuilder()
                .setCustomId('user_id')
                .setLabel('User ID')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Enter user ID to unblacklist')
                .setRequired(true)
                .setMinLength(15)
                .setMaxLength(20);
            const firstActionRow = new ActionRowBuilder().addComponents(userIdInput);
            modal.addComponents(firstActionRow);
            await interaction.showModal(modal);
        }
    },
};
