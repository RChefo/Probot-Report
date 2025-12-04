const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('panel')
        .setDescription('Create the report control panel (Admin only)')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
    async execute(interaction) {
        const configPath = path.join(__dirname, '..', 'config.json');
        if (!fs.existsSync(configPath)) {
            return await interaction.reply({
                content: '❌ Bot is not set up yet! Use `/setup` first.',
                ephemeral: true
            });
        }
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (!config.reportChannelId) {
            return await interaction.reply({
                content: '❌ Report channel is not set! Use `/setup` first.',
                ephemeral: true
            });
        }
        const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
                       (config.adminRoleId && interaction.member.roles.cache.has(config.adminRoleId)) ||
                       (config.adminUserIds && config.adminUserIds.includes(interaction.user.id));
        if (!isAdmin) {
            return await interaction.reply({
                content: '❌ This command is for administrators only!',
                ephemeral: true
            });
        }
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('report_user')
                    .setLabel('Report User')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🚫'),
                new ButtonBuilder()
                    .setCustomId('unblacklist_user')
                    .setLabel('Unblacklist User')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅')
            );
        const embed = new EmbedBuilder()
            .setTitle('🛡️ ProBot Blacklist Management System')
            .setDescription('Select an action below to manage user reports:')
            .setColor(0x5865F2)
            .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
            .addFields(
                {
                    name: 'Report User',
                    value: 'Add a user to the blacklist with evidence',
                    inline: true
                },
                {
                    name: 'Unblacklist User',
                    value: 'Remove a user from the blacklist',
                    inline: true
                },
                {
                    name: '\u200B',
                    value: '\u200B',
                    inline: true
                },
                {
                    name: 'System Statistics',
                    value: 'Loading statistics...',
                    inline: false
                }
            )
            .setFooter({
                text: `ProBot System • Managed by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp(        );
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        await updatePanelStats(interaction);
    },
};
async function updatePanelStats(interaction) {
    try {
        const reportsPath = path.join(__dirname, '..', 'data', 'reports.json');
        const reports = fs.existsSync(reportsPath) ? JSON.parse(fs.readFileSync(reportsPath, 'utf8')) : [];
        const totalReports = reports.length;
        const activeBlacklists = reports.filter(r => !r.unblacklisted).length;
        const unblacklisted = reports.filter(r => r.unblacklisted).length;
        const embed = new EmbedBuilder()
            .setTitle('🛡️ ProBot Blacklist Management System')
            .setDescription('Select an action below to manage user reports:')
            .setColor(0x5865F2)
            .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
            .addFields(
                {
                    name: 'Report User',
                    value: 'Add a user to the blacklist with evidence',
                    inline: true
                },
                {
                    name: 'Unblacklist User',
                    value: 'Remove a user from the blacklist',
                    inline: true
                },
                {
                    name: '\u200B',
                    value: '\u200B',
                    inline: true
                },
                {
                    name: 'System Statistics',
                    value: `**Total Reports:** \`${totalReports}\`\n**Active Blacklists:** \`${activeBlacklists}\`\n**Resolved Cases:** \`${unblacklisted}\``,
                    inline: false
                }
            )
            .setFooter({
                text: `ProBot System • Managed by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Error updating statistics:', error);
    }
}
