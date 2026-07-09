const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('unlock the current channel for the @everyone role.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels), // Staff only

    async execute(interaction) {
        const channel = interaction.channel;
        const guild = interaction.guild;

        try {
            // Edit permissions: Deny SendMessages for the @everyone role
            await channel.permissionOverwrites.edit(guild.roles.everyone, {
                SendMessages: true
            });

            // 🎨 BUILD THE CLEAN MINIMALIST EMBED
            const lockEmbed = new EmbedBuilder()
                .setColor('#2b2d31') // 🔑 Hides the side border by matching Discord dark mode
                .setTitle('Channel Unlocked!')
                .setDescription(
                    `☑️ ${channel}\n` +
                    `👤 **Moderator:** \`${interaction.user.username}\`\n\n` +
                    `> **Status:** Unlocked for \`@everyone\``
                );

            // Send it directly to the channel
            await interaction.reply({ embeds: [lockEmbed] });

        } catch (error) {
            console.error(error);
            await interaction.reply({ 
                content: '❌ I was unable to unlock this channel. Please check my permission hierarchy!', 
                flags: MessageFlags.Ephemeral 
            });
        }
    },
};