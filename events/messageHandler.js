const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const webhookLogger = require('../utils/webhookLogger');

const ALLOWED_GUILD_ID = '1445391172750016534';

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        // Ignore bot messages
        if (message.author.bot) return;

        // Check for staff report command (works in all guilds)
        if (message.content.toLowerCase() === '!staffreport' || message.content.toLowerCase() === '!report') {
            // Command works in all guilds now
            console.log('Staff report command detected:', message.content);
            const configPath = path.join(__dirname, '..', 'config.json');
            if (!fs.existsSync(configPath)) return;

            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            const isAdmin = message.member.permissions.has('Administrator') ||
                           (config.adminRoleId && message.member.roles.cache.has(config.adminRoleId)) ||
                           (config.adminUserIds && config.adminUserIds.includes(message.author.id));

            if (!isAdmin) {
                return await message.reply({
                    content: '❌ This command is for administrators only!',
                    ephemeral: true
                }).catch(console.error);
            }

            const embed = new EmbedBuilder()
                .setTitle('🚨 Staff Report System')
                .setDescription('Use this panel to report users who engage in suspicious or prohibited activities.\n\n**Report violations such as:**\n1. Spam servers or being a member of suspicious servers (spam-focused servers)\n2. Buying or selling credits/reps in exchange for real money, cryptocurrency convertible to real money, or mobile balance\n3. Advertising the sale of credits for another person (this may also result in your own account being blacklisted)\n4. Participating in any suspicious activity related to credits, rewards, or anything that may we suspect it')
                .setColor(0xFF6B6B)
                .addFields(
                    {
                        name: '📋 Report Process',
                        value: 'To submit a report, please follow the below steps:\n\n- Click "File Report" below\n- Fill in the violation details\n- Submit the report for Manager Review',
                        inline: false
                    },
                    {
                        name: '⚠️ Important Notes',
                        value: '- False reports may result in penalties\n- Include evidence when possible\n- Use additional details for complex cases',
                        inline: false
                    }
                )
                .setFooter({
                    text: '',
                    iconURL: message.guild.iconURL({ dynamic: true })
                })
                .setTimestamp();

            const button = new ButtonBuilder()
                .setCustomId('staff_report_button')
                .setLabel('File Report')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🚨');

            const row = new ActionRowBuilder().addComponents(button);

            await message.channel.send({
                embeds: [embed],
                components: [row]
            }).catch(error => {
                console.error('Error sending staff report panel:', error);
                webhookLogger.sendError(error, {
                    location: 'messageHandler - staff report command',
                    userId: message.author.id,
                    guildId: message.guild.id,
                    action: 'send_staff_report_panel'
                });
            });
        }

        // Check for stats command
        if (message.content.toLowerCase() === '!stats') {
            console.log('Staff stats command detected');
            const configPath = path.join(__dirname, '..', 'config.json');
            if (!fs.existsSync(configPath)) return;

            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            const isAdmin = message.member.permissions.has('Administrator') ||
                           (config.adminRoleId && message.member.roles.cache.has(config.adminRoleId)) ||
                           (config.adminUserIds && config.adminUserIds.includes(message.author.id));

            if (!isAdmin) {
                return await message.reply({
                    content: '❌ This command is for administrators only!',
                    ephemeral: true
                });
            }

            try {
                // Import Report model
                const Report = require('../models/Report');

                // Get statistics from MongoDB
                const totalReports = await Report.countDocuments();
                const activeBlacklists = await Report.countDocuments({ unblacklisted: false });
                const resolvedCases = await Report.countDocuments({ unblacklisted: true });

                const statsEmbed = new EmbedBuilder()
                    .setTitle('ProBot Blacklist Statistics')
                    .setColor(0x3498DB)
                    .addFields(
                        {
                            name: 'Report Statistics',
                            value: `**Total Reports:** \`${totalReports}\`\n**Active Blacklists:** \`${activeBlacklists}\`\n**Resolved Cases:** \`${resolvedCases}\``,
                            inline: true
                        },
                        {
                            name: 'Activity Status',
                            value: `**System Status:** 🟢 Active\n**Last Updated:** <t:${Math.floor(Date.now() / 1000)}:F>`,
                            inline: false
                        }
                    )
                    .setFooter({
                        text: 'ProBot Blacklist System • Real-time Statistics',
                        iconURL: message.guild.iconURL({ dynamic: true })
                    })
                    .setTimestamp();

                await message.channel.send({ embeds: [statsEmbed] });

            } catch (error) {
                console.error('Error getting stats:', error);
                webhookLogger.sendError(error, {
                    location: 'messageHandler - stats command',
                    userId: message.author.id,
                    guildId: message.guild.id,
                    action: 'get_stats'
                });
                await message.reply({
                    content: '❌ Error retrieving statistics!',
                    ephemeral: true
                });
            }
        }

        // Check for database cleanup command
        if (message.content.toLowerCase() === '!cleandb') {
            console.log('Database cleanup command detected');
            const configPath = path.join(__dirname, '..', 'config.json');
            if (!fs.existsSync(configPath)) return;

            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            const isAdmin = message.member.permissions.has('Administrator') ||
                           (config.adminRoleId && message.member.roles.cache.has(config.adminRoleId)) ||
                           (config.adminUserIds && config.adminUserIds.includes(message.author.id));

            if (!isAdmin) {
                return await message.reply({
                    content: '❌ This command is for administrators only!',
                    ephemeral: true
                });
            }

            try {
                // Import Report model
                const Report = require('../models/Report');

                // Confirm cleanup
                const confirmEmbed = new EmbedBuilder()
                    .setTitle('🗑️ Database Cleanup Confirmation')
                    .setDescription('⚠️ **WARNING:** This will delete ALL reports from the database!\n\n**This action cannot be undone!**\n\nReact with ✅ to confirm or ❌ to cancel.')
                    .setColor(0xFF4444)
                    .setFooter({
                        text: 'ProBot Database Management',
                        iconURL: message.guild.iconURL({ dynamic: true })
                    })
                    .setTimestamp();

                const confirmMessage = await message.reply({ embeds: [confirmEmbed] });

                // Add reactions
                await confirmMessage.react('✅');
                await confirmMessage.react('❌');

                // Wait for reaction
                const filter = (reaction, user) => {
                    return ['✅', '❌'].includes(reaction.emoji.name) && user.id === message.author.id;
                };

                const collected = await confirmMessage.awaitReactions({
                    filter,
                    max: 1,
                    time: 30000,
                    errors: ['time']
                });

                const reaction = collected.first();

                if (reaction.emoji.name === '✅') {
                    // Delete all reports
                    const deleteResult = await Report.deleteMany({});

                    const successEmbed = new EmbedBuilder()
                        .setTitle('✅ Database Cleaned Successfully')
                        .setDescription(`🗑️ **Deleted ${deleteResult.deletedCount} reports** from the database.\n\nThe database is now clean and ready for production use.`)
                        .setColor(0x00FF00)
                        .setFooter({
                            text: 'ProBot Database Management',
                            iconURL: message.guild.iconURL({ dynamic: true })
                        })
                        .setTimestamp();

                    await confirmMessage.edit({ embeds: [successEmbed] });
                    await confirmMessage.reactions.removeAll();

                } else {
                    const cancelEmbed = new EmbedBuilder()
                        .setTitle('❌ Database Cleanup Cancelled')
                        .setDescription('The database cleanup operation has been cancelled.\n\nNo data was deleted.')
                        .setColor(0xFFA500)
                        .setFooter({
                            text: 'ProBot Database Management',
                            iconURL: message.guild.iconURL({ dynamic: true })
                        })
                        .setTimestamp();

                    await confirmMessage.edit({ embeds: [cancelEmbed] });
                    await confirmMessage.reactions.removeAll();
                }

            } catch (error) {
                console.error('Error in database cleanup:', error);
                webhookLogger.sendError(error, {
                    location: 'messageHandler - database cleanup command',
                    userId: message.author.id,
                    guildId: message.guild?.id,
                    action: 'database_cleanup'
                });

                await message.reply({
                    content: '❌ An error occurred while cleaning the database.',
                    ephemeral: true
                });
            }
            return;
        }

        // Check for panel command
        if (message.content.toLowerCase() === '!panel') {
            console.log('Panel command detected');
            const configPath = path.join(__dirname, '..', 'config.json');
            if (!fs.existsSync(configPath)) {
                return await message.reply('❌ Bot is not set up yet!');
            }

            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            const isAdmin = message.member.permissions.has('Administrator') ||
                           (config.adminRoleId && message.member.roles.cache.has(config.adminRoleId)) ||
                           (config.adminUserIds && config.adminUserIds.includes(message.author.id));

            if (!isAdmin) {
                return await message.reply('❌ This command is for administrators only!');
            }

            // Import Report model
            const Report = require('../models/Report');

            // Get statistics
            const totalReports = await Report.countDocuments();
            const activeBlacklists = await Report.countDocuments({ unblacklisted: false });
            const resolvedCases = await Report.countDocuments({ unblacklisted: true });

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
                .setThumbnail(message.guild.iconURL({ dynamic: true }))
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
                        name: 'Current Statistics',
                        value: `**Active Blacklists:** \`${activeBlacklists}\`\n**Resolved Cases:** \`${resolvedCases}\`\n**Last Updated:** <t:${Math.floor(Date.now() / 1000)}:F>`,
                        inline: false
                    }
                )
                .setFooter({
                    text: `ProBot System • Panel created by ${message.author.tag}`,
                    iconURL: message.author.displayAvatarURL({ dynamic: true })
                })
                .setTimestamp();

            await message.channel.send({ embeds: [embed], components: [row] });
            return;
        }

        // Check for staff reports statistics command
        if (message.content.toLowerCase() === '!staffstats') {
            console.log('Staff reports stats command detected');
            const configPath = path.join(__dirname, '..', 'config.json');
            if (!fs.existsSync(configPath)) return;

            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            const isAdmin = message.member.permissions.has('Administrator') ||
                           (config.adminRoleId && message.member.roles.cache.has(config.adminRoleId)) ||
                           (config.adminUserIds && config.adminUserIds.includes(message.author.id));

            if (!isAdmin) {
                return await message.reply({
                    content: '❌ This command is for administrators only!',
                    ephemeral: true
                });
            }

            try {
                // Import Report model
                const Report = require('../models/Report');

                // Get staff reports statistics from MongoDB
                const totalStaffReports = await Report.countDocuments();
                const approvedStaffReports = await Report.countDocuments({ approved: true });
                const pendingStaffReports = await Report.countDocuments({ approved: false });
                const rejectedStaffReports = totalStaffReports - approvedStaffReports;

                // Get unique staff members who submitted reports
                const staffMembers = await Report.distinct('reportedBy');
                const activeReports = await Report.countDocuments({ unblacklisted: false });
                const resolvedReports = await Report.countDocuments({ unblacklisted: true });

                const staffStatsEmbed = new EmbedBuilder()
                    .setTitle('Staff Reports Statistics')
                    .setColor(0xFF6B6B)
                    .addFields(
                        {
                            name: 'Statistics Overview',
                            value: `**Total Reports:** \`${totalStaffReports}\`\n**Approved Reports:** \`${approvedStaffReports}\`\n**Rejected Reports:** \`${rejectedStaffReports}\``,
                            inline: false
                        }
                    )
                    .setFooter({
                        text: 'Staff Report Management System • ProBot',
                        iconURL: message.guild.iconURL({ dynamic: true })
                    })
                    .setTimestamp();

                await message.channel.send({ embeds: [staffStatsEmbed] });

            } catch (error) {
                console.error('Error getting staff reports stats:', error);
                webhookLogger.sendError(error, {
                    location: 'messageHandler - staff reports stats command',
                    userId: message.author.id,
                    guildId: message.guild?.id,
                    action: 'get_staff_reports_stats'
                });
                await message.reply({
                    content: '❌ Error retrieving staff reports statistics!',
                    ephemeral: true
                });
            }
        }
    },
};