const { glob } = require("glob");
const { promisify } = require("util");
const fs = require('fs');
const path = require('path');
const Data = require("pro.db");
const globPromise = promisify(glob);

module.exports = async (client) => {
    const commandFiles = await globPromise(`${process.cwd()}/Commands/**/*.js`);
    commandFiles.map((value) => {
        const file = require(value);
        const splitted = value.split("/");
        const directory = splitted[splitted.length - 2];

        const isEnabled = Data.get(`command_enabled_${file.name}`);
        if (isEnabled === false) return;

        if (file.name) {
            const properties = { directory, ...file };
            client.commands.set(file.name, properties);

            if (file.aliases && Array.isArray(file.aliases)) {
                file.aliases.forEach(alias => {
                    const aliasIsEnabled = Data.get(`command_enabled_${alias}`);
                    if (aliasIsEnabled === false) return;
                    client.commands.set(alias, properties);
                });
            }
        }
    });

    const eventFiles = await globPromise(`${process.cwd()}/events/*.js`);
    eventFiles.map((value) => require(value));

    fs.readdirSync('./Extras/Guild/').filter(file => file.endsWith('.js')).forEach(file => {
        require(`../Extras/Guild/${file}`);
    });

    client.on('messageCreate', async (msg) => {
        if (!msg.guild || msg.author.bot) return;

        const guildId = msg.guild.id;
        const isPrefixlessAdminEnabled = Data.get(`Enable_PrefixlessAdmin_${guildId}`);

        if (!isPrefixlessAdminEnabled) return; 

        const adminCommands = loadAdminCommands();
        const inputCommand = msg.content.split(" ")[0].toLowerCase();

        Object.keys(adminCommands).forEach(commandName => {
            const aliases = adminCommands[commandName];
            if (inputCommand === commandName || aliases.includes(inputCommand)) {
          
                    const command = client.commands.get(commandName);
                    if (command) {
                        command.run(client, msg, msg.content.split(" ").slice(1));
                    }
                
            }
        });
    });
};


function loadAdminCommands() {
    const adminCommandsPath = `${process.cwd()}/Commands/Admin`;
    const adminCommands = {};
    fs.readdirSync(adminCommandsPath).forEach(file => {
        const commandName = path.basename(file, '.js');
        const command = require(path.join(adminCommandsPath, file));
        adminCommands[commandName] = command.aliases || [];
    });
    return adminCommands;
}