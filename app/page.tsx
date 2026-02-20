'use client';

import { useState, useEffect } from 'react';

// ═══════════════════════════════════════════════════════════
// EXEMPLAR DATABASE & CONSTANTS
// ═══════════════════════════════════════════════════════════
const BOUTIQUE_EXEMPLAR_FIRMS = [
  { name: "TopDog Law", url: "topdoglaw.com", specialty: "Personal Injury", strength: "Brand Identity & Founder Story" },
  { name: "Cho Law LLC", url: "cholawllc.com", specialty: "Immigration", strength: "Visual Coherence & Client Framing" },
  { name: "ABC Law Centers", url: "abclawcenters.com", specialty: "Birth Injury", strength: "Niche Authority & People Investment" },
  { name: "Bick Law LLP", url: "bicklawllp.com", specialty: "Environmental", strength: "UVP Clarity & Culture Visibility" }
];

const LARGE_FIRM_EXEMPLARS = [
  { name: "Cravath, Swaine & Moore", url: "cravath.com", specialty: "Corporate / Litigation", strength: "Institutional Authority & Heritage" },
  { name: "Wachtell, Lipton", url: "wlrk.com", specialty: "M&A / Corporate", strength: "Elite Positioning & Selectivity" },
  { name: "Cooley LLP", url: "cooley.com", specialty: "Tech / Venture", strength: "Digital Sophistication & Innovation Brand" },
  { name: "Gibson Dunn", url: "gibsondunn.com", specialty: "Litigation / Corporate", strength: "Thought Leadership & Talent Depth" }
];

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

const SCORING_WEIGHTS = {
  brandClarity: 20,
  languageDifferentiation: 15,
  visualCoherence: 10,
  visualFreshness: 10,
  cultureVisibility: 10,
  peopleInvestment: 15,
  contentThoughtLeadership: 10,
  uxFoundations: 10
};

const TIER_LABELS: Record<string, string> = {
  boutique: 'Boutique Firm',
  midsize: 'Mid-Size Firm',
  large: 'Large Firm',
  biglaw: 'BigLaw / Global Firm',
};

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════
interface CategoryData {
  score: number;
  label: string;
  summary: string;
  findings: string[];
}

interface AnalysisResult {
  firmName: string;
  firmType: string;
  overallScore: number;
  verdict: string;
  categories: {
    [key: string]: CategoryData;
  };
  topStrength: string;
  criticalGap: string;
  peerComparison: string;
  firmSizeTier?: string;
  firmSizeSignals?: string[];
  isOutlierFirm?: boolean;
  scrapedPagesCount?: number;
  scrapingErrors?: string[];
}

type ViewState = 'input' | 'loading' | 'results';

// ═══════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════
function getScoreClass(score: number): string {
  if (score >= 81) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 60) return 'average';
  if (score >= 50) return 'below';
  return 'poor';
}

