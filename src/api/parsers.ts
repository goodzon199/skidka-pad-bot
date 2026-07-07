import axios from 'axios';

export interface ProductInfo {
  title: string;
  price: number;
  currency: string;
  platform: 'wildberries' | 'ozon' | 'aliexpress';
}

function extractPrice(text: string): number | null {
  const digits = text.replace(/[^\d]/g, '');
  return digits ? parseInt(digits, 10) : null;
}

export async function parseWildberries(url: string): Promise<ProductInfo | null> {
  try {
    const match = url.match(/\/catalog\/(\d+)\//) || url.match(/\/product\/(\d+)/);
    if (!match) return null;
    const id = match[1];
    const { data } = await axios.get(
      `https://card.wb.ru/cards/v2/detail?appType=1&curr=rub&dest=-1257786&spp=30&nm=${id}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 },
    );
    const product = data?.data?.products?.[0];
    if (!product) return null;
    const price = product.sizes?.[0]?.price?.product || product.price?.product || product.priceU / 100;
    return {
      title: product.name || 'Товар Wildberries',
      price: Math.round(price),
      currency: '₽',
      platform: 'wildberries',
    };
  } catch {
    return null;
  }
}

export async function parseOzon(url: string): Promise<ProductInfo | null> {
  try {
    const { data } = await axios.get(url, {
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
  } catch {
    return null;
  }
}

export async function parseAliExpress(url: string): Promise<ProductInfo | null> {
  try {
    const { data } = await axios.get(url, {
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
  } catch {
    return null;
  }
}

export function detectPlatform(url: string): 'wildberries' | 'ozon' | 'aliexpress' | null {
  if (url.includes('wildberries') || url.includes('wb.ru')) return 'wildberries';
  if (url.includes('ozon') || url.includes('ozon.ru')) return 'ozon';
  if (url.includes('aliexpress') || url.includes('alicdn')) return 'aliexpress';
  return null;
}
