import type { ScrapedSite } from './scraper';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════
export type FirmTier = 'boutique' | 'midsize' | 'large' | 'biglaw';

export interface FirmSizeResult {
  tier: FirmTier;
  signals: string[];
  isOutlier: boolean; // 500+ employees — grade less strictly
  estimatedHeadcount: number | null;
}

// ═══════════════════════════════════════════════════════════
// KNOWN BIGLAW FIRMS (~50)
// ═══════════════════════════════════════════════════════════
const KNOWN_BIGLAW_NAMES = [
  'skadden', 'cravath', 'kirkland', 'latham', 'sullivan & cromwell',
  'sullivan cromwell', 'wachtell', 'davis polk', 'simpson thacher',
  'paul weiss', 'cleary gottlieb', 'weil gotshal', 'gibson dunn',
  'jones day', 'sidley austin', 'morgan lewis', 'white & case',
  'white case', 'hogan lovells', 'baker mckenzie', 'baker & mckenzie',
  'norton rose', 'clifford chance', 'allen & overy', 'allen overy',
  'linklaters', 'freshfields', 'herbert smith', 'dentons',
  'dla piper', 'greenberg traurig', 'holland & knight', 'holland knight',
  'king & spalding', 'king spalding', 'mayer brown', 'milbank',
  'proskauer', 'ropes & gray', 'ropes gray', 'debevoise',
  'willkie farr', 'quinn emanuel', 'covington', 'cooley',
  'goodwin procter', 'goodwin', 'orrick', 'shearman',
  'arnold & porter', 'arnold porter', 'akin gump', 'morrison foerster',
  'mofo', 'winston & strawn', 'winston strawn', 'dechert',
  'reed smith', 'squire patton', 'pillsbury', 'katten muchin',
];

// Known mega firms (500+ attorneys) — outliers that should be graded less strictly
const KNOWN_MEGA_FIRMS = [
  'morgan & morgan', 'morgan and morgan', 'morganandmorgan',
  'littler mendelson', 'littler', 'jackson lewis', 'ogletree deakins',
  'fisher phillips', 'seyfarth shaw', 'seyfarth',
  'baker donelson', 'polsinelli', 'husch blackwell',
  'foley & lardner', 'foley lardner', 'mcguirewoods',
  'bryan cave', 'thompson hine', 'faegre drinker',
];

// Prestige indicator terms
const PRESTIGE_TERMS = [
  'am law', 'amlaw', 'am law 100', 'am law 200',
  'vault', 'chambers', 'legal 500', 'nlj 500',
  'global 100', 'magic circle', 'white shoe',
];

// ═══════════════════════════════════════════════════════════
// DETECTION LOGIC
// ═══════════════════════════════════════════════════════════
export function detectFirmSize(site: ScrapedSite): FirmSizeResult {
  const signals: string[] = [];
  const scores: number[] = [];
  let isOutlier = false;
  let estimatedHeadcount: number | null = null;

  // Gather all text from all pages
  const allText = getAllText(site);
  const allTextLower = allText.toLowerCase();

  // Also gather firm name from homepage title
  const firmName = site.homepage?.title?.toLowerCase() || '';
  const firmUrl = site.homepage?.url?.toLowerCase() || '';

  // ── Signal 0: Known mega firm match (500+ outlier) ──
  for (const name of KNOWN_MEGA_FIRMS) {
    if (firmName.includes(name) || allTextLower.includes(name) || firmUrl.includes(name.replace(/[&\s]+/g, ''))) {
      signals.push(`Known mega firm (500+ attorneys): "${name}"`);
      isOutlier = true;
      break;
    }
  }

  // ── Signal 1: Known BigLaw name match ──
  for (const name of KNOWN_BIGLAW_NAMES) {
    if (firmName.includes(name) || allTextLower.includes(name) || firmUrl.includes(name.replace(/\s+/g, ''))) {
      signals.push(`Known BigLaw firm name match: "${name}"`);
      // Most BigLaw firms are 500+ — mark as outlier too
      isOutlier = true;
      return { tier: 'biglaw', signals, isOutlier, estimatedHeadcount }; // Direct override
    }
  }

  // ── Signal 2: Attorney/lawyer count ──
  const attorneyCount = detectAttorneyCount(allTextLower, site);
  if (attorneyCount !== null) {
    estimatedHeadcount = attorneyCount;
    signals.push(`Detected ~${attorneyCount} attorneys/professionals`);
    if (attorneyCount >= 500) {
      isOutlier = true;
      signals.push(`500+ attorneys — outlier grading applies`);
    }
    if (attorneyCount > 250) scores.push(4);
    else if (attorneyCount > 75) scores.push(3);
    else if (attorneyCount > 15) scores.push(2);
    else scores.push(1);
  }

  // ── Signal 3: Office count ──
  const officeCount = detectOfficeCount(allTextLower);
  if (officeCount !== null) {
    signals.push(`Detected ~${officeCount} office locations`);
    if (officeCount > 10) scores.push(4);
    else if (officeCount > 4) scores.push(3);
    else if (officeCount > 1) scores.push(2);
    else scores.push(1);
  }

  // ── Signal 4: Practice area breadth ──
  const practiceCount = detectPracticeAreaCount(site);
  if (practiceCount > 0) {
    signals.push(`Detected ~${practiceCount} practice areas`);
    if (practiceCount > 30) scores.push(4);
    else if (practiceCount > 15) scores.push(3);
    else if (practiceCount > 5) scores.push(2);
    else scores.push(1);
  }

  // ── Signal 5: Prestige mentions ──
  const prestigeHits = detectPrestigeMentions(allTextLower);
  if (prestigeHits.length > 0) {
    signals.push(`Prestige mentions: ${prestigeHits.join(', ')}`);
    scores.push(prestigeHits.length >= 3 ? 4 : 3);
  }

  // ── Calculate final tier ──
  if (scores.length === 0) {
    signals.push('No strong size signals detected — defaulting to boutique');
    return { tier: 'boutique', signals, isOutlier, estimatedHeadcount };
  }

  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

  let tier: FirmTier;
  if (avgScore >= 3.5) tier = 'biglaw';
  else if (avgScore >= 2.5) tier = 'large';
  else if (avgScore >= 1.5) tier = 'midsize';
  else tier = 'boutique';

  return { tier, signals, isOutlier, estimatedHeadcount };
}

