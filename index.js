const { Client, Events, GatewayIntentBits, ActivityType, PresenceUpdateStatus, Collection, MessageFlags } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

// 🔧 Database & Variable Engine Initialization
const { QuickDB } = require('quick.db');
const db = new QuickDB();
const { parseVariables } = require('./utils/variableEngine.js');

// 🚨 CRUCIAL: Added GuildMessages and MessageContent intents so the bot can read triggers!
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers 
    ] 
});

client.commands = new Collection();

// --- COMMAND LOADER ---
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing "data" or "execute".`);
        }
    }
}

// --- READY EVENT ---
client.once(Events.ClientReady, (readyClient) => {
    console.log(`You did it Marnie! Logged in as ${readyClient.user.tag}`);
    
    readyClient.user.setPresence({ 
        activities: [{ name: 'customstatus', state: 'Created by marnietsso', type: ActivityType.Custom }], 
        status: PresenceUpdateStatus.Online 
    });
});

// --- INTERACTION / SLASH COMMANDS HANDLER ---
client.on('interactionCreate', async interaction => {
    // Standard execution handler
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
        }
    } 
    // AUTOCOMPLETE EVENT HANDLER
    else if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        try {
            await command.autocomplete(interaction);
        } catch (error) {
            console.error(error);
        }
    }
});

// --- AUTORESPONDER TEXT LISTENER ---
client.on('parseVariables', async (message) => {
    // Ignore bots and DM channels
    if (message.author.bot || !message.guild) return;

    const guildId = message.guild.id;
    const cleanContent = message.content.toLowerCase().trim();

    // 1. Check if the exact message matches a saved autoresponder key
    const savedReply = await db.get(`ar_${guildId}_${cleanContent}`);
    
    if (savedReply) {
        // 2. Pass it through your dedicated engine to parse all Mimu variables dynamically!
            const messagePayload = await parseVariables(savedReply, message);
        // 3. Send the formatted custom text layout cleanly to the channel
        await message.channel.send(messagePayload);    
    }
});

client.on(Events.MessageCreate, async (message) => {
    // Prevent infinite processing feedback loops caused by bots talking to themselves
    if (message.author.bot || !message.guild) return;

    const guildId = message.guild.id;
    const cleanContent = message.content.toLowerCase().trim();

    // Look up if a matching string pattern exists in our database store
    const savedReply = await db.get(`ar_${guildId}_${cleanContent}`);

    if (savedReply) {
        try {
            // Run the raw text string through our asynchronous placeholder formatter engine
            const messagePayload = await parseVariables(savedReply, message);

            // Directly post the combined plain text string and custom built embed matrices
            await message.channel.send(messagePayload);
        } catch (error) {
            console.error("Autoresponder Dispatch Failure:", error);
        }
    }
});

const http = require('http');

// --- 🌐 LIGHTWEIGHT ALIVE PORT LISTENER ---
// Render automatically assigns a dynamic port via process.env.PORT
const PORT = process.env.PORT || 3000; 

http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.write('Bot core operational matrix: Online 24/7.');
    res.end();
}).listen(PORT, () => {
    console.log(`📡 Keep-Alive server listening on port ${PORT}`);
});

client.login(process.env.DISCORD_TOKEN);