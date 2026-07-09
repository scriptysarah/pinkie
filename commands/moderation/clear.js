const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Purge/delete messages from the current channel.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages) // Staff only!
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Number of messages to clear (1-100)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(100)
        ),

    async execute(interaction) {
        // Fallback to 100 if the user didn't specify an amount
        const amount = interaction.options.getInteger('amount') || 100;

        // Defer the reply so the bot has time to process the deletion without timing out
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            // Bulk delete the messages
            const deleted = await interaction.channel.bulkDelete(amount, true);

            // Give a helpful breakdown of what happened
            return await interaction.editReply({
                content: `🧹 Successfully cleared **${deleted.size}** messages from this channel.`,
            });
            
        } catch (error) {
            console.error(error);
            return await interaction.editReply({
                content: '❌ There was an error trying to clear messages in this channel! Ensure I have the correct permissions.',
            });
        }
    },
};