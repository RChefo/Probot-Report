const { Events, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const webhookLogger = require('../utils/webhookLogger');
module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isModalSubmit()) return;
        try {
            const configPath = path.join(__dirname, '..', 'config.json');
            if (!fs.existsSync(configPath)) {
                return await interaction.reply({
                    content: '❌ Bot configuration not found. Please run `/setup` first.',
                    ephemeral: true
                });
            }
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (interaction.customId === 'report_modal') {
                await handleReportModal(interaction, config);
            } else if (interaction.customId === 'unblacklist_modal') {
                await handleUnblacklistModal(interaction, config);
            }
        } catch (error) {
            console.error('Modal handling error:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An unexpected error occurred. Please try again.',
                    ephemeral: true
                });
            }
        }
    },
};
async function updateExistingReportEmbed(interaction, config, report) {
    try {
        const reportChannel = interaction.guild.channels.cache.get(config.reportChannelId);
        if (!reportChannel || !report.messageId) {
            console.log(`[ERROR] Cannot find report channel or message for user ${report.userId}`);
            return;
        }
        const message = await reportChannel.messages.fetch(report.messageId);
        if (!message) {
            console.log(`[ERROR] Cannot find message ${report.messageId} for user ${report.userId}`);
            return;
        }
        const updatedEmbed = EmbedBuilder.from(message.embeds[0])
            .addFields({
                name: '🔄 **Last Updated**',
                value: `**Updated by:** <@${interaction.user.id}>\n**Date:** <t:${Math.floor(Date.now() / 1000)}:F>\n**Total Edits:** \`${report.edits ? report.edits.length : 0}\``,
                inline: false
            });
        const reasonFieldIndex = updatedEmbed.data.fields.findIndex(f => f.name === 'Blacklist Details');
        if (reasonFieldIndex !== -1) {
            updatedEmbed.data.fields[reasonFieldIndex] = {
                name: 'Blacklist Details',
                value: `**Reason:** ${report.reason}`,
                inline: false
            };
        }
        const proofFieldIndex = updatedEmbed.data.fields.findIndex(f => f.name === 'Evidence Provided');
        if (proofFieldIndex !== -1) {
            const proofValue = report.proof !== 'No proof available' ?
                `[View Evidence](${report.proof})` :
                '❌ No evidence provided';
            updatedEmbed.data.fields[proofFieldIndex] = {
                name: 'Evidence Provided',
                value: proofValue,
                inline: false
            };
        }
        await message.edit({ embeds: [updatedEmbed] });
        console.log(`[INFO] Successfully updated embed for user ${report.userId}`);
    } catch (error) {
        console.error(`[ERROR] Failed to update embed for user ${report.userId}:`, error);
        await webhookLogger.sendError(error, {
            location: 'updateExistingReportEmbed',
            userId: report.userId,
            messageId: report.messageId,
            action: 'update_report_embed'
        });
    }
}
async function handleReportModal(interaction, config) {
    await interaction.deferReply({ ephemeral: true });
    const userId = interaction.fields.getTextInputValue('user_id');
    const reason = interaction.fields.getTextInputValue('reason');
    const proof = interaction.fields.getTextInputValue('proof') || 'No proof available';
    if (!/^\d{15,20}$/.test(userId)) {
        return await interaction.editReply({
            content: '❌ Invalid User ID! Please enter a valid Discord user ID (15-20 digits).'
        });
    }
    if (reason.length < 10) {
        return await interaction.editReply({
            content: '❌ Reason must be at least 10 characters long.'
        });
    }
    try {
        const reportsPath = path.join(__dirname, '..', 'data', 'reports.json');
        let reports = [];
        if (fs.existsSync(reportsPath)) {
            reports = JSON.parse(fs.readFileSync(reportsPath, 'utf8'));
        }
        const existingReportIndex = reports.findIndex(r => r.userId === userId && !r.unblacklisted);
        if (existingReportIndex !== -1) {
            const existingReport = reports[existingReportIndex];
            if (!existingReport.edits) {
                existingReport.edits = [];
            }
            existingReport.edits.push({
                editId: `EDIT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`,
                previousReason: existingReport.reason,
                previousProof: existingReport.proof,
                newReason: reason,
                newProof: proof,
                editedBy: interaction.user.id,
                editedAt: new Date().toISOString()
            });
            existingReport.reason = reason;
            existingReport.proof = proof;
            existingReport.lastEditedBy = interaction.user.id;
            existingReport.lastEditedAt = new Date().toISOString();
            console.log(`[INFO] Updated existing report for user ${userId}`);
            await updateExistingReportEmbed(interaction, config, existingReport);
            fs.writeFileSync(reportsPath, JSON.stringify(reports, null, 2));
            await updateGlobalStats(interaction.guild, config);
            await interaction.editReply({
                content: `✅ Report updated successfully for user \`${userId}\`!\n📍 Report Channel: <#${config.reportChannelId}>`
            });
            return;
        }
        const reportId = `RPT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        const report = {
            id: reportId,
            userId: userId,
            reason: reason,
            proof: proof,
            reportedBy: interaction.user.id,
            reportedAt: new Date().toISOString(),
            messageId: null, 
            unblacklisted: false,
            edits: [] 
        };
        reports.push(report);
        fs.writeFileSync(reportsPath, JSON.stringify(reports, null, 2));
        const reportChannel = interaction.guild.channels.cache.get(config.reportChannelId);
        if (!reportChannel) {
            return await interaction.editReply({
                content: '❌ Report channel does not exist!'
            });
        }
        const titleMessage = await reportChannel.send(`🚫 Blacklist Report - User ${userId}`);
        const reportEmbed = new EmbedBuilder()
            .setTitle('🚫 Blacklist Report')
            .setDescription('A new user has been reported and added to the blacklist.')
            .setColor(0xDC143C)
            .addFields(
                {
                    name: 'Target User',
                    value: `**ID:** \`${userId}\`\n**Status:** 🔴 Blacklisted`,
                    inline: true
                },
                {
                    name: 'Report Details',
                    value: `**Date:** <t:${Math.floor(Date.now() / 1000)}:F>\n**Reporter:** <@${interaction.user.id}>\n**Report ID:** \`${reportId}\``,
                    inline: true
                },
                {
                    name: 'Blacklist Details',
                    value: `**Reason:** ${reason}`,
                    inline: false
                }
            )
            .setFooter({
                text: `ProBot Blacklist System • Report ID: ${reportId}`,
                iconURL: interaction.guild.iconURL({ dynamic: true })
            })
            .setTimestamp();
        if (proof !== 'No proof available') {
            reportEmbed.setImage(proof);
            reportEmbed.addFields({
                name: 'Evidence Provided',
                value: `[View Evidence](${proof})`,
                inline: false
            });
        } else {
            reportEmbed.addFields({
                name: 'Evidence Provided',
                value: '❌ No evidence provided',
                inline: false
            });
        }
        const embedMessage = await reportChannel.send({ embeds: [reportEmbed] });
        report.messageId = embedMessage.id;
        fs.writeFileSync(reportsPath, JSON.stringify(reports, null, 2));
        await updateGlobalStats(interaction.guild, config);
        await interaction.editReply({
            content: `✅ Report sent successfully!`
        });
    } catch (error) {
        console.error('Error processing report:', error);
        await webhookLogger.sendError(error, {
            location: 'handleReportModal',
            userId: userId,
            action: 'create_report'
        });
        await interaction.editReply({
            content: '❌ An error occurred while processing the report!'
        });
    }
}
async function handleUnblacklistModal(interaction, config) {
    await interaction.deferReply({ ephemeral: true });
    const userId = interaction.fields.getTextInputValue('user_id');
    if (!/^\d{15,20}$/.test(userId)) {
        return await interaction.editReply({
            content: '❌ Invalid User ID! Please enter a valid Discord user ID (15-20 digits).'
        });
    }
    try {
        const reportsPath = path.join(__dirname, '..', 'data', 'reports.json');
        if (!fs.existsSync(reportsPath)) {
            return await interaction.reply({
                content: '❌ No reports found!'
            });
        }
        let reports = JSON.parse(fs.readFileSync(reportsPath, 'utf8'));
        const reportIndex = reports.findIndex(r => r.userId === userId && !r.unblacklisted);
        if (reportIndex === -1) {
            return await interaction.reply({
                content: '❌ No report found for this user or they are already unblacklisted!'
            });
        }
        const report = reports[reportIndex];
        report.unblacklisted = true;
        report.unblacklistedBy = interaction.user.id;
        report.unblacklistedAt = new Date().toISOString();
        fs.writeFileSync(reportsPath, JSON.stringify(reports, null, 2));
        const reportChannel = interaction.guild.channels.cache.get(config.reportChannelId);
        console.log(`[DEBUG] Attempting to update message - Channel: ${config.reportChannelId}, Message ID: ${report.messageId}`);
        if (reportChannel && report.messageId) {
            try {
                console.log(`[DEBUG] Fetching message ${report.messageId} from channel ${reportChannel.id}`);
                const message = await reportChannel.messages.fetch(report.messageId);
                console.log(`[DEBUG] Message found: ${message.id}`);
                const embed = message.embeds[0];
                if (embed) {
                    console.log(`[DEBUG] Updating embed for user ${userId}`);
                    const updatedEmbed = EmbedBuilder.from(embed)
                        .setTitle('✅ Blacklist Report - RESOLVED')
                        .setDescription('This user has been removed from the blacklist.')
                        .setColor(0x32CD32) 
                        .addFields({
                            name: 'Unblacklist Action',
                            value: `**Removed by:** <@${interaction.user.id}>\n**Date:** <t:${Math.floor(Date.now() / 1000)}:F>\n**Status:** ✅ Resolved`,
                            inline: false
                        });
                    await message.edit({ embeds: [updatedEmbed] });
                    console.log(`[DEBUG] Successfully updated embed for user ${userId}`);
                } else {
                    console.log(`[DEBUG] No embed found in message ${message.id}`);
                }
            } catch (error) {
                console.error(`[ERROR] Failed to update message for user ${userId}:`, error);
                await webhookLogger.sendError(error, {
                    location: 'handleUnblacklistModal - message update',
                    userId: userId,
                    messageId: report.messageId,
                    action: 'update_unblacklist_embed'
                });
            }
        } else {
            console.log(`[DEBUG] Missing channel (${!!reportChannel}) or messageId (${report.messageId}) for user ${userId}`);
        }
        await updateGlobalStats(interaction.guild, config);
        await interaction.editReply({
            content: `✅ User \`${userId}\` has been successfully unblacklisted!`
        });
    } catch (error) {
        console.error('Error processing unblacklist:', error);
        await webhookLogger.sendError(error, {
            location: 'handleUnblacklistModal',
            userId: userId,
            action: 'unblacklist_user'
        });
        await interaction.editReply({
            content: '❌ An error occurred while processing the unblacklist request!'
        });
    }
}
async function updateGlobalStats(guild, config) {
    try {
        if (!config.statsMessageId || !config.statsChannelId) {
            console.log('[INFO] No stats message to update');
            return;
        }
        const statsChannel = guild.channels.cache.get(config.statsChannelId);
        if (!statsChannel) {
            console.log('[INFO] Stats channel not found');
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        const reportsPath = path.join(__dirname, '..', 'data', 'reports.json');
        let reports = [];
        if (fs.existsSync(reportsPath)) {
            reports = JSON.parse(fs.readFileSync(reportsPath, 'utf8'));
        }
        const totalReports = reports.length;
        const activeBlacklists = reports.filter(r => !r.unblacklisted).length;
        const resolvedCases = reports.filter(r => r.unblacklisted).length;
        const totalUsers = new Set(reports.map(r => r.userId)).size;
        const blacklistedUsers = new Set(reports.filter(r => !r.unblacklisted).map(r => r.userId)).size;
        const clearedUsers = new Set(reports.filter(r => r.unblacklisted).map(r => r.userId)).size;
        const statsEmbed = new EmbedBuilder()
            .setTitle('📊 **ProBot Blacklist Statistics**')
            .setColor(0x3498DB)
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .addFields(
                {
                    name: '📋 **Report Statistics**',
                    value: `**Total Reports:** \`${totalReports}\`\n**Active Blacklists:** \`${activeBlacklists}\`\n**Resolved Cases:** \`${resolvedCases}\``,
                    inline: true
                },
                {
                    name: '👥 **User Statistics**',
                    value: `**Total Users:** \`${totalUsers}\`\n**Currently Blacklisted:** \`${blacklistedUsers}\`\n**Cleared Users:** \`${clearedUsers}\``,
                    inline: true
                },
                {
                    name: '📈 **Activity Status**',
                    value: `**System Status:** ${totalReports > 0 ? '🟢 **Active**' : '⚪ **Idle**'}\n**Last Updated:** <t:${Math.floor(Date.now() / 1000)}:F>`,
                    inline: false
                }
            )
            .setFooter({
                text: `ProBot System • Auto-updated`,
                iconURL: guild.iconURL({ dynamic: true })
            })
            .setTimestamp();
        try {
            const statsMessage = await statsChannel.messages.fetch(config.statsMessageId);
            await statsMessage.edit({ embeds: [statsEmbed] });
            console.log('[INFO] Global stats updated successfully via modal handler');
        } catch (error) {
            console.log('[ERROR] Could not update global stats via modal handler:', error.message);
        }
        if (config.panelMessageId && config.panelChannelId) {
            try {
                const panelChannel = guild.channels.cache.get(config.panelChannelId);
                if (panelChannel) {
                    const panelMessage = await panelChannel.messages.fetch(config.panelMessageId);
                    const panelEmbed = new EmbedBuilder()
                        .setTitle('🛡️ ProBot Blacklist Management System')
                        .setDescription('Select an action below to manage user reports:')
                        .setColor(0x5865F2)
                        .setThumbnail(guild.iconURL({ dynamic: true }))
                        .addFields(
                            {
                                name: '🚫 **Report User**',
                                value: 'Add a user to the blacklist with evidence',
                                inline: true
                            },
                            {
                                name: '✅ **Unblacklist User**',
                                value: 'Remove a user from the blacklist',
                                inline: true
                            },
                            {
                                name: '\u200B',
                                value: '\u200B',
                                inline: true
                            },
                            {
                                name: '📊 **Current Statistics**',
                                value: `**Active Blacklists:** \`${activeBlacklists}\`\n**Resolved Cases:** \`${resolvedCases}\`\n**Last Updated:** <t:${Math.floor(Date.now() / 1000)}:F>`,
                                inline: false
                            }
                        )
                        .setFooter({
                            text: `ProBot System • Auto-updated`,
                            iconURL: guild.iconURL({ dynamic: true })
                        })
                        .setTimestamp();
                    const existingComponents = panelMessage.components;
                    await panelMessage.edit({ embeds: [panelEmbed], components: existingComponents });
                    console.log('[INFO] Panel message updated successfully');
                }
            } catch (error) {
                console.log('[ERROR] Could not update panel message:', error.message);
            }
        }
    } catch (error) {
        console.error('Error updating global stats:', error);
        await webhookLogger.sendError(error, {
            location: 'updateGlobalStats',
            guildId: guild.id,
            action: 'update_global_stats'
        });
    }
}
