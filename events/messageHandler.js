const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const webhookLogger = require('../utils/webhookLogger');
const prefix = '!';
module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot || !message.content.startsWith(prefix)) return;
        console.log(`[DEBUG] [${new Date().toISOString()}] Processing command: "${message.content}" from ${message.author.tag} in ${message.channel.name}`);
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        console.log(`[DEBUG] [${new Date().toISOString()}] Command extracted: "${command}" with args: [${args.join(', ')}]`);
        const configPath = path.join(__dirname, '..', 'config.json');
        let config = {};
        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
        if (message.guild.id !== config.guildId) return;
        const isAdmin = message.member.permissions.has('Administrator') ||
                       (config.adminRoleId && message.member.roles.cache.has(config.adminRoleId)) ||
                       (config.adminUserIds && config.adminUserIds.includes(message.author.id));
        if (command === 'stats') {
            console.log(`[DEBUG] Calling handleStatsCommand for ${message.author.tag}`);
            await handleStatsCommand(message, config, isAdmin);
        } else if (command === 'panel') {
            await handlePanelCommand(message, config, isAdmin);
        } else if (command === 'clearreports') {
            await handleClearReportsCommand(message, config, isAdmin);
        }
    },
};
async function handleStatsCommand(message, config, isAdmin) {
    if (!isAdmin) {
        return await message.reply('❌ This command is for administrators only!');
    }
    const messageKey = `stats_${message.id}`;
    if (global.processingCommands && global.processingCommands[messageKey]) {
        console.log('[INFO] Stats command already processing for this message, skipping duplicate');
        return;
    }
    if (!global.processingCommands) global.processingCommands = {};
    global.processingCommands[messageKey] = true;
    const now = Date.now();
    if (!global.lastStatsCommand) global.lastStatsCommand = {};
    if (global.lastStatsCommand[message.author.id] && (now - global.lastStatsCommand[message.author.id]) < 3000) {
        global.processingStatsCommand = false;
        return await message.reply('⏳ Please wait 3 seconds before using this command again!').then(msg => {
            setTimeout(() => msg.delete().catch(() => {}), 3000);
        });
    }
    global.lastStatsCommand[message.author.id] = now;
    const configPath = path.join(__dirname, '..', 'config.json');
    try {
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
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
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
                text: `ProBot System • Updated by ${message.author.tag}`,
                iconURL: message.author.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();
        let sentMessage;
        if (config.statsMessageId && config.statsChannelId === message.channel.id) {
            try {
                const existingMessage = await message.channel.messages.fetch(config.statsMessageId);
                sentMessage = await existingMessage.edit({ embeds: [statsEmbed] });
                console.log('[INFO] Updated existing stats message');
            } catch (error) {
                console.log('[INFO] Could not update existing message, will send new one');
            }
        }
        if (!sentMessage) {
            sentMessage = await message.channel.send({ embeds: [statsEmbed] });
            console.log('[INFO] Sent new stats message');
        }
        config.statsMessageId = sentMessage.id;
        config.statsChannelId = message.channel.id;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        await message.delete().catch(() => {});
    } catch (error) {
        console.error('Error handling stats command:', error);
        await webhookLogger.sendError(error, {
            location: 'handleStatsCommand',
            userId: message.author.id,
            channelId: message.channel.id,
            action: 'stats_command'
        });
        await message.reply('❌ An error occurred while generating statistics!');
    } finally {
        if (global.processingCommands && global.processingCommands[messageKey]) {
            delete global.processingCommands[messageKey];
        }
    }
}
async function handlePanelCommand(message, config, isAdmin) {
    if (!isAdmin) {
        return await message.reply('❌ This command is for administrators only!');
    }
    const now = Date.now();
    if (!global.lastPanelCommand) global.lastPanelCommand = {};
    if (global.lastPanelCommand[message.author.id] && (now - global.lastPanelCommand[message.author.id]) < 3000) {
        return await message.reply('⏳ Please wait 3 seconds before using this command again!').then(msg => {
            setTimeout(() => msg.delete().catch(() => {}), 3000);
        });
    }
    global.lastPanelCommand[message.author.id] = now;
    const configPath = path.join(__dirname, '..', 'config.json');
    try {
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
        const reportsPath = path.join(__dirname, '..', 'data', 'reports.json');
        let reports = [];
        if (fs.existsSync(reportsPath)) {
            reports = JSON.parse(fs.readFileSync(reportsPath, 'utf8'));
        }
        const activeBlacklists = reports.filter(r => !r.unblacklisted).length;
        const resolvedCases = reports.filter(r => r.unblacklisted).length;
        const panelEmbed = new EmbedBuilder()
            .setTitle('🛡️ ProBot Blacklist Management System')
            .setDescription('Select an action below to manage user reports:')
            .setColor(0x5865F2)
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
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
                text: `ProBot System • Panel created by ${message.author.tag}`,
                iconURL: message.author.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();
        let sentMessage;
        if (config.panelMessageId) {
            try {
                const existingMessage = await message.channel.messages.fetch(config.panelMessageId);
                sentMessage = await existingMessage.edit({ embeds: [panelEmbed], components: [row] });
            } catch (error) {
                sentMessage = await message.channel.send({ embeds: [panelEmbed], components: [row] });
                config.panelMessageId = sentMessage.id;
            }
        } else {
            sentMessage = await message.channel.send({ embeds: [panelEmbed], components: [row] });
            config.panelMessageId = sentMessage.id;
        }
        config.panelMessageId = sentMessage.id;
        config.panelChannelId = sentMessage.channel.id;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        await message.delete().catch(() => {});
    } catch (error) {
        console.error('Error handling panel command:', error);
        await webhookLogger.sendError(error, {
            location: 'handlePanelCommand',
            userId: message.author.id,
            channelId: message.channel.id,
            action: 'panel_command'
        });
        await message.reply('❌ An error occurred while creating the panel!');
    }
}
async function handleClearReportsCommand(message, config, isAdmin) {
    if (!isAdmin) {
        return await message.reply('❌ This command is for administrators only!');
    }
    const now = Date.now();
    if (!global.lastClearCommand) global.lastClearCommand = {};
    if (global.lastClearCommand[message.author.id] && (now - global.lastClearCommand[message.author.id]) < 10000) {
        return await message.reply('⏳ This command can only be used once every 10 seconds for safety!').then(msg => {
            setTimeout(() => msg.delete().catch(() => {}), 5000);
        });
    }
    global.lastClearCommand[message.author.id] = now;
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    args.shift(); 
    const confirmation = args.join(' ').toUpperCase();
    if (confirmation !== 'CONFIRM') {
        return await message.reply('❌ You must type `!clearreports CONFIRM` to clear all reports.\n⚠️ **This action cannot be undone!**');
    }
    try {
        const reportsPath = path.join(__dirname, '..', 'data', 'reports.json');
        let currentReports = [];
        if (fs.existsSync(reportsPath)) {
            currentReports = JSON.parse(fs.readFileSync(reportsPath, 'utf8'));
        }
        fs.writeFileSync(reportsPath, JSON.stringify([], null, 2));
        const configPath = path.join(__dirname, '..', 'config.json');
        const currentStatsMessageId = config.statsMessageId;
        const currentStatsChannelId = config.statsChannelId;
        const currentPanelMessageId = config.panelMessageId;
        const currentPanelChannelId = config.panelChannelId;
        try {
            console.log(`[DEBUG] Updating stats: channel ${currentStatsChannelId}, message ${currentStatsMessageId}`);
            const statsChannel = message.guild.channels.cache.get(currentStatsChannelId);
            if (statsChannel && currentStatsMessageId) {
                const statsMessage = await statsChannel.messages.fetch(currentStatsMessageId);
                if (statsMessage) {
                    console.log('[DEBUG] Stats message found, updating...');
                    const totalReports = 0; 
                    const activeBlacklists = 0;
                    const resolvedCases = 0;
                    const totalUsers = 0;
                    const blacklistedUsers = 0;
                    const clearedUsers = 0;
                    const statsEmbed = {
                        title: '📊 **ProBot Blacklist Statistics**',
                        color: 0x3498DB,
                        thumbnail: { url: message.guild.iconURL({ dynamic: true }) },
                        fields: [
                            {
                                name: 'Report Statistics',
                                value: `**Total Reports:** \`${totalReports}\`\n**Active Blacklists:** \`${activeBlacklists}\`\n**Resolved Cases:** \`${resolvedCases}\``,
                                inline: true
                            },
                            {
                                name: 'User Statistics',
                                value: `**Total Users:** \`${totalUsers}\`\n**Currently Blacklisted:** \`${blacklistedUsers}\`\n**Cleared Users:** \`${clearedUsers}\``,
                                inline: true
                            },
                            {
                                name: 'Activity Status',
                                value: `**System Status:** ${totalReports > 0 ? '🟢 **Active**' : '⚪ **Idle**'}\n**Last Updated:** <t:${Math.floor(Date.now() / 1000)}:F>`,
                                inline: false
                            }
                        ],
                        footer: {
                            text: `ProBot System • Auto-updated`,
                            iconURL: message.guild.iconURL({ dynamic: true })
                        },
                        timestamp: new Date()
                    };
                    await statsMessage.edit({ embeds: [statsEmbed] });
                    console.log('[INFO] Stats updated after clearing reports');
                }
            }
        } catch (error) {
            console.log('[INFO] Could not update stats after clearing:', error.message);
        }
        try {
            console.log(`[DEBUG] Updating panel: channel ${currentPanelChannelId}, message ${currentPanelMessageId}`);
            if (currentPanelChannelId && currentPanelMessageId) {
                const panelChannel = message.guild.channels.cache.get(currentPanelChannelId);
                if (panelChannel) {
                    const panelMessage = await panelChannel.messages.fetch(currentPanelMessageId);
                    if (panelMessage) {
                        const activeBlacklists = 0;
                        const resolvedCases = 0;
                        const panelEmbed = {
                            title: '🛡️ ProBot Blacklist Management System',
                            description: 'Select an action below to manage user reports:',
                            color: 0x5865F2,
                            thumbnail: { url: message.guild.iconURL({ dynamic: true }) },
                            fields: [
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
                            ],
                            footer: {
                                text: `ProBot System • Auto-updated`,
                                iconURL: message.guild.iconURL({ dynamic: true })
                            },
                            timestamp: new Date()
                        };
                        const existingComponents = panelMessage.components;
                        await panelMessage.edit({ embeds: [panelEmbed], components: existingComponents });
                        console.log('[INFO] Panel updated after clearing reports');
                    }
                }
            }
        } catch (error) {
            console.log('[INFO] Could not update panel after clearing:', error.message);
        }
        const embed = {
            title: '🗑️ **Reports Cleared Successfully**',
            description: 'All reports have been permanently deleted from the database.',
            color: 0xFF6B6B,
            fields: [
                {
                    name: '📊 **Deleted Reports**',
                    value: `**Total Reports Removed:** \`${currentReports.length}\`\n**Active Blacklists Cleared:** \`${currentReports.filter(r => !r.unblacklisted).length}\`\n**Resolved Cases Removed:** \`${currentReports.filter(r => r.unblacklisted).length}\``,
                    inline: false
                },
                {
                    name: '🔄 **System Reset**',
                    value: '• Statistics panels have been reset\n• All report data cleared\n• System ready for new reports',
                    inline: false
                }
            ],
            footer: {
                text: `Cleared by ${message.author.tag} • ${new Date().toLocaleString()}`,
                iconURL: message.author.displayAvatarURL({ dynamic: true })
            },
            timestamp: new Date()
        };
        await message.reply({ embeds: [embed] });
        await webhookLogger.sendInfo(
            `🗑️ **Reports Cleared**\n**Admin:** ${message.author.tag} (${message.author.id})\n**Reports Deleted:** ${currentReports.length}\n**Channel:** ${message.channel.name}`,
            'Database Maintenance',
            0xFF6B6B
        );
        await message.delete().catch(() => {});
    } catch (error) {
        console.error('Error clearing reports:', error);
        await webhookLogger.sendError(error, {
            location: 'handleClearReportsCommand',
            userId: message.author.id,
            channelId: message.channel.id,
            action: 'clear_all_reports'
        });
        await message.reply('❌ An error occurred while clearing reports!');
    }
}
