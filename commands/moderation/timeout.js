const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Mute/timeout a member so they cannot talk or join voice channels.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers) // Staff only!
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The member you want to timeout')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('How long should the timeout last?')
                .setRequired(true)
                .addChoices(
                    { name: '60 Seconds', value: 60 * 1000 },
                    { name: '5 Minutes', value: 5 * 60 * 1000 },
                    { name: '1 Hour', value: 60 * 60 * 1000 },
                    { name: '1 Day', value: 24 * 60 * 60 * 1000 },
                    { name: '1 Week', value: 7 * 24 * 60 * 60 * 1000 }
                )
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('The reason for the timeout')
                .setRequired(false)
        ),

    async execute(interaction) {
        const targetMember = interaction.options.getMember('target');
        const duration = interaction.options.getInteger('duration');
        const reason = interaction.options.getString('reason') || 'No reason provided.';

        // Safety check: Make sure the target is actually in the server
        if (!targetMember) {
            return interaction.reply({ content: '❌ That user does not appear to be in this server.', flags: MessageFlags.Ephemeral });
        }

        // Safety check: Prevent trying to timeout yourself
        if (targetMember.id === interaction.user.id) {
            return interaction.reply({ content: '❌ You cannot put yourself in timeout!', flags: MessageFlags.Ephemeral });
        }

        // Safety check: Prevent timing out someone with higher or equal roles than the bot/staff
        if (!targetMember.moderatable) {
            return interaction.reply({ 
                content: '❌ I cannot timeout this user. Their roles might be higher than mine, or they are the server owner.', 
                flags: MessageFlags.Ephemeral 
            });
        }

        await interaction.deferReply();

        try {
            // Apply the timeout via Discord's native API (expects milliseconds)
            await targetMember.timeout(duration, reason);

            // Send a public confirmation in the channel
            return await interaction.editReply({
                content: `⏳ **${targetMember.user.tag}** has been put in timeout for **${interaction.options.getInteger('duration') / 60000} minute(s)**.\n> **Reason:** ${reason}`
            });

        } catch (error) {
            console.error(error);
            return await interaction.editReply({
                content: '❌ An error occurred while trying to apply the timeout.',
            });
        }
    },
};