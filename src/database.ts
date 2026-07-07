import fs from 'fs';
import path from 'path';
import { config } from './config';

export interface TrackedProduct {
  id: string;
  chatId: number;
  url: string;
  platform: 'wildberries' | 'ozon' | 'aliexpress';
  title: string;
  currentPrice: number;
  originalPrice: number;
  currency: string;
  lastChecked: string;
  createdAt: string;
  lastNotifiedPrice?: number;
}

interface DbData {
  products: TrackedProduct[];
}

let db: DbData = { products: [] };

function ensureDir() {
  const dir = path.dirname(config.db.path);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function loadDb() {
  ensureDir();
  if (fs.existsSync(config.db.path)) {
    try { db = JSON.parse(fs.readFileSync(config.db.path, 'utf-8')); }
    catch { db = { products: [] }; }
  }
}

export function saveDb() {
  ensureDir();
  fs.writeFileSync(config.db.path, JSON.stringify(db, null, 2), 'utf-8');
}

export function getProducts(chatId: number): TrackedProduct[] {
  return db.products.filter((p) => p.chatId === chatId);
}

export function addProduct(product: TrackedProduct) {
  db.products.push(product);
  saveDb();
}

export function removeProduct(chatId: number, productId: string) {
  db.products = db.products.filter((p) => !(p.chatId === chatId && p.id === productId));
  saveDb();
}

export function getAllProducts(): TrackedProduct[] {
  return db.products;
}

export function updateProductPrice(id: string, price: number, currency: string) {
  const p = db.products.find((x) => x.id === id);
  if (p) {
    p.currentPrice = price;
    p.currency = currency;
    p.lastChecked = new Date().toISOString();
    saveDb();
  }
}
