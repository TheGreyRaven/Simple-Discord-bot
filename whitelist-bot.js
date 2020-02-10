#!/usr/bin/env node
const Discord = require("discord.js");
var request = require("request")
var mysql = require('mysql');
const SteamAPI = require('steamapi');
const steam = new SteamAPI(config.steam);
const client = new Discord.Client();

const config = require("./config.json");

var con = mysql.createConnection({
    connectionLimit : 10,
    host: config.host,
    user: config.user,
    password: config.pass,
    database: "essentialmode"
});

con.connect();

client.on("ready", () => {
    console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`);
    client.user.setActivity(`(ง •̀_•́)ง (${client.guilds.size})`);
});

client.on("guildCreate", guild => {
    console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
    client.user.setActivity(`(ง •̀_•́)ง (${client.guilds.size})`);
});

client.on("guildDelete", guild => {
    console.log(`I have been removed from: ${guild.name} (id: ${guild.id})`);
    client.user.setActivity(`(ง •̀_•́)ง (${client.guilds.size})`);
});

function dec2hex(str) { // .toString(16) only works up to 2^53
    var dec = str.toString().split(''), sum = [], hex = [], i, s
    while (dec.length) {
        s = 1 * dec.shift()
        for (i = 0; s || i < sum.length; i++) {
            s += (sum[i] || 0) * 10
            sum[i] = s % 16
            s = (s - sum[i]) / 16
        }
    }
    while (sum.length) {
        hex.push(sum.pop().toString(16))
    }
    return hex.join('')
};

client.on("message", async message => {
    if (message.author.bot) return;

    if (message.content.indexOf(config.prefix) !== 0) return;

    const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    if (command === "avatar") {
        let member = message.mentions.members.first() || message.guild.members.get(args[0]);
        if (!member) {
            client.fetchUser(message.author).then(myUser => {
                message.channel.send(`Here is the avatar: ${myUser.avatarURL + "?size=1024"}`)
            });
        } else if (member) {
            client.fetchUser(member.user).then(myUser => {
                message.channel.send(`Here is the avatar: ${myUser.avatarURL + "?size=1024"}`)
            });
        }
    }

    if (command === "ping") {
        const m = await message.channel.send("Calculating ping...");
        m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ping)}ms`);
    }

    if (command === "pong") {
        message.channel.send("Do you think this is a fucking game?");
    }

    if (command === "yeet") {
	message.channel.send("https://www.youtube.com/watch?v=5i2FhLp3g-A");
    }

    if (command === "food") {
	message.channel.send("Next Gordon Ramsay huh? https://www.youtube.com/watch?v=NlIiIv-XKhs&list=PLopY4n17t8RCqmupsW66yOsR5eDPRUN_y");
    }

    if (command === "whitelist") {
        const steamURL = args.join(" ");
        if (!message.member.roles.some(r => ["Whitelist Machine", "Developer", "Head Of Admin", "Staff", "Admin", "Whitelist Manager"].includes(r.name))) {
            return message.reply(" you don't have permission to use this command!");
        } else if (steamURL === "") {
            message.channel.send("You need to add a Steam link!");
        } else {
            if (steamURL.indexOf("/id/") != -1 || steamURL.indexOf("/profiles/") != -1) {
                steam.resolveCache.clear();
                steam.resolve(steamURL).then(id => {
                    var sql = "INSERT INTO user_whitelist (identifier, whitelisted) VALUES ('steam:" + dec2hex(id) + "', 1)";
                    con.query(sql, function (err, result) {
                        if (err) {
                            message.channel.send(`Oh no something went wrong! (${err.code}) ${err.sqlMessage}`);
                        } else {
                            message.channel.send(`Successfully added to whitelist: ${steamURL}`);
                        }
                    });
                });
            } else {
                message.channel.send("Oh no something went wrong, it looks like you have a unknown Steam URL!")
            }
        }
    }

    if (command === "players") {
        request({ url: config.server, json: true }, function (error, response, body) {
            if (!error) {
                count = Object.keys(body).length;
                message.channel.send(`Currently: ${count}/32 players in-game!`);
            } else {
                message.channel.send(`Oh no something went wrong, please try again later! Error: ${error}`);
            }
        })
    }
});

client.login(config.token);
