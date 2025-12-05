const webhookLogger = require('../utils/webhookLogger');

const ALLOWED_GUILD_ID = '1446149015006744709';

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.isChatInputCommand()) return;

        // Bot now works in all guilds

        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error('Error executing command:', error);
            webhookLogger.sendError(error, {
                location: 'interactionCreate event',
                commandName: interaction.commandName,
                userId: interaction.user.id,
                guildId: interaction.guild?.id,
                action: 'command_execution_error'
            });
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
            } else {
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            }
        }
    },
};
