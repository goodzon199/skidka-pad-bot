import axios from 'axios';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36';

const api = axios.create({
  timeout: 15000,
  headers: { 'User-Agent': UA },
  maxRedirects: 5,
});

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

    for (const apiUrl of [
      `https://card.wb.ru/cards/v2/detail?appType=1&curr=rub&dest=-1257786&spp=30&nm=${id}`,
      `https://wbx-content-v2.wbstatic.net/ru/${id}.json`,
      `https://basket-01.wb.ru/vol${id.slice(0, 4)}/part${id.slice(0, 6)}/${id}/info/ru/card.json`,
    ]) {
      try {
        const { data } = await api.get(apiUrl);
        const product = data?.data?.products?.[0] || data;
        if (!product) continue;
        const price = product.sizes?.[0]?.price?.product || product.price?.product || product.priceU / 100 || product.salePrice || product.price;
        if (price) {
          return {
            title: product.name || product.title || 'Товар Wildberries',
            price: Math.round(Number(price)),
            currency: '₽',
            platform: 'wildberries',
          };
        }
      } catch { }
    }

    try {
      const { data: html } = await api.get(url, { headers: { 'Accept': 'text/html' } });
      const jsonLd = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>({.+?})<\/script>/s);
      if (jsonLd) {
        const parsed = JSON.parse(jsonLd[1]);
        const price = parsed?.offers?.price || parsed?.offers?.[0]?.price;
        if (price) {
          return { title: parsed?.name || 'Товар Wildberries', price: Math.round(Number(price)), currency: '₽', platform: 'wildberries' };
        }
      }
    } catch { }

    return null;
  } catch { return null; }
}

export async function parseOzon(url: string): Promise<ProductInfo | null> {
  try {
    const match = url.match(/[-\/](\d{7,12})(?:\/|$|\.html|\?)/) || url.match(/\/(\d{7,12})\b/);
    if (!match) return null;
    const id = match[1];

    try {
      const { data } = await api.get(`https://www.ozon.ru/api/product/description/${id}`, {
        headers: {
          'Accept': 'application/json',
          'X-O3-Application-Name': 'ozonapp',
          'User-Agent': UA,
        },
      });
      if (data?.name) {
        const price = data?.priceInfo?.price || data?.price || data?.marketingPrice || data?.oldPrice || data?.minPrice || data?.offer?.price;
        if (price) {
          return { title: data.name, price: Math.round(Number(price)), currency: '₽', platform: 'ozon' };
        }
      }
    } catch { }

    try {
      const { data: html } = await api.get(url, {
        headers: { 'Accept': 'text/html, */*' },
      });

      const jsonLd = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>({.+?})<\/script>/s);
      if (jsonLd) {
        try {
          const parsed = JSON.parse(jsonLd[1]);
          const price = parsed?.offers?.price || parsed?.offers?.[0]?.price;
          if (price) {
            const title = parsed?.name || 'Товар Ozon';
            return { title, price: Math.round(Number(price)), currency: '₽', platform: 'ozon' };
          }
        } catch { }
      }

      const priceMeta = html.match(/"price":"?(\d+)/) || html.match(/(\d[\d\s]*)\s*₽/);
      if (priceMeta) {
        const titleMatch = html.match(/<title>([^<]+)<\/title>/) || html.match(/<h1[^>]*>([^<]+)<\/h1>/);
        return {
          title: titleMatch ? titleMatch[1].trim() : 'Товар Ozon',
          price: parseInt(priceMeta[1].replace(/\s/g, ''), 10),
          currency: '₽',
          platform: 'ozon',
        };
      }
    } catch { }

    return null;
  } catch { return null; }
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
