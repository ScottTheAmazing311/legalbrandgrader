import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { scrapeSite, buildContentSummary } from '../../lib/scraper';
import { detectFirmSize, type FirmTier, type FirmSizeResult } from '../../lib/firmSizeDetector';

export const maxDuration = 30;

// Exemplar benchmarks
const EXEMPLAR_BENCHMARKS = {
  brandClarity: 87,
  languageDifferentiation: 82,
  visualCoherence: 79,
  visualFreshness: 84,
  cultureVisibility: 76,
  peopleInvestment: 88,
  contentThoughtLeadership: 72,
  uxFoundations: 81
};

// ═══════════════════════════════════════════════════════════
// PROMPT BUILDER — branches by firm tier
// ═══════════════════════════════════════════════════════════
function buildAnalysisPrompt(url: string, scrapedContent: string | null, firmTier: FirmTier, isOutlier: boolean): string {
  const contentBlock = scrapedContent
    ? `\n\nHere is the actual scraped content from the firm's website:\n\n${scrapedContent}\n\nUse this content as the PRIMARY basis for your scoring. Be specific about what you observe in the actual content above.\n`
    : `\n\nNote: We were unable to scrape this website's content. Base your analysis on your knowledge of this firm and typical patterns for firms at this URL. Be transparent that your analysis is inference-based.\n`;

  const isLargeFirm = firmTier === 'large' || firmTier === 'biglaw';

  const dimensionLabels = isLargeFirm
    ? {
        brandClarity: 'Institutional Brand Authority',
        languageDifferentiation: 'Market Positioning & Voice',
        visualCoherence: 'Visual Coherence',
        visualFreshness: 'Digital Sophistication',
        cultureVisibility: 'Thought Leadership & Values',
        peopleInvestment: 'Talent Brand & Depth',
        contentThoughtLeadership: 'Publications & Industry Influence',
        uxFoundations: 'UX & Digital Foundations',
      }
    : {
        brandClarity: 'Brand Clarity & Slogan',
        languageDifferentiation: 'Firm Differentiation',
        visualCoherence: 'Visual Coherence',
        visualFreshness: 'Visual Freshness',
        cultureVisibility: 'Culture Visibility',
        peopleInvestment: 'People Investment',
        contentThoughtLeadership: 'Content & Thought Leadership',
        uxFoundations: 'UX & Digital Foundations',
      };

  // Outlier clause for 500+ employee firms
  const outlierClause = isOutlier
    ? `\n\nIMPORTANT — OUTLIER FIRM (500+ employees detected):
This is an exceptionally large firm where standard boutique/mid-size brand rules may not fully apply. Grade this firm LESS STRICTLY:
- Add 8-12 points across all dimensions compared to how you'd score a typical firm with similar branding
- Massive firms achieve brand awareness through sheer scale, advertising spend, and market saturation — credit this
- Their UVP may be "we're everywhere and we're the biggest" — that IS a valid differentiator at this scale
- Do not penalize for template-style websites if the firm compensates with massive brand recognition
- Focus criticism on genuinely poor execution, not on lacking boutique-style personality\n`
    : '';

  const scoringGuidelines = isLargeFirm
    ? `CRITICAL SCORING GUIDELINES FOR LARGE/BIGLAW FIRMS:
- You are evaluating an institutional law firm. Do NOT penalize conservative, professional branding — that is the norm and expectation for this tier.
- ${dimensionLabels.brandClarity}: Score based on institutional authority, market recognition, and clarity of practice strengths — NOT founder personality or quirky positioning.
- ${dimensionLabels.languageDifferentiation}: Score based on how well the firm differentiates from peer firms (Cravath, Wachtell, Gibson Dunn, Cooley) — NOT vs boutique firms.
- ${dimensionLabels.visualFreshness}: Score based on digital sophistication, modern UX, and polish — NOT playful/bold/unconventional design.
- ${dimensionLabels.cultureVisibility}: Score based on thought leadership visibility, DEI initiatives, pro bono commitment, and values communication.
- ${dimensionLabels.peopleInvestment}: Score based on bio depth, credentials display, partner/associate profiles, lateral recruiting presence.
- ${dimensionLabels.contentThoughtLeadership}: Score based on publications, client alerts, industry influence, media presence, and speaking engagements.
- Peer comparison should be against Cravath, Wachtell, Gibson Dunn, and Cooley — NOT boutique exemplars.
- Large firms with polished, authoritative, well-organized websites should score 60-80.
- Elite institutional brands that excel at digital presence and thought leadership score 80+.
- Only penalize for genuinely outdated design, poor UX, thin content, or lack of depth — not for being "corporate."`
    : `CRITICAL SCORING GUIDELINES - Be STRICT and HONEST:
- The benchmarks above represent the TOP 1% of law firm brands (firms like TopDog Law, Cho Law, ABC Law Centers, Bick Law)
- Most law firms are mediocre and score 35-60 overall. This is the NORM.
- Large corporate/BigLaw firms with generic branding typically score 45-65 (even if they look "professional")
- Only truly exceptional, distinctive brands score 70-79
- Only elite exemplar-level brands score 80+
- A score of 80+ means the firm rivals or exceeds TopDog Law, Cho Law, ABC Law Centers, and Bick Law in brand excellence
- Be critical: professional-looking ≠ strong brand. Most law firms have bland, undifferentiated brands.
- Generic stock photos, lawyer headshots on white backgrounds, and "we fight for you" language = low scores
- High scores require: unique visual identity, differentiated language, visible culture, substantial people investment, and fresh modern design`;

  const peerComparisonInstruction = isLargeFirm
    ? '"peerComparison": "string (1 sentence comparing to peer institutional firms like Cravath, Wachtell, Gibson Dunn, Cooley)"'
    : '"peerComparison": "string (1 sentence comparing to exemplar firms like TopDog Law, Cho Law, ABC Law Centers, Bick Law)"';

  return `You are a legal brand analyst. Analyze the law firm website at: ${url}
${contentBlock}${outlierClause}
Based on the content provided and observable signals, score this firm on 8 brand dimensions.

Return ONLY a valid JSON object — no markdown, no explanation, no preamble. The JSON must match this exact structure:

{
  "firmName": "string (extract from site content or URL)",
  "firmType": "string (e.g. Personal Injury, Immigration, Corporate, Full-Service, etc.)",
  "overallScore": number (0-100, weighted composite),
  "verdict": "string (2-3 sentence overall brand assessment, direct and honest)",
  "categories": {
    "brandClarity": {
      "score": number (0-100),
      "label": "${dimensionLabels.brandClarity}",
      "summary": "string (1 sentence, specific observation)",
      "findings": ["string", "string", "string"]
    },
    "languageDifferentiation": {
      "score": number (0-100),
      "label": "${dimensionLabels.languageDifferentiation}",
      "summary": "string",
      "findings": ["string", "string", "string"]
    },
    "visualCoherence": {
      "score": number (0-100),
      "label": "${dimensionLabels.visualCoherence}",
      "summary": "string",
      "findings": ["string", "string", "string"]
    },
    "visualFreshness": {
      "score": number (0-100),
      "label": "${dimensionLabels.visualFreshness}",
      "summary": "string",
      "findings": ["string", "string", "string"]
    },
    "cultureVisibility": {
      "score": number (0-100),
      "label": "${dimensionLabels.cultureVisibility}",
      "summary": "string",
      "findings": ["string", "string", "string"]
    },
    "peopleInvestment": {
      "score": number (0-100),
      "label": "${dimensionLabels.peopleInvestment}",
      "summary": "string",
      "findings": ["string", "string", "string"]
    },
    "contentThoughtLeadership": {
      "score": number (0-100),
      "label": "${dimensionLabels.contentThoughtLeadership}",
      "summary": "string",
      "findings": ["string", "string", "string"]
    },
    "uxFoundations": {
      "score": number (0-100),
      "label": "${dimensionLabels.uxFoundations}",
      "summary": "string",
      "findings": ["string", "string", "string"]
    }
  },
  "topStrength": "string (the single strongest brand element)",
  "criticalGap": "string (the single most important thing holding the brand back — tease the insight, don't fully explain it)",
  ${peerComparisonInstruction}
}

Scoring calibration — your exemplar benchmarks (what ELITE law firm brands score):
- ${dimensionLabels.brandClarity}: ${EXEMPLAR_BENCHMARKS.brandClarity}/100
- ${dimensionLabels.languageDifferentiation}: ${EXEMPLAR_BENCHMARKS.languageDifferentiation}/100
- Visual Coherence: ${EXEMPLAR_BENCHMARKS.visualCoherence}/100
- ${dimensionLabels.visualFreshness}: ${EXEMPLAR_BENCHMARKS.visualFreshness}/100
- ${dimensionLabels.cultureVisibility}: ${EXEMPLAR_BENCHMARKS.cultureVisibility}/100
- ${dimensionLabels.peopleInvestment}: ${EXEMPLAR_BENCHMARKS.peopleInvestment}/100
- ${dimensionLabels.contentThoughtLeadership}: ${EXEMPLAR_BENCHMARKS.contentThoughtLeadership}/100
- UX & Digital Foundations: ${EXEMPLAR_BENCHMARKS.uxFoundations}/100

${scoringGuidelines}

SLOGAN & TAGLINE SCORING (heavily weighted within Brand Clarity):
- A firm's slogan/tagline is one of the MOST important brand signals. It anchors the entire brand promise.
- If the firm has a strong, memorable slogan that appears in the header or hero area, this is a MAJOR positive signal — boost brandClarity by 10-15 points.
- If the slogan is repeated across multiple pages (header, footer, about page), it shows brand discipline — additional boost.
- If the slogan is generic ("Fighting for you", "Experienced attorneys", "Justice for all") — this is a NEGATIVE signal, penalize brandClarity.
- If no slogan/tagline is found at all, that itself is a weakness worth noting.

FIRM DIFFERENTIATION (UVP) — key criteria for languageDifferentiation:
- This dimension measures how clearly the firm communicates its Unique Value Proposition (UVP).
- A clear, specific UVP ("We exclusively handle trucking accident cases in Texas") = high score.
- A vague, generic UVP ("We provide aggressive representation") = low score. Most firms say this — it differentiates nothing.
- Score HIGH if: the UVP is specific, niche-focused, tied to outcomes, or clearly distinct from competitors.
- Score LOW if: the messaging could be copy-pasted onto any law firm website without anyone noticing.

AUTHENTICITY (heavily weighted cross-cutting factor):
- Authenticity in tone and messaging should be rewarded HEAVILY across all dimensions.
- Signs of authenticity: founder's personal story, genuine voice (not corporate-speak), real client stories, behind-the-scenes content, specific anecdotes, honest about the firm's focus and limitations.
- Signs of inauthenticity: buzzword-heavy copy, stock-feeling language, "we are committed to excellence" type platitudes, no human voice.
- If authenticity is strong: boost cultureVisibility, brandClarity, and languageDifferentiation by 5-10 points each.
- If copy feels templated/generic: penalize these same dimensions.

Be specific about what you observe, not generic. The findings should be specific observations — not generic advice. Keep findings to 8-12 words each. The criticalGap should tease an insight that makes them want a full audit, but don't give away the full solution.`;
}

