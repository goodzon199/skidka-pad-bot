import { Telegraf } from 'telegraf';
import { config } from './config';
import { loadDb, getAllProducts, updateProductPrice, saveDb } from './database';
import { setupBot } from './bot/commands';
import { parseWildberries, parseOzon, parseAliExpress } from './api/parsers';
import { formatPriceDrop } from './utils/formatters';

const bot = new Telegraf(config.bot.token);

loadDb();
setupBot(bot);

async function checkPrices() {
  console.log(`[${new Date().toISOString()}] Checking prices...`);
  const products = getAllProducts();

  for (const product of products) {
    try {
      let info;
      switch (product.platform) {
        case 'wildberries': info = await parseWildberries(product.url); break;
        case 'ozon': info = await parseOzon(product.url); break;
        case 'aliexpress': info = await parseAliExpress(product.url); break;
      }

      if (!info || !info.price || info.price >= product.currentPrice) continue;

      const oldPrice = product.currentPrice;
      updateProductPrice(product.id, info.price, info.currency);

      if (!product.lastNotifiedPrice || info.price < product.lastNotifiedPrice) {
        const msg = formatPriceDrop({ ...product, currentPrice: info.price }, oldPrice);
        await bot.telegram.sendMessage(product.chatId, msg, { parse_mode: 'Markdown' });
        updateProductPrice(product.id, info.price, info.currency);
        const p = getAllProducts().find((x) => x.id === product.id);
        if (p) {
          p.lastNotifiedPrice = info.price;
          saveDb();
        }
      }
    } catch (error) {
      console.error(`Error checking product ${product.id}:`, error);
    }
  }
}

const intervalMs = config.monitor.intervalMinutes * 60 * 1000;
console.log(`Price monitor every ${config.monitor.intervalMinutes} minutes`);
checkPrices();
setInterval(checkPrices, intervalMs);

bot.launch().then(() => console.log('СкидкоПад is running!'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
