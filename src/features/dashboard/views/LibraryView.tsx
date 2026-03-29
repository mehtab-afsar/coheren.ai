import React, { useState } from 'react';
import { useStore } from '@core/store/useStore';
import { ap } from '@core/design-system/appleTokens';
import { Chip, Label, Tile, Divider } from '@core/design-system/AppleUI';

export default function LibraryView() {
  const agentRoadmapV2 = useStore(s => s.agentRoadmapV2);
  const [sourcesExpanded, setSourcesExpanded] = useState(false);

  // Empty state — no roadmap yet
  if (!agentRoadmapV2) {
    return (
      <div style={{ fontFamily: ap.font }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', color: ap.textPrimary, margin: '0 0 24px' }}>Library</h1>
        <Tile>
          <div style={{ padding: '32px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📚</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: ap.textPrimary, marginBottom: 8 }}>No framework yet</div>
            <div style={{ fontSize: 13, color: ap.textSecondary }}>Complete onboarding to see which framework was selected for your goal.</div>
          </div>
        </Tile>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: ap.font }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', color: ap.textPrimary, margin: '0 0 24px' }}>Library</h1>

      {/* Section 1: Your Framework */}
      <div style={{ marginBottom: 24 }}>
        <Label left="Your Framework" />
        <Tile>
          <div style={{ padding: '20px 22px' }}>
            {/* Framework name */}
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: ap.accent, marginBottom: 12 }}>
              {agentRoadmapV2.frameworkName}
            </div>

            {/* Why chosen */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: ap.textTertiary, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Why this was chosen for you
              </div>
              <div style={{ fontSize: 14, color: ap.textSecondary, lineHeight: 1.6 }}>
                {agentRoadmapV2.frameworkReason}
              </div>
            </div>

            <Divider />

            {/* The science */}
            <div style={{ paddingTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: ap.textTertiary, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                The science
              </div>
              <div style={{ fontSize: 13.5, color: ap.textSecondary, lineHeight: 1.6, fontStyle: 'italic' }}>
                "{agentRoadmapV2.frameworkScience}"
              </div>
            </div>
          </div>
        </Tile>
      </div>

      {/* Section 2: How It Applies to Your Curriculum */}
      <div style={{ marginBottom: 24 }}>
        <Label left="How It Applies to Your Curriculum" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {agentRoadmapV2.months.map(month => {
            const stoneAdjustments = Object.entries(agentRoadmapV2.modifiers_from_stones ?? {});
            return (
              <Tile key={month.month}>
                <div style={{ padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <Chip label={`Month ${month.month}`} color={ap.textSecondary} bg={ap.surfaceAlt} />
                    <span style={{ fontSize: 15, fontWeight: 650 as React.CSSProperties['fontWeight'], color: ap.textPrimary }}>{month.title}</span>
                  </div>

                  <div style={{ fontSize: 13, color: ap.textSecondary, lineHeight: 1.55, marginBottom: month.scienceRationale ? 12 : 0 }}>
                    {month.scienceRationale}
                  </div>

                  {/* Stone adjustments for this phase — only on month 1 */}
                  {stoneAdjustments.length > 0 && month.month === 1 && (
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {stoneAdjustments.map(([stone, mods]) => (
                        <div key={stone} style={{
                          backgroundColor: ap.amberSoft, border: `1px solid rgba(212,136,15,.15)`,
                          borderRadius: 8, padding: '8px 12px',
                        }}>
                          <span style={{ fontSize: 11, fontWeight: 650 as React.CSSProperties['fontWeight'], color: ap.amber }}>{stone} adjustment: </span>
                          <span style={{ fontSize: 12, color: ap.textSecondary }}>
                            {mods.added.length > 0 ? mods.added[0] : mods.modified.length > 0 ? mods.modified[0] : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Tile>
            );
          })}
        </div>
      </div>

      {/* Section 3: What Informed This (expandable) */}
      {agentRoadmapV2.frameworkSources && agentRoadmapV2.frameworkSources.length > 0 && (
        <div>
          <Tile style={{ overflow: 'hidden' }}>
            <div
              onClick={() => setSourcesExpanded(!sourcesExpanded)}
              style={{
                padding: '14px 18px', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: ap.textPrimary }}>
                What Informed This
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: ap.textTertiary }}>
                  {agentRoadmapV2.frameworkSources.length} sources
                </span>
                <span style={{ color: ap.textTertiary, fontSize: 12, transform: sourcesExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
              </div>
            </div>
            {sourcesExpanded && (
              <>
                <Divider />
                <div style={{ padding: '0 18px 16px' }}>
                  {agentRoadmapV2.frameworkSources.map((src, i) => (
                    <div key={i} style={{ paddingTop: 12 }}>
                      {i > 0 && <Divider />}
                      <div style={{ paddingTop: i > 0 ? 12 : 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: ap.textPrimary }}>{src.title}</div>
                        <div style={{ fontSize: 12, color: ap.textTertiary, marginTop: 2 }}>{src.author}</div>
                        <div style={{ fontSize: 12, color: ap.textSecondary, marginTop: 4, lineHeight: 1.5 }}>{src.note}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Tile>
        </div>
      )}
    </div>
  );
}
