const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const webhookLogger = require('../utils/webhookLogger');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('check')
        .setDescription('Check all reports for a specific user')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addStringOption(option =>
            option.setName('user_id')
                .setDescription('The user ID to check reports for')
                .setRequired(true)
                .setMinLength(15)
                .setMaxLength(20)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return await interaction.reply({
                content: '❌ This command is for administrators only!',
                ephemeral: true
            });
        }
        const userId = interaction.options.getString('user_id');
        if (!/^\d{15,20}$/.test(userId)) {
            return await interaction.editReply({
                content: '❌ Invalid User ID! Please enter a valid Discord user ID (15-20 digits).'
            });
        }
        try {
            const reportsPath = path.join(__dirname, '..', 'data', 'reports.json');
            if (!fs.existsSync(reportsPath)) {
                return await interaction.reply({
                    content: '❌ No reports database found!',
                    ephemeral: true
                });
            }
            const reports = JSON.parse(fs.readFileSync(reportsPath, 'utf8'));
            const userReports = reports.filter(report => report.userId === userId);
            if (userReports.length === 0) {
                return await interaction.reply({
                    content: `❌ No reports found for user \`${userId}\`.`,
                    ephemeral: true
                });
            }
            const summaryEmbed = new EmbedBuilder()
                .setTitle('🔍 User Report Summary')
                .setDescription(`Reports for user \`${userId}\``)
                .setColor(0x3498DB)
                .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                .addFields(
                    {
                        name: 'Statistics',
                        value: `**Total Reports:** \`${userReports.length}\`\n**Active Blacklists:** \`${userReports.filter(r => !r.unblacklisted).length}\`\n**Resolved Cases:** \`${userReports.filter(r => r.unblacklisted).length}\``,
                        inline: false
                    }
                )
                .setFooter({
                    text: `Checked by ${interaction.user.tag} • ${userReports.length} reports found`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .setTimestamp();
            let currentPage = 0;
            const reportsPerPage = 1;
            const totalPages = Math.ceil(userReports.length / reportsPerPage);
            const createReportEmbed = (page) => {
                const startIndex = page * reportsPerPage;
                const endIndex = Math.min(startIndex + reportsPerPage, userReports.length);
                const currentReports = userReports.slice(startIndex, endIndex);
                const activeReports = userReports.filter(r => !r.unblacklisted).length;
                const resolvedReports = userReports.filter(r => r.unblacklisted).length;
                const overallStatus = activeReports > 0 ? '🚫 **BLACKLISTED**' : '✅ **CLEARED**';
                const statusColor = activeReports > 0 ? 0xDC143C : 0x32CD32;
                const embed = new EmbedBuilder()
                    .setTitle(`${overallStatus} - User ${userId}`)
                    .setDescription(`*Page ${page + 1} of ${totalPages}*\n\n**Reports ${startIndex + 1}-${endIndex} of ${userReports.length}**\n\n**Overall Status:** ${activeReports > 0 ? `🔴 **${activeReports} Active Blacklist(s)**` : `🟢 **All ${resolvedReports} report(s) resolved**`}`)
                    .setColor(statusColor)
                    .setThumbnail(interaction.guild.iconURL({ dynamic: true }));
                embed.addFields(
                    {
                        name: 'Statistics',
                        value: `**Total Reports:** \`${userReports.length}\`\n**Active Blacklists:** \`${userReports.filter(r => !r.unblacklisted).length}\`\n**Resolved Cases:** \`${userReports.filter(r => r.unblacklisted).length}\``,
                        inline: false
                    }
                );
                if (currentReports.length > 0) {
                    const report = currentReports[0];
                    const reportNumber = startIndex + 1;
                    embed.setColor(report.unblacklisted ? 0x32CD32 : 0xDC143C);
                    embed.addFields(
                        {
                            name: `${report.unblacklisted ? '✅ **RESOLVED**' : '🚫 **ACTIVE BLACKLIST**'} - Report #${reportNumber}`,
                            value: `**Report ID:** \`${report.id}\`\n**Status:** ${report.unblacklisted ? '**🟢 RESOLVED** - User unbanned' : '**🔴 ACTIVE** - User still blacklisted'}\n**Date:** <t:${Math.floor(new Date(report.reportedAt).getTime() / 1000)}:F>\n**Reporter:** <@${report.reportedBy}>${report.lastEditedAt ? `\n**Last Edited:** <t:${Math.floor(new Date(report.lastEditedAt).getTime() / 1000)}:F>` : ''}`,
                            inline: false
                        },
                        {
                            name: 'Blacklist Details',
                            value: report.reason,
                            inline: false
                        }
                    );
                    if (report.proof && report.proof !== 'No proof available') {
                        embed.addFields({
                            name: 'Evidence',
                            value: `[View Evidence](${report.proof})`,
                            inline: false
                        });
                    }
                    if (report.edits && report.edits.length > 0) {
                        const recentEdit = report.edits[report.edits.length - 1];
                        embed.addFields({
                            name: 'Recent Edit',
                            value: `**Edited by:** <@${recentEdit.editedBy}>\n**Date:** <t:${Math.floor(new Date(recentEdit.editedAt).getTime() / 1000)}:F>\n**Total Edits:** \`${report.edits.length}\``,
                            inline: false
                        });
                    }
                    if (report.unblacklisted) {
                        embed.addFields({
                            name: 'Resolution',
                            value: `**Removed by:** <@${report.unblacklistedBy}>\n**Date:** <t:${Math.floor(new Date(report.unblacklistedAt).getTime() / 1000)}:F>`,
                            inline: false
                        });
                    }
                }
                embed.setFooter({
                    text: `Checked by ${interaction.user.tag} • Page ${page + 1}/${totalPages}`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                });
                return embed;
            };
            const createButtons = (page) => {
                const row = new ActionRowBuilder();
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev_page')
                        .setLabel('◀️ Previous')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === 0)
                );
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId('page_indicator')
                        .setLabel(`${page + 1}/${totalPages}`)
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true)
                );
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId('next_page')
                        .setLabel('Next ▶️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === totalPages - 1)
                );
                return row;
            };
            const embed = createReportEmbed(currentPage);
            const buttons = totalPages > 1 ? createButtons(currentPage) : null;
            const replyOptions = {
                embeds: [embed],
                ephemeral: true
            };
            if (buttons) {
                replyOptions.components = [buttons];
            }
            await interaction.reply(replyOptions);
            if (totalPages > 1) {
                const message = await interaction.fetchReply();
                const filter = (btnInteraction) => {
                    return btnInteraction.user.id === interaction.user.id &&
                           ['prev_page', 'next_page'].includes(btnInteraction.customId);
                };
                const collector = message.createMessageComponentCollector({
                    filter,
                    time: 300000 
                });
                collector.on('collect', async (btnInteraction) => {
                    if (btnInteraction.customId === 'prev_page' && currentPage > 0) {
                        currentPage--;
                    } else if (btnInteraction.customId === 'next_page' && currentPage < totalPages - 1) {
                        currentPage++;
                    }
                    const newEmbed = createReportEmbed(currentPage);
                    const newButtons = createButtons(currentPage);
                    await btnInteraction.update({
                        embeds: [newEmbed],
                        components: [newButtons]
                    });
                });
                collector.on('end', () => {
                    const disabledButtons = createButtons(currentPage);
                    disabledButtons.components.forEach(button => {
                        button.setDisabled(true);
                    });
                    interaction.editReply({
                        embeds: [createReportEmbed(currentPage)],
                        components: [disabledButtons]
                    }).catch(() => {});
                });
            }
        } catch (error) {
            console.error('Error checking user reports:', error);
            await webhookLogger.sendError(error, {
                location: 'check command',
                userId: interaction.user.id,
                targetUserId: userId,
                action: 'check_user_reports'
            });
            await interaction.reply({
                content: '❌ An error occurred while checking user reports!',
                ephemeral: true
            });
        }
    },
};
