const Parser = require('rss-parser');

const parser = new Parser({
  timeout: 12000,
  headers: {
    'User-Agent': 'TechminNews/1.0 (+https://techmin.example)',
    Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml'
  },
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: true }],
      ['media:thumbnail', 'mediaThumbnail', { keepArray: true }],
      ['content:encoded', 'contentEncoded'],
      ['dc:creator', 'creator']
    ]
  }
});

const FEEDS = [
  { name: 'TechCabal', url: 'https://techcabal.com/feed/', region: 'Africa', priority: 10 },
  { name: 'Techpoint Africa', url: 'https://techpoint.africa/feed/', region: 'Africa', priority: 9 },
  { name: 'Disrupt Africa', url: 'https://disruptafrica.com/feed/', region: 'Africa', priority: 9 },
  { name: 'Rest of World', url: 'https://restofworld.org/feed/', region: 'Global', priority: 8 },
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', region: 'Global', priority: 8 },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', region: 'Global', priority: 7 }
];

const AFRICA_TERMS = /\b(africa|african|nigeria|nigerian|kenya|kenyan|ghana|ghanaian|south africa|egypt|egyptian|rwanda|rwandan|ethiopia|ethiopian|uganda|ugandan|tanzania|tanzanian|senegal|senegalese|morocco|moroccan|lagos|nairobi|cape town|johannesburg|accra|kigali|fintech africa)\b/i;

function stripHtml(value = '') {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function imageFromHtml(html = '') {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : '';
}

function getImage(item) {
  const candidates = [
    item.enclosure?.url,
    item.mediaContent?.[0]?.$?.url,
    item.mediaThumbnail?.[0]?.$?.url,
    imageFromHtml(item.contentEncoded || ''),
    imageFromHtml(item.content || ''),
    imageFromHtml(item.summary || '')
  ];
  return candidates.find((value) => /^https?:\/\//i.test(value || '')) || '';
}

function getCategory(text) {
  if (/\b(ai|artificial intelligence|machine learning|llm|chatgpt|gemini|copilot|deepseek)\b/i.test(text)) return 'AI';
  if (/\b(cyber|security|breach|ransomware|malware|privacy|hack)\b/i.test(text)) return 'Cybersecurity';
  if (/\b(startup|funding|fundraise|venture capital|seed round|series [a-f]|founder)\b/i.test(text)) return 'Startups';
  if (/\b(policy|regulation|regulator|government|law|antitrust|tax|ban)\b/i.test(text)) return 'Policy';
  if (/\b(phone|laptop|device|hardware|gadget|chip|semiconductor|smartphone)\b/i.test(text)) return 'Gadgets';
  if (/\b(developer|software|programming|javascript|python|open source|github|cloud)\b/i.test(text)) return 'Development';
  if (/\b(fintech|bank|payments|crypto|blockchain|mobile money)\b/i.test(text)) return 'Fintech';
  return 'Technology';
}

function normalise(item, feed) {
  const title = stripHtml(item.title || '');
  const rawDescription = item.contentSnippet || item.summary || item.content || item.contentEncoded || '';
  const description = stripHtml(rawDescription).slice(0, 240);
  const text = `${title} ${description} ${(item.categories || []).join(' ')}`;
  const publishedAt = new Date(item.isoDate || item.pubDate || item.published || Date.now());
  const region = feed.region === 'Africa' || AFRICA_TERMS.test(text) ? 'Africa' : 'Global';
  const ageHours = Math.max(0, (Date.now() - publishedAt.getTime()) / 36e5);
  const freshness = Math.max(0, 72 - ageHours);
  const africaBoost = region === 'Africa' ? 18 : 0;
  const categoryBoost = /\b(ai|funding|cyber|startup|fintech)\b/i.test(text) ? 7 : 0;

  return {
    id: Buffer.from(`${feed.name}|${item.link || title}`).toString('base64url').slice(0, 32),
    title,
    description: description ? `${description}${description.length >= 240 ? '…' : ''}` : 'Open the original report for the complete story.',
    url: item.link || item.guid || '',
    image: getImage(item),
    source: feed.name,
    author: stripHtml(item.creator || item.author || ''),
    publishedAt: Number.isNaN(publishedAt.getTime()) ? new Date().toISOString() : publishedAt.toISOString(),
    region,
    category: getCategory(text),
    trendingScore: Math.round(freshness + africaBoost + categoryBoost + feed.priority)
  };
}

async function fetchFeed(feed) {
  try {
    const result = await parser.parseURL(feed.url);
    return (result.items || []).slice(0, 20).map((item) => normalise(item, feed));
  } catch (error) {
    console.error(`News feed failed: ${feed.name}`, error.message);
    return [];
  }
}

async function getNews() {
  const groups = await Promise.all(FEEDS.map(fetchFeed));
  const seen = new Set();
  const articles = groups
    .flat()
    .filter((article) => article.title && /^https?:\/\//i.test(article.url))
    .filter((article) => {
      const key = article.url.replace(/[?#].*$/, '').replace(/\/$/, '').toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  return {
    updatedAt: new Date().toISOString(),
    articles,
    sources: FEEDS.map(({ name, region }) => ({ name, region })),
    unavailableSources: FEEDS.length - groups.filter((group) => group.length).length
  };
}

module.exports = { getNews };
