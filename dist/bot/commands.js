"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupBot = setupBot;
const parsers_1 = require("../api/parsers");
const affiliate_1 = require("../api/affiliate");
const database_1 = require("../database");
const formatters_1 = require("../utils/formatters");
const keyboards_1 = require("./keyboards");
const userLinks = new Map();
function setupBot(bot) {
    bot.start(async (ctx) => {
        const name = ctx.from?.first_name || 'Друг';
        await ctx.reply(`👋 Привет, ${name}!\n\n`
            + 'Я — *ЦеноБот* 🏷\n'
            + 'Просто *скинь ссылку* на товар с Wildberries, Ozon или AliExpress —\n'
            + 'я буду следить за ценой и уведомлю, когда она упадёт!\n\n'
            + '📌 *Команды:*\n'
            + '/track — отслеживать товар\n'
            + '/mytrack — мои товары\n'
            + '/untrack — удалить товар\n'
            + '/help — помощь', { parse_mode: 'Markdown', ...keyboards_1.mainKeyboard });
    });
    bot.command('help', async (ctx) => {
        await ctx.reply('🏷 *ЦеноБот — Помощь*\n\n'
            + '📌 *Как работает:*\n'
            + '1. Скинь ссылку на товар с Wildberries, Ozon или AliExpress\n'
            + '2. Я определю цену и начну отслеживать\n'
            + '3. Когда цена упадёт — я пришлю уведомление\n\n'
            + '📋 *Мои товары:* /mytrack\n'
            + '❌ *Удалить:* /untrack\n\n'
            + '💰 Я использую партнёрские ссылки — это помогает проекту!', { parse_mode: 'Markdown' });
    });
    bot.command('track', async (ctx) => {
        const cid = ctx.chat?.id;
        if (!cid)
            return;
        userLinks.set(cid, { url: '', platform: '' });
        await ctx.reply('📎 Отправьте ссылку на товар (Wildberries, Ozon, AliExpress):');
    });
    bot.command('mytrack', async (ctx) => {
        const cid = ctx.chat?.id;
        if (!cid)
            return;
        const products = (0, database_1.getProducts)(cid);
        if (products.length === 0) {
            await ctx.reply('📭 У вас нет отслеживаемых товаров.\nОтправьте ссылку на товар чтобы начать.');
            return;
        }
        const msg = products.map((p, i) => (0, formatters_1.formatTrackedProduct)(p, i)).join('\n\n');
        await ctx.reply(`📋 *Отслеживаемые товары:*\n\n${msg}`, { parse_mode: 'Markdown' });
    });
    bot.command('untrack', async (ctx) => {
        const cid = ctx.chat?.id;
        if (!cid)
            return;
        const products = (0, database_1.getProducts)(cid);
        if (products.length === 0) {
            await ctx.reply('У вас нет отслеживаемых товаров.');
            return;
        }
        const msg = products.map((p, i) => `${i + 1}. ${p.title} — ${p.currentPrice} ${p.currency}`).join('\n');
        await ctx.reply(`❌ Введите *номер* товара для удаления:\n\n${msg}`, { parse_mode: 'Markdown' });
        userLinks.set(cid, { url: '', platform: 'untrack' });
    });
    bot.on('text', async (ctx) => {
        const cid = ctx.chat?.id;
        if (!cid)
            return;
        const text = ctx.message.text.trim();
        const session = userLinks.get(cid);
        const urlPattern = /^(https?:\/\/)?([\w.-]+\.)+(wildberries|wb|ozon|aliexpress|alicdn)\S+/i;
        if (urlPattern.test(text)) {
            await handleUrl(ctx, text);
            return;
        }
        if (session?.platform === 'untrack') {
            const index = parseInt(text, 10) - 1;
            const products = (0, database_1.getProducts)(cid);
            if (isNaN(index) || index < 0 || index >= products.length) {
                await ctx.reply('❌ Неверный номер. Попробуйте снова.');
                return;
            }
            (0, database_1.removeProduct)(cid, products[index].id);
            userLinks.delete(cid);
            await ctx.reply(`✅ Товар удалён из отслеживания.`);
            return;
        }
    });
    bot.hears('📋 Мои товары', async (ctx) => {
        await ctx.reply('/mytrack');
    });
    bot.hears('❌ Удалить товар', async (ctx) => {
        await ctx.reply('/untrack');
    });
}
async function handleUrl(ctx, url) {
    const cid = ctx.chat?.id;
    if (!cid)
        return;
    const platform = (0, parsers_1.detectPlatform)(url);
    if (!platform) {
        await ctx.reply('❌ Поддерживаются только Wildberries, Ozon и AliExpress.');
        return;
    }
    await ctx.reply('🔍 Получаю информацию о товаре...');
    let info;
    switch (platform) {
        case 'wildberries':
            info = await (0, parsers_1.parseWildberries)(url);
            break;
        case 'ozon':
            info = await (0, parsers_1.parseOzon)(url);
            break;
        case 'aliexpress':
            info = await (0, parsers_1.parseAliExpress)(url);
            break;
    }
    if (!info || !info.price) {
        await ctx.reply('😔 Не удалось получить цену. Возможно, ссылка неверная или товар недоступен.\n'
            + 'Попробуйте другую ссылку.');
        return;
    }
    const affiliateUrl = (0, affiliate_1.buildAffiliateLink)(url, platform);
    const msg = (0, formatters_1.formatProduct)({ ...info, url: affiliateUrl });
    const productId = `${platform}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const tracked = {
        id: productId,
        chatId: cid,
        url: affiliateUrl,
        platform,
        title: info.title,
        currentPrice: info.price,
        originalPrice: info.price,
        currency: info.currency,
        lastChecked: new Date().toISOString(),
        createdAt: new Date().toISOString(),
    };
    (0, database_1.addProduct)(tracked);
    await ctx.reply(msg, { parse_mode: 'Markdown' });
    await ctx.reply(`✅ *Цена ${info.price.toLocaleString('ru-RU')} ${info.currency}*\n`
        + '🔔 Я буду проверять каждые 3 часа и уведомлю при снижении!', { parse_mode: 'Markdown' });
}
//# sourceMappingURL=commands.js.map