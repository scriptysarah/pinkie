const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userin')
        .setDescription('List all members who have a specific role.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('The role you want to check')
                .setRequired(true)
        ),

    async execute(interaction) {
        const inputRole = interaction.options.getRole('role');

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            // 1. Force fetch all members from Discord directly into cache
            await interaction.guild.members.fetch();

            // 2. Grab the fresh, complete role object directly out of the guild cache
            const role = interaction.guild.roles.cache.get(inputRole.id);
            if (!role) {
                return await interaction.editReply({ content: '❌ Could not pull fresh cache data for that role.' });
            }

            const membersWithRole = role.members;

            if (membersWithRole.size === 0) {
                return await interaction.editReply({
                    content: `ℹ️ There are currently no members with the role **${role.name}**.`,
                });
            }

            // 3. Map user records elegantly
            const memberList = membersWithRole.map(member => `• ${member.user} (${member.user.username})`);

            // Gracefully handle massive lists so they never overflow Discord's embed caps
            let descriptionText = memberList.join('\n');
            if (descriptionText.length > 3500) {
                descriptionText = memberList.slice(0, 35).join('\n') + `\n\n*...and ${memberList.length - 35} more members.*`;
            }

            const embed = new EmbedBuilder()
                .setColor(role.hexColor === '#000000' ? '#ffb6c1' : role.hexColor)
                .setTitle(`👥 Members in Role: ${role.name}`)
                .setDescription(descriptionText)
                .setFooter({ text: `Total Members: ${membersWithRole.size}` })
                .setTimestamp();

            return await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            return await interaction.editReply({
                content: '❌ An error occurred while trying to fetch the member list for this role.',
            });
        }
    },
};