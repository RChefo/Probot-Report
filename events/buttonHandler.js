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

            console.log(`Processing button: ${interaction.customId}`);

            // No server restrictions - buttons work in any server the bot is in
            const configPath = path.join(__dirname, '..', 'config.json');
            console.log(`Config path: ${configPath}`);
            if (!fs.existsSync(configPath)) {
                console.log('Config file not found');
                return;
            }
            console.log('Reading config file...');
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            console.log('Config loaded successfully');

            // Check if this is an admin-only button
            const isAdminButton = interaction.customId.startsWith('staff_add_blacklist_') ||
                                 interaction.customId.startsWith('confirm_add_blacklist_') ||
                                 interaction.customId === 'staff_dismiss_report_';

            if (isAdminButton) {
                const isAdmin = interaction.member?.permissions?.has('Administrator') ||
                               (config.adminRoleId && interaction.member?.roles?.cache?.has(config.adminRoleId)) ||
                               (config.adminUserIds && config.adminUserIds.includes(interaction.user.id));

                if (!isAdmin) {
                    return await interaction.reply({
                        content: '❌ This action is for administrators only!',
                        ephemeral: true
                    });
                }
            }

            if (interaction.customId === 'staff_report_button') {
                // No defer needed - showModal responds immediately
                console.log('Creating staff report modal...');
                const modal = new ModalBuilder()
                    .setCustomId('staff_report_modal')
                    .setTitle('🚨 Staff Violation Report');

                const userIdInput = new TextInputBuilder()
                    .setCustomId('staff_user_id')
                    .setLabel('Reported User ID')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Enter the user ID being reported')
                    .setRequired(true)
                    .setMinLength(15)
                    .setMaxLength(20);

                const userTagInput = new TextInputBuilder()
                    .setCustomId('staff_user_tag')
                    .setLabel('Reported User Tag')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Example: elchef.')
                    .setRequired(true)
                    .setMinLength(3)
                    .setMaxLength(37);

                const violationInput = new TextInputBuilder()
                    .setCustomId('staff_violation')
                    .setLabel('Type of Violation')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('buying, Selling credits, Suspicious activity, etc.')
                    .setRequired(true)
                    .setMinLength(3)
                    .setMaxLength(50);

                const detailsInput = new TextInputBuilder()
                    .setCustomId('staff_details')
                    .setLabel('Violation Details')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Provide detailed description of the violation, including server links if available')
                    .setRequired(false)
                    .setMaxLength(1000);

                const evidenceInput = new TextInputBuilder()
                    .setCustomId('staff_evidence')
                    .setLabel('Evidence Links')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Image/video links or message links as evidence (Required)')
                    .setRequired(true)
                    .setMinLength(10)
                    .setMaxLength(500);

                const firstActionRow = new ActionRowBuilder().addComponents(userIdInput);
                const secondActionRow = new ActionRowBuilder().addComponents(userTagInput);
                const thirdActionRow = new ActionRowBuilder().addComponents(violationInput);
                const fourthActionRow = new ActionRowBuilder().addComponents(detailsInput);
                const fifthActionRow = new ActionRowBuilder().addComponents(evidenceInput);

                modal.addComponents(firstActionRow, secondActionRow, thirdActionRow, fourthActionRow, fifthActionRow);

                console.log('Showing modal...');
                await interaction.showModal(modal);
                console.log('Modal shown successfully');
            } else if (interaction.customId === 'report_user') {
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
                console.log('Creating unblacklist modal...');
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

                console.log('Showing unblacklist modal...');
                await interaction.showModal(modal);
                console.log('Unblacklist modal shown successfully');
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
;

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

                // Prevent duplicate processing with a global flag
                if (global.processingBlacklistAdd && global.processingBlacklistAdd[interaction.id]) {
                    console.log('Already processing this blacklist add, skipping duplicate');
                    return;
                }

                // Set processing flag
                if (!global.processingBlacklistAdd) global.processingBlacklistAdd = {};
                global.processingBlacklistAdd[interaction.id] = true;

                // Track if interaction was responded to
                let interactionResponded = false;

                // Check if this interaction was already processed
                if (interaction.deferred || interaction.replied) {
                    console.log('Interaction already processed, skipping');
                    delete global.processingBlacklistAdd[interaction.id];
                    return;
                }

                const userId = interaction.customId.split('_')[3];

                // Get the original report data
                let originalReportData = null;
                let latestReport = null;

                try {
                    latestReport = await Report.findOne({
                        userId: userId,
                        unblacklisted: false
                    }).sort({ reportedAt: -1 });

                    if (latestReport) {
                        // Parse the combined reason field
                        const reasonParts = latestReport.reason.split('\n');
                        const violationType = reasonParts.find(p => p.startsWith('**Type of Violation:**'))?.replace('**Type of Violation:** ', '') || 'Not specified';
                        const violationDetails = reasonParts.find(p => p.startsWith('**Violation Details:**'))?.replace('**Violation Details:** ', '') || 'No details provided';

                        originalReportData = {
                            violationDetails: `${violationType} - ${violationDetails}`,
                            evidenceLink: latestReport.proof || 'No evidence provided',
                            violationServer: latestReport.server || 'Not specified'
                        };
                    }
                } catch (error) {
                    console.error('Error fetching report data:', error);
                }

                // Create new approved report
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
                    console.log(`New blacklist report created: ${reportId}`);
                } catch (saveError) {
                    console.error('Error saving blacklist report:', saveError);
                    interactionResponded = true;
                    return await interaction.update({
                        content: '❌ Error saving the blacklist report to database.',
                        embeds: [],
                        components: []
                    });
                }

                // Send report to report channel
                console.log('Looking for report channel:', config.reportChannelId);
                let reportChannel = null;
                for (const guild of interaction.client.guilds.cache.values()) {
                    console.log('Checking guild:', guild.name, 'ID:', guild.id);
                    const channel = guild.channels.cache.get(config.reportChannelId);
                    if (channel) {
                        reportChannel = channel;
                        console.log('Found report channel:', channel.name, 'in guild:', guild.name);
                        break;
                    }
                }

                console.log('Report channel result:', reportChannel ? 'Found' : 'Not found');

                if (reportChannel) {
                    try {
                        console.log('Sending title message...');
                        const titleMessage = await reportChannel.send(`🚫 Blacklist Report - User ${userId}`);
                        console.log('Title message sent, ID:', titleMessage.id);

                        console.log('Building report embed...');
                        const reportEmbed = new EmbedBuilder()
                            .setTitle('🚫 Blacklist Report')
                            .setDescription('A new user has been reported and added to the blacklist.')
                            .setColor(0xDC143C)
                            .addFields(
                                {
                                    name: 'Target User',
                                    value: `**ID:** \`${userId}\`\n**Tag:** \`${latestReport ? latestReport.userTag || 'Unknown' : 'Unknown'}\`\n**Status:** 🔴 Blacklisted`,
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

                        console.log('About to send embed to report channel');
                        const embedMessage = await reportChannel.send({ embeds: [reportEmbed] });
                        console.log('Embed sent successfully, message ID:', embedMessage.id);

                        // Update messageId in database
                        try {
                            await Report.findOneAndUpdate(
                                { id: reportId },
                                { messageId: embedMessage.id }
                            );
                            console.log('Message ID updated in database');
                        } catch (updateError) {
                            console.error('Error updating messageId:', updateError);
                        }
                    } catch (reportError) {
                        console.error('Error sending blacklist report:', reportError);
                    }
                }

                // Update global stats (disabled due to message not found errors)
                // const updateGlobalStats = require('../utils/updateGlobalStats');
                // if (updateGlobalStats) {
                //     await updateGlobalStats(interaction.guild, config);
                // }

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
;

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

                // Update the confirmation message with success (only if not already responded)
                if (!interactionResponded) {
                    await interaction.update({
                        content: '✅ User added to blacklist successfully.',
                        embeds: [],
                        components: []
                    });
                }

                // Clear processing flag
                delete global.processingBlacklistAdd[interaction.id];
            } else if (interaction.customId === 'cancel_action') {
                await interaction.update({
                    content: 'Cancelled',
                    components: []
                });
            }
        } catch (error) {
            console.error('Error in button handler:', error);

            // Clear processing flag on error
            if (global.processingBlacklistAdd && global.processingBlacklistAdd[interaction.id]) {
                delete global.processingBlacklistAdd[interaction.id];
            }

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