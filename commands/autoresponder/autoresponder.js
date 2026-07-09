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
        .setName('autoresponder')
        .setDescription('autoresponder custom trigger engine')
        .addSubcommand(subcommand =>
            subcommand
                .setName('builder')
                .setDescription('autoresponder creation dashboard')
        )
        // --- ✏️ NEW: INTERACTIVE EDIT SUBCOMMAND ---
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Edit an existing autoresponder template live')
                .addStringOption(option => 
                    option.setName('trigger')
                        .setDescription('The trigger keyword you want to edit')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete an existing autoresponder keyword trigger')
                .addStringOption(option => option.setName('trigger').setDescription('The trigger word to wipe').setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all active triggers')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        // Staff-only permission gate
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({ content: '❌ You lack permission to configure server autoresponder text hooks!', flags: MessageFlags.Ephemeral });
        }

        // --- 🗑️ DELETE SUBCOMMAND ---
        if (subcommand === 'delete') {
            const trigger = interaction.options.getString('trigger').toLowerCase().trim();
            const exists = await db.get(`ar_${guildId}_${trigger}`);
            if (!exists) return interaction.reply({ content: `❌ No active autoresponder found for the keyword \`${trigger}\`.`, flags: MessageFlags.Ephemeral });
            
            await db.delete(`ar_${guildId}_${trigger}`);
            return interaction.reply({ content: `🗑️ Successfully purged autoresponder keyword trigger \`${trigger}\`.`, flags: MessageFlags.Ephemeral });
        }

        // --- 📋 LIST SUBCOMMAND ---
        if (subcommand === 'list') {
            const allData = await db.all();
            const keys = allData.filter(row => row.id.startsWith(`ar_${guildId}_`));
            if (keys.length === 0) return interaction.reply({ content: 'ℹ️ There are no active autoresponder strings registered here.', flags: MessageFlags.Ephemeral });
            
            const list = keys.map(k => `• \`${k.id.replace(`ar_${guildId}_`, '')}\``).join('\n');
            return interaction.reply({ content: `👋 **Active Guild Autoresponder Triggers:**\n${list}`, flags: MessageFlags.Ephemeral });
        }

        // --- 🤖 INTERACTIVE BUILDER & EDIT ENGINE ---
        if (subcommand === 'builder' || subcommand === 'edit') {
            let currentData = {
                trigger: 'none',
                reply: 'No reply text configured yet. Use the dropdown below to set your message values!'
            };

            // If we are editing, grab the existing text out of the database first!
            if (subcommand === 'edit') {
                const targetTrigger = interaction.options.getString('trigger').toLowerCase().trim();
                const savedReply = await db.get(`ar_${guildId}_${targetTrigger}`);

                if (!savedReply) {
                    return interaction.reply({ content: `❌ No existing autoresponder found for the trigger \`${targetTrigger}\`. Use \`/autoresponder builder\` to make a new one!`, flags: MessageFlags.Ephemeral });
                }

                currentData.trigger = targetTrigger;
                currentData.reply = savedReply;
            }

            // Compiles the Mimu visual grid overview card matrix
            const buildMimuSummaryEmbed = (data) => {
                return new EmbedBuilder()
                    .setColor('#2b2d31')
                    .setAuthor({ name: `${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
                    .setTitle(subcommand === 'edit' ? ' editing autoresponder' : 'new autoresponder created')
                    .setDescription(
                        `• not sure how to configure all these options?\n` +
                        `• check out the **using ar functions guide** in our docs\n\n` +
                        `\`\`\`\n${data.reply}\n\`\`\``
                    )
                    .addFields(
                        { name: 'Trigger', value: `\`${data.trigger}\``, inline: false },
                        { name: 'Match mode', value: 'exact', inline: true },
                        { name: 'Response method', value: 'sends in current channel', inline: true },
                        { name: 'Has embed(s)', value: '`none`', inline: true },
                        { name: 'Has buttons?', value: '`none`', inline: true },
                        { name: 'cooldown?', value: 'no cooldown', inline: true },
                        { name: 'makes choices?', value: 'no', inline: true },
                        { name: 'requires/denies any permissions?', value: 'none required', inline: true },
                        { name: 'requires/denies any roles?', value: 'none required', inline: true },
                        { name: 'silent errors?', value: 'no (recommended)', inline: true }
                    );
            };

            // Component Dropdown UI mapping layout
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('ar_builder_menu')
                .setPlaceholder('Modify autoresponder attributes...')
                .addOptions([
                    { label: 'Set Trigger Phrase', value: 'set_trigger', description: 'The text keyword that invokes the response', emoji: '💬' },
                    { label: 'Set Response Message', value: 'set_reply', description: 'The text string reply payload dispatched back', emoji: '📝' },
                    { label: '💾 Save & Save Changes', value: 'save_ar', description: 'Commit this operational trigger to the database engine', emoji: '💾' }
                ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const initialMessage = await interaction.reply({
                embeds: [buildMimuSummaryEmbed(currentData)],
                components: [row],
                fetchReply: true
            });

            const collector = initialMessage.createMessageComponentCollector({
                componentType: ComponentType.StringSelect,
                time: 600000 // Active layout for 10 minutes
            });

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) {
                    return i.reply({ content: '❌ Initialize your own configuration workspace using `/autoresponder builder`!', flags: MessageFlags.Ephemeral });
                }

                const selection = i.values[0];

                // --- 💾 DATABASE COMMIT ACTION ---
                if (selection === 'save_ar') {
                    if (currentData.trigger === 'none' || currentData.trigger.trim() === '') {
                        return i.reply({ content: '❌ You cannot save without setting a valid unique trigger keyword phrase!', flags: MessageFlags.Ephemeral });
                    }

                    const dbKey = `ar_${guildId}_${currentData.trigger.toLowerCase().trim()}`;
                    await db.set(dbKey, currentData.reply);

                    return i.reply({ content: `✅ Successfully saved and updated the autoresponder trigger for \`${currentData.trigger}\`!`, flags: MessageFlags.Ephemeral });
                }

                // --- 📋 INTERACTIVE INTERFACE MODAL MAP ---
                if (selection === 'set_trigger') {
                    const modal = new ModalBuilder().setCustomId('m_ar_trigger').setTitle('Setup Trigger Word');
                    const input = new TextInputBuilder()
                        .setCustomId('ar_input_trigger')
                        .setLabel('ENTER CHAT TRIGGER WORD/PHRASE:')
                        .setValue(currentData.trigger === 'none' ? '' : currentData.trigger)
                        .setPlaceholder('e.g., .hire, hello, website')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true);

                    modal.addComponents(new ActionRowBuilder().addComponents(input));
                    await i.showModal(modal);

                    const submit = await i.awaitModalSubmit({ time: 60000 }).catch(() => null);
                    if (submit) {
                        currentData.trigger = submit.fields.getTextInputValue('ar_input_trigger').toLowerCase().trim();
                        await submit.update({ embeds: [buildMimuSummaryEmbed(currentData)] });
                    }
                }

                if (selection === 'set_reply') {
                    const modal = new ModalBuilder().setCustomId('m_ar_reply').setTitle('Setup Response Text');
                    const input = new TextInputBuilder()
                        .setCustomId('ar_input_reply')
                        .setLabel('RESPONSE STRING BODY (Supports Placeholders):')
                        .setValue(currentData.reply.startsWith('No reply text') ? '' : currentData.reply)
                        .setPlaceholder('e.g., State if free/paid state the plan... {user}')
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true);

                    modal.addComponents(new ActionRowBuilder().addComponents(input));
                    await i.showModal(modal);

                    const submit = await i.awaitModalSubmit({ time: 60000 }).catch(() => null);
                    if (submit) {
                        currentData.reply = submit.fields.getTextInputValue('ar_input_reply');
                        await submit.update({ embeds: [buildMimuSummaryEmbed(currentData)] });
                    }
                }
            });

            collector.on('end', () => {
                selectMenu.setDisabled(true);
                const disabledRow = new ActionRowBuilder().addComponents(selectMenu);
                interaction.editReply({ components: [disabledRow] }).catch(() => null);
            });
        }
    }
};