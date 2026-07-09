const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('divorce')
        .setDescription('Instantly divorce your partner. 💔')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('The user you are breaking up with')
                .setRequired(true)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');
        const author = interaction.user;

        // 🛑 Guard Clauses
        if (targetUser.id === author.id) {
            return interaction.reply({ content: "❌ You can't divorce yourself!", flags: MessageFlags.Ephemeral });
        }

        await interaction.deferReply();

        try {
            // 🎬 Fetch an instant sad/breakup animation (Using "cry")
            const response = await axios.get('https://api.otakugifs.xyz/gif?reaction=cry&format=gif');
            const divorceGif = response.data.url;

            // 🎨 Build the clean aesthetic layout
            const divorceEmbed = new EmbedBuilder()
                .setColor('#2b2d31') // Minimalist dark theme card
                .setTitle('🕊️ Divorce Finalized')
                .setDescription(`🥀 **${author}** has officially broken up with **${targetUser}**. The marriage is over, and both are now single.`)
                .setImage(divorceGif);

            // Send the final message directly (No buttons needed!)
            await interaction.editReply({ 
                content: `${targetUser}`, 
                embeds: [divorceEmbed] 
            });

        } catch (error) {
            console.error('Divorce Command Error:', error);
            await interaction.editReply({ content: '❌ The courthouse API is down! Try again later.' });
        }
    },
};