import * as cheerio from 'cheerio';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════
export interface ParsedPage {
  url: string;
  title: string;
  metaDescription: string;
  headings: string[];
  bodyText: string;
  headerText: string; // Text from header/nav area before stripping
  navLinks: { text: string; href: string }[];
  imageAlts: string[];
  slogan: string | null;
  sloganLocation: string | null; // 'header' | 'hero' | 'meta' | 'schema' | 'body'
  schemaData: string[]; // JSON-LD structured data descriptions
}

export interface ScrapedSite {
  homepage: ParsedPage | null;
  subpages: ParsedPage[];
  errors: string[];
}

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const MAX_RESPONSE_BYTES = 1_000_000; // 1MB cap

// ═══════════════════════════════════════════════════════════
// FETCH PAGE
// ═══════════════════════════════════════════════════════════
async function fetchPage(url: string, timeoutMs = 8000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      throw new Error(`Non-HTML content type: ${contentType}`);
    }

    // Read with size cap
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_RESPONSE_BYTES) {
        chunks.push(value.slice(0, MAX_RESPONSE_BYTES - (totalBytes - value.byteLength)));
        reader.cancel();
        break;
      }
      chunks.push(value);
    }

    const decoder = new TextDecoder('utf-8', { fatal: false });
    return decoder.decode(Buffer.concat(chunks));
  } finally {
    clearTimeout(timer);
  }
}

