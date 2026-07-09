const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('marry')
        .setDescription('Propose to the love of your life! 💍')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('The user you want to propose to')
                .setRequired(true)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');
        const author = interaction.user;

        // 🛑 Guard Clauses (Safety checks)
        if (targetUser.id === author.id) {
            return interaction.reply({ content: "❌ You can't marry yourself, silly!", flags: MessageFlags.Ephemeral });
        }
        if (targetUser.bot) {
            return interaction.reply({ content: "❌ Bots aren't looking for romance right now.", flags: MessageFlags.Ephemeral });
        }

        await interaction.deferReply();

        try {
            // 🎬 1. Fetch the Proposal Gif
            const proposalResponse = await axios.get('https://api.otakugifs.xyz/gif?reaction=handhold&format=gif');
            const proposalGif = proposalResponse.data.url;

            // 🎨 Build proposal layout using our minimalist aesthetic color
            const proposalEmbed = new EmbedBuilder()
                .setColor('#2b2d31')
                .setTitle('💍 A Proposal is in the air!')
                .setDescription(`✨ **${author}** has gotten down on one knee and asked **${targetUser}** to marry them!\n\n*Do you accept?*`)
                .setImage(proposalGif);

            // 🔘 Add Accept & Decline Interactive Buttons
            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('accept_marriage').setLabel('Yes, I do! 🌸').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('decline_marriage').setLabel('No... 💔').setStyle(ButtonStyle.Danger)
            );

            const initialMessage = await interaction.editReply({ 
                content: `${targetUser}`, 
                embeds: [proposalEmbed], 
                components: [buttons] 
            });

            // ⏳ 2. Create a Component Collector to listen for the target user's choice (timeout after 60 seconds)
            const collector = initialMessage.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 60000 
            });

            collector.on('collect', async (btnInteraction) => {
                // Only let the TARGET user click the buttons
                if (btnInteraction.user.id !== targetUser.id) {
                    return btnInteraction.reply({ content: ' Underground gossip says this proposal isn\'t for you!', flags: MessageFlags.Ephemeral });
                }

                await btnInteraction.deferUpdate(); // Prevents loading/thinking loop on the buttons

                if (btnInteraction.customId === 'accept_marriage') {
                    // Fetch Celebration/Kiss GIF
                    const acceptResponse = await axios.get('https://api.otakugifs.xyz/gif?reaction=kiss&format=gif');
                    const acceptGif = acceptResponse.data.url;

                    const acceptedEmbed = new EmbedBuilder()
                        .setColor('#ffb6c1') // Soft pink romance color
                        .setTitle('🎉 Just Married!')
                        .setDescription(`💖 **${targetUser}** said **YES**! **${author}** and **${targetUser}** are officially married! ✨`)
                        .setImage(acceptGif);

                    await interaction.editReply({ embeds: [acceptedEmbed], components: [] });
                    collector.stop();
                } 
                
                else if (btnInteraction.customId === 'decline_marriage') {
                    // Fetch Sad/Cry GIF
                    const declineResponse = await axios.get('https://api.otakugifs.xyz/gif?reaction=cry&format=gif');
                    const declineGif = declineResponse.data.url;

                    const declinedEmbed = new EmbedBuilder()
                        .setColor('#2b2d31')
                        .setTitle('💔 Ouch...')
                        .setDescription(`😭 **${targetUser}** has rejected the proposal. Better luck next time, **${author}**...`)
                        .setImage(declineGif);

                    await interaction.editReply({ embeds: [declinedEmbed], components: [] });
                    collector.stop();
                }
            });

            // If the timer runs out without an answer, clean up the buttons
            collector.on('end', async (collected, reason) => {
                if (reason === 'time') {
                    const timeoutEmbed = EmbedBuilder.from(proposalEmbed)
                        .setDescription(`⏰ **${targetUser}** took too long to answer. The proposal has expired!`);
                    await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
                }
            });

        } catch (error) {
            console.error('Marriage Command Error:', error);
            await interaction.editReply({ content: '❌ The romance API went down! Try again in a moment.' });
        }
    },
};