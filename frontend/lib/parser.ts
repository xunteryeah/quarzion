export type ParserBrand = {
  id: string;
  name: string;
  canonicalName: string;
  isPrimary: number;
  aliases: string[];
};

export type ParsedMention = {
  brandId: string;
  position: number;
  mentionCount: number;
  sentimentScore: number;
  isPrimary: boolean;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sentimentAround(text: string, offset: number) {
  const context = text.slice(Math.max(0, offset - 120), offset + 180).toLowerCase();
  const positive = ["推荐", "领先", "优秀", "经典", "保值", "可靠", "值得", "稀缺", "精湛", "透明", "稳定", "专业", "positive", "recommended"];
  const negative = ["昂贵", "风险", "不足", "争议", "不推荐", "溢价", "缺点", "不稳定", "错误", "负面", "negative", "avoid"];
  const count = (word: string) => context.split(word.toLowerCase()).length - 1;
  const positiveCount = positive.reduce((sum, word) => sum + count(word), 0);
  const negativeCount = negative.reduce((sum, word) => sum + count(word), 0);
  const score = 50 + positiveCount * 8 - negativeCount * 10;
  return Math.max(0, Math.min(100, score));
}

export function parseBrandMentions(text: string, brands: ParserBrand[]) {
  const detected = brands.flatMap((brand) => {
    const terms = [...new Set([brand.name, brand.canonicalName, ...brand.aliases].map((term) => term?.trim()).filter(Boolean))].sort((left, right) => right.length - left.length);
    const rawMatches = terms.flatMap((term) => [...text.matchAll(new RegExp(escapeRegExp(term), "giu"))].map((match) => ({ offset: match.index ?? 0, length: term.length })));
    const matches = rawMatches.sort((left, right) => left.offset - right.offset || right.length - left.length).filter((match, index, all) => !all.slice(0, index).some((previous) => match.offset >= previous.offset && match.offset < previous.offset + previous.length));
    if (!matches.length) return [];
    const first = Math.min(...matches.map((match) => match.offset));
    return [{ brand, first, mentionCount: matches.length, sentimentScore: sentimentAround(text, first) }];
  }).sort((a, b) => a.first - b.first);

  return detected.map<ParsedMention>((item, index) => ({
    brandId: item.brand.id,
    position: index + 1,
    mentionCount: item.mentionCount,
    sentimentScore: item.sentimentScore,
    isPrimary: Boolean(item.brand.isPrimary),
  }));
}

export function extractUrls(text: string) {
  const matches = text.match(/https?:\/\/[^\s\])}>，。；;]+/g) ?? [];
  return [...new Set(matches)];
}

export function inferSourceType(domain: string) {
  if (domain.includes("official")) return "品牌官网";
  if (domain.includes("weixin") || domain.includes("sina") || domain.includes("hodinkee")) return "行业媒体";
  if (domain.includes("baike") || domain.includes("wikipedia")) return "百科";
  return "第三方媒体";
}
