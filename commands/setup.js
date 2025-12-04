const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Setup the bot for the server (Admin only)')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel where reports will be sent')
                .setRequired(true)
                .addChannelTypes(0)),
        .addRoleOption(option =>
            option.setName('admin_role')
                .setDescription('Admin role that can use the bot')
                .setRequired(false)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return await interaction.reply({
                content: '❌ This command is for administrators only!',
                ephemeral: true
            });
        }
        const channel = interaction.options.getChannel('channel');
        const adminRole = interaction.options.getRole('admin_role');
        const configPath = path.join(__dirname, '..', 'config.json');
        let config = {};
        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
        config.guildId = interaction.guild.id;
        config.reportChannelId = channel.id;
        if (adminRole) {
            config.adminRoleId = adminRole.id;
        }
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        const embed = {
            color: 0x00ff00,
            title: '✅ Bot setup completed successfully!',
            fields: [
                {
                    name: '📢 Report Channel',
                    value: `<#${channel.id}>`,
                    inline: true
                }
            ],
            timestamp: new Date()
        };
        if (adminRole) {
            embed.fields.push({
                name: '👑 Admin Role',
                value: `<@&${adminRole.id}>`,
                inline: true
            });
        }
        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
