"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseWildberries = parseWildberries;
exports.parseOzon = parseOzon;
exports.parseAliExpress = parseAliExpress;
exports.detectPlatform = detectPlatform;
const axios_1 = __importDefault(require("axios"));
function extractPrice(text) {
    const digits = text.replace(/[^\d]/g, '');
    return digits ? parseInt(digits, 10) : null;
}
async function parseWildberries(url) {
    try {
        const match = url.match(/\/catalog\/(\d+)\//) || url.match(/\/product\/(\d+)/);
        if (!match)
            return null;
        const id = match[1];
        const { data } = await axios_1.default.get(`https://card.wb.ru/cards/v2/detail?appType=1&curr=rub&dest=-1257786&spp=30&nm=${id}`, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 });
        const product = data?.data?.products?.[0];
        if (!product)
            return null;
        const price = product.sizes?.[0]?.price?.product || product.price?.product || product.priceU / 100;
        return {
            title: product.name || 'Товар Wildberries',
            price: Math.round(price),
            currency: '₽',
            platform: 'wildberries',
        };
    }
    catch {
        return null;
    }
}
async function parseOzon(url) {
    try {
        const { data } = await axios_1.default.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html',
            },
            timeout: 10000,
        });
        const titleMatch = data.match(/<h1[^>]*>([^<]+)<\/h1>/);
        const priceMatch = data.match(/"price":\s*"?(\d+)/);
        if (priceMatch) {
            return {
                title: titleMatch ? titleMatch[1].trim() : 'Товар Ozon',
                price: parseInt(priceMatch[1], 10),
                currency: '₽',
                platform: 'ozon',
            };
        }
        const metaPrice = data.match(/(\d[\d\s]*)\s*₽/);
        if (metaPrice) {
            return {
                title: titleMatch ? titleMatch[1].trim() : 'Товар Ozon',
                price: extractPrice(metaPrice[1]) || 0,
                currency: '₽',
                platform: 'ozon',
            };
        }
        return null;
    }
    catch {
        return null;
    }
}
async function parseAliExpress(url) {
    try {
        const { data } = await axios_1.default.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html',
            },
            timeout: 10000,
        });
        const titleMatch = data.match(/<title>([^<]+)<\/title>/);
        const priceMatch = data.match(/"(?:price|minPrice|salePrice)["\s:]+(\d+\.?\d*)/);
        if (priceMatch) {
            return {
                title: titleMatch ? titleMatch[1].trim().replace(' | AliExpress', '') : 'Товар AliExpress',
                price: Math.round(parseFloat(priceMatch[1])),
                currency: '₽',
                platform: 'aliexpress',
            };
        }
        const rubMatch = data.match(/(\d[\d\s]*)\s*(?:руб|₽)/);
        if (rubMatch) {
            return {
                title: titleMatch ? titleMatch[1].trim().replace(' | AliExpress', '') : 'Товар AliExpress',
                price: extractPrice(rubMatch[1]) || 0,
                currency: '₽',
                platform: 'aliexpress',
            };
        }
        return null;
    }
    catch {
        return null;
    }
}
function detectPlatform(url) {
    if (url.includes('wildberries') || url.includes('wb.ru'))
        return 'wildberries';
    if (url.includes('ozon') || url.includes('ozon.ru'))
        return 'ozon';
    if (url.includes('aliexpress') || url.includes('alicdn'))
        return 'aliexpress';
    return null;
}
//# sourceMappingURL=parsers.js.map