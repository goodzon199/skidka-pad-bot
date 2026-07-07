import axios from 'axios';

export interface ProductInfo {
  title: string;
  price: number;
  currency: string;
  platform: 'wildberries' | 'ozon' | 'aliexpress';
}

export async function parseWildberries(url: string): Promise<ProductInfo | null> {
  try {
    const match = url.match(/\/catalog\/(\d+)\//) || url.match(/\/product\/(\d+)/) || url.match(/(\d{8,})/);
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
    const match = url.match(/[-\/](\d{7,12})(?:\/|$|\.html|\?)/) || url.match(/\/(\d{7,12})\b/);
    if (!match) return null;
    const id = match[1];

    const { data } = await axios.get(
      `https://www.ozon.ru/api/product/description/${id}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'X-O3-Application-Name': 'ozonapp',
        },
        timeout: 10000,
      },
    );

    if (data?.name) {
      let price = 0;
      const pricing = data?.price || data?.marketingPrice || data?.oldPrice || data?.minPrice;
      if (pricing) price = pricing;
      if (data?.priceInfo?.price) price = data.priceInfo.price;
      if (data?.offer?.price) price = data.offer.price;
      return {
        title: data.name || 'Товар Ozon',
        price: Math.round(price),
        currency: '₽',
        platform: 'ozon',
      };
    }

    const { data: html } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
      timeout: 10000,
    });

    const jsonMatch = html.match(/window\s*\.\s*__NUXT__\s*=\s*({.+?});/);
    if (jsonMatch) {
      try {
        const nuxt = JSON.parse(jsonMatch[1]);
        const state = nuxt?.state || nuxt?.store || nuxt;
        const price = findPriceInObject(state);
        if (price) {
          const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
          return {
            title: titleMatch ? titleMatch[1].trim() : 'Товар Ozon',
            price: Math.round(price),
            currency: '₽',
            platform: 'ozon',
          };
        }
      } catch { }
    }

    const priceMatch = html.match(/(\d[\d\s]*)\s*(?:₽|руб)/);
    if (priceMatch) {
      const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
      return {
        title: titleMatch ? titleMatch[1].trim() : 'Товар Ozon',
        price: parseInt(priceMatch[1].replace(/\s/g, ''), 10),
        currency: '₽',
        platform: 'ozon',
      };
    }

    return null;
  } catch {
    return null;
  }
}

function findPriceInObject(obj: any): number | null {
  if (!obj || typeof obj !== 'object') return null;
  for (const key of ['price', 'totalPrice', 'finalPrice', 'sellingPrice', 'marketingPrice']) {
    if (typeof obj[key] === 'number' && obj[key] > 0) return obj[key];
    if (typeof obj[key] === 'string' && /^\d+$/.test(obj[key])) return parseInt(obj[key], 10);
  }
  for (const val of Object.values(obj)) {
    const result = findPriceInObject(val);
    if (result) return result;
  }
  return null;
}

export async function parseAliExpress(url: string): Promise<ProductInfo | null> {
  try {
    const { data: html } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
      timeout: 10000,
    });

    const jsonMatch = html.match(/data: ({.*?})\s*,\s*\n/i) || html.match(/window\.runParams\s*=\s*({.+?});/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        const price = parsed?.price || parsed?.minPrice || parsed?.salePrice || parsed?.originalPrice;
        if (price) {
          const titleMatch = html.match(/<title>([^<]+)<\/title>/);
          return {
            title: titleMatch ? titleMatch[1].trim().replace(/\s*\|.*/, '') : 'Товар AliExpress',
            price: Math.round(parseFloat(price)),
            currency: '₽',
            platform: 'aliexpress',
          };
        }
      } catch { }
    }

    const priceMatch = html.match(/(\d[\d\s]*)\s*(?:₽|руб)/);
    if (priceMatch) {
      const titleMatch = html.match(/<title>([^<]+)<\/title>/);
      return {
        title: titleMatch ? titleMatch[1].trim().replace(/\s*\|.*/, '') : 'Товар AliExpress',
        price: parseInt(priceMatch[1].replace(/\s/g, ''), 10),
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
  if (url.includes('aliexpress') || url.includes('alicdn') || url.includes('aliexpress.ru')) return 'aliexpress';
  return null;
}
