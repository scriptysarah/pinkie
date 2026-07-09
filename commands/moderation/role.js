const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('role')
        .setDescription('Toggle a role on or off for a specific member.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles) // Staff only!
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The member to give or remove a role from')
                .setRequired(true)
        )
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('The role to toggle')
                .setRequired(true)
        ),

    async execute(interaction) {
        const targetMember = interaction.options.getMember('target');
        const role = interaction.options.getRole('role');

        // Safety check: Make sure the target is valid and in the server
        if (!targetMember) {
            return interaction.reply({ content: '❌ That user does not appear to be in this server.', flags: MessageFlags.Ephemeral });
        }

        // Safety check: Make sure the bot isn't trying to manage a system/bot integration role
        if (role.managed) {
            return interaction.reply({ content: '❌ I cannot assign this role because it belongs to an external integration or bot.', flags: MessageFlags.Ephemeral });
        }

        // Safety check: Make sure the bot's highest role is physically above the role it's trying to give out
        const botMember = interaction.guild.members.me;
        if (role.position >= botMember.roles.highest.position) {
            return interaction.reply({ 
                content: '❌ I cannot manage this role. It is positioned higher than my bot\'s highest role in the server settings!', 
                flags: MessageFlags.Ephemeral 
            });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            // Check if the user already has the role
            if (targetMember.roles.cache.has(role.id)) {
                // Remove the role
                await targetMember.roles.remove(role);
                return await interaction.editReply({
                    content: `🗑️ Removed the role **${role.name}** from **${targetMember.user.username}**.`,
                });
            } else {
                // Add the role
                await targetMember.roles.add(role);
                return await interaction.editReply({
                    content: `✅ Added the role **${role.name}** to **${targetMember.user.username}**.`,
                });
            }

        } catch (error) {
            console.error(error);
            return await interaction.editReply({
                content: '❌ An error occurred while trying to change permissions for this user.',
            });
        }
    },
};