import dotenv from 'dotenv';
dotenv.config();

export const config = {
  bot: { token: process.env.BOT_TOKEN || '' },
  db: { path: process.env.DB_PATH || './data/products.json' },
  monitor: {
    intervalMinutes: parseInt(process.env.MONITOR_INTERVAL_MINUTES || '180', 10),
  },
};

if (!config.bot.token) {
  console.error('BOT_TOKEN is required');
  process.exit(1);
}
