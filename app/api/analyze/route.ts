import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

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

function buildAnalysisPrompt(url: string): string {
  return `You are a legal brand analyst. Analyze the law firm website at: ${url}

Based on publicly observable signals (domain name, site structure, typical law firm patterns for this type of firm), score this firm on 8 brand dimensions.

Return ONLY a valid JSON object — no markdown, no explanation, no preamble. The JSON must match this exact structure:

{
  "firmName": "string (extract from URL or domain)",
  "firmType": "string (e.g. Personal Injury, Immigration, Corporate, etc.)",
  "overallScore": number (0-100, weighted composite),
  "verdict": "string (2-3 sentence overall brand assessment, direct and honest)",
  "categories": {
    "brandClarity": {
      "score": number (0-100),
      "label": "string (e.g. 'Brand Clarity')",
      "summary": "string (1 sentence, specific observation)",
      "findings": ["string", "string", "string"]
    },
    "languageDifferentiation": {
      "score": number (0-100),
      "label": "string",
      "summary": "string",
      "findings": ["string", "string", "string"]
    },
    "visualCoherence": {
      "score": number (0-100),
      "label": "string",
      "summary": "string",
      "findings": ["string", "string", "string"]
    },
    "visualFreshness": {
      "score": number (0-100),
      "label": "string",
      "summary": "string",
      "findings": ["string", "string", "string"]
    },
    "cultureVisibility": {
      "score": number (0-100),
      "label": "string",
      "summary": "string",
      "findings": ["string", "string", "string"]
    },
    "peopleInvestment": {
      "score": number (0-100),
      "label": "string",
      "summary": "string",
      "findings": ["string", "string", "string"]
    },
    "contentThoughtLeadership": {
      "score": number (0-100),
      "label": "string",
      "summary": "string",
      "findings": ["string", "string", "string"]
    },
    "uxFoundations": {
      "score": number (0-100),
      "label": "string",
      "summary": "string",
      "findings": ["string", "string", "string"]
    }
  },
  "topStrength": "string (the single strongest brand element)",
  "criticalGap": "string (the single most important thing holding the brand back — tease the insight, don't fully explain it)",
  "peerComparison": "string (1 sentence comparing to exemplar firms like TopDog Law, Cho Law, ABC Law Centers, Bick Law)"
}

Scoring calibration — your exemplar benchmarks (what ELITE law firm brands score):
- Brand Clarity: ${EXEMPLAR_BENCHMARKS.brandClarity}/100
- Language Differentiation: ${EXEMPLAR_BENCHMARKS.languageDifferentiation}/100
- Visual Coherence: ${EXEMPLAR_BENCHMARKS.visualCoherence}/100
- Visual Freshness: ${EXEMPLAR_BENCHMARKS.visualFreshness}/100
- Culture Visibility: ${EXEMPLAR_BENCHMARKS.cultureVisibility}/100
- People Investment: ${EXEMPLAR_BENCHMARKS.peopleInvestment}/100
- Content & Thought Leadership: ${EXEMPLAR_BENCHMARKS.contentThoughtLeadership}/100
- UX & Digital Foundations: ${EXEMPLAR_BENCHMARKS.uxFoundations}/100

CRITICAL SCORING GUIDELINES - Be STRICT and HONEST:
- The benchmarks above represent the TOP 1% of law firm brands (firms like TopDog Law, Cho Law, ABC Law Centers, Bick Law)
- Most law firms are mediocre and score 35-60 overall. This is the NORM.
- Large corporate/BigLaw firms with generic branding typically score 45-65 (even if they look "professional")
- Only truly exceptional, distinctive brands score 70-79
- Only elite exemplar-level brands score 80+
- A score of 80+ means the firm rivals or exceeds TopDog Law, Cho Law, ABC Law Centers, and Bick Law in brand excellence
- Be critical: professional-looking ≠ strong brand. Most law firms have bland, undifferentiated brands.
- Generic stock photos, lawyer headshots on white backgrounds, and "we fight for you" language = low scores
- High scores require: unique visual identity, differentiated language, visible culture, substantial people investment, and fresh modern design

Be specific about what you observe, not generic. The findings should be specific observations — not generic advice. Keep findings to 8-12 words each. The criticalGap should tease an insight that makes them want a full audit, but don't give away the full solution.`;
}

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
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
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

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    // Build prompt
    const prompt = buildAnalysisPrompt(url);

    // Call Anthropic API
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

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Analysis error:', error);

    // Return appropriate error
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
