const { Client, Util } = require('discord.js');
const { DISCORD_TOKEN, COMMAND_PREFIX, GOOGLE_API } = require('./config.js')
const YouTube = require('simple-youtube-api');
const ytdl = require('ytdl-core');

const client = new Client({ disableEveryone: true });

const youtube = new YouTube(GOOGLE_API);

const queue = new Map();

client.on('warn', console.warn);

client.on('error', console.error);

client.on('disconnect', () => client.user.setActivity("Type !help"));

client.on('ready', () => {
    console.log(`Discord Bot initialized and ready!`);
})

client.on('message', async msg => {
    if (msg.author.bot) return undefined;
    if (!msg.content.startsWith(COMMAND_PREFIX)) return undefined;

    const args = msg.content.split(' ');
    const searchString = args.slice(1).join(' ');
    const url = args[1] ? args[1].replace(/<(.+)>/g, '$1') : '';
    const serverQueue = queue.get(msg.guild.id);

    let command = msg.content.toLowerCase().split(' ')[0];
    command = command.slice(COMMAND_PREFIX.length);

    if (command === 'play' || command === 'p')
    {
        const voiceChannel = msg.member.voiceChannel;
        if (!voiceChannel) return msg.channel.send('I\'m sorry but you need to be connected to a voice channel in order for me to play music!');
        const permission = voiceChannel.permissionsFor(msg.client.user);
        if (!permission.has('CONNECT')) return msg.channel.send('I can\'t **connect** to your voice channel, please make sure I have the correct permissions!');
        if (!permission.has('SPEAK')) return msg.channel.send('I can\'t **speak** in your voice channel, please make sure I have the correct permissions!');

        if (url.match(/^https?:\/\/(www.youtube.com|youtube.com|youtu.be|www.youtu.be)\/playlist(.*)$/))
        {
            const playlist  = await youtube.getPlaylist(url);
			const videos    = await playlist.getVideos();

            for (const video of Object.values(videos))
            {
                const video2 = await youtube.getVideoByID(video.id);
                await handleVideo(video2, msg, voiceChannel, true);
            }
            return msg.channel.send(`📻 Playlist: **${playlist.title}** has been added to queue!`);
        } else {
            try {
                var video = await youtube.getVideo(url);
            }
            catch (error)
            {
                try {
                    var videos = await youtube.searchVideos(searchString, 10);
                    let index = 0;
                    msg.channel.send(`
                        **Please select song:**\n
                        ${videos.map(videos2 => `**${++index} -** ${video2.title}`).join('\n')} 
                        Please select song by providing a value ranging from 1 to 10!
                    `);

                    try {
                        var response = await msg.channel.awaitMessages(msg2 => msg2.content > 0 && msg2.content < 11, {
                            maxMatches: 1,
                            time: 10000,
                            errors: ['time']
                        });
                    }
                    catch (err)
                    {
                        return msg.channel.send('No value was specified, cancelling video selection!');
                    }

                    const videoIndex = parseInt(response.first().content);
                    var video = await youtube.getVideoByID(videos[videoIndex - 1].id);
                }
                catch (error)
                {
                    return msg.channel.send('I could not find related to your search input!')
                }
            }
            return handleVideo(video, msg, voiceChannel);
        }
    }
    
    else if (command === 'skip' || command === 's')
    {
        if (!msg.member.voiceChannel) return msg.channel.send('I\'m sorry but you need to be connected to a voice channel in order for me to skip music!');
        if (!serverQueue) return msg.channel.send('I can\'t skip something that is not playing...');
        serverQueue.connection.dispatcher.end();
        msg.channel.send('Skipping song!');
        return undefined;
    }

    else if (command === 'stop')
    {
        if (!msg.member.voiceChannel) return msg.channel.send('I\'m sorry but you need to be connected to a voice channel in order for me to stop music!');
        if (!serverQueue) return msg.channel.send('You know, it could be good to have some music playing before asking me to stop it...');
        serverQueue.songs = [];
        serverQueue.connection.dispatcher.end()
        msg.channel.send('Okay then, I will stop playing music...');
        client.user.setActivity("Type !help");
        return undefined;
    }

    else if (command === 'nowplaying' || command === 'np')
    {
        if (!serverQueue) return msg.channel.send("There is nothing playing... FeelsBadMan");
        return msg.channel.send(`🎶 Now playing: **${serverQueue.songs[0].title}**!`);
    }

    else if (command === 'q' || command === 'queue')
    {
        if (!serverQueue) return msg.channel.send('The playlist is just as empty as my soul...');
        return msg.channel.send(`
            **Song queue:**\n
            ${serverQueue.songs.map(song => `**-** ${song.title}`).join('\n')}

            **Now playing:** ${serverQueue.songs[0].title}
        `);
    }

    else if (command === 'pause')
    {
        if (serverQueue && serverQueue.playing) {
            serverQueue.playing = false;
            serverQueue.connection.dispatcher.pause();
            client.user.setActivity("Type !resume to continue playing!")
            return msg.channel.send('⏸ Paused the music for you!');
        }
        return msg.channel.send('There is nothing playing.');
    } 
    
    else if (command === 'resume') {
        if (serverQueue && !serverQueue.playing) {
            serverQueue.playing = true;
            serverQueue.connection.dispatcher.resume();
            client.user.setActivity(String(serverQueue.songs[0].title),
            {
                type: "STREAMING",
                url: serverQueue.songs[0].url,
                
            })
            return msg.channel.send(':play_pause: Resumed the music for you!');
        }
        return msg.channel.send('There is nothing playing.');
    }

    return undefined;
});

async function handleVideo(video, msg, voiceChannel, playlist = false)
{
    const serverQueue = queue.get(msg.guild.id);
    
    const song = {
        id: video.id,
        title: Util.escapeMarkdown(video.title),
        url: `https://www.youtube.com/watch?v=${video.id}`
    };

    if (!serverQueue)
    {
        const queueConstruct = {
            textChannel: msg.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 5,
            playing: true
        };

        queue.set(msg.guild.id, queueConstruct);
        queueConstruct.songs.push(song);

        try {
            var connection = await voiceChannel.join();
            queueConstruct.connection = connection;
            play(msg.guild, queueConstruct.songs[0]);
        }
        catch (error)
        {
            queue.delete(msg.guild.id);
            return msg.channel.send(`I was unable to join the voice channel! :(\nError:\n||${error}||`);
        }
    }
    else
    {
        serverQueue.songs.push(song);
        if (playlist) return undefined;
        else {
            msg.channel.send(`🎶 **${song.title}** has been added to the queue!`)
            return;
        };
    }
    return undefined;
}

function play(guild, song)
{
    const serverQueue = queue.get(guild.id);

    if (!song)
    {
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
        return;
    }

    const dispatcher = serverQueue.connection.playStream(ytdl(song.url, {
            filter: "audioonly",
            highWaterMark: 1<<25
        })).on('end', reason => {
            if (reason === 'Stream is not generating quickly enough.') console.log('Song ended');
            else console.log(reason);

            serverQueue.songs.shift();

            play(guild, serverQueue.songs[0]);
        })
        .on('error', error => console.log(error));

    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);

    client.user.setActivity(String(song.title),
    {
        type: "STREAMING",
        url: song.url,
        
    })
}

client.login(DISCORD_TOKEN);