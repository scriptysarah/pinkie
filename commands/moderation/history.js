const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('history')
        .setDescription('Display server records, profile information, and permission tracking for a user')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('The user whose profile records you want to look up')
                .setRequired(false)),

    async execute(interaction) {
        // Fallback to the command executor if no target is specified
        const user = interaction.options.getUser('target') || interaction.user;
        
        // Fetch the target as a guild member to read server-specific info (roles, join dates)
        let member;
        try {
            member = await interaction.guild.members.fetch(user.id);
        } catch (e) {
            return interaction.reply({ content: '❌ Could not find historical server data for this user.', ephemeral: true });
        }

        // --- 📅 DATE STRUCTURE FORMATTING ---
        const formatOptions = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
        const discordJoinDate = new Date(user.createdTimestamp).toLocaleDateString('en-US', formatOptions);
        const serverJoinDate = new Date(member.joinedTimestamp).toLocaleDateString('en-US', formatOptions);
        
        const boostDate = member.premiumSinceTimestamp 
            ? new Date(member.premiumSinceTimestamp).toLocaleDateString('en-US', formatOptions) 
            : 'Not boosting';

        // --- 🛡️ ROLES TRACKING ---
        // Filter out @everyone to keep the list tidy
        const rolesList = member.roles.cache
            .filter(role => role.name !== '@everyone')
            .map(role => role.toString())
            .join(', ') || 'None';

        // --- 🔑 KEY PERMISSIONS GENERATOR ---
        // Checks for notable, high-clearance administrative permissions
        const keyPermsList = [];
        if (member.permissions.has(PermissionFlagsBits.Administrator)) keyPermsList.push('`Administrator`');
        if (member.permissions.has(PermissionFlagsBits.ManageGuild)) keyPermsList.push('`Manage Server`');
        if (member.permissions.has(PermissionFlagsBits.ManageRoles)) keyPermsList.push('`Manage Roles`');
        if (member.permissions.has(PermissionFlagsBits.ManageChannels)) keyPermsList.push('`Manage Channels`');
        if (member.permissions.has(PermissionFlagsBits.ManageMessages)) keyPermsList.push('`Manage Messages`');
        if (member.permissions.has(PermissionFlagsBits.KickMembers)) keyPermsList.push('`Kick Members`');
        if (member.permissions.has(PermissionFlagsBits.BanMembers)) keyPermsList.push('`Ban Members`');
        
        const finalPermsOutput = keyPermsList.length > 0 ? keyPermsList.join(', ') : '`Standard Member Clearances`';

        // --- 🖼️ EMBED ASSEMBLY ---
        const historyEmbed = new EmbedBuilder()
            .setColor(member.displayHexColor || '#2b2d31')
            .setTitle(`📜 Profile History Data — ${user.username}`)
            .setThumbnail(user.displayAvatarURL({ extension: 'png', size: 256 }))
            .addFields(
                { 
                    name: '👤 Identity Coordinates', 
                    value: `• **Username:** ${user.username}\n• **User ID:** \`${user.id}\`\n• **Server Nickname:** ${member.displayName}`, 
                    inline: false 
                },
                { 
                    name: '📅 Timeline Records', 
                    value: `• **Joined Discord:** \`${discordJoinDate}\`\n• **Joined Server:** \`${serverJoinDate}\`\n• **Server Boosting:** \`${boostDate}\``, 
                    inline: false 
                },
                { 
                    name: '🎨 Assigned Server Roles', 
                    value: rolesList.length > 512 ? `${rolesList.substring(0, 500)}... and more.` : rolesList, 
                    inline: false 
                },
                { 
                    name: '🛡️ Key Administrative Permissions', 
                    value: finalPermsOutput, 
                    inline: false 
                }
            )
            .setFooter({ text: `Requested by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.reply({ embeds: [historyEmbed] });
    },
};