import { TrackedProduct } from '../database';

const PLATFORM_ICONS: Record<string, string> = {
  wildberries: '🟣',
  ozon: '🔵',
  aliexpress: '🔴',
};

export function formatProduct(product: { title: string; price: number; currency: string; platform: string; url: string }): string {
  const icon = PLATFORM_ICONS[product.platform] || '🛍';
  return [
    `${icon} *${product.title}*`,
    `💵 *${product.price.toLocaleString('ru-RU')} ${product.currency}*`,
    `[🛒 Перейти](${product.url})`,
  ].join('\n');
}

export function formatTrackedProduct(p: TrackedProduct, index: number): string {
  const icon = PLATFORM_ICONS[p.platform] || '🛍';
  const drop = p.originalPrice - p.currentPrice;
  const dropPercent = Math.round((drop / p.originalPrice) * 100);
  return [
    `*${index + 1}.* ${icon} ${p.title}`,
    `💰 Было: *${p.originalPrice.toLocaleString('ru-RU')} ${p.currency}*`,
    `🏷 Стало: *${p.currentPrice.toLocaleString('ru-RU')} ${p.currency}*${drop > 0 ? ` (📉 -${dropPercent}%)` : ''}`,
    `[🔗 Смотреть](${p.url})`,
  ].join('\n');
}

export function formatPriceDrop(product: TrackedProduct, oldPrice: number): string {
  const icon = PLATFORM_ICONS[product.platform] || '🛍';
  const drop = oldPrice - product.currentPrice;
  const dropPercent = Math.round((drop / oldPrice) * 100);
  return [
    `📉 *Цена снизилась!*`,
    `${icon} ${product.title}`,
    `📉 *${oldPrice.toLocaleString('ru-RU')} ${product.currency}* → *${product.currentPrice.toLocaleString('ru-RU')} ${product.currency}* (🔥 -${dropPercent}%)`,
    `📦 Экономия: *${drop.toLocaleString('ru-RU')} ${product.currency}*`,
    ``,
    `[🛒 Купить по новой цене](${product.url})`,
  ].join('\n');
}
