"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatProduct = formatProduct;
exports.formatTrackedProduct = formatTrackedProduct;
exports.formatPriceDrop = formatPriceDrop;
const PLATFORM_ICONS = {
    wildberries: '🟣',
    ozon: '🔵',
    aliexpress: '🔴',
};
function formatProduct(product) {
    const icon = PLATFORM_ICONS[product.platform] || '🛍';
    return [
        `${icon} *${product.title}*`,
        `💵 *${product.price.toLocaleString('ru-RU')} ${product.currency}*`,
        `[🛒 Перейти](${product.url})`,
    ].join('\n');
}
function formatTrackedProduct(p, index) {
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
function formatPriceDrop(product, oldPrice) {
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
//# sourceMappingURL=formatters.js.map