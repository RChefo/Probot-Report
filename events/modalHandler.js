const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const webhookLogger = require('../utils/webhookLogger');
const Report = require('../models/Report');

// Bot now works in all guilds

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isModalSubmit()) return;

        console.log('=== MODAL SUBMITTED ===');
        console.log('Modal submitted with customId:', interaction.customId);

        // No guild restrictions for modals

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
            } else if (interaction.customId === 'staff_report_modal') {
                await handleStaffReportModal(interaction, config);
            }
        } catch (error) {
            console.error('Modal handling error:', error);
            // Don't reply if already replied, deferred, or if deferReply was used
            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({
                        content: '❌ An unexpected error occurred. Please try again.',
                        ephemeral: true
                    });
                } catch (replyError) {
                    console.error('Failed to send error reply:', replyError);
                }
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
                value: `**** ${report.reason}`,
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

    // Import Report model
    const Report = require('../models/Report');
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
        const dataDir = path.join(__dirname, '..', 'data');
        const reportsPath = path.join(dataDir, 'reports.json');

        // Create data directory if it doesn't exist
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
            console.log('Created data directory');
        }

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
            // Update existing report in MongoDB
            const editEntry = {
                editId: `EDIT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`,
                previousReason: existingReport.reason,
                previousProof: existingReport.proof,
                newReason: reason,
                newProof: proof,
                editedBy: interaction.user.id,
                editedAt: new Date()
            };

            await Report.findByIdAndUpdate(existingReport._id, {
                reason: reason,
                proof: proof,
                edits: [...(existingReport.edits || []), editEntry]
            });

            console.log(`[INFO] Updated existing report for user ${userId}`);
            await updateExistingReportEmbed(interaction, config, existingReport);
            await updateGlobalStats(interaction.guild, config);
            await interaction.editReply({
                content: `✅ Report updated successfully for user \`${userId}\`!\n📍 Report Channel: <#${config.reportChannelId}>`
            });
            return;
        }
        const reportId = `RPT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

        console.log('Saving report:', {
            id: reportId,
            userId: userId,
            reason: reason,
            proof: proof,
            server: 'Not specified'
        });

        const newReport = new Report({
            id: reportId,
            userId: userId,
            reason: reason,
            proof: proof,
            server: 'Not specified',
            reportedBy: interaction.user.id,
            messageId: null,
            unblacklisted: false,
            approved: false,
            edits: []
        });

        await newReport.save();
        console.log('Report saved to database successfully');
        const reportChannel = interaction.guild.channels.cache.get(config.reportChannelId);
        if (!reportChannel) {
            return await interaction.editReply({
                content: '❌ Report channel does not exist!'
            });
        }
        console.log('About to save report to database first...');
        console.log('=== DATA BEING SAVED TO DATABASE ===');
        console.log('Report object:', {
            id: reportId,
            userId: userId,
            reason: reason,
            proof: proof,
            server: 'Not specified'
        });

        try {
            fs.writeFileSync(reportsPath, JSON.stringify(reports, null, 2));
            console.log('Report saved to database successfully');
            console.log('Total reports in database:', reports.length);
        } catch (saveError) {
            console.error('Error saving report to database:', saveError);
            return await interaction.editReply({
                content: '❌ Error saving report to database.'
            });
        }

        console.log('About to send report to channel:', reportChannel.name);
        try {
            const titleMessage = await reportChannel.send(`🚫 Blacklist Report - User ${userId}`);
            console.log('Report title sent successfully');
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
                    value: `**** ${reason}`,
                    inline: false
                }
            )
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
            const embedMessage = await reportChannel.send({
                embeds: [reportEmbed]
            });
            console.log('Report embed sent successfully');

            // Update the saved report with messageId in MongoDB
            await Report.findByIdAndUpdate(newReport._id, {
                messageId: embedMessage.id
            });
            console.log('Report updated with messageId in database');
        } catch (sendError) {
            console.error('Error sending report to channel:', sendError);
            // Report is already saved to database even if sending failed
        }
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
    const userId = interaction.fields.getTextInputValue('unblacklist_user_id');
    if (!/^\d{15,20}$/.test(userId)) {
        return await interaction.editReply({
            content: '❌ Invalid User ID! Please enter a valid Discord user ID (15-20 digits).'
        });
    }
    try {
        // Import Report model
        const Report = require('../models/Report');

        // Find the report in MongoDB
        const report = await Report.findOne({
            userId: userId,
            unblacklisted: false,
            approved: true
        }).sort({ reportedAt: -1 });

        if (!report) {
            return await interaction.editReply({
                content: '❌ No active blacklist report found for this user!'
            });
        }

        // Update the report in MongoDB
        await Report.findByIdAndUpdate(report._id, {
            unblacklisted: true,
            unblacklistedBy: interaction.user.id,
            unblacklistedAt: new Date()
        });
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

async function handleStaffReportModal(interaction, config) {
    console.log('=== STARTING handleStaffReportModal ===');
    console.log('handleStaffReportModal called with customId:', interaction.customId);
    console.log('Interaction details:', {
        customId: interaction.customId,
        guildId: interaction.guildId,
        userId: interaction.user.id
    });
    await interaction.deferReply({ ephemeral: true });
    console.log('Deferred reply successfully');

    try {
        const reportedUserId = interaction.fields.getTextInputValue('staff_user_id');
        const reportedUserTag = interaction.fields.getTextInputValue('staff_user_tag');
        const violationType = interaction.fields.getTextInputValue('staff_violation');
        const violationDetails = interaction.fields.getTextInputValue('staff_details') || 'No additional details provided';
        const evidenceLink = interaction.fields.getTextInputValue('staff_evidence');

        console.log('=== FORM DATA RECEIVED ===');
        console.log('reportedUserId:', reportedUserId);
        console.log('reportedUserTag:', reportedUserTag);
        console.log('violationType:', violationType);
        console.log('violationDetails:', violationDetails);
        console.log('evidenceLink:', evidenceLink);

        // Validate user ID format
        if (!/^\d{15,20}$/.test(reportedUserId)) {
            return await interaction.editReply({
                content: '❌ Invalid User ID! Please enter a valid Discord user ID (15-20 digits).'
            });
        }

        // Check if user is already approved in blacklist
        let isApprovedBlacklisted = false;
        try {
            const existingApprovedReport = await Report.findOne({
                userId: reportedUserId,
                unblacklisted: false,
                approved: true
            });
            isApprovedBlacklisted = !!existingApprovedReport;
            console.log('isApprovedBlacklisted result for user', reportedUserId, ':', isApprovedBlacklisted);
        } catch (error) {
            console.error('Error checking approved blacklist status:', error);
            webhookLogger.sendError(error, {
                location: 'modalHandler - approved blacklist check',
                userId: reportedUserId,
                action: 'check_approved_blacklist_status'
            });
        }

        if (isApprovedBlacklisted) {
            // User is already approved in blacklist - prevent new report
            return await interaction.editReply({
                content: `❌ This user is already in the blacklist and cannot submit new reports.`
            });
        }

        console.log('User is not blacklisted, proceeding with save');

        // SAVE TO DATABASE FIRST - BEFORE ANYTHING ELSE
        const reportId = `RPT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

        console.log('About to save report to database first...');
        console.log('=== DATA BEING SAVED TO DATABASE ===');

        // Combine all data into reason field
        const fullReason = `**Type of Violation:** ${violationType}\n**Violation Details:** ${violationDetails}`;

        console.log('Report object:', {
            id: reportId,
            userId: reportedUserId,
            userTag: reportedUserTag,
            reason: fullReason,
            violationType: violationType,
            violationDetails: violationDetails,
            evidenceLink: evidenceLink,
            reportedBy: interaction.user.id
        });

        try {
            const newReport = new Report({
                id: reportId,
                userId: reportedUserId,
                userTag: reportedUserTag,
                reason: fullReason,
                violationType: violationType,
                violationDetails: violationDetails,
                proof: evidenceLink,
                reportedBy: interaction.user.id,
                messageId: null,
                staffMessageId: null,
                unblacklisted: false,
                approved: false,
                edits: []
            });

            await newReport.save();
            console.log('Report saved to database successfully');
        } catch (saveError) {
            console.error('Error saving report to database:', saveError);
            webhookLogger.sendError(saveError, {
                location: 'modalHandler - save report',
                userId: reportedUserId,
                action: 'save_report'
            });
            return await interaction.editReply({
                content: '❌ Error saving report to database.'
            });
        }

        // NOW SEND TO CHANNEL (AFTER DATABASE SAVE)
        console.log('About to find staff channel');
        const staffChannelId = '1446252890502205471'; // Staff reports channel

        // Find channel across all guilds the bot is in
        let staffChannel = null;
        for (const guild of interaction.client.guilds.cache.values()) {
            const channel = guild.channels.cache.get(staffChannelId);
            if (channel) {
                staffChannel = channel;
                console.log(`Found staff channel: ${channel.name} in guild: ${guild.name}`);
                break;
            }
        }

        if (!staffChannel) {
            console.error(`[ERROR] Staff reports channel ${staffChannelId} not found in any guild`);
            console.log('Available guilds and channels:');
            for (const guild of interaction.client.guilds.cache.values()) {
                console.log(`Guild: ${guild.name} (${guild.id})`);
                const channels = guild.channels.cache.filter(ch => ch.type === 0).map(ch => `${ch.name} (${ch.id})`);
                console.log(`Text channels: ${channels.join(', ')}`);
            }
            webhookLogger.sendError(new Error(`Staff reports channel ${staffChannelId} not found`), {
                location: 'handleStaffReportModal',
                userId: interaction.user.id,
                staffChannelId: staffChannelId,
                action: 'channel_not_found'
            });
            return await interaction.editReply({
                content: '❌ Staff reports channel not found! Please contact an administrator.'
            });
        }

        console.log('Staff channel found, proceeding to build embed');
        const reportEmbed = new EmbedBuilder()
            .setTitle('Staff Violation Report')
            .setDescription('A new violation report has been submitted by staff.')
            .setColor(0xFF4444);

        // Add image if evidence link is provided
        if (evidenceLink !== 'No evidence provided' &&
            (evidenceLink.includes('http') || evidenceLink.includes('https')) &&
            (evidenceLink.match(/\.(jpeg|jpg|gif|png|webp)/i) ||
             evidenceLink.includes('cdn.discordapp.com') ||
             evidenceLink.includes('media.discordapp.net'))) {
            reportEmbed.setImage(evidenceLink);
        }

        reportEmbed.addFields(
                {
                    name: 'Reported User',
                    value: `**User ID:** \`${reportedUserId}\`\n**User Tag:** \`${reportedUserTag}\`\n**Status:** Not in blacklist`,
                    inline: true
                },
                {
                    name: 'Reporting Staff',
                    value: `**Staff Member:** <@${interaction.user.id}>\n**Staff ID:** \`${interaction.user.id}\``,
                    inline: true
                },
                {
                    name: 'Blacklist Details',
                    value: `**Type:** ${violationType}\n**Details:** ${violationDetails.length > 300 ? violationDetails.substring(0, 300) + '...' : violationDetails}`,
                    inline: false
                }
            )
            .setTimestamp();

        console.log('Embed fully built, proceeding to send message');

        // Add buttons for additional actions
        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`staff_add_blacklist_${reportedUserId}`)
                    .setLabel('➕ Add to Blacklist')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`staff_dismiss_report_${reportedUserId}`)
                    .setLabel('❌ Dismiss Report')
                    .setStyle(ButtonStyle.Secondary)
            );

        console.log('About to send message to staff channel');
        console.log('About to send message to staff channel');
        const staffMessage = await staffChannel.send({
            embeds: [reportEmbed],
            components: [actionRow]
        });
        console.log('Message sent successfully to staff channel, message ID:', staffMessage.id);

        // Save the staff report message ID to the report for later updates
        console.log('About to save staffMessageId to MongoDB report');
        try {
            await Report.findOneAndUpdate(
                { id: reportId },
                { staffMessageId: staffMessage.id }
            );
            console.log('Staff report message ID saved to MongoDB successfully:', staffMessage.id);
        } catch (updateError) {
            console.error('Error saving staff message ID to MongoDB:', updateError);
        }

        // Confirm to staff member
        await interaction.editReply({
            content: '✅ Report Submitted Successfully'
        });

    } catch (error) {
        console.error('Error processing staff report:', error);
        await webhookLogger.sendError(error, {
            location: 'handleStaffReportModal',
            userId: interaction.user.id,
            action: 'staff_report_submission'
        });
        await interaction.editReply({
            content: '❌ An error occurred while processing your report!'
        });
    }
}
