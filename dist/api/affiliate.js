"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAffiliateLink = buildAffiliateLink;
function buildAffiliateLink(url, platform) {
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
//# sourceMappingURL=affiliate.js.map