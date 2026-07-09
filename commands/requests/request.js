const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags, EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('request')
        .setDescription('Manage or submit graphics and asset requests')
        
        // --- CONFIG SUBCOMMAND: SET CHANNEL ---
        .addSubcommand(subcommand =>
            subcommand
                .setName('set-channel')
                .setDescription('Set the channel where requests will be posted.')
                .addChannelOption(option => 
                    option.setName('channel')
                        .setDescription('The channel to send requests to')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )

        // --- CONFIG SUBCOMMAND: SET STAFF ROLE (New!) ---
        .addSubcommand(subcommand =>
            subcommand
                .setName('config-role')
                .setDescription('Set the role required to claim requests.')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The role that can use /claim')
                        .setRequired(true)
                )
        )

        // --- CONFIG SUBCOMMAND: SET LAYOUT ---
        .addSubcommand(subcommand =>
            subcommand
                .setName('layout')
                .setDescription('Set a custom layout template for requests.')
                .addStringOption(option =>
                    option.setName('template')
                        .setDescription('Variables: {id}, {user}, {type}, {details}.')
                        .setRequired(true)
                )
        )
        
        // --- ACTION SUBCOMMAND: CREATE A REQUEST ---
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Submit a request for graphics or assets!')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('What type of graphic? (e.g., banner, pfp)')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('details')
                        .setDescription('What are you looking for? (e.g., JJK, pink theme)')
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        // Permissions Check for Configuration Options
        if (['set-channel', 'config-role', 'layout'].includes(subcommand)) {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                return interaction.reply({ content: '❌ Only staff can configure this command!', flags: MessageFlags.Ephemeral });
            }
        }

        if (subcommand === 'set-channel') {
            const targetChannel = interaction.options.getChannel('channel');
            await db.set(`request_channel_${guildId}`, targetChannel.id);
            return interaction.reply({ content: `Requests channel set to ${targetChannel}!`, flags: MessageFlags.Ephemeral });
        }

        if (subcommand === 'config-role') {
            const targetRole = interaction.options.getRole('role');
            await db.set(`uploader_role_${guildId}`, targetRole.id);
            return interaction.reply({ content: `Only users with the role **${targetRole.name}** can now use \`/claim\`!`, flags: MessageFlags.Ephemeral });
        }

        if (subcommand === 'layout') {
            const templateText = interaction.options.getString('template');
            await db.set(`request_layout_${guildId}`, templateText);
            return interaction.reply({ content: `Message template updated!`, flags: MessageFlags.Ephemeral });
        }
// --- 3. CREATE HANDLER ---
        if (subcommand === 'create') {
            const requestType = interaction.options.getString('type');
            const requestDetails = interaction.options.getString('details');

            // Fetch required target channel configuration
            const requestChannelId = await db.get(`request_channel_${guildId}`);
            if (!requestChannelId) {
                return interaction.reply({ content: 'The request channel has not been set up yet!' });
            }

            const targetChannel = interaction.guild.channels.cache.get(requestChannelId);
            if (!targetChannel) return interaction.reply({ content: 'Target channel missing.'});

            // Fetch the configured uploader role to ping it dynamically
            const allowedRoleId = await db.get(`uploader_role_${guildId}`);
            const rolePing = allowedRoleId ? `<@&${allowedRoleId}>` : '@Uploader';

            // Increment a global counter to give this specific request a unique ID number
            const currentCounter = (await db.get(`req_counter_${guildId}`)) || 0;
            const newId = currentCounter + 1;
            await db.set(`req_counter_${guildId}`, newId);

            // Fetch custom layout configuration, or fall back to your beautiful default layout
            const savedLayout = await db.get(`request_layout_${guildId}`);
            
            // 🌸 YOUR CUSTOM AESTHETIC TEMPLATE 🌸
            let finalMessage = savedLayout || 
`︵︵ {user} is requesting . . ୨୧ **#{id}**
₊⊹ . ︵ . ︵ . ︵ . ︵ . ︵ . ︵ . ︵ .
꒰꒰ ✎ :: ⊹ ── ***{type} - {details}*** ︶꒷꒦ 🩹
︵︵ ୨୧ ₊˚ ⊹ ꒰꒰ {role} ୧ ✦
🍁﹒︵︵︵︵ ⁺. ✧ .⁺ ︵︵︵
꒰ა ໒꒱ ︶꒦ଘ🌿๑꒷꒦ **uploaders, __pls use /claim if claiming __**˚ ໑ ₊˚・ ‧`;

            finalMessage = finalMessage
                .replaceAll('{id}', newId)
                .replaceAll('{user}', `${interaction.user}`)
                .replaceAll('{type}', requestType)
                .replaceAll('{details}', requestDetails)
                .replaceAll('{role}', rolePing);

            const statusEmbed = new EmbedBuilder()
                .setColor('#ffb6c1') 
                .setFooter({ text: 'Status: Unclaimed | Use /claim to take this request' });

            const sentMessage = await targetChannel.send({ 
                content: finalMessage,
                embeds: [statusEmbed]
            });

            await db.set(`active_request_${guildId}_${newId}`, {
                id: newId,
                user: interaction.user.tag,
                type: requestType,
                details: requestDetails,
                messageId: sentMessage.id,
                channelId: targetChannel.id,
                claimed: false
            });

            return interaction.reply({ content: `Request sent! ^^`, flags: MessageFlags.Ephemeral });
        }
    },
};