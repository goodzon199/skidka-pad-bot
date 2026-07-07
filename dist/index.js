"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const telegraf_1 = require("telegraf");
const config_1 = require("./config");
const database_1 = require("./database");
const commands_1 = require("./bot/commands");
const parsers_1 = require("./api/parsers");
const formatters_1 = require("./utils/formatters");
const bot = new telegraf_1.Telegraf(config_1.config.bot.token);
(0, database_1.loadDb)();
(0, commands_1.setupBot)(bot);
async function checkPrices() {
    console.log(`[${new Date().toISOString()}] Checking prices...`);
    const products = (0, database_1.getAllProducts)();
    for (const product of products) {
        try {
            let info;
            switch (product.platform) {
                case 'wildberries':
                    info = await (0, parsers_1.parseWildberries)(product.url);
                    break;
                case 'ozon':
                    info = await (0, parsers_1.parseOzon)(product.url);
                    break;
                case 'aliexpress':
                    info = await (0, parsers_1.parseAliExpress)(product.url);
                    break;
            }
            if (!info || !info.price || info.price >= product.currentPrice)
                continue;
            const oldPrice = product.currentPrice;
            (0, database_1.updateProductPrice)(product.id, info.price, info.currency);
            if (!product.lastNotifiedPrice || info.price < product.lastNotifiedPrice) {
                const msg = (0, formatters_1.formatPriceDrop)({ ...product, currentPrice: info.price }, oldPrice);
                await bot.telegram.sendMessage(product.chatId, msg, { parse_mode: 'Markdown' });
                (0, database_1.updateProductPrice)(product.id, info.price, info.currency);
                const p = (0, database_1.getAllProducts)().find((x) => x.id === product.id);
                if (p) {
                    p.lastNotifiedPrice = info.price;
                    (0, database_1.saveDb)();
                }
            }
        }
        catch (error) {
            console.error(`Error checking product ${product.id}:`, error);
        }
    }
}
const intervalMs = config_1.config.monitor.intervalMinutes * 60 * 1000;
console.log(`Price monitor every ${config_1.config.monitor.intervalMinutes} minutes`);
checkPrices();
setInterval(checkPrices, intervalMs);
bot.launch().then(() => console.log('PriceBot is running!'));
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
//# sourceMappingURL=index.js.map