// ═══════════════════════════════════════════════════════════
// HELPER: Gather all text
// ═══════════════════════════════════════════════════════════
function getAllText(site: ScrapedSite): string {
  const parts: string[] = [];
  if (site.homepage) {
    parts.push(site.homepage.title);
    parts.push(site.homepage.metaDescription);
    parts.push(site.homepage.bodyText);
    parts.push(site.homepage.headings.join(' '));
    parts.push(site.homepage.navLinks.map(l => l.text).join(' '));
  }
  for (const page of site.subpages) {
    parts.push(page.title);
    parts.push(page.metaDescription);
    parts.push(page.bodyText);
    parts.push(page.headings.join(' '));
    parts.push(page.navLinks.map(l => l.text).join(' '));
  }
  return parts.join(' ');
}

// ═══════════════════════════════════════════════════════════
// HELPER: Detect attorney count
// ═══════════════════════════════════════════════════════════
function detectAttorneyCount(text: string, site: ScrapedSite): number | null {
  // Pattern 1: "X attorneys" / "X lawyers" / "X professionals"
  const countPatterns = [
    /(\d[\d,]*)\s*(?:\+\s*)?(?:attorneys|lawyers|professionals|associates|partners)/gi,
    /(?:more than|over|approximately|nearly)\s*(\d[\d,]*)\s*(?:attorneys|lawyers|professionals)/gi,
  ];

  let maxCount = 0;
  for (const pattern of countPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const num = parseInt(match[1].replace(/,/g, ''), 10);
      if (num > maxCount && num < 50000) maxCount = num;
    }
  }

  if (maxCount > 0) return maxCount;

  // Pattern 2: Count list items on team/people pages (subpages that mention team/attorneys)
  for (const page of site.subpages) {
    const pageUrl = page.url.toLowerCase();
    if (pageUrl.includes('team') || pageUrl.includes('attorney') || pageUrl.includes('people') || pageUrl.includes('lawyer') || pageUrl.includes('professional')) {
      // Count headings that look like names (2-4 words, capitalized)
      const namePattern = /^[A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?$/;
      let nameCount = 0;
      for (const heading of page.headings) {
        if (namePattern.test(heading.trim())) nameCount++;
      }
      if (nameCount > maxCount) maxCount = nameCount;
    }
  }

  return maxCount > 0 ? maxCount : null;
}

// ═══════════════════════════════════════════════════════════
// HELPER: Detect office count
// ═══════════════════════════════════════════════════════════
function detectOfficeCount(text: string): number | null {
  // Pattern: "X offices" or "X locations"
  const officePatterns = [
    /(\d+)\s*(?:offices|locations|cities)/gi,
    /(?:offices?\s+in|locations?\s+in|across)\s+(\d+)/gi,
  ];

  let maxCount = 0;
  for (const pattern of officePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const num = parseInt(match[1], 10);
      if (num > maxCount && num < 500) maxCount = num;
    }
  }

  return maxCount > 0 ? maxCount : null;
}

// ═══════════════════════════════════════════════════════════
// HELPER: Detect practice area count
// ═══════════════════════════════════════════════════════════
function detectPracticeAreaCount(site: ScrapedSite): number {
  // Count practice area links/headings across all pages
  const practiceKeywords = /practice|service|expertise|area|specialt/i;
  let count = 0;

  const allPages = [site.homepage, ...site.subpages].filter(Boolean) as import('./scraper').ParsedPage[];

  for (const page of allPages) {
    // Check nav links that look like practice areas
    const pageUrl = page.url.toLowerCase();
    if (pageUrl.includes('practice') || pageUrl.includes('service') || pageUrl.includes('expertise')) {
      // On a practice area page, count headings as individual practice areas
      count = Math.max(count, page.headings.length);
    }

    // Count links pointing to practice/service sub-paths
    const practiceLinks = page.navLinks.filter(l => {
      try {
        const linkPath = new URL(l.href).pathname.toLowerCase();
        return practiceKeywords.test(linkPath);
      } catch { return false; }
    });
    count = Math.max(count, practiceLinks.length);
  }

  return count;
}

// ═══════════════════════════════════════════════════════════
// HELPER: Detect prestige mentions
// ═══════════════════════════════════════════════════════════
function detectPrestigeMentions(text: string): string[] {
  const hits: string[] = [];
  for (const term of PRESTIGE_TERMS) {
    if (text.includes(term)) {
      hits.push(term);
    }
  }
  return hits;
}
