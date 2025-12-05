const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const fs = require('fs');
const path = require('path');
const webhookLogger = require('./utils/webhookLogger');
require('dotenv').config();

const GUILD_ID = '1446149015006744709';

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

if (fs.existsSync(commandsPath)) {
    try {
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            try {
                const filePath = path.join(commandsPath, file);
                const command = require(filePath);
                commands.push(command.data.toJSON());
            } catch (error) {
                console.error(`[ERROR] Failed to load command ${file} for deployment:`, error);
                webhookLogger.sendError(error, {
                    location: 'deploy-commands.js - command loading',
                    file: file,
                    action: 'load_command_deployment'
                });
            }
        }
    } catch (error) {
        console.error('[ERROR] Failed to read commands directory for deployment:', error);
        webhookLogger.sendError(error, {
            location: 'deploy-commands.js - commands directory',
            action: 'read_commands_dir_deployment'
        });
    }
}

const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands...');

        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, GUILD_ID),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('[ERROR] Failed to deploy commands:', error);
        webhookLogger.sendError(error, {
            location: 'deploy-commands.js - command deployment',
            action: 'deploy_commands'
        });
    }
})();
