const { Events, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const webhookLogger = require('../utils/webhookLogger');
const Report = require('../models/Report');

const STAFF_GUILD_ID = '1445391172750016534';
const MAIN_GUILD_ID = '1446149015006744709';

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        console.log('Button interaction received:', interaction.customId);

        try {
            if (!interaction.isButton()) return;

            // No server restrictions - buttons work in any server the bot is in
            const configPath = path.join(__dirname, '..', 'config.json');
            if (!fs.existsSync(configPath)) return;
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            const isAdmin = interaction.member?.permissions?.has('Administrator') ||
                           (config.adminRoleId && interaction.member?.roles?.cache?.has(config.adminRoleId)) ||
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
                    .setPlaceholder('https://example.com/image.png')
                    .setRequired(false);
                const serverInput = new TextInputBuilder()
                    .setCustomId('server')
                    .setLabel('Server (Optional)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Server where violation occurred')
                    .setRequired(false);

                const firstActionRow = new ActionRowBuilder().addComponents(userIdInput);
                const secondActionRow = new ActionRowBuilder().addComponents(reasonInput);
                const thirdActionRow = new ActionRowBuilder().addComponents(proofInput);
                const fourthActionRow = new ActionRowBuilder().addComponents(serverInput);

                modal.addComponents(firstActionRow, secondActionRow, thirdActionRow, fourthActionRow);

                await interaction.showModal(modal);
            } else if (interaction.customId === 'unblacklist_user') {
                const modal = new ModalBuilder()
                    .setCustomId('unblacklist_modal')
                    .setTitle('✅ Unblacklist User');
                const userIdInput = new TextInputBuilder()
                    .setCustomId('unblacklist_user_id')
                    .setLabel('User ID to Unblacklist')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Enter user ID')
                    .setRequired(true)
                    .setMinLength(15)
                    .setMaxLength(20);

                const firstActionRow = new ActionRowBuilder().addComponents(userIdInput);

                modal.addComponents(firstActionRow);

                await interaction.showModal(modal);
            } else if (interaction.customId.startsWith('staff_add_blacklist_')) {
                const userId = interaction.customId.split('_')[3];

                const confirmButton = new ButtonBuilder()
                    .setCustomId(`confirm_add_blacklist_${userId}`)
                    .setLabel('✅ Confirm')
                    .setStyle(ButtonStyle.Success);

                const cancelButton = new ButtonBuilder()
                    .setCustomId('cancel_action')
                    .setLabel('❌ Cancel')
                    .setStyle(ButtonStyle.Secondary);

                const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

                await interaction.reply({
                    content: `Are you sure you want to add user \`${userId}\` to the blacklist?`,
                    components: [row],
                    ephemeral: true
                });
            } else if (interaction.customId.startsWith('staff_dismiss_report_')) {
                const userId = interaction.customId.split('_')[3];

                // Update the original staff report message to show it's dismissed
                try {
                    // Find the staff channel
                    let staffChannel = null;
                    for (const guild of interaction.client.guilds.cache.values()) {
                        const channel = guild.channels.cache.get('1446252890502205471');
                        if (channel) {
                            staffChannel = channel;
                            break;
                        }
                    }

                    if (staffChannel) {
                        // Search for the original message
                        const messages = await staffChannel.messages.fetch({ limit: 50 });
                        let originalMessage = null;

                        for (const message of messages.values()) {
                            if (message.author.id === interaction.client.user.id &&
                                message.embeds.length > 0) {
                                const embed = message.embeds[0];
                                if (embed.fields && embed.fields.some(field =>
                                    field.name === 'Reported User' &&
                                    field.value.includes(`**User ID:** \`${userId}\``)
                                )) {
                                    originalMessage = message;
                                    break;
                                }
                            }
                        }

                        if (originalMessage) {
                            const dismissedEmbed = EmbedBuilder.from(originalMessage.embeds[0])
                                .setTitle('🚨 Staff Violation Report - DISMISSED')
                                .setColor(0x666666)
                                .setFooter({
                                    text: `Dismissed by ${interaction.user.tag} • ProBot`,
                                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                                });

                            await originalMessage.edit({
                                embeds: [dismissedEmbed],
                                components: []
                            });
                        }
                    }
                } catch (updateError) {
                    console.error('Error updating dismiss message:', updateError);
                }

                await interaction.reply({
                    content: '✅ Report dismissed successfully.',
                    ephemeral: true
                });
            } else if (interaction.customId.startsWith('confirm_add_blacklist_')) {
                const userId = interaction.customId.split('_')[3];

                // Get the original report data
                let originalReportData = null;
                try {
                    const latestReport = await Report.findOne({
                        userId: userId,
                        unblacklisted: false
                    }).sort({ reportedAt: -1 });

                    if (latestReport) {
                        originalReportData = {
                            violationDetails: latestReport.reason || 'No reason provided',
                            evidenceLink: latestReport.proof || 'No evidence provided',
                            violationServer: latestReport.server || 'Not specified'
                        };
                    }
                } catch (error) {
                    console.error('Error fetching report data:', error);
                }

                // Create new report
                const reportId = `RPT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

                try {
                    const newReport = new Report({
                        id: reportId,
                        userId: userId,
                        reason: originalReportData ? originalReportData.violationDetails : 'Added from staff report system',
                        proof: originalReportData ? originalReportData.evidenceLink : 'Staff approved report',
                        server: originalReportData ? originalReportData.violationServer : 'Not specified',
                        reportedBy: interaction.user.id,
                        messageId: null,
                        unblacklisted: false,
                        approved: true,
                        edits: []
                    });

                    await newReport.save();
                } catch (saveError) {
                    console.error('Error saving blacklist report:', saveError);
                }

                // Send report to report channel
                let reportChannel = null;
                for (const guild of interaction.client.guilds.cache.values()) {
                    const channel = guild.channels.cache.get(config.reportChannelId);
                    if (channel) {
                        reportChannel = channel;
                        break;
                    }
                }

                if (reportChannel) {
                    try {
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
                                    value: `**Reporter:** <@${interaction.user.id}>\n**Report ID:** \`${reportId}\``,
                                    inline: true
                                },
                                {
                                    name: 'Evidence',
                                    value: originalReportData && originalReportData.evidenceLink !== 'No evidence provided' ? `✅ Evidence provided` : '❌ No evidence provided',
                                    inline: true
                                },
                                {
                                    name: 'Server',
                                    value: originalReportData && originalReportData.violationServer !== 'Not specified' ? originalReportData.violationServer : 'Not specified',
                                    inline: true
                                },
                                {
                                    name: 'Blacklist Details',
                                    value: `**Reason:** ${originalReportData ? originalReportData.violationDetails : 'Added from staff report system'}`,
                                    inline: false
                                }
                            )
                            .setFooter({
                                text: `ProBot Blacklist System • Report ID: ${reportId}`,
                                iconURL: interaction.guild.iconURL({ dynamic: true })
                            })
                            .setTimestamp();

                        // Add image if evidence is provided
                        if (originalReportData && originalReportData.evidenceLink &&
                            originalReportData.evidenceLink !== 'No evidence provided' &&
                            (originalReportData.evidenceLink.includes('http') || originalReportData.evidenceLink.includes('https')) &&
                            (originalReportData.evidenceLink.match(/\.(jpeg|jpg|gif|png|webp)/i) ||
                             originalReportData.evidenceLink.includes('cdn.discordapp.com') ||
                             originalReportData.evidenceLink.includes('media.discordapp.net'))) {
                            reportEmbed.setImage(originalReportData.evidenceLink);
                        }

                        const embedMessage = await reportChannel.send({ embeds: [reportEmbed] });
                        // Update messageId in database
                        try {
                            await Report.findOneAndUpdate(
                                { id: reportId },
                                { messageId: embedMessage.id }
                            );
                        } catch (updateError) {
                            console.error('Error updating messageId:', updateError);
                        }
                    } catch (reportError) {
                        console.error('Error sending blacklist report:', reportError);
                    }
                }

                // Update global stats
                const updateGlobalStats = require('../utils/updateGlobalStats');
                if (updateGlobalStats) {
                    await updateGlobalStats(interaction.guild, config);
                }

                // Update the original staff report message
                try {
                    let staffChannel = null;
                    for (const guild of interaction.client.guilds.cache.values()) {
                        const channel = guild.channels.cache.get('1446252890502205471');
                        if (channel) {
                            staffChannel = channel;
                            break;
                        }
                    }

                    if (staffChannel) {
                        const messages = await staffChannel.messages.fetch({ limit: 50 });
                        let originalMessage = null;

                        for (const message of messages.values()) {
                            if (message.author.id === interaction.client.user.id &&
                                message.embeds.length > 0) {
                                const embed = message.embeds[0];
                                if (embed.fields && embed.fields.some(field =>
                                    field.name === 'Reported User' &&
                                    field.value.includes(`**User ID:** \`${userId}\``)
                                )) {
                                    originalMessage = message;
                                    break;
                                }
                            }
                        }

                        if (originalMessage) {
                            const processedEmbed = EmbedBuilder.from(originalMessage.embeds[0])
                                .setTitle('✅ Staff Violation Report - BLACKLISTED')
                                .setColor(0xDC143C)
                                .setFooter({
                                    text: `Blacklisted by ${interaction.user.tag} • ProBot`,
                                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                                });

                            await originalMessage.edit({
                                embeds: [processedEmbed],
                                components: []
                            });

                            // Mark the original report as approved
                            try {
                                await Report.findOneAndUpdate(
                                    { userId: userId, unblacklisted: false },
                                    { approved: true },
                                    { sort: { reportedAt: -1 } }
                                );
                            } catch (updateError) {
                                console.error('Error marking report as approved:', updateError);
                            }
                        }
                    }
                } catch (updateError) {
                    console.error('Error updating original message:', updateError);
                }

                await interaction.reply({
                    content: '✅ User added to blacklist successfully.',
                    ephemeral: true
                });
            } else if (interaction.customId === 'cancel_action') {
                await interaction.update({
                    content: 'Cancelled',
                    components: []
                });
            }
        } catch (error) {
            console.error('Error in button handler:', error);
            webhookLogger.sendError(error, {
                location: 'buttonHandler event',
                customId: interaction.customId,
                userId: interaction.user.id,
                guildId: interaction.guild?.id,
                action: 'button_interaction_error'
            });
        }
    },
};