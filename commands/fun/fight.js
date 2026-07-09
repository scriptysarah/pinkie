const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fight')
        .setDescription('Fight with someone in a fun way!')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('The user you want to fight')
                .setRequired(true)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');
        
        if (targetUser.id === interaction.user.id) {
            return interaction.reply({ content: `uhh buddy you can't fight yourself!` });
        }

        await interaction.deferReply();

        try {
            // 1. Create a list of fight-themed actions the API actually understands
            const fightActions = ['punch', 'slap', 'smack'];

            // 2. The Math.random() trick to select one random item from our list
            const randomAction = fightActions[Math.floor(Math.random() * fightActions.length)];

            // 3. Inject that random action directly into the API URL using backticks!
            const response = await axios.get(`https://api.otakugifs.xyz/gif?reaction=${randomAction}&format=gif`);
            const gifUrl = response.data.url;

            // 4. Customize the description text to match the action being thrown!
            const fightEmbed = new EmbedBuilder()
                .setColor('#ffb6c1')
                .setDescription(`💥 **${interaction.user}** delivers an epic **${randomAction}** to **${targetUser}**!`)
                .setImage(gifUrl)

            await interaction.editReply({ embeds: [fightEmbed] });

        } catch (error) {
            console.error('API Error:', error);
            await interaction.editReply({ content: '❌ Ouch, I couldn\'t grab a GIF from the web right now!' });
        }
    },
};