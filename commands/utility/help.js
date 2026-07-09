const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    ComponentType 
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('View the full directory of bot commands organized by category'),

    async execute(interaction) {
        // --- 📊 LANDING PAGE EMBED ---
        const mainEmbed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle('🌸 Bot Command Directory')
            .setDescription(
                `Welcome! Use the drop-down select menu below to navigate through all available system features and configurations.\n\n` +
                `✨ **Categories Available:**\n` +
                `🖼️ • **Embed Templates** — Custom design sandboxes\n` +
                `💕 • **Social & Fun** — Marriage and social interactions\n` +
                `🛡️ • **Moderation** — Server management, utility logs, and overrides\n` +
                `📥 • **Requests / Claims** — Server request processing modules\n` +
                `⚙️ • **Utility & Variables** — Core systems, links, variables reference, and AI`
            )
            .setFooter({ text: 'Select a category below to view its commands!' });

        // --- 🗂️ THE DROP-DOWN SELECT MENU ---
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_menu')
            .setPlaceholder('Select a command category...')
            .addOptions([
                {
                    label: 'Embed Templates',
                    description: 'Interactive visual designers and managers',
                    value: 'embed_cat',
                    emoji: '🖼️'
                },
                {
                    label: 'Social & Fun',
                    description: 'Marriage commands and action modifiers',
                    value: 'fun_cat',
                    emoji: '💕'
                },
                {
                    label: 'Moderation',
                    description: 'Server protection tools and user lists',
                    value: 'mod_cat',
                    emoji: '🛡️'
                },
                {
                    label: 'Requests System',
                    description: 'Track, dispatch, and claim open request tasks',
                    value: 'req_cat',
                    emoji: '📥'
                },
                {
                    label: 'Utility & Variables',
                    description: 'Link trackers, AI answers, and scripting lists',
                    value: 'util_cat',
                    emoji: '⚙️'
                }
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const response = await interaction.reply({ 
            embeds: [mainEmbed], 
            components: [row] 
        });

        // --- 🔄 LIVE INTERACTION COLLECTOR ---
        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 300000
        });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: '❌ Run `/help` to open your own navigation panel!', ephemeral: true });
            }

            const selection = i.values[0];
            const updatedEmbed = new EmbedBuilder().setColor('#2b2d31');

            // 1. EMBEDS CATEGORY
            if (selection === 'embed_cat') {
                updatedEmbed
                    .setTitle('🖼️ Embed Template Systems')
                    .setDescription(
                        `### 🛠️ Commands\n` +
                        `• \`/embed builder\` — Launch the interactive visual embed builder.\n` +
                        `• \`/embed edit name:<slot_name>\` — Load and live-edit an existing template.\n` +
                        `• \`/embed delete name:<slot_name>\` — Delete a saved template slot.\n` +
                        `• \`/embed list\` — List all active server embed cards.`
                    );
            }

            // 2. FUN CATEGORY
            if (selection === 'fun_cat') {
                updatedEmbed
                    .setTitle('💕 Social & Fun interactions')
                    .setDescription(
                        `### 🛠️ Commands\n` +
                        `• \`/marry user:<@user>\` — Propose to a server member.\n` +
                        `• \`/divorce\` — Sever an existing matrimonial link.\n` +
                        `• \`/hug user:<@user>\` — Wrap someone up in a warm embrace!\n` +
                        `• \`/fight user:<@user>\` — Challenge another member to a battle!`
                    );
            }

            // 3. MODERATION CATEGORY (Matched to your sidebar)
            if (selection === 'mod_cat') {
                updatedEmbed
                    .setTitle('🛡️ Server Moderation Suites')
                    .setDescription(
                        `### 🛠️ Management Tools\n` +
                        `• \`/clear amount:<number>\` — Bulk delete recent messages in the channel.\n` +
                        `• \`/lock\` — Lock down the current text channel.\n` +
                        `• \`/unlock\` — Re-open a locked text channel.\n` +
                        `• \`/timeout user:<@user> duration:<time>\` — Place a disruptive user in timeout.\n` +
                        `• \`/role action:<add|remove> user:<@user> role:<@role>\` — Modify a user's role list.\n\n` +
                        `### 📋 Audit & Logs Utility\n` +
                        `• \`/history target:[@user]\` — View a profile's history, creation timelines, and status card.\n` +
                        `• \`/userin role:<@role>\` — Search and fetch all members containing a specific role.`
                    );
            }

            // 4. REQUESTS CATEGORY
            if (selection === 'req_cat') {
                updatedEmbed
                    .setTitle('📥 Request Processing Pipeline')
                    .setDescription(
                        `### 🛠️ Commands\n` +
                        `• \`/request\` — Submit a completely new server task or file upload asset.\n` +
                        `• \`/claim request:<id>\` — Claim an open task queue (Allows Owner, Admin, or Uploader role bypass overrides!).`
                    );
            }

            // 5. UTILITY & VARIABLES CATEGORY (Includes ask, link, and formatting)
            if (selection === 'util_cat') {
                updatedEmbed
                    .setTitle('⚙️ Server Utility Engine & Placeholders')
                    .setDescription(
                        `### 🛠️ Utility Commands\n` +
                        `• \`/ask question:<text>\` — Query the localized conversational response engine.\n` +
                        `• \`/link get name:<shortcut>\` — Fetch a registered bookmark (Has autocomplete autocomplete suggestions!).\n` +
                        `• \`/link list\` — View all server quick-access bookmark link names.\n` +
                        `• \`/link set name:<shortcut> url:<http...>\` — Assign a new travel bookmark mapping (Staff only).\n` +
                        `• \`/link delete name:<shortcut>\` — Remove an assigned link bookmark (Staff only).\n\n` +
                        `### 🔤 Scripting Variables Cheat Sheet\n` +
                        `• \`{user}\` / \`{user_name}\` — Reference executing user metadata.\n` +
                        `• \`{server_name}\` / \`{channel}\` — Reference current server name or chat link.\n` +
                        `• \`{newline}\` — Forces a clean line split.\n` +
                        `• \`{embed:name}\` — Spawns one of your preset visual layouts.\n` +
                        `• \`{choose: option A | option B}\` — Random choice picks via \`[choice]\`.\n` +
                        `• \`{range: 1-10}\` — Number generator rolls via \`[range]\`.`
                    );
            }

            updatedEmbed.setFooter({ text: `Viewing Category: ${i.component.options.find(o => o.value === selection).label}` });

            await i.update({ embeds: [updatedEmbed] });
        });

        collector.on('end', () => {
            selectMenu.setDisabled(true);
            const disabledRow = new ActionRowBuilder().addComponents(selectMenu);
            interaction.editReply({ components: [disabledRow] }).catch(() => null);
        });
    },
};