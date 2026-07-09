const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags, EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('claim')
        .setDescription('Claim an open request!')
        .addStringOption(option =>
            option.setName('request')
                .setDescription('Select the unclaimed request ID')
                .setRequired(true)
                .setAutocomplete(true) 
        ),

    // 1. DYNAMIC AUTOCOMPLETE HANDLER
    async autocomplete(interaction) {
        const guildId = interaction.guild.id;
        const focusedValue = interaction.options.getFocused();

        const allData = await db.all();
        
        const openRequests = allData
            .filter(row => row.id.startsWith(`active_request_${guildId}_`))
            .map(row => row.value)
            .filter(req => req.claimed === false);

        const choices = openRequests.map(req => ({
            name: `ID: #${req.id} | ${req.type} (${req.details.substring(0, 15)}...)`,
            value: req.id.toString()
        }));

        const filtered = choices.filter(choice => choice.name.toLowerCase().includes(focusedValue.toLowerCase()));

        await interaction.respond(filtered.slice(0, 25));
    },

    // 2. FINAL EXECUTION HANDLER
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const requestId = interaction.options.getString('request');

        // --- 🛡️ HIGH PERMISSION BYPASS LOGIC ---
        const isOwner = interaction.user.id === interaction.guild.ownerId;
        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
        
        // Fetch your custom configured role ID from database
        const allowedRoleId = await db.get(`uploader_role_${guildId}`);
        const hasUploaderRole = allowedRoleId ? interaction.member.roles.cache.has(allowedRoleId) : false;

        // If a role hasn't been configured yet, only let Owners/Admins pass through
        if (!allowedRoleId && !isOwner && !isAdmin) {
            return interaction.reply({ 
                content: '❌ Staff has not configured the allowed uploader role using `/request config-role`.', 
                flags: MessageFlags.Ephemeral 
            });
        }

        // Check if the user meets at least ONE of the valid clearance requirements
        if (!isOwner && !isAdmin && !hasUploaderRole) {
            return interaction.reply({ 
                content: '❌ You must have the configured Uploader role or high server permissions (Administrator/Owner) to claim requests!', 
                flags: MessageFlags.Ephemeral 
            });
        }

        // --- FETCH REQUEST RECORD ---
        const reqData = await db.get(`active_request_${guildId}_${requestId}`);
        if (!reqData || reqData.claimed) {
            return interaction.reply({ content: '❌ This request could not be found or has already been claimed!', flags: MessageFlags.Ephemeral });
        }

        // --- UPDATE LOG EMBED CHANNEL ---
        try {
            const logChannel = interaction.guild.channels.cache.get(reqData.channelId);
            if (logChannel) {
                const originalMsg = await logChannel.messages.fetch(reqData.messageId);
                
                const updatedEmbed = new EmbedBuilder()
                    .setColor('#ffb6c1') 
                    .setFooter({ text: `Status: Claimed by ${interaction.user.username}` });

                await originalMsg.edit({
                    content: originalMsg.content,
                    embeds: [updatedEmbed]
                });
            }
        } catch (err) {
            console.error("Could not update the original text message log entry:", err);
        }

        // --- COMMIT DATABASE CHANGE ---
        reqData.claimed = true;
        await db.set(`active_request_${guildId}_${requestId}`, reqData);

        return interaction.reply({ content: `✅ Request **#${requestId}** has been successfully claimed by ${interaction.user}!` });
    },
};