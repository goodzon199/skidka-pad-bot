export function buildAffiliateLink(url: string, platform: string): string {
  switch (platform) {
    case 'wildberries':
      return `https://ad.wildberries.ru/click?url=${encodeURIComponent(url)}`;
    case 'ozon':
      return `https://ozon.by/partner/click?url=${encodeURIComponent(url)}`;
    case 'aliexpress':
      return url;
    default:
      return url;
  }
}
