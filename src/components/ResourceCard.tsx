/**
 * Resource Card Component
 *
 * Displays learning resources (videos, articles, tools) for each task.
 * Supports embedded YouTube videos, clickable links, and thumbnails.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Play, BookOpen, Wrench, FileText, ThumbsUp, ThumbsDown } from 'lucide-react';
import { tokens } from '../design-system';

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
}

interface ResourceCardProps {
  primary: TaskResource | null;
  supplementary?: TaskResource[];
  onRateHelpful?: (resource: TaskResource) => void;
  onRateNotHelpful?: (resource: TaskResource) => void;
}

// Extract YouTube video ID from URL - Bulletproof version
function getYouTubeId(url: string): string | null {
  if (!url) return null;

  // Handle multiple YouTube URL formats
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);

  // Validate the ID is 11 characters (YouTube standard)
  return (match && match[2].length === 11) ? match[2] : null;
}

export default function ResourceCard({
  primary,
  supplementary = [],
  onRateHelpful,
  onRateNotHelpful
}: ResourceCardProps) {
  const [showVideo, setShowVideo] = useState(false);
  const [helpfulVoted, setHelpfulVoted] = useState(false);
  const [notHelpfulVoted, setNotHelpfulVoted] = useState(false);

  if (!primary) return null;

  const videoId = primary.type === 'video' ? getYouTubeId(primary.url) : null;

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
        {/* Video Embed */}
        {primary.type === 'video' && videoId && (
          <div style={{ marginBottom: tokens.spacing.md }}>
            {showVideo ? (
              <div style={{
                position: 'relative',
                paddingBottom: '56.25%', // 16:9 aspect ratio
                height: 0,
                overflow: 'hidden',
                borderRadius: tokens.borderRadius.xl
              }}>
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}`}
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
                {/* Thumbnail or placeholder */}
                {primary.thumbnail ? (
                  <img
                    src={primary.thumbnail}
                    alt={primary.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Play size={64} color="white" />
                  </div>
                )}

                {/* Play overlay */}
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
            {primary.duration && <span>⏱️ {primary.duration}</span>}
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

          {/* External link */}
          {primary.type !== 'video' && (
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