function getGradeLabel(score: number): string {
  if (score >= 81) return 'Strong Brand';
  if (score >= 70) return 'Solid';
  if (score >= 60) return 'Needs Polish';
  if (score >= 50) return 'Needs Work';
  return 'Brand Crisis';
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export default function Home() {
  const [currentView, setCurrentView] = useState<ViewState>('input');
  const [urlInput, setUrlInput] = useState('');
  const [loadingUrl, setLoadingUrl] = useState('');
  const [error, setError] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [loadingSteps, setLoadingSteps] = useState<number[]>([]);

  // Loading step animation
  useEffect(() => {
    if (currentView === 'loading') {
      const delays = [0, 600, 1300, 2100, 2900, 3700];
      const timers = delays.map((delay, index) => {
        return setTimeout(() => {
          setLoadingSteps(prev => [...prev, index]);
        }, delay);
      });

      return () => {
        timers.forEach(timer => clearTimeout(timer));
      };
    } else {
      setLoadingSteps([]);
    }
  }, [currentView]);

  const startGrading = async () => {
    const input = urlInput.trim();

    if (!input) {
      setError('Please enter a website URL to grade.');
      return;
    }

    // Normalize URL
    let url = input;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    // Validate URL
    try {
      new URL(url);
    } catch (e) {
      setError('Please enter a valid URL (e.g. https://yourfirm.com)');
      return;
    }

    setError('');
    setLoadingUrl(url);
    setCurrentView('loading');

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const result = await response.json();

      // Wait for final loading step to complete
      setTimeout(() => {
        setAnalysisResult(result);
        setCurrentView('results');
      }, 500);

    } catch (err: any) {
      console.error('Analysis error:', err);
      setCurrentView('input');
      setError('Unable to analyze this site. Please check the URL and try again.');
    }
  };

  const resetGrader = () => {
    setCurrentView('input');
    setAnalysisResult(null);
    setUrlInput('');
    setError('');
    setLoadingUrl('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      startGrading();
    }
  };

  return (
    <>
      {/* GLOBAL DECORATIVE ORBS */}
      <div className="deco-orbs">
        <div className="deco-orb"></div>
        <div className="deco-orb"></div>
        <div className="deco-orb"></div>
      </div>

      {/* HEADER */}
      <header>
        <div className="logo">
          <div className="logo-mark"></div>
          <div className="logo-text">LegalBrandGrader</div>
        </div>
        <div className="header-tag">Calibrated against elite exemplars</div>
      </header>

      {/* INPUT SECTION */}
      {currentView === 'input' && (
        <div id="inputSection">
          <div className="hero" style={{ position: 'relative' }}>
            {/* Floating decorative squares */}
            <div className="deco-squares">
              <div className="deco-square"></div>
              <div className="deco-square"></div>
              <div className="deco-square"></div>
              <div className="deco-square"></div>
              <div className="deco-square"></div>
              <div className="deco-square"></div>
            </div>
            <div className="hero-eyebrow">Brand Intelligence for Law Firms</div>
            <h1>How does your firm&apos;s<br /><em>brand</em> stack up?</h1>
            <p className="hero-sub">Enter your firm&apos;s website and get an instant brand score across 8 dimensions — benchmarked against firms that have cracked the code on legal branding.</p>
          </div>

          <div className="input-card">
            <div className="input-row">
              <div className="url-input-wrap">
                <label className="url-label" htmlFor="urlInput">Law Firm Website URL</label>
                <input
                  type="url"
                  id="urlInput"
                  className="url-input"
                  placeholder="https://yourfirm.com"
                  autoComplete="off"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
              </div>
              <button className="grade-btn" onClick={startGrading}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                Grade My Brand
              </button>
            </div>
            {error && <div className="error-msg visible">{error}</div>}
          </div>

          {/* Animated section divider */}
          <div className="section-line delay-1" style={{ marginTop: '80px' }}></div>

          {/* WHY IT MATTERS SECTION */}
          <div className="why-matters-section" style={{ position: 'relative' }}>
            {/* Floating squares for this section too */}
            <div className="deco-squares">
              <div className="deco-square"></div>
              <div className="deco-square"></div>
              <div className="deco-square"></div>
              <div className="deco-square"></div>
              <div className="deco-square"></div>
              <div className="deco-square"></div>
            </div>
            <div className="why-matters-header">
              <div className="section-line" style={{ marginBottom: '32px' }}></div>
              <h2 className="why-matters-title">Why Your Legal Brand Matters More Than Ever</h2>
              <p className="why-matters-subtitle">In a crowded market, your brand is the difference between being chosen and being overlooked.</p>
            </div>

            <div className="why-matters-grid">
              <div className="why-matters-card">
                <div className="why-matters-art">
                  <img src="/art/vermeer.jpg" alt="Girl with a Pearl Earring by Vermeer" />
                </div>
                <div className="why-matters-card-body">
                  <h3 className="why-matters-card-title">First Impressions Are Everything</h3>
                  <p className="why-matters-card-text">
                    93% of potential clients judge your firm within seconds of visiting your website. A strong brand signals credibility, expertise, and trustworthiness before a single word is read.
                  </p>
                </div>
              </div>

              <div className="why-matters-card">
                <div className="why-matters-art">
                  <img src="/art/wanderer.jpg" alt="Wanderer above the Sea of Fog by Caspar David Friedrich" />
                </div>
                <div className="why-matters-card-body">
                  <h3 className="why-matters-card-title">Stand Out in a Sea of Sameness</h3>
                  <p className="why-matters-card-text">
                    Most law firms look identical — generic stock photos, corporate jargon, and forgettable websites. Elite firms use distinctive branding to command premium fees and attract ideal clients.
                  </p>
                </div>
              </div>

              <div className="why-matters-card">
                <div className="why-matters-art">
                  <img src="/art/venus.jpg" alt="The Birth of Venus by Botticelli" />
                </div>
                <div className="why-matters-card-body">
                  <h3 className="why-matters-card-title">Convert More High-Value Clients</h3>
                  <p className="why-matters-card-text">
                    Firms with strong brands convert 40% more leads and charge 25% higher rates. Your brand isn&apos;t just aesthetics — it&apos;s your most powerful business development tool.
                  </p>
                </div>
              </div>

              <div className="why-matters-card">
                <div className="why-matters-art">
                  <img src="/art/athens.jpg" alt="The School of Athens by Raphael" />
                </div>
                <div className="why-matters-card-body">
                  <h3 className="why-matters-card-title">Attract Top Talent</h3>
                  <p className="why-matters-card-text">
                    The best lawyers want to work for firms with strong identities and clear missions. A compelling brand helps you recruit and retain exceptional talent in a competitive market.
                  </p>
                </div>
              </div>
            </div>

            <div className="why-matters-cta">
              <div className="why-matters-cta-content">
                <h3 className="why-matters-cta-title">See Where You Stand</h3>
                <p className="why-matters-cta-text">Get your free brand scorecard in 60 seconds ↑</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LOADING SECTION */}
      {currentView === 'loading' && (
        <div className="loading-state active">
          <div className="loading-ring"></div>
          <div className="loading-title">Analyzing Your Brand</div>
          <div className="loading-sub">{loadingUrl}</div>
          <div className="loading-steps">
            {[
              'Fetching website content',
              'Detecting firm size & type',
              'Evaluating visual & language signals',
              'Scoring people investment & culture',
              'Calibrating against exemplars',
              'Building your scorecard'
            ].map((step, index) => (
              <div
                key={index}
                className={`loading-step ${loadingSteps.includes(index) ? 'visible' : ''} ${loadingSteps.includes(index + 1) ? 'done' : ''}`}
              >
                <div className="step-dot"></div>
                {step}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RESULTS SECTION */}
      {currentView === 'results' && analysisResult && (
        <ResultsSection result={analysisResult} url={loadingUrl} onReset={resetGrader} />
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// RESULTS COMPONENT
// ═══════════════════════════════════════════════════════════
function ResultsSection({ result, url, onReset }: { result: AnalysisResult; url: string; onReset: () => void }) {
  const overall = result.overallScore || 0;
  const scoreClass = getScoreClass(overall);

  const avgExemplar = Math.round(
    Object.values(EXEMPLAR_BENCHMARKS).reduce((a, b) => a + b, 0) /
    Object.keys(EXEMPLAR_BENCHMARKS).length
  );

  const catKeys = [
    'brandClarity', 'languageDifferentiation', 'visualCoherence', 'visualFreshness',
    'cultureVisibility', 'peopleInvestment', 'contentThoughtLeadership', 'uxFoundations'
  ];

  const isLargeFirm = result.firmSizeTier === 'large' || result.firmSizeTier === 'biglaw';
  const exemplarFirms = isLargeFirm ? LARGE_FIRM_EXEMPLARS : BOUTIQUE_EXEMPLAR_FIRMS;
  const tierLabel = result.firmSizeTier ? (TIER_LABELS[result.firmSizeTier] || result.firmSizeTier) : null;
  const tierClass = result.firmSizeTier ? `tier-${result.firmSizeTier}` : '';

  // Data source info
  const scrapedCount = result.scrapedPagesCount || 0;
  const hasScrapedData = scrapedCount > 0;

  // Animate bars on mount
  useEffect(() => {
    // Trigger animations after a brief delay
    requestAnimationFrame(() => {
      const ringFill = document.getElementById('ringFill');
      if (ringFill) {
        const circ = 2 * Math.PI * 90;
        const offset = circ - (overall / 100) * circ;
        ringFill.style.strokeDashoffset = offset.toString();
      }

      // Animate category bars
      document.querySelectorAll<HTMLElement>('.cat-bar-fill').forEach(el => {
        const width = el.getAttribute('data-width');
        if (width) {
          el.style.width = width + '%';
        }
      });

      // Animate benchmark bar
      const benchFill = document.getElementById('benchFirmFill');
      if (benchFill) {
        benchFill.style.width = overall + '%';
      }
    });
  }, [overall]);

  return (
    <div className="results-section active">
      {/* SCORE HERO */}
      <div className="score-hero">
        <div>
          <div className="score-firm-name">{url}</div>
          {tierLabel && (
            <div className={`firm-tier-badge ${tierClass}`}>{tierLabel}</div>
          )}
          {hasScrapedData && (
            <div className="data-source-indicator">
              Analyzed {scrapedCount} page{scrapedCount !== 1 ? 's' : ''} of live website content
            </div>
          )}
          {!hasScrapedData && (
            <div className="data-source-indicator">
              Inference-based analysis — website content could not be fetched
            </div>
          )}
          <div className="score-headline">{result.firmName || 'Your Firm'}<br />Brand Assessment</div>
          <div className="score-verdict">{result.verdict || ''}</div>
          {result.peerComparison && (
            <div style={{
              marginTop: '20px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.72rem',
              color: 'var(--text-secondary)',
              lineHeight: '1.5',
              borderLeft: '1px solid var(--border)',
              paddingLeft: '14px',
              maxWidth: '460px',
              letterSpacing: '-0.01em'
            }}>
              {result.peerComparison}
            </div>
          )}
        </div>
        <div className="score-ring-wrap">
          <div className="score-ring">
            <svg viewBox="0 0 200 200">
              <circle className="score-ring-bg" cx="100" cy="100" r="90" />
              <circle
                className={`score-ring-fill ring-${scoreClass}`}
                id="ringFill"
                cx="100"
                cy="100"
                r="90"
              />
            </svg>
            <div className="score-ring-text">
              <div className="score-number">{overall}</div>
              <div className="score-denom">out of 100</div>
            </div>
          </div>
          <div className={`score-grade-badge grade-${scoreClass}`}>{getGradeLabel(overall)}</div>
        </div>
      </div>

      {/* CATEGORY BREAKDOWN */}
      <div className="categories-label">Score Breakdown · 8 Dimensions</div>
      <div className="categories-grid">
        {catKeys.map((key) => {
          const cat = result.categories[key] || {} as CategoryData;
          const s = cat.score || 0;
          const cls = getScoreClass(s);

          return (
            <div key={key} className="cat-card">
              <div className="cat-card-top">
                <div className="cat-name">{cat.label || key}</div>
                <div className={`cat-score-pill pill-${cls}`}>{s}/100</div>
              </div>
              <div className="cat-bar-track">
                <div className={`cat-bar-fill bg-${cls}`} data-width={s}></div>
              </div>
              <div className="cat-summary">{cat.summary || ''}</div>
              <div className="cat-findings">
                {(cat.findings || []).map((finding, i) => {
                  const isPositive = !finding.toLowerCase().includes('no ') &&
                    !finding.toLowerCase().includes('missing') &&
                    !finding.toLowerCase().includes('lack') &&
                    !finding.toLowerCase().includes('weak') &&
                    !finding.toLowerCase().includes("doesn't") &&
                    !finding.toLowerCase().includes('limited');

                  return (
                    <div key={i} className="cat-finding">
                      <span className="cat-finding-icon">{isPositive ? '✦' : '◦'}</span>
                      <span>{finding}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* BENCHMARK BAR */}
      <div className="benchmark-section">
        <div className="benchmark-title">
          {isLargeFirm
            ? 'How You Stack Up Against Leading Institutional Firms'
            : 'How You Stack Up Against Elite Exemplars'
          }
        </div>
        <div className="benchmark-sub">
          {isLargeFirm
            ? 'Calibrated against leading institutional firms that excel in digital presence, thought leadership, and talent branding. Most firms score 20-35 points below this benchmark.'
            : 'Calibrated against 4 law firms that have each cracked a different dimension of brand. Most firms score 20–35 points below this benchmark.'
          }
        </div>
        <div className="benchmark-track">
          <div className="benchmark-avg-fill" style={{ width: `${avgExemplar}%` }}></div>
          <div className={`benchmark-firm-fill bg-${scoreClass}`} id="benchFirmFill"></div>
        </div>
        <div className="benchmark-labels">
          <span>0</span>
          <span>Industry Avg (~38)</span>
          <span>Your Score: {overall}</span>
          <span>Exemplar Avg ({avgExemplar})</span>
          <span>100</span>
        </div>
        <div className="benchmark-legend">
          <div className="legend-item">
            <div className="legend-dot" style={{ background: 'var(--surface-2)' }}></div>
            Exemplar avg
          </div>
          <div className="legend-item">
            <div className={`legend-dot bg-${scoreClass}`}></div>
            Your score
          </div>
        </div>
      </div>

      {/* TEASER: TOP STRENGTH + CRITICAL GAP */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px',
        marginBottom: '72px'
      }}>
        <div style={{
          background: 'var(--surface)',
          border: '1px solid rgba(45, 122, 82, 0.15)',
          padding: '28px 28px'
        }}>
          <div style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.55rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase' as const,
            color: 'var(--green)',
            marginBottom: '12px',
            fontWeight: 700
          }}>Top Strength</div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.95rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            lineHeight: '1.3'
          }}>{result.topStrength || 'Identified in audit'}</div>
        </div>
        <div style={{
          background: 'var(--surface)',
          border: '1px solid rgba(151, 112, 10, 0.15)',
          padding: '28px 28px',
          position: 'relative' as const,
          overflow: 'hidden' as const
        }}>
          <div style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.55rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase' as const,
            color: 'var(--yellow)',
            marginBottom: '12px',
            fontWeight: 700
          }}>Critical Gap</div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.95rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            lineHeight: '1.3'
          }}>{result.criticalGap || 'Revealed in full audit'}</div>
          <div style={{
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
            marginTop: '10px',
            lineHeight: '1.55',
            letterSpacing: '-0.01em'
          }}>Full breakdown + actionable fix included in your comprehensive audit.</div>
        </div>
      </div>

      {/* EXEMPLAR PANEL */}
      <div className="exemplar-section">
        <div className="exemplar-section-title">
          {isLargeFirm
            ? `Calibrated against ${exemplarFirms.length} leading institutional firms`
            : `Calibrated against ${exemplarFirms.length} exemplar firms`
          }
        </div>
        <div className="exemplar-grid">
          {exemplarFirms.map((firm, i) => (
            <div key={i} className="exemplar-card">
              <div className="exemplar-name">{firm.name}</div>
              <div className="exemplar-type">{firm.specialty}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="section-divider"></div>

      {/* CTA */}
      <div className="cta-section">
        <div className="cta-eyebrow">Ready to close the gap?</div>
        <div className="cta-title">Turn your score into a strategy.</div>
        <div className="cta-sub">
          Your scorecard shows you where you stand. A full brand audit shows you exactly what to fix, how to fix it, and in what order — with real examples from firms who&apos;ve done it.
        </div>
        <div className="cta-buttons">
          <a
            href={`mailto:scottknudson@rankings.io?subject=Brand Audit Request — ${encodeURIComponent(url)}&body=I just ran my brand score on Legal Brand Grader and would like to request a full comprehensive brand audit for ${encodeURIComponent(url)}. My overall score was ${overall}/100.`}
            className="cta-btn-primary"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8 19.79 19.79 0 01.03 1.16 2 2 0 012 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92v2z" />
            </svg>
            Request a Full Brand Audit
          </a>
          <a
            href={`mailto:scottknudson@rankings.io?subject=Legal Brand Hacks Download Request&body=I just scored my brand on Legal Brand Grader and would like to receive the Legal Brand Hacks 1-Pager. My firm website is: ${encodeURIComponent(url)}`}
            className="cta-btn-secondary"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Download Legal Brand Hacks
          </a>
        </div>
      </div>

      {/* SCORE AGAIN */}
      <div className="score-again">
        <button className="score-again-btn" onClick={onReset}>← Grade Another Firm</button>
      </div>
    </div>
  );
}
