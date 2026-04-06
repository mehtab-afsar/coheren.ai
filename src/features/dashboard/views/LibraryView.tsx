import { useState } from 'react';
import { useStore } from '@core/store/useStore';

// Severity color map for stone cards
const SEVERITY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  Low:      { bg: 'rgba(34,197,94,0.06)',   border: 'rgba(34,197,94,0.20)',   text: '#16a34a' },
  Moderate: { bg: 'rgba(245,158,11,0.06)',  border: 'rgba(245,158,11,0.20)',  text: '#d97706' },
  High:     { bg: 'rgba(239,68,68,0.06)',   border: 'rgba(239,68,68,0.20)',   text: '#dc2626' },
  Critical: { bg: 'rgba(124,58,237,0.06)',  border: 'rgba(124,58,237,0.20)', text: '#7c3aed' },
};

export default function LibraryView() {
  const agentRoadmapV2 = useStore(s => s.agentRoadmapV2);
  const stoneProfile = useStore(s => s.stoneProfile);
  const [sourcesExpanded, setSourcesExpanded] = useState(false);

  const stones = stoneProfile?.stoneProfile?.stones ?? [];
  const modifiers = agentRoadmapV2?.modifiers_from_stones ?? {};

  // Empty state
  if (!agentRoadmapV2) {
    return (
      <div style={{ fontFamily: 'var(--c-font-body)' }}>
        <h1 style={{
          fontFamily: 'var(--c-font-display)',
          fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em',
          color: 'var(--c-text-primary)', margin: '0 0 24px',
        }}>
          Library
        </h1>
        <div style={{
          padding: '40px 24px', textAlign: 'center',
          backgroundColor: '#ffffff',
          border: '1px solid var(--c-border-subtle)',
          borderRadius: 12,
        }}>
          <p style={{ fontSize: 15, color: 'var(--c-text-tertiary)', margin: 0 }}>
            Complete onboarding to see which framework was selected for your goal.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'var(--c-font-body)', paddingBottom: 80 }}>

      {/* Section: Your Framework */}
      <div style={{ marginBottom: 32 }}>

        {/* Micro caps label */}
        <div style={{
          fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: 'var(--c-text-quaternary)',
          marginBottom: 16,
        }}>
          Your Learning Framework
        </div>

        {/* Framework name — H1 Fraunces */}
        <h1 style={{
          fontFamily: 'var(--c-font-display)',
          fontSize: 32, fontWeight: 500,
          letterSpacing: '-0.02em',
          color: 'var(--c-text-primary)',
          margin: '0 0 4px',
        }}>
          {agentRoadmapV2.frameworkName}
        </h1>
        <p style={{
          fontSize: 13, color: 'var(--c-text-tertiary)',
          margin: '0 0 20px',
        }}>
          {agentRoadmapV2.frameworkReason}
        </p>

        {/* Science quote — Fraunces italic */}
        {agentRoadmapV2.frameworkScience && (
          <div style={{
            padding: '18px 20px',
            backgroundColor: 'var(--c-accent-purple-soft)',
            border: '1px solid var(--c-accent-purple-border)',
            borderRadius: 10,
            marginBottom: 20,
          }}>
            <p style={{
              fontFamily: 'var(--c-font-display)',
              fontStyle: 'italic',
              fontSize: 16,
              color: 'var(--c-text-primary)',
              lineHeight: 1.65,
              margin: 0,
            }}>
              "{agentRoadmapV2.frameworkScience}"
            </p>
          </div>
        )}

        {/* How it shapes your plan — phase table */}
        {agentRoadmapV2.months.length > 0 && (
          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid var(--c-border-subtle)',
            borderRadius: 10,
            overflow: 'hidden',
            boxShadow: 'var(--c-shadow-card)',
          }}>
            <div style={{
              padding: '12px 16px 8px',
              borderBottom: '1px solid var(--c-border-subtle)',
            }}>
              <span style={{
                fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: 'var(--c-text-quaternary)',
              }}>
                How It Shapes Your Plan
              </span>
            </div>
            {agentRoadmapV2.months.map((month, idx) => (
              <div key={month.month} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '12px 16px',
                borderTop: idx > 0 ? '1px solid var(--c-border-subtle)' : 'none',
              }}>
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  color: 'var(--c-text-quaternary)',
                  minWidth: 80, paddingTop: 1,
                }}>
                  {month.title?.split(' · ')[0] ?? `Phase ${idx + 1}`}
                </span>
                <span style={{
                  fontSize: 13,
                  color: 'var(--c-text-secondary)',
                  lineHeight: 1.5,
                  flex: 1,
                }}>
                  {month.scienceRationale ?? month.phaseName ?? ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section: Your Personal Adjustments */}
      {(stones.length > 0 || Object.keys(modifiers).length > 0) && (
        <div style={{ marginBottom: 32 }}>
          <div style={{
            fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'var(--c-text-quaternary)',
            marginBottom: 12,
          }}>
            Your Personal Adjustments
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stones.map(stone => {
              const sev = stone.severity ?? 'Low';
              const colors = SEVERITY_COLORS[sev] ?? SEVERITY_COLORS.Low;
              const mod = modifiers[stone.type];
              const description = mod?.added?.[0] ?? mod?.modified?.[0] ?? stone.trigger ?? '';

              return (
                <div key={stone.type} style={{
                  padding: '14px 16px',
                  backgroundColor: colors.bg,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 10,
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: description ? 6 : 0,
                  }}>
                    <span style={{
                      fontSize: 13, fontWeight: 600,
                      color: 'var(--c-text-primary)',
                    }}>
                      {stone.type}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 600,
                      color: colors.text,
                      backgroundColor: `${colors.border}`,
                      padding: '1px 6px',
                      borderRadius: 9999,
                    }}>
                      {sev}
                    </span>
                  </div>
                  {description && (
                    <p style={{
                      fontSize: 12,
                      color: 'var(--c-text-secondary)',
                      margin: 0,
                      lineHeight: 1.5,
                    }}>
                      {description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section: Research Sources */}
      {agentRoadmapV2.frameworkSources && agentRoadmapV2.frameworkSources.length > 0 && (
        <div>
          <div style={{
            fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'var(--c-text-quaternary)',
            marginBottom: 12,
          }}>
            Research Sources
          </div>

          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid var(--c-border-subtle)',
            borderRadius: 10,
            overflow: 'hidden',
            boxShadow: 'var(--c-shadow-card)',
          }}>
            <button
              onClick={() => setSourcesExpanded(!sourcesExpanded)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '14px 16px',
                background: 'none', border: 'none', cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--c-text-secondary)' }}>
                {agentRoadmapV2.frameworkSources.length} sources
              </span>
              <span style={{
                color: 'var(--c-text-quaternary)',
                fontSize: 14,
                transform: sourcesExpanded ? 'rotate(90deg)' : 'none',
                transition: 'transform 0.2s ease',
              }}>
                ›
              </span>
            </button>

            {sourcesExpanded && (
              <div style={{ borderTop: '1px solid var(--c-border-subtle)', padding: '8px 0' }}>
                {agentRoadmapV2.frameworkSources.map((src, i) => (
                  <div key={i} style={{
                    padding: '10px 16px',
                    borderTop: i > 0 ? '1px solid var(--c-border-subtle)' : 'none',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text-primary)' }}>
                      {src.title}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--c-text-tertiary)', marginTop: 2 }}>
                      {src.author}
                    </div>
                    {src.note && (
                      <div style={{
                        fontSize: 12, color: 'var(--c-text-secondary)',
                        marginTop: 4, lineHeight: 1.5,
                      }}>
                        {src.note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
