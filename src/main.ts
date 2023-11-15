require('dotenv').config();
const { Client, GatewayIntentBits, TextChannel } = require('discord.js');
const cron = require('node-cron');
const { chromium } = require('playwright');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const userSettings: UserSetting[] = [];

const fetchPrice = async (setting: UserSetting) => {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(setting.websiteUrl);
    const price = await (await page.locator(setting.xpath)).innerText();
    await browser.close();

    return price;
}

const sendPriceAlert = async (setting: UserSetting) => {
    const price = await fetchPrice(setting);
    const channel = await client.channels.fetch(setting.channelId) as typeof TextChannel;
    
    await channel.send(`The current price for ${setting.itemName} is ${price}`);
}

cron.schedule('* * * * * *', async () => userSettings.forEach(async setting => await sendPriceAlert(setting)));

client.once('ready', () => console.log(`Bot ${client.user?.tag} logged in!`));

client.on('messageCreate', message => {

    if (message.content.startsWith('!list')) {
        message.reply(JSON.stringify(userSettings));
    }

    if (message.content.startsWith('!add')) {
        const args = message.content.split(' ');
        if (args.length === 4) {
            const [, itemName, websiteUrl, xpath] = args;
            console.log(`${message.author.globalName} added ${itemName}`);

            if (itemName && websiteUrl && xpath) {
                const channelId = message.channel.id;
                const newSetting: UserSetting = { channelId, itemName, websiteUrl, xpath };
                userSettings.push(newSetting);

                message.reply(`Price tracker for ${newSetting.itemName} added! You will be alerted on price drops.}`);
            } else {
                message.reply('Invalid command! Use `!add <itemName> <websiteUrl> <xpathLocator>`')
            }
        } else {
            message.reply('Invalid command! Use `!add <itemName> <websiteUrl> <xpathLocator>`')
        }
    }
});

client.login(process.env.TOKEN);