import axios from 'axios';

export interface ProductInfo {
  title: string;
  price: number;
  originalPrice?: number;
  currency: string;
  platform: 'wildberries' | 'ozon' | 'aliexpress';
}

const api = axios.create({ timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0' } });

export async function parseWildberries(url: string): Promise<ProductInfo | null> {
  try {
    const match = url.match(/\/catalog\/(\d+)\//) || url.match(/\/product\/(\d+)/) || url.match(/(\d{8,})/);
    if (!match) return null;
    const id = match[1];

    const { data } = await api.get(`https://card.wb.ru/cards/v2/detail?appType=1&curr=rub&dest=-1257786&spp=30&nm=${id}`);
    const p = data?.data?.products?.[0];
    if (!p) return null;

    const price = p.sizes?.[0]?.price?.product || p.price?.product || Math.round(p.priceU / 100);
    const originalPrice = p.sizes?.[0]?.price?.basic || p.price?.basic || price;

    return {
      title: p.name || 'Товар Wildberries',
      price: Math.round(price),
      originalPrice: Math.round(originalPrice),
      currency: '₽',
      platform: 'wildberries',
    };
  } catch { return null; }
}

export async function parseOzon(_url: string): Promise<ProductInfo | null> {
  return null;
}

export async function parseAliExpress(_url: string): Promise<ProductInfo | null> {
  return null;
}

export function detectPlatform(url: string): 'wildberries' | 'ozon' | 'aliexpress' | null {
  if (url.includes('wildberries') || url.includes('wb.ru')) return 'wildberries';
  if (url.includes('ozon') || url.includes('ozon.ru')) return 'ozon';
  if (url.includes('aliexpress') || url.includes('alicdn')) return 'aliexpress';
  return null;
}