// ═══════════════════════════════════════════════════════════
// PARSE PAGE
// ═══════════════════════════════════════════════════════════
function parsePage(html: string, url: string): ParsedPage {
  const $ = cheerio.load(html);

  // Title
  const title = $('title').first().text().trim();

  // Meta description
  const metaDescription = $('meta[name="description"]').attr('content')?.trim() || '';

  // Headings (h1-h3, first 30)
  const headings: string[] = [];
  $('h1, h2, h3').each((i, el) => {
    if (headings.length >= 30) return false;
    const text = $(el).text().trim().replace(/\s+/g, ' ');
    if (text) headings.push(text);
  });

  // Extract header/nav text BEFORE stripping (captures taglines, slogans in header)
  let headerText = '';
  $('header, nav, .header, .top-bar, .site-header').each((i, el) => {
    headerText += ' ' + $(el).text();
  });
  headerText = headerText.replace(/\s+/g, ' ').trim().slice(0, 500);

  // Extract JSON-LD structured data (schema.org) — often contains firm descriptions, slogans
  const schemaData: string[] = [];
  $('script[type="application/ld+json"]').each((i, el) => {
    try {
      const raw = $(el).html();
      if (!raw) return;
      const parsed = JSON.parse(raw);
      // Extract description fields from schema
      const extractDescriptions = (obj: any, depth = 0): void => {
        if (depth > 3 || !obj) return;
        if (typeof obj === 'object') {
          if (obj.description && typeof obj.description === 'string') {
            schemaData.push(obj.description.trim());
          }
          if (obj.slogan && typeof obj.slogan === 'string') {
            schemaData.push(obj.slogan.trim());
          }
          if (obj.name && typeof obj.name === 'string' && obj['@type']) {
            schemaData.push(`${obj['@type']}: ${obj.name}`);
          }
          for (const val of Object.values(obj)) {
            if (typeof val === 'object') extractDescriptions(val, depth + 1);
          }
        }
      };
      if (Array.isArray(parsed)) {
        parsed.forEach(item => extractDescriptions(item));
      } else {
        extractDescriptions(parsed);
      }
    } catch {
      // skip invalid JSON-LD
    }
  });

  // Body text — strip script/style/nav/footer, collapse whitespace
  $('script, style, nav, footer, header, noscript, iframe, svg').remove();
  let bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  bodyText = bodyText.slice(0, 3000);

  // Nav links (text + href, resolved to absolute, limit 30)
  const navLinks: { text: string; href: string }[] = [];
  const baseUrl = new URL(url);
  $('a[href]').each((i, el) => {
    if (navLinks.length >= 30) return false;
    const href = $(el).attr('href');
    const text = $(el).text().trim().replace(/\s+/g, ' ');
    if (!href || !text) return;
    try {
      const resolved = new URL(href, url).toString();
      navLinks.push({ text, href: resolved });
    } catch {
      // skip invalid URLs
    }
  });

  // Image alt texts (limit 20)
  const imageAlts: string[] = [];
  $('img[alt]').each((i, el) => {
    if (imageAlts.length >= 20) return false;
    const alt = $(el).attr('alt')?.trim();
    if (alt) imageAlts.push(alt);
  });

  // Slogan / tagline extraction — check prominent locations
  let slogan: string | null = null;
  let sloganLocation: string | null = null;

  // Reload HTML for slogan extraction (we stripped header/nav earlier for bodyText)
  const $full = cheerio.load(html);

  // Priority 1: Header area (tagline, slogan, subtitle classes in header/nav)
  const headerSelectors = [
    'header .tagline', 'header .slogan', 'header .subtitle', 'header .motto',
    '.header-tagline', '.header-slogan', '.site-tagline', '.site-slogan',
    'header p', '.top-bar p', '.header-tag',
  ];
  for (const sel of headerSelectors) {
    const text = $full(sel).first().text().trim().replace(/\s+/g, ' ');
    if (text && text.length > 5 && text.length < 150) {
      slogan = text;
      sloganLocation = 'header';
      break;
    }
  }

  // Priority 2: Hero area (h2 after h1, .hero p, .hero-subtitle)
  if (!slogan) {
    const heroSelectors = [
      '.hero .subtitle', '.hero-subtitle', '.hero-tagline', '.hero-slogan',
      '.hero h2', '.banner h2', '.hero p:first-of-type',
    ];
    for (const sel of heroSelectors) {
      const text = $full(sel).first().text().trim().replace(/\s+/g, ' ');
      if (text && text.length > 5 && text.length < 200) {
        slogan = text;
        sloganLocation = 'hero';
        break;
      }
    }
  }

  // Priority 3: JSON-LD schema data — often contains explicit slogans/descriptions
  if (!slogan) {
    for (const desc of schemaData) {
      // Look for short, slogan-like descriptions
      if (desc.length > 5 && desc.length < 120 && !desc.startsWith('{')) {
        slogan = desc;
        sloganLocation = 'schema';
        break;
      }
    }
  }

  // Priority 4: og:description or meta description if short enough to be a slogan
  if (!slogan) {
    const ogDesc = $full('meta[property="og:description"]').attr('content')?.trim() || '';
    if (ogDesc && ogDesc.length > 5 && ogDesc.length < 120) {
      slogan = ogDesc;
      sloganLocation = 'meta';
    }
  }

  return { url, title, metaDescription, headings, bodyText, headerText, navLinks, imageAlts, slogan, sloganLocation, schemaData };
}

// ═══════════════════════════════════════════════════════════
// DISCOVER SUBPAGES
// ═══════════════════════════════════════════════════════════
const PRIORITY_KEYWORDS = [
  'about', 'team', 'attorneys', 'lawyers', 'people',
  'practice', 'services', 'expertise', 'professionals', 'our-firm',
];

function discoverSubpages(homepage: ParsedPage, baseUrl: string): string[] {
  const base = new URL(baseUrl);
  const candidates: { url: string; priority: number }[] = [];
  const seen = new Set<string>();

  for (const link of homepage.navLinks) {
    try {
      const linkUrl = new URL(link.href);
      // Same domain only
      if (linkUrl.hostname !== base.hostname) continue;
      // Skip homepage itself
      if (linkUrl.pathname === '/' || linkUrl.pathname === '') continue;
      // Skip anchors, files, etc.
      if (linkUrl.pathname.match(/\.(pdf|jpg|png|gif|svg|css|js|zip)$/i)) continue;

      const normalized = linkUrl.origin + linkUrl.pathname.replace(/\/$/, '');
      if (seen.has(normalized)) continue;
      seen.add(normalized);

      // Score by keyword match
      const pathAndText = (linkUrl.pathname + ' ' + link.text).toLowerCase();
      let priority = 0;
      for (const keyword of PRIORITY_KEYWORDS) {
        if (pathAndText.includes(keyword)) {
          priority += 1;
        }
      }

      if (priority > 0) {
        candidates.push({ url: normalized, priority });
      }
    } catch {
      // skip invalid URLs
    }
  }

  // Sort by priority descending, return top 3
  candidates.sort((a, b) => b.priority - a.priority);
  return candidates.slice(0, 3).map(c => c.url);
}

