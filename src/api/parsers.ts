import axios from 'axios';

export interface ProductInfo {
  title: string;
  price: number;
  currency: string;
  platform: 'wildberries' | 'ozon' | 'aliexpress';
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36';

const api = axios.create({ timeout: 15000, headers: { 'User-Agent': UA }, maxRedirects: 5 });

async function fetchViaProxy(url: string): Promise<string | null> {
  for (const proxyUrl of [
    `https://r.jina.ai/${url}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  ]) {
    try {
      const { data } = await axios.get(proxyUrl, { timeout: 20000, headers: { 'User-Agent': UA, 'Accept': 'text/html,application/json,*/*' } });
      if (data && typeof data === 'string' && data.length > 100) return data;
      if (data && typeof data === 'object') return JSON.stringify(data);
    } catch { }
  }
  return null;
}

export async function parseWildberries(url: string): Promise<ProductInfo | null> {
  try {
    const match = url.match(/\/catalog\/(\d+)\//) || url.match(/\/product\/(\d+)/) || url.match(/(\d{8,})/);
    if (!match) return null;
    const id = match[1];

    for (const apiUrl of [
      `https://card.wb.ru/cards/v2/detail?appType=1&curr=rub&dest=-1257786&spp=30&nm=${id}`,
      `https://wbx-content-v2.wbstatic.net/ru/${id}.json`,
    ]) {
      try {
        const { data } = await api.get(apiUrl);
        const p = data?.data?.products?.[0] || data;
        const price = p?.sizes?.[0]?.price?.product || p?.price?.product || p?.priceU / 100 || p?.salePrice || p?.price;
        if (price) return { title: p?.name || p?.title || 'Товар Wildberries', price: Math.round(Number(price)), currency: '₽', platform: 'wildberries' };
      } catch { }
    }
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
        headers: { 'Accept': 'application/json', 'X-O3-Application-Name': 'ozonapp', 'User-Agent': UA },
      });
      if (data?.name) {
        const price = data?.priceInfo?.price || data?.price || data?.marketingPrice || data?.minPrice || data?.offer?.price;
        if (price) return { title: data.name, price: Math.round(Number(price)), currency: '₽', platform: 'ozon' };
      }
    } catch { }

    const html = await fetchViaProxy(url);
    if (html) {
      const titleMatch = html.match(/<title>([^<]+)<\/title>/) || html.match(/"name":"([^"]+)"/);
      const priceMatch = html.match(/"price"?:\s*"?(\d+)/) || html.match(/(\d[\d\s]*)\s*₽/);
      if (priceMatch) {
        return {
          title: titleMatch ? titleMatch[1].trim().replace(/<[^>]+>/g, '') : 'Товар Ozon',
          price: parseInt(priceMatch[1].replace(/\s/g, ''), 10),
          currency: '₽',
          platform: 'ozon',
        };
      }
    }
    return null;
  } catch { return null; }
}

export async function parseAliExpress(url: string): Promise<ProductInfo | null> {
  try {
    const html = await fetchViaProxy(url);
    if (html) {
      const titleMatch = html.match(/<title>([^<]+)<\/title>/) || html.match(/"subject":"([^"]+)"/);
      const priceMatch = html.match(/"price":\s*"?([\d.]+)/) || html.match(/"minPrice":\s*"?([\d.]+)/) || html.match(/(\d[\d\s]*)\s*(?:₽|руб)/);
      if (priceMatch) {
        return {
          title: titleMatch ? titleMatch[1].trim().replace(/\s*\|.*/, '').replace(/<[^>]+>/g, '') : 'Товар AliExpress',
          price: Math.round(parseFloat(priceMatch[1].replace(/\s/g, ''))),
          currency: '₽',
          platform: 'aliexpress',
        };
      }
    }
    return null;
  } catch { return null; }
}

export function detectPlatform(url: string): 'wildberries' | 'ozon' | 'aliexpress' | null {
  if (url.includes('wildberries') || url.includes('wb.ru')) return 'wildberries';
  if (url.includes('ozon') || url.includes('ozon.ru')) return 'ozon';
  if (url.includes('aliexpress') || url.includes('alicdn') || url.includes('aliexpress.ru')) return 'aliexpress';
  return null;
}