// ═══════════════════════════════════════════════════════════
// POST HANDLER
// ═══════════════════════════════════════════════════════════
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    // Validate URL
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    let normalizedUrl = url;
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
      if (!url.startsWith('http')) normalizedUrl = `https://${url}`;
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Check for API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API configuration error' },
        { status: 500 }
      );
    }

    // ── Step 1: Scrape website ──
    let scrapedSite;
    try {
      scrapedSite = await scrapeSite(normalizedUrl);
    } catch (err: any) {
      console.error('Scraping error:', err);
      scrapedSite = { homepage: null, subpages: [], errors: [err.message] };
    }

    // ── Step 2: Detect firm size ──
    const firmSizeResult = detectFirmSize(scrapedSite);

    // ── Step 3: Build content summary ──
    const scrapedContent = buildContentSummary(scrapedSite);

    // ── Step 4: Build prompt ──
    const prompt = buildAnalysisPrompt(normalizedUrl, scrapedContent, firmSizeResult.tier, firmSizeResult.isOutlier);

    // ── Step 5: Call Claude API ──
    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    // Extract text from response
    const responseText = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('');

    // Clean and parse JSON
    const cleanedText = responseText.replace(/```json|```/g, '').trim();
    const result = JSON.parse(cleanedText);

    // ── Step 6: Merge scraping metadata into result ──
    const scrapedPagesCount = (scrapedSite.homepage ? 1 : 0) + scrapedSite.subpages.length;

    return NextResponse.json({
      ...result,
      firmSizeTier: firmSizeResult.tier,
      firmSizeSignals: firmSizeResult.signals,
      isOutlierFirm: firmSizeResult.isOutlier,
      scrapedPagesCount,
      scrapingErrors: scrapedSite.errors,
    });

  } catch (error: any) {
    console.error('Analysis error:', error);

    if (error.name === 'SyntaxError') {
      return NextResponse.json(
        { error: 'Failed to parse API response' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Analysis failed' },
      { status: 500 }
    );
  }
}