// ═══════════════════════════════════════════════════════════
// SCRAPE SITE (Orchestrator)
// ═══════════════════════════════════════════════════════════
export async function scrapeSite(url: string): Promise<ScrapedSite> {
  const errors: string[] = [];
  let homepage: ParsedPage | null = null;

  // 1. Fetch + parse homepage
  try {
    const html = await fetchPage(url);
    homepage = parsePage(html, url);
  } catch (err: any) {
    errors.push(`Homepage fetch failed: ${err.message}`);
    return { homepage: null, subpages: [], errors };
  }

  // 2. Discover subpage URLs
  const subpageUrls = discoverSubpages(homepage, url);

  // 3. Fetch subpages in parallel
  const subpageResults = await Promise.allSettled(
    subpageUrls.map(async (subUrl) => {
      const html = await fetchPage(subUrl, 6000);
      return parsePage(html, subUrl);
    })
  );

  const subpages: ParsedPage[] = [];
  for (const result of subpageResults) {
    if (result.status === 'fulfilled') {
      subpages.push(result.value);
    } else {
      errors.push(`Subpage fetch failed: ${result.reason?.message || 'Unknown error'}`);
    }
  }

  return { homepage, subpages, errors };
}

// ═══════════════════════════════════════════════════════════
// BUILD CONTENT SUMMARY
// ═══════════════════════════════════════════════════════════
function formatPageSection(page: ParsedPage, label: string): string {
  const parts: string[] = [`=== ${label} ===`];
  parts.push(`URL: ${page.url}`);
  if (page.title) parts.push(`Title: ${page.title}`);
  if (page.metaDescription) parts.push(`Meta: ${page.metaDescription}`);
  if (page.slogan) parts.push(`Slogan/Tagline: "${page.slogan}" (found in: ${page.sloganLocation})`);
  if (page.schemaData.length > 0) parts.push(`Schema/Structured Data: ${page.schemaData.join(' | ')}`);
  if (page.headerText) parts.push(`Header/Nav Text: ${page.headerText}`);
  if (page.headings.length > 0) parts.push(`Headings: ${page.headings.join(' | ')}`);
  if (page.bodyText) parts.push(`Content: ${page.bodyText}`);
  if (page.imageAlts.length > 0) parts.push(`Image Alts: ${page.imageAlts.join(', ')}`);
  if (page.navLinks.length > 0) {
    const navSummary = page.navLinks
      .slice(0, 15)
      .map(l => l.text)
      .join(', ');
    parts.push(`Nav Links: ${navSummary}`);
  }
  return parts.join('\n');
}

export function buildContentSummary(site: ScrapedSite): string | null {
  if (!site.homepage) return null;

  const sections: string[] = [];
  const BUDGET = 12000; // ~3K tokens

  // Homepage section
  sections.push(formatPageSection(site.homepage, 'HOMEPAGE'));

  // Subpage sections
  const subpageLabels = ['ABOUT PAGE', 'TEAM/PEOPLE PAGE', 'PRACTICE AREAS PAGE'];
  for (let i = 0; i < site.subpages.length; i++) {
    const label = subpageLabels[i] || `SUBPAGE ${i + 1}`;
    sections.push(formatPageSection(site.subpages[i], label));
  }

  let summary = sections.join('\n\n');

  // Truncate to budget
  if (summary.length > BUDGET) {
    summary = summary.slice(0, BUDGET) + '\n[... content truncated ...]';
  }

  return summary;
}
