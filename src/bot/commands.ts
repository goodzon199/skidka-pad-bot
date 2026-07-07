import { Telegraf, Context } from 'telegraf';
import { detectPlatform, parseWildberries, parseOzon, parseAliExpress } from '../api/parsers';
import { buildAffiliateLink } from '../api/affiliate';
import {
  TrackedProduct,
  getProducts,
  addProduct,
  removeProduct,
} from '../database';
import { formatProduct, formatTrackedProduct } from '../utils/formatters';
import { mainKeyboard } from './keyboards';

const userLinks = new Map<number, { url: string; platform: string }>();

export function setupBot(bot: Telegraf) {
  bot.start(async (ctx) => {
    const name = ctx.from?.first_name || 'Друг';
    await ctx.reply(
      `👋 Привет, ${name}!\n\n`
        + 'Я — *СкидкоПад* 🏷\n'
        + 'Просто *скинь ссылку* на товар с Wildberries, Ozon или AliExpress —\n'
        + 'я буду следить за ценой и уведомлю, когда она упадёт!\n\n'
        + '📌 *Команды:*\n'
        + '/track — отслеживать товар\n'
        + '/mytrack — мои товары\n'
        + '/untrack — удалить товар\n'
        + '/help — помощь',
      { parse_mode: 'Markdown', ...mainKeyboard },
    );
  });

  bot.command('help', async (ctx) => {
    await ctx.reply(
      '🏷 *СкидкоПад — Помощь*\n\n'
        + '📌 *Как работает:*\n'
        + '1. Скинь ссылку на товар с Wildberries, Ozon или AliExpress\n'
        + '2. Я определю цену и начну отслеживать\n'
        + '3. Когда цена упадёт — я пришлю уведомление\n\n'
        + '📋 *Мои товары:* /mytrack\n'
        + '❌ *Удалить:* /untrack\n\n'
        + '💰 Я использую партнёрские ссылки — это помогает проекту!',
      { parse_mode: 'Markdown' },
    );
  });

  bot.command('track', async (ctx) => {
    const cid = ctx.chat?.id;
    if (!cid) return;
    userLinks.set(cid, { url: '', platform: '' });
    await ctx.reply('📎 Отправьте ссылку на товар (Wildberries, Ozon, AliExpress):');
  });

  bot.command('mytrack', async (ctx) => {
    const cid = ctx.chat?.id;
    if (!cid) return;
    const products = getProducts(cid);
    if (products.length === 0) {
      await ctx.reply('📭 У вас нет отслеживаемых товаров.\nОтправьте ссылку на товар чтобы начать.');
      return;
    }
    const msg = products.map((p, i) => formatTrackedProduct(p, i)).join('\n\n');
    await ctx.reply(`📋 *Отслеживаемые товары:*\n\n${msg}`, { parse_mode: 'Markdown' });
  });

  bot.command('untrack', async (ctx) => {
    const cid = ctx.chat?.id;
    if (!cid) return;
    const products = getProducts(cid);
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
    if (!cid) return;
    const text = ctx.message.text.trim();
    const session = userLinks.get(cid);

    const urlPattern = /^(https?:\/\/)?([\w.-]+\.)?(wildberries|wb|ozon|aliexpress|alicdn)\S+/i;
    if (urlPattern.test(text)) {
      await handleUrl(ctx, text);
      return;
    }

    if (session?.url && !session?.platform.includes('untrack') && /^\d{3,}$/.test(text)) {
      const price = parseInt(text, 10);
      const platform = session.platform;
      const url = session.url;
      userLinks.delete(cid);
      const affiliateUrl = buildAffiliateLink(url, platform);
      const productId = `${platform}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const tracked: TrackedProduct = {
        id: productId,
        chatId: cid,
        url: affiliateUrl,
        platform: platform as 'wildberries' | 'ozon' | 'aliexpress',
        title: `Товар ${platform === 'wildberries' ? 'Wildberries' : platform === 'ozon' ? 'Ozon' : 'AliExpress'}`,
        currentPrice: price,
        originalPrice: price,
        currency: '₽',
        lastChecked: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      addProduct(tracked);
      await ctx.reply(
        `✅ *${price.toLocaleString('ru-RU')} ₽* — цена добавлена!\n`
          + '🔔 Буду проверять каждые 3 часа и уведомлю при снижении!',
        { parse_mode: 'Markdown' },
      );
      return;
    }

    if (session?.platform === 'untrack') {
      const index = parseInt(text, 10) - 1;
      const products = getProducts(cid);
      if (isNaN(index) || index < 0 || index >= products.length) {
        await ctx.reply('❌ Неверный номер. Попробуйте снова.');
        return;
      }
      removeProduct(cid, products[index].id);
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

async function handleUrl(ctx: Context, url: string) {
  const cid = ctx.chat?.id;
  if (!cid) return;
  const platform = detectPlatform(url);
  if (!platform) {
    await ctx.reply('❌ Поддерживаются только Wildberries, Ozon и AliExpress.');
    return;
  }

  console.log(`[handleUrl] platform=${platform} url=${url.slice(0, 100)}`);
  await ctx.reply('🔍 Получаю информацию о товаре...');

  let info;
  switch (platform) {
    case 'wildberries': info = await parseWildberries(url); break;
    case 'ozon': info = await parseOzon(url); break;
    case 'aliexpress': info = await parseAliExpress(url); break;
  }

  if (!info || !info.price) {
    userLinks.set(cid, { url, platform });
    await ctx.reply(
      '😔 Не удалось получить цену автоматически.\n'
        + '👉 Введите цену товара в рублях (только цифры):',
    );
    return;
  }

  const affiliateUrl = buildAffiliateLink(url, platform);
  const msg = formatProduct({ ...info, url: affiliateUrl });

  const productId = `${platform}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const tracked: TrackedProduct = {
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

  addProduct(tracked);

  await ctx.reply(msg, { parse_mode: 'Markdown' });
  await ctx.reply(
    `✅ *Цена ${info.price.toLocaleString('ru-RU')} ${info.currency}*\n`
      + '🔔 Я буду проверять каждые 3 часа и уведомлю при снижении!',
    { parse_mode: 'Markdown' },
  );
}
