const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

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
            console.log('[INFO] Global stats updated successfully');
        } catch (error) {
            console.log('[ERROR] Could not update global stats:', error.message);
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
    }
}

module.exports = updateGlobalStats;

