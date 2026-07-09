const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('link')
        .setDescription('Retrieve or manage quick-access server hyperlinks')
        
        // --- 🔍 GET LINK (With Autocomplete) ---
        .addSubcommand(subcommand =>
            subcommand
                .setName('get')
                .setDescription('Retrieve a saved hyperlink bookmark')
                .addStringOption(option => 
                    option.setName('name')
                        .setDescription('The name of the saved link')
                        .setRequired(true)
                        .setAutocomplete(true) // ◁─── Enables dynamic suggestions!
                )
        )
        // --- 📋 LIST LINKS ---
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('View all saved server link shortcuts')
        )
        // --- ➕ SET LINK ---
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Save a new hyperlink shortcut (Staff only)')
                .addStringOption(option => option.setName('name').setDescription('Shortcut name').setRequired(true))
                .addStringOption(option => option.setName('url').setDescription('Full URL').setRequired(true))
        )
        // --- 🗑️ DELETE LINK ---
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete a link shortcut (Staff only)')
                .addStringOption(option => option.setName('name').setDescription('Shortcut name').setRequired(true))
        ),

    // 🧠 DYNAMIC AUTOCOMPLETE HANDLER
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        const guildId = interaction.guild.id;
        
        const allData = await db.all();
        // Extract links matching this guild
        const links = allData
            .filter(row => row.id.startsWith(`lnk_${guildId}_`))
            .map(row => row.id.replace(`lnk_${guildId}_`, ''));

        // Filter based on user input
        const filtered = links.filter(choice => choice.toLowerCase().includes(focusedValue.toLowerCase()));
        
        // Respond with valid choices
        await interaction.respond(filtered.slice(0, 25).map(choice => ({ name: choice, value: choice })));
    },

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        // 1. GET HANDLER
        if (subcommand === 'get') {
            const name = interaction.options.getString('name').toLowerCase().trim();
            const savedUrl = await db.get(`lnk_${guildId}_${name}`);

            if (!savedUrl) return interaction.reply({ content: `❌ No link found named \`${name}\`.`, flags: MessageFlags.Ephemeral });
            return interaction.reply({ content: `[${name}](${savedUrl})` });
        }

        // 2. LIST HANDLER
        if (subcommand === 'list') {
            const allData = await db.all();
            const links = allData.filter(row => row.id.startsWith(`lnk_${guildId}_`));
            
            if (links.length === 0) return interaction.reply({ content: 'ℹ️ No saved links found in this server.', flags: MessageFlags.Ephemeral });

            const list = links.map(l => `• \`${l.id.replace(`lnk_${guildId}_`, '')}\``).join('\n');
            return interaction.reply({ content: `**📋 Available Server Links:**\n${list}`, flags: MessageFlags.Ephemeral });
        }

        // 🛑 STAFF PERMISSION CHECKS (Set/Delete)
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({ content: '❌ You lack permission to alter server link mappings!', flags: MessageFlags.Ephemeral });
        }

        // 3. SET HANDLER
        if (subcommand === 'set') {
            const name = interaction.options.getString('name').toLowerCase().trim();
            const url = interaction.options.getString('url').trim();

            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                return interaction.reply({ content: '❌ URL must begin with `http://` or `https://`!', flags: MessageFlags.Ephemeral });
            }

            await db.set(`lnk_${guildId}_${name}`, url);
            return interaction.reply({ content: `✅ Link \`${name}\` has been set.`, flags: MessageFlags.Ephemeral });
        }

        // 4. DELETE HANDLER
        if (subcommand === 'delete') {
            const name = interaction.options.getString('name').toLowerCase().trim();
            if (!(await db.get(`lnk_${guildId}_${name}`))) return interaction.reply({ content: `❌ No link named \`${name}\` found.`, flags: MessageFlags.Ephemeral });

            await db.delete(`lnk_${guildId}_${name}`);
            return interaction.reply({ content: `🗑️ Deleted link \`${name}\`.`, flags: MessageFlags.Ephemeral });
        }
    },
};