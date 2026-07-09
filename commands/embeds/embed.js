const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ComponentType,
    MessageFlags
} = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Interactive layout designer & manager')
        .addSubcommand(subcommand =>
            subcommand
                .setName('builder')
                .setDescription('Launch a blank interactive, live-preview visual embed designer')
        )
        // --- ✏️ NEW: INTERACTIVE EDIT SUBCOMMAND ---
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Load and edit an existing saved embed template')
                .addStringOption(option => 
                    option.setName('name')
                        .setDescription('The name of the template slot you want to modify')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Purge a saved template slot')
                .addStringOption(option => option.setName('name').setDescription('Template slot name').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all saved template slots')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        // Staff protection check
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({ content: '❌ You lack permission to configure server embed layouts!', flags: MessageFlags.Ephemeral });
        }

        // --- 🗑️ DELETE SUBCOMMAND ---
        if (subcommand === 'delete') {
            const name = interaction.options.getString('name').toLowerCase().trim();
            const exists = await db.get(`emb_${guildId}_${name}`);
            if (!exists) return interaction.reply({ content: `❌ No template slot found named \`${name}\`.`, flags: MessageFlags.Ephemeral });
            
            await db.delete(`emb_${guildId}_${name}`);
            return interaction.reply({ content: `🗑️ Successfully purged embed template slot \`${name}\`.`, flags: MessageFlags.Ephemeral });
        }

        // --- 📋 LIST SUBCOMMAND ---
        if (subcommand === 'list') {
            const allData = await db.all();
            const keys = allData.filter(row => row.id.startsWith(`emb_${guildId}_`));
            if (keys.length === 0) return interaction.reply({ content: 'ℹ️ There are no saved embed templates in this server yet.', flags: MessageFlags.Ephemeral });
            
            const list = keys.map(k => `• \`${k.id.replace(`emb_${guildId}_`, '')}\``).join('\n');
            return interaction.reply({ content: `📋 **Active Server Embed Templates:**\n${list}`, flags: MessageFlags.Ephemeral });
        }

        // --- 🎨 INTERACTIVE BUILDER & EDIT ENGINE ---
        if (subcommand === 'builder' || subcommand === 'edit') {
            // Default setup values
            let currentData = {
                title: 'New Embed Template',
                description: 'This is a live preview setup block. Select options from the dropdown below to change these fields!',
                color: '#ffb6c1',
                image: '',
                thumbnail: '',
                footer: ''
            };
            
            let prefilledSlotName = '';

            // If editing, try to pull the current setup from the DB first!
            if (subcommand === 'edit') {
                prefilledSlotName = interaction.options.getString('name').toLowerCase().trim();
                const savedEmbed = await db.get(`emb_${guildId}_prefilledSlotName`);

                if (!savedEmbed) {
                    return interaction.reply({ content: `❌ No saved embed template found matching the name \`${prefilledSlotName}\`.`, flags: MessageFlags.Ephemeral });
                }
                
                // Merge database save state over the defaults
                currentData = savedEmbed;
            }

            // Function to dynamically build the preview card
            const buildPreviewEmbed = (data) => {
                const embed = new EmbedBuilder()
                    .setTitle(data.title || null)
                    .setDescription(data.description || null)
                    .setColor(data.color.startsWith('#') ? data.color : '#ffb6c1');
                
                if (data.image && data.image.startsWith('http')) embed.setImage(data.image);
                if (data.thumbnail && data.thumbnail.startsWith('http')) embed.setThumbnail(data.thumbnail);
                if (data.footer) embed.setFooter({ text: data.footer });
                
                return embed;
            };

            // Dropdown component controls
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('embed_builder_menu')
                .setPlaceholder('Select a property to design...')
                .addOptions([
                    { label: 'Edit Title', value: 'edit_title', emoji: '✍️' },
                    { label: 'Edit Description', value: 'edit_description', emoji: '📝' },
                    { label: 'Edit Hex Color', value: 'edit_color', emoji: '🎨' },
                    { label: 'Edit Image URL', value: 'edit_image', emoji: '🖼️' },
                    { label: 'Edit Thumbnail URL', value: 'edit_thumbnail', emoji: '📷' },
                    { label: 'Edit Footer Text', value: 'edit_footer', emoji: '🔖' },
                    { label: '💾 Save Template Changes', value: 'save_template', description: 'Commit this design layout to the server dataset', emoji: '💾' }
                ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const initialMessage = await interaction.reply({
                content: subcommand === 'edit' ? `✏️ **Modifying Embed Template Slot \`${prefilledSlotName}\`:**` : '✨ **Embed Live Preview Sandbox:**',
                embeds: [buildPreviewEmbed(currentData)],
                components: [row],
                fetchReply: true
            });

            const collector = initialMessage.createMessageComponentCollector({
                componentType: ComponentType.StringSelect,
                time: 600000 // 10 minutes active window
            });

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) {
                    return i.reply({ content: '❌ Open your own setup canvas using `/embed builder`!', flags: MessageFlags.Ephemeral });
                }

                const selection = i.values[0];

                // HANDLE FINAL SAVE ACTION
                if (selection === 'save_template') {
                    const saveModal = new ModalBuilder().setCustomId('modal_save').setTitle('Save Template Slot');
                    const nameInput = new TextInputBuilder()
                        .setCustomId('slot_name')
                        .setLabel('ENTER TEMPLATE SAVING SLOT NAME:')
                        .setValue(prefilledSlotName) // Autofills the slot name if we are editing!
                        .setPlaceholder('e.g., welcome, rules, announcement')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true);
                    
                    saveModal.addComponents(new ActionRowBuilder().addComponents(nameInput));
                    await i.showModal(saveModal);
                    
                    const submitted = await i.awaitModalSubmit({ time: 60000 }).catch(() => null);
                    if (submitted) {
                        const slotName = submitted.fields.getTextInputValue('slot_name').toLowerCase().trim();
                        await db.set(`emb_${guildId}_${slotName}`, currentData);
                        await submitted.reply({ content: `✅ Template successfully committed to slot \`${slotName}\`! You can use it via \`{embed:${slotName}}\`.`, flags: MessageFlags.Ephemeral });
                    }
                    return;
                }

                // DIALOG MODAL MAP ROUTER
                const modalMap = {
                    edit_title: { id: 'm_title', title: 'Edit Embed Title', label: 'TITLE CONTENT', field: 'title', val: currentData.title, style: TextInputStyle.Short },
                    edit_description: { id: 'm_desc', title: 'Edit Embed Description', label: 'DESCRIPTION TEXT (Supports Markdowns)', field: 'description', val: currentData.description, style: TextInputStyle.Paragraph },
                    edit_color: { id: 'm_color', title: 'Edit Embed Color', label: 'HEX COLOR CODE (e.g., #FFB6C1)', field: 'color', val: currentData.color, style: TextInputStyle.Short },
                    edit_image: { id: 'm_image', title: 'Edit Image Link', label: 'IMAGE ADDRESS LINK (http://...)', field: 'image', val: currentData.image, style: TextInputStyle.Short },
                    edit_thumbnail: { id: 'm_thumbnail', title: 'Edit Thumbnail Link', label: 'THUMBNAIL ADDRESS LINK (http://...)', field: 'thumbnail', val: currentData.thumbnail, style: TextInputStyle.Short },
                    edit_footer: { id: 'm_footer', title: 'Edit Footer Text', label: 'FOOTER CONTENT TEXT', field: 'footer', val: currentData.footer, style: TextInputStyle.Short }
                };

                const activeConfig = modalMap[selection];
                if (!activeConfig) return;

                const propertyModal = new ModalBuilder().setCustomId(activeConfig.id).setTitle(activeConfig.title);
                const inputField = new TextInputBuilder()
                    .setCustomId('user_input')
                    .setLabel(activeConfig.label)
                    .setValue(activeConfig.val || '')
                    .setStyle(activeConfig.style)
                    .setRequired(selection === 'edit_title' || selection === 'edit_description');

                propertyModal.addComponents(new ActionRowBuilder().addComponents(inputField));
                await i.showModal(propertyModal);

                const modalSubmit = await i.awaitModalSubmit({ time: 60000 }).catch(() => null);
                if (modalSubmit) {
                    const valueReceived = modalSubmit.fields.getTextInputValue('user_input');
                    currentData[activeConfig.field] = valueReceived;

                    await modalSubmit.update({
                        embeds: [buildPreviewEmbed(currentData)]
                    });
                }
            });

            collector.on('end', () => {
                selectMenu.setDisabled(true);
                const closedRow = new ActionRowBuilder().addComponents(selectMenu);
                interaction.editReply({ components: [closedRow] }).catch(() => null);
            });
        }
    }
};