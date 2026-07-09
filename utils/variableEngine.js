const { ChannelType, EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

/**
 * Parses a string containing Mimu-style placeholders, functions, and database embed tags.
 * @param {string} rawString - The raw autoresponder reply template.
 * @param {object} message - The original Discord.js Message object that triggered it.
 * @returns {object} Message payload object containing content and embeds array.
 */
async function parseVariables(rawString, message) {
    if (!rawString) return { content: '', embeds: [] };

    const author = message.author;
    const member = message.member;
    const guild = message.guild;
    const channel = message.channel;

    // --- 📅 DATE FORMATTING ---
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
    const joinDateStr = member?.joinedTimestamp ? new Date(member.joinedTimestamp).toLocaleDateString('en-US', options) : 'N/A';
    const createDateStr = new Date(author.createdTimestamp).toLocaleDateString('en-US', options);
    const serverCreateStr = new Date(guild.createdTimestamp).toLocaleDateString('en-US', options);
    const boostSinceStr = member?.premiumSinceTimestamp ? new Date(member.premiumSinceTimestamp).toLocaleDateString('en-US', options) : 'Not a Booster';

    // --- 🔢 SERVER CONFIG COUNTS ---
    const totalMembers = guild.memberCount;
    const botCount = guild.members.cache.filter(m => m.user.bot).size;
    const noBotsCount = totalMembers - botCount;

    const getOrdinal = (n) => {
        const s = ["th", "st", "nd", "rd"], v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    // --- 🎲 RANDOM MEMBER GENERATORS ---
    const memberArray = Array.from(guild.members.cache.values());
    const randomMember = memberArray[Math.floor(Math.random() * memberArray.length)]?.user || author;
    const noBotsArray = memberArray.filter(m => !m.user.bot);
    const randomMemberNoBots = noBotsArray.length > 0 ? noBotsArray[Math.floor(Math.random() * noBotsArray.length)].user : author;

    let result = rawString;
    let builtEmbeds = [];

    // ==========================================
    // 🖼️ DATABASE EMBED ATTACHMENT PARSER
    // ==========================================
    // Matches {embed:name} or {embed:name} tags
    const embedMatch = result.match(/{embed:([^\}]+)}/i);
    if (embedMatch) {
        const embedName = embedMatch[1].toLowerCase().trim();
        const storedEmbedData = await db.get(`emb_${guild.id}_${embedName}`);

        if (storedEmbedData) {
            const embed = new EmbedBuilder();
            let hasData = false;

            // Simple helper to process variables inside the embed fields themselves
            const parseField = (text) => {
                if (!text) return null;
                return text
                    .replaceAll('{user}', `${author}`)
                    .replaceAll('{username}', author.username)
                    .replaceAll('{user_name}', author.username)
                    .replaceAll('{server_name}', guild.name)
                    .replaceAll('{member_count}', totalMembers)
                    .replaceAll('{newline}', '\n');
            };

            if (storedEmbedData.title) { embed.setTitle(parseField(storedEmbedData.title)); hasData = true; }
            if (storedEmbedData.description) { embed.setDescription(parseField(storedEmbedData.description)); hasData = true; }
            if (storedEmbedData.image) { embed.setImage(storedEmbedData.image); hasData = true; }
            if (storedEmbedData.thumbnail) { embed.setThumbnail(storedEmbedData.thumbnail); hasData = true; }
            if (storedEmbedData.footer) { embed.setFooter({ text: parseField(storedEmbedData.footer) }); hasData = true; }
            
            if (storedEmbedData.color) {
                embed.setColor(storedEmbedData.color.startsWith('#') ? storedEmbedData.color : `#${storedEmbedData.color}`);
                hasData = true;
            } else if (hasData) {
                embed.setColor('#2b2d31');
            }

            if (hasData) builtEmbeds.push(embed);
        }
        // Remove the {embed:name} tag from the main string content output
        result = result.replace(embedMatch[0], '');
    }

    // ==========================================
    // 🔥 ADVANCED INTERMEDIATE FUNCTIONS PARSER
    // ==========================================
    const choicesMade = [];
    let chosenIndex = null; 

    result = result.replace(/{choose(\d*):([^\}]+)}/gi, (match, num, content) => {
        const list = content.split('|').map(item => item.trim());
        const choice = list[Math.floor(Math.random() * list.length)];
        choicesMade.push(choice);
        chosenIndex = list.indexOf(choice); 
        return '';
    });

    result = result.replace(/\[choice\]/gi, choicesMade[0] || '');
    result = result.replace(/\[choice1\]/gi, choicesMade[1] || '');

    result = result.replace(/{lockedchoose(\d*):([^\}]+)}/gi, (match, num, content) => {
        const list = content.split('|').map(item => item.trim());
        if (chosenIndex !== null && list[chosenIndex]) {
            result = result.replace(/\[lockedchoice\]/gi, list[chosenIndex]);
        }
        return '';
    });

    const rangesMade = [];
    result = result.replace(/{range(\d*):(\d+)-(\d+)}/gi, (match, num, min, max) => {
        const rolledValue = Math.floor(Math.random() * (parseInt(max) - parseInt(min) + 1)) + parseInt(min);
        rangesMade.push(rolledValue);
        return '';
    });

    result = result.replace(/\[range\]/gi, rangesMade[0] || '');

    const args = message.content.split(/\s+/);
    result = result.replace(/\[\$(\d+)\]/g, (match, index) => args[parseInt(index)] || '');
    result = result.replace(/\[\$(\d+)\+\]/g, (match, index) => args.slice(parseInt(index)).join(' ') || '');

    // ==========================================
    // 🌸 CORE STANDARD PLACEHOLDERS PARSER
    // ==========================================
    result = result
        .replaceAll('{user}', `${author}`)
        .replaceAll('{user_tag}', author.username)
        .replaceAll('{user_name}', author.username)
        .replaceAll('{user_avatar}', author.displayAvatarURL({ extension: 'png' }))
        .replaceAll('{user_discrim}', author.discriminator || '0')
        .replaceAll('{user_id}', author.id)
        .replaceAll('{user_nick}', member?.displayName || author.username)
        .replaceAll('{user_joindate}', joinDateStr)
        .replaceAll('{user_createdate}', createDateStr)
        .replaceAll('{user_displaycolor}', member?.displayHexColor || '#ffffff')
        .replaceAll('{user_boostsince}', boostSinceStr)
        .replaceAll('{server_name}', guild.name)
        .replaceAll('{server_id}', guild.id)
        .replaceAll('{server_membercount}', totalMembers)
        .replaceAll('{server_membercount_ordinal}', getOrdinal(totalMembers))
        .replaceAll('{server_membercount_nobots}', noBotsCount)
        .replaceAll('{server_membercount_nobots_ordinal}', getOrdinal(noBotsCount))
        .replaceAll('{server_botcount}', botCount)
        .replaceAll('{server_botcount_ordinal}', getOrdinal(botCount))
        .replaceAll('{server_icon}', guild.iconURL({ extension: 'png' }) || '')
        .replaceAll('{server_rolecount}', guild.roles.cache.size)
        .replaceAll('{server_channelcount}', guild.channels.cache.size)
        .replaceAll('{server_owner}', `<@${guild.ownerId}>`)
        .replaceAll('{server_owner_id}', guild.ownerId)
        .replaceAll('{server_createdate}', serverCreateStr)
        .replaceAll('{server_boostlevel}', guild.premiumTier)
        .replaceAll('{server_boostcount}', guild.premiumSubscriptionCount || 0)
        .replaceAll('{server_randommember}', `${randomMember}`)
        .replaceAll('{server_randommember_tag}', randomMember.username)
        .replaceAll('{server_randommember_nobots}', `${randomMemberNoBots}`)
        .replaceAll('{channel}', `${channel}`)
        .replaceAll('{channel_name}', channel.name)
        .replaceAll('{message_id}', message.id)
        .replaceAll('{message_content}', message.content)
        .replaceAll('{message_link}', `https://discord.com/channels/${guild.id}/${channel.id}/${message.id}`)
        .replaceAll('{date}', new Date().toLocaleDateString('en-US', options))
        .replaceAll('{newline}', '\n');

    return {
        content: result.trim().length > 0 ? result : null,
        embeds: builtEmbeds
    };
}

module.exports = { parseVariables };