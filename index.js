const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const webhookLogger = require('./utils/webhookLogger');
const connectDB = require('./config/database');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
});

client.commands = new Collection();
client.events = new Collection();

const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    try {
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            try {
                const filePath = path.join(commandsPath, file);
                const command = require(filePath);

                if ('data' in command && 'execute' in command) {
                    client.commands.set(command.data.name, command);
                } else {
                    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
                }
            } catch (error) {
                console.error(`[ERROR] Failed to load command ${file}:`, error);
                webhookLogger.sendError(error, {
                    location: 'index.js - command loading',
                    file: file,
                    action: 'load_command'
                });
            }
        }
    } catch (error) {
        console.error('[ERROR] Failed to read commands directory:', error);
        webhookLogger.sendError(error, {
            location: 'index.js - commands directory',
            action: 'read_commands_dir'
        });
    }
}

const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    try {
        const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

        for (const file of eventFiles) {
            try {
                const filePath = path.join(eventsPath, file);
                const event = require(filePath);

                if (event.once) {
                    client.once(event.name, (...args) => event.execute(...args));
                } else {
                    client.on(event.name, (...args) => event.execute(...args));
                }
            } catch (error) {
                console.error(`[ERROR] Failed to load event ${file}:`, error);
                webhookLogger.sendError(error, {
                    location: 'index.js - event loading',
                    file: file,
                    action: 'load_event'
                });
            }
        }
    } catch (error) {
        console.error('[ERROR] Failed to read events directory:', error);
        webhookLogger.sendError(error, {
            location: 'index.js - events directory',
            action: 'read_events_dir'
        });
    }
}

// Connect to MongoDB
connectDB();

client.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error('[ERROR] Failed to login:', error);
    webhookLogger.sendError(error, {
        location: 'index.js - client login',
        action: 'discord_login'
    });
});

process.on('unhandledRejection', (error) => {
    console.error('[ERROR] Unhandled promise rejection:', error);
    webhookLogger.sendError(error, {
        location: 'index.js - unhandled rejection',
        action: 'unhandled_promise_rejection'
    });
});

process.on('uncaughtException', (error) => {
    console.error('[ERROR] Uncaught exception:', error);
    webhookLogger.sendError(error, {
        location: 'index.js - uncaught exception',
        action: 'uncaught_exception'
    });
});
