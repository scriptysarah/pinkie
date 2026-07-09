const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ask')
        .setDescription('Ask the bot core a question and get a mystical or funny answer!')
        .addStringOption(option => 
            option.setName('question')
                .setDescription('What do you want to ask?')
                .setRequired(true)),

    async execute(interaction) {
        const question = interaction.options.getString('question');

        // --- 🔮 THE PERSONALITY RESPONSES BANK ---
        const responses = [
            // Positive / Yes
            "✨ Yes, absolutely! It is written in the stars.",
            "💕 Most definitely! Things are looking highly in your favor.",
            "🌸 My data banks point to a definitive yes!",
            "✨ Without a single doubt, yes.",
            "🔮 The spirits say yes! Go for it!",

            // Neutral / Unclear
            "🔮 Signs are hazy... ask me again in a little bit.",
            "💤 I tried to look into the future but fell asleep. Try again?",
            "🌸 I'm pondering deeply on this, but the answer is currently locked.",
            "🔮 Better not tell you now... secrets are fun, right?",
            "✨ Ask again later when my wires cool down down.",

            // Negative / No
            "❌ My sensors say highly unlikely.",
            "💔 Outlook not so good... try rephrasing your fate.",
            "❌ Don't count on it this time around!",
            "💔 My sources say no, unfortunately.",
            "❌ Absolutely not! Better luck next time."
        ];

        // Pick a truly random response from our customized personality deck
        const randomAnswer = responses[Math.floor(Math.random() * responses.length)];

        // Truncate the question layout if it's super long for the embed title
        const cleanQuestion = question.length > 50 ? question.substring(0, 47) + '...' : question;

        const askEmbed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle(`❓ Question: ${cleanQuestion}`)
            .setDescription(randomAnswer)
            .setFooter({ text: `Invoked by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

        // Since this processes locally without web delays, we reply instantly!
        await interaction.reply({ embeds: [askEmbed] });
    },
};