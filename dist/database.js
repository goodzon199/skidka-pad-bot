"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadDb = loadDb;
exports.saveDb = saveDb;
exports.getProducts = getProducts;
exports.addProduct = addProduct;
exports.removeProduct = removeProduct;
exports.getAllProducts = getAllProducts;
exports.updateProductPrice = updateProductPrice;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_1 = require("./config");
let db = { products: [] };
function ensureDir() {
    const dir = path_1.default.dirname(config_1.config.db.path);
    if (!fs_1.default.existsSync(dir))
        fs_1.default.mkdirSync(dir, { recursive: true });
}
function loadDb() {
    ensureDir();
    if (fs_1.default.existsSync(config_1.config.db.path)) {
        try {
            db = JSON.parse(fs_1.default.readFileSync(config_1.config.db.path, 'utf-8'));
        }
        catch {
            db = { products: [] };
        }
    }
}
function saveDb() {
    ensureDir();
    fs_1.default.writeFileSync(config_1.config.db.path, JSON.stringify(db, null, 2), 'utf-8');
}
function getProducts(chatId) {
    return db.products.filter((p) => p.chatId === chatId);
}
function addProduct(product) {
    db.products.push(product);
    saveDb();
}
function removeProduct(chatId, productId) {
    db.products = db.products.filter((p) => !(p.chatId === chatId && p.id === productId));
    saveDb();
}
function getAllProducts() {
    return db.products;
}
function updateProductPrice(id, price, currency) {
    const p = db.products.find((x) => x.id === id);
    if (p) {
        p.currentPrice = price;
        p.currency = currency;
        p.lastChecked = new Date().toISOString();
        saveDb();
    }
}
//# sourceMappingURL=database.js.map