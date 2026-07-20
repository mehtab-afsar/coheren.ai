/**
 * Resource Card Component
 *
 * Displays learning resources (videos, articles, tools) for each task.
 * Supports embedded YouTube videos, clickable links, and thumbnails.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Play, BookOpen, Wrench, FileText, ThumbsUp, ThumbsDown, X } from 'lucide-react';
import { tokens } from '@core/design-system';
import { useBreakpoint } from '@hooks/useBreakpoint';
import { getYouTubeId, isYouTubeSearchUrl, extractYouTubeSearchQuery, timeToSeconds } from '@lib/youtube';

interface TaskResource {
  type: 'video' | 'article' | 'interactive' | 'image' | 'pdf' | 'tool' | 'playlist';
  title: string;
  url: string;
  platform?: string;
  channel?: string;
  duration?: string;
  thumbnail?: string;
  description: string;
  why: string;
  timestamps?: Record<string, string>;
  watchFrom?: string;    // e.g. "0:05:00"
  watchTo?: string;      // e.g. "0:20:00"
  watchMinutes?: number; // planned watch time in minutes
}

interface ResourceCardProps {
  primary: TaskResource | null;
  supplementary?: TaskResource[];
  onRateHelpful?: (resource: TaskResource) => void;
  onRateNotHelpful?: (resource: TaskResource) => void;
}

// YouTube helpers now live in @lib/youtube (shared with the resource producer side).

export default function ResourceCard({
  primary,
  supplementary = [],
  onRateHelpful,
  onRateNotHelpful
}: ResourceCardProps) {
  const { isMobile } = useBreakpoint();
  const [showVideo, setShowVideo] = useState(false);
  const [helpfulVoted, setHelpfulVoted] = useState(false);
  const [notHelpfulVoted, setNotHelpfulVoted] = useState(false);
  const [showReader, setShowReader] = useState(false);
  const [readerUrl, setReaderUrl] = useState('');

  if (!primary) return null;

  const videoId = primary.type === 'video' ? getYouTubeId(primary.url) : null;

  // Whether this video has a specific time window to show
  const isTimeCropped = !!(primary.watchFrom && primary.watchTo);

  // Build YouTube embed URL with optional start/end time
  const embedUrl = videoId
    ? (() => {
        const params = new URLSearchParams();
        if (primary.watchFrom) params.set('start', String(timeToSeconds(primary.watchFrom)));
        if (primary.watchTo) params.set('end', String(timeToSeconds(primary.watchTo)));
        // Autoplay when showing a cropped segment directly
        if (isTimeCropped) params.set('autoplay', '1');
        const qs = params.toString();
        return `https://www.youtube.com/embed/${videoId}${qs ? `?${qs}` : ''}`;
      })()
    : null;

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'video': return <Play size={16} />;
      case 'article': return <BookOpen size={16} />;
      case 'tool': return <Wrench size={16} />;
      case 'interactive': return <Wrench size={16} />;
      default: return <FileText size={16} />;
    }
  };

  return (
    <div style={{
      backgroundColor: tokens.colors.surface,
      borderRadius: tokens.borderRadius['2xl'],
      padding: tokens.spacing.xl,
      border: `1px solid ${tokens.colors.border}`,
      marginBottom: tokens.spacing.lg
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing.sm,
        marginBottom: tokens.spacing.md
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: tokens.borderRadius.lg,
          backgroundColor: `${tokens.colors.primary}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: tokens.colors.primary
        }}>
          {getResourceIcon(primary.type)}
        </div>
        <h3 style={{
          fontSize: tokens.typography.sizes.lg,
          fontWeight: tokens.typography.weights.medium,
          color: tokens.colors.text.primary
        }}>
          Learn from the best
        </h3>
      </div>

      {/* Primary Resource */}
      <div style={{
        marginBottom: supplementary.length > 0 ? tokens.spacing.lg : 0
      }}>
        {/* YouTube Search Card — shown when the URL is a search query, not a direct embed */}
        {primary.type === 'video' && !videoId && isYouTubeSearchUrl(primary.url) && (() => {
          const query = extractYouTubeSearchQuery(primary.url);
          return (
            <a
              href={primary.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: tokens.spacing.md,
                marginBottom: tokens.spacing.md,
                padding: tokens.spacing.lg,
                backgroundColor: 'rgba(255, 0, 0, 0.05)',
                border: '1px solid rgba(255, 0, 0, 0.2)',
                borderRadius: tokens.borderRadius.xl,
                textDecoration: 'none',
                transition: 'background-color 0.2s',
              }}
            >
              {/* YouTube logo circle */}
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: tokens.borderRadius.lg,
                backgroundColor: '#FF0000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Play size={20} color="white" fill="white" />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: tokens.typography.sizes.sm,
                  fontWeight: tokens.typography.weights.medium,
                  color: tokens.colors.text.primary,
                  marginBottom: '2px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  🔎 Search: &ldquo;{query}&rdquo;
                </p>
                <p style={{
                  fontSize: tokens.typography.sizes.xs,
                  color: tokens.colors.text.tertiary,
                }}>
                  Opens YouTube — find the best tutorial for you
                </p>
              </div>

              <ExternalLink size={16} color={tokens.colors.text.tertiary} style={{ flexShrink: 0 }} />
            </a>
          );
        })()}

        {/* Video Embed */}
        {primary.type === 'video' && videoId && (
          <div style={{ marginBottom: tokens.spacing.md }}>
            {isTimeCropped ? (
              /* Time-cropped: show the clip directly, no click required */
              <div style={{
                position: 'relative',
                paddingBottom: '56.25%',
                height: 0,
                overflow: 'hidden',
                borderRadius: tokens.borderRadius.xl,
                boxShadow: tokens.shadows.md,
              }}>
                <iframe
                  src={embedUrl ?? ''}
                  title={primary.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    border: 'none'
                  }}
                />
              </div>
            ) : showVideo ? (
              <div style={{
                position: 'relative',
                paddingBottom: '56.25%',
                height: 0,
                overflow: 'hidden',
                borderRadius: tokens.borderRadius.xl
              }}>
                <iframe
                  src={embedUrl ?? ''}
                  title={primary.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    border: 'none'
                  }}
                />
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowVideo(true)}
                style={{
                  width: '100%',
                  position: 'relative',
                  borderRadius: tokens.borderRadius.xl,
                  overflow: 'hidden',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: tokens.colors.gray[900],
                  aspectRatio: '16/9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {primary.thumbnail ? (
                  <img
                    src={primary.thumbnail}
                    alt={primary.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Play size={64} color="white" />
                  </div>
                )}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '80px',
                  height: '80px',
                  borderRadius: tokens.borderRadius.full,
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}>
                  <Play size={32} color={tokens.colors.primary} fill={tokens.colors.primary} />
                </div>
              </motion.button>
            )}
          </div>
        )}

        {/* Resource Info */}
        <div style={{ marginBottom: tokens.spacing.md }}>
          <h4 style={{
            fontSize: tokens.typography.sizes.base,
            fontWeight: tokens.typography.weights.medium,
            color: tokens.colors.text.primary,
            marginBottom: tokens.spacing.xs
          }}>
            {primary.title}
          </h4>

          {/* Metadata */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.md,
            fontSize: tokens.typography.sizes.sm,
            color: tokens.colors.text.tertiary,
            marginBottom: tokens.spacing.sm
          }}>
            {primary.channel && <span>📺 {primary.channel}</span>}
            {primary.watchMinutes
              ? <span style={{ color: tokens.colors.primary, fontWeight: tokens.typography.weights.medium }}>▶ Watch ~{primary.watchMinutes} min</span>
              : primary.duration && <span>⏱️ {primary.duration}</span>}
            {primary.platform && !primary.channel && <span>{primary.platform}</span>}
          </div>

          {/* Why this resource */}
          <p style={{
            fontSize: tokens.typography.sizes.sm,
            color: tokens.colors.text.secondary,
            lineHeight: 1.6,
            marginBottom: tokens.spacing.sm
          }}>
            <strong>Why this:</strong> {primary.why}
          </p>

          {/* Timestamps */}
          {primary.timestamps && Object.keys(primary.timestamps).length > 0 && (
            <div style={{
              padding: tokens.spacing.sm,
              backgroundColor: `${tokens.colors.primary}08`,
              borderRadius: tokens.borderRadius.lg,
              marginBottom: tokens.spacing.sm
            }}>
              <p style={{
                fontSize: tokens.typography.sizes.xs,
                fontWeight: tokens.typography.weights.medium,
                color: tokens.colors.text.secondary,
                marginBottom: tokens.spacing.xs
              }}>
                Key sections:
              </p>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: tokens.spacing.xs
              }}>
                {Object.entries(primary.timestamps).map(([label, time]) => (
                  <div key={label} style={{
                    fontSize: tokens.typography.sizes.xs,
                    color: tokens.colors.text.tertiary,
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span>{label}</span>
                    <span style={{ color: tokens.colors.primary, fontWeight: tokens.typography.weights.medium }}>
                      {time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Open resource — in-app reader for articles, external for tools */}
          {primary.type !== 'video' && (
            <div style={{ display: 'flex', gap: tokens.spacing.sm, flexWrap: 'wrap' }}>
              {(primary.type === 'article' || primary.type === 'pdf') ? (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setReaderUrl(primary.url); setShowReader(true); }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: tokens.spacing.xs,
                    padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
                    backgroundColor: tokens.colors.primary,
                    color: 'white',
                    border: 'none',
                    borderRadius: tokens.borderRadius.lg,
                    fontSize: tokens.typography.sizes.sm,
                    fontWeight: tokens.typography.weights.medium,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <BookOpen size={14} /> Read inside app
                </motion.button>
              ) : (
                <a
                  href={primary.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: tokens.spacing.xs,
                    padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
                    backgroundColor: tokens.colors.primary,
                    color: 'white',
                    borderRadius: tokens.borderRadius.lg,
                    fontSize: tokens.typography.sizes.sm,
                    fontWeight: tokens.typography.weights.medium,
                    textDecoration: 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  Open Resource <ExternalLink size={14} />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Rating */}
        <div style={{
          display: 'flex',
          gap: tokens.spacing.sm,
          paddingTop: tokens.spacing.md,
          borderTop: `1px solid ${tokens.colors.border}`
        }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setHelpfulVoted(true);
              setNotHelpfulVoted(false);
              onRateHelpful?.(primary);
            }}
            style={{
              flex: 1,
              padding: tokens.spacing.sm,
              borderRadius: tokens.borderRadius.lg,
              border: helpfulVoted
                ? `2px solid ${tokens.colors.success}`
                : `1px solid ${tokens.colors.border}`,
              backgroundColor: helpfulVoted
                ? `${tokens.colors.success}15`
                : 'transparent',
              color: helpfulVoted ? tokens.colors.success : tokens.colors.text.secondary,
              fontSize: tokens.typography.sizes.sm,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: tokens.spacing.xs,
              transition: 'all 0.2s'
            }}
          >
            <ThumbsUp size={14} />
            Helpful
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setNotHelpfulVoted(true);
              setHelpfulVoted(false);
              onRateNotHelpful?.(primary);
            }}
            style={{
              flex: 1,
              padding: tokens.spacing.sm,
              borderRadius: tokens.borderRadius.lg,
              border: notHelpfulVoted
                ? `2px solid ${tokens.colors.warning}`
                : `1px solid ${tokens.colors.border}`,
              backgroundColor: notHelpfulVoted
                ? `${tokens.colors.warning}15`
                : 'transparent',
              color: notHelpfulVoted ? tokens.colors.warning : tokens.colors.text.secondary,
              fontSize: tokens.typography.sizes.sm,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: tokens.spacing.xs,
              transition: 'all 0.2s'
            }}
          >
            <ThumbsDown size={14} />
            Not helpful
          </motion.button>
        </div>
      </div>

      {/* In-App Reader Overlay */}
      {showReader && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
          }}
          onClick={() => setShowReader(false)}
        >
          {/* Backdrop */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
          }} />

          {/* Panel — full-screen on mobile, 65% slide-in from right on desktop */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              marginLeft: isMobile ? 0 : 'auto',
              width: isMobile ? '100%' : '65%',
              maxWidth: isMobile ? 'none' : '900px',
              height: '100%',
              backgroundColor: tokens.colors.surface,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: isMobile ? 'none' : '-8px 0 40px rgba(0,0,0,0.2)',
            }}
          >
            {/* Panel Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: `${tokens.spacing.md} ${tokens.spacing.xl}`,
              borderBottom: `1px solid ${tokens.colors.border}`,
              backgroundColor: tokens.colors.background,
              flexShrink: 0,
            }}>
              <span style={{
                fontSize: tokens.typography.sizes.sm,
                fontWeight: tokens.typography.weights.medium,
                color: tokens.colors.text.secondary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '70%',
              }}>
                {primary.title}
              </span>
              <div style={{ display: 'flex', gap: tokens.spacing.sm, alignItems: 'center', flexShrink: 0 }}>
                <a
                  href={readerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: tokens.spacing.xs,
                    fontSize: tokens.typography.sizes.xs,
                    color: tokens.colors.text.tertiary,
                    textDecoration: 'none',
                    padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
                    borderRadius: tokens.borderRadius.sm,
                    border: `1px solid ${tokens.colors.border}`,
                  }}
                >
                  <ExternalLink size={12} />
                  Open in browser
                </a>
                <button
                  onClick={() => setShowReader(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: tokens.colors.text.secondary,
                    borderRadius: tokens.borderRadius.sm,
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* iframe */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
              <iframe
                src={readerUrl}
                title={primary.title}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
              {/* Fallback note — always visible at bottom in case iframe is blocked */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: `${tokens.spacing.sm} ${tokens.spacing.xl}`,
                backgroundColor: tokens.colors.background + 'e0',
                borderTop: `1px solid ${tokens.colors.borderLight}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: tokens.spacing.sm,
                fontSize: tokens.typography.sizes.xs,
                color: tokens.colors.text.tertiary,
              }}>
                Content not loading?
                <a
                  href={readerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: tokens.colors.primary,
                    textDecoration: 'none',
                    fontWeight: tokens.typography.weights.medium,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  Open in browser <ExternalLink size={11} />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Supplementary Resources */}
      {supplementary.length > 0 && (
        <div style={{
          paddingTop: tokens.spacing.lg,
          borderTop: `1px solid ${tokens.colors.border}`
        }}>
          <p style={{
            fontSize: tokens.typography.sizes.sm,
            fontWeight: tokens.typography.weights.medium,
            color: tokens.colors.text.secondary,
            marginBottom: tokens.spacing.sm
          }}>
            Additional resources:
          </p>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: tokens.spacing.sm
          }}>
            {supplementary.map((resource, index) => (
              <a
                key={index}
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spacing.sm,
                  padding: tokens.spacing.sm,
                  backgroundColor: tokens.colors.background,
                  borderRadius: tokens.borderRadius.lg,
                  border: `1px solid ${tokens.colors.border}`,
                  fontSize: tokens.typography.sizes.sm,
                  color: tokens.colors.text.primary,
                  textDecoration: 'none',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: tokens.borderRadius.md,
                  backgroundColor: `${tokens.colors.primary}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: tokens.colors.primary
                }}>
                  {getResourceIcon(resource.type)}
                </div>
                <span style={{ flex: 1 }}>{resource.title}</span>
                <ExternalLink size={14} color={tokens.colors.text.tertiary} />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
