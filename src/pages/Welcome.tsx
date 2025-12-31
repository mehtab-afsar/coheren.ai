import { ArrowRight } from 'lucide-react';
import { useStore } from '../store/useStore';
import { tokens, layout, text, button, hoverHandlers } from '../design-system';

export default function Welcome() {
  const setStep = useStore((state) => state.setStep);

  return (
    <div style={layout.fullPageCentered}>
      <div style={{
        ...layout.contentContainer('448px'),
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: tokens.spacing['2xl'] }}>
          <h1 style={text.display}>
            CONSIST
          </h1>
          <div style={{
            height: '1px',
            width: '96px',
            backgroundColor: tokens.colors.primary,
            margin: '0 auto'
          }} />
        </div>

        <p style={{
          ...text.h2,
          color: tokens.colors.text.secondary,
          marginBottom: tokens.spacing['2xl']
        }}>
          Your everyday ally for building consistency
        </p>

        <div style={{ marginBottom: tokens.spacing['2xl'] }}>
          <p style={text.body}>
            Stop planning. Start doing.
          </p>
          <p style={{
            ...text.body,
            marginTop: tokens.spacing.lg
          }}>
            I'll learn who you are, build your roadmap, and hold your hand every single day until the habit is yours.
          </p>
        </div>

        <button
          onClick={() => setStep(1)}
          style={{
            ...button.primary,
            borderRadius: tokens.borderRadius.full,
            letterSpacing: '0.05em',
          }}
          {...hoverHandlers.darkBg}
        >
          <span>Get Started</span>
          <ArrowRight size={16} />
        </button>

        <p style={{
          ...text.caption,
          marginTop: tokens.spacing.lg
        }}>
          5 minutes to your personalized roadmap
        </p>
      </div>
    </div>
  );
}
