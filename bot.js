const Discord = require('discord.js');
const client = new Discord.Client();

client.on("ready", () => {
    console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`);
    client.user.setActivity(`Indexing the WWW!`);
});

client.on("guildCreate", guild => {
    console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
    client.user.setActivity(`Indexing the WWW!`);
});

client.on("guildDelete", guild => {
    console.log(`I have been removed from: ${guild.name} (id: ${guild.id})`);
    client.user.setActivity(`Indexing the WWW!`);
});

client.on('message', async message => {
    if (message.author.bot) return;

    if (message.channel.name !== "botspam") return;

    if (message.content.indexOf('!') !== 0) return;

    const args = message.content.slice('!'.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    if (command === "ping") {
        const m = await message.channel.send("Calculating ping...");
        m.edit(`Pong! Latency to Discord is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ping)}ms`);
    }
});

client.login('change_me_to_your_key');