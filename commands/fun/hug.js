const { 
    SlashCommandBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    EmbedBuilder, 
    ComponentType,
    MessageFlags 
} = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hug')
        .setDescription('Give someone a warm hug!')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('The user you want to hug')
                .setRequired(true)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');
        
        if (targetUser.id === interaction.user.id) {
            return interaction.reply({ content: `🤗 You try to hug yourself. It's cozy, but let's find you a friend instead!` });
        }

        await interaction.deferReply();

        try {
            const response = await axios.get('https://api.otakugifs.xyz/gif?reaction=hug&format=gif');
            const gifUrl = response.data.url;

            const hugEmbed = new EmbedBuilder()
                .setColor('#ffb6c1')
                .setDescription(`🤗 awnn…**${interaction.user}** gave **${targetUser}** a massive, warm hug!`)
                .setImage(gifUrl);

            await interaction.editReply({ embeds: [hugEmbed] });

        } catch (error) {
            console.error('API Error:', error);
            await interaction.editReply({ content: '❌ Outch, I couldn\'t grab a GIF from the web right now!' });
        }
    },
};