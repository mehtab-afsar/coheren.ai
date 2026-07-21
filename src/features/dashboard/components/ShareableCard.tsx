import { useRef, useEffect } from 'react';
import { Download, Share2, X } from 'lucide-react';
import { tokens } from '@core/design-system';

interface Props {
  streak: number;
  tasksCompleted: number;
  hoursInvested: number;
  domain: string;
  onClose: () => void;
}

export default function ShareableCard({ streak, tasksCompleted, hoursInvested, domain, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 480;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 800, 480);
    grad.addColorStop(0, '#2e1065');
    grad.addColorStop(1, '#0f0a1e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 480);

    // Purple radial glow top-right
    const radial = ctx.createRadialGradient(640, 120, 0, 640, 120, 400);
    radial.addColorStop(0, 'rgba(221, 161, 137,0.18)');
    radial.addColorStop(1, 'transparent');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, 800, 480);

    // Top label
    ctx.font = 'bold 22px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(196,181,253,0.45)';
    ctx.fillText('MY PROGRESS', 48, 72);

    // Domain / goal
    ctx.font = 'bold 40px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = '#f3e8ff';
    const domainText = domain.length > 28 ? domain.slice(0, 28) + '…' : domain;
    ctx.fillText(domainText, 48, 130);

    // Divider line
    ctx.strokeStyle = 'rgba(221, 161, 137,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(48, 158);
    ctx.lineTo(752, 158);
    ctx.stroke();

    // Stats
    const stats = [
      { label: 'Day Streak', value: `${streak}`, emoji: '🔥' },
      { label: 'Tasks Done', value: String(tasksCompleted), emoji: '✅' },
      { label: 'Hours In',   value: `${hoursInvested}h`, emoji: '⏱' },
    ];

    stats.forEach((stat, i) => {
      const x = 48 + i * 246;

      // Value
      ctx.font = `bold 56px -apple-system, system-ui, sans-serif`;
      ctx.fillStyle = '#E3B9A5';
      ctx.fillText(stat.value, x, 270);

      // Label
      ctx.font = '20px -apple-system, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(196,181,253,0.5)';
      ctx.fillText(`${stat.emoji} ${stat.label}`, x, 310);
    });

    // Bottom divider
    ctx.strokeStyle = 'rgba(221, 161, 137,0.12)';
    ctx.beginPath();
    ctx.moveTo(48, 370);
    ctx.lineTo(752, 370);
    ctx.stroke();

    // Branding
    ctx.font = '18px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(196,181,253,0.28)';
    ctx.fillText('coheren.ai — AI Habit Coach', 48, 420);
  }, [streak, tasksCompleted, hoursInvested, domain]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = 'coheren-achievement.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  };

  const handleShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) { handleDownload(); return; }
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'My Coheren Progress',
            text: `${streak} day streak · ${tasksCompleted} tasks done on Coheren!`,
            files: [new File([blob], 'coheren-achievement.png', { type: 'image/png' })],
          });
        } catch {
          handleDownload();
        }
      } else {
        handleDownload();
      }
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '24px',
        backdropFilter: 'blur(6px)',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: tokens.colors.surface,
          border: `1px solid ${tokens.colors.borderLight}`,
          borderRadius: tokens.borderRadius.xl,
          padding: tokens.spacing['2xl'],
          maxWidth: '440px',
          width: '100%',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacing.lg }}>
          <h2 style={{
            fontSize: tokens.typography.sizes.lg,
            fontWeight: tokens.typography.weights.semibold,
            color: tokens.colors.text.primary,
            margin: 0,
            letterSpacing: '-0.02em',
          }}>
            Share Achievement
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
          >
            <X size={18} color={tokens.colors.text.tertiary} />
          </button>
        </div>

        {/* Canvas preview */}
        <div style={{
          borderRadius: tokens.borderRadius.lg,
          overflow: 'hidden',
          marginBottom: tokens.spacing.xl,
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        }}>
          <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: 'auto' }} />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: tokens.spacing.sm }}>
          <button
            onClick={handleShare}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: `${tokens.spacing.md} ${tokens.spacing.lg}`,
              backgroundColor: '#C4552D',
              color: '#fff',
              border: 'none',
              borderRadius: tokens.borderRadius.md,
              cursor: 'pointer',
              fontSize: tokens.typography.sizes.sm,
              fontWeight: tokens.typography.weights.medium,
            }}
          >
            <Share2 size={14} />
            Share
          </button>
          <button
            onClick={handleDownload}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: `${tokens.spacing.md} ${tokens.spacing.lg}`,
              backgroundColor: 'transparent',
              color: tokens.colors.text.primary,
              border: `1px solid ${tokens.colors.borderLight}`,
              borderRadius: tokens.borderRadius.md,
              cursor: 'pointer',
              fontSize: tokens.typography.sizes.sm,
              fontWeight: tokens.typography.weights.medium,
            }}
          >
            <Download size={14} />
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
