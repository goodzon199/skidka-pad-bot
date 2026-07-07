import { Markup } from 'telegraf';

export const mainKeyboard = Markup.keyboard([
  ['📋 Мои товары', '❌ Удалить товар'],
  ['❓ Помощь'],
]).resize();
