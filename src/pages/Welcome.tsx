import { ArrowRight } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function Welcome() {
  const setStep = useStore((state) => state.setStep);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'white',
      padding: '24px'
    }}>
      <div style={{ maxWidth: '448px', width: '100%', textAlign: 'center' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{
            fontSize: '60px',
            fontWeight: 300,
            letterSpacing: '-0.02em',
            color: 'black',
            marginBottom: '12px'
          }}>
            CONSIST
          </h1>
          <div style={{
            height: '1px',
            width: '96px',
            backgroundColor: 'black',
            margin: '0 auto'
          }} />
        </div>

        <p style={{
          fontSize: '20px',
          fontWeight: 300,
          color: '#666',
          marginBottom: '32px'
        }}>
          Your everyday ally for building consistency
        </p>

        <div style={{ marginBottom: '32px' }}>
          <p style={{
            fontSize: '14px',
            fontWeight: 300,
            color: '#999',
            lineHeight: 1.6
          }}>
            Stop planning. Start doing.
          </p>
          <p style={{
            fontSize: '14px',
            fontWeight: 300,
            color: '#999',
            lineHeight: 1.6,
            marginTop: '16px'
          }}>
            I'll learn who you are, build your roadmap, and hold your hand every single day until the habit is yours.
          </p>
        </div>

        <button
          onClick={() => setStep(1)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '16px 32px',
            backgroundColor: 'black',
            color: 'white',
            border: 'none',
            borderRadius: '9999px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 300,
            letterSpacing: '0.05em',
            transition: 'background-color 0.3s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#333'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'black'}
        >
          <span>Get Started</span>
          <ArrowRight size={16} />
        </button>

        <p style={{
          fontSize: '12px',
          fontWeight: 300,
          color: '#ccc',
          marginTop: '16px'
        }}>
          5 minutes to your personalized roadmap
        </p>
      </div>
    </div>
  );
}
