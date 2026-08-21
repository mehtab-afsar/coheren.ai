import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { DitheringShader } from '@shared/components/ui/dithering-shader';
import GoogleIcon from '@shared/components/ui/google-icon';
import { useStore } from '@core/store/useStore';
import { tokens } from '@core/design-system';
import { supabase, signInWithGoogle } from '@lib/supabase';

interface AuthPageProps {
  mode: 'signup' | 'signin';
}

export default function AuthPage({ mode }: AuthPageProps) {
  const setStep = useStore((s) => s.setStep);

  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const isSignUp = mode === 'signup';

  const handleGoogleSignIn = async () => {
    setError('');
    const { error: err } = await signInWithGoogle();
    if (err) setError(err.message);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (isSignUp) {
      const { error: err } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
      setLoading(false);
      if (err) { setError(err.message); return; }
      setStep(1);
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (err) { setError(err.message); return; }
    }
  };

  return (
    <div className="fixed inset-0 flex" style={{ background: '#fff' }}>

      {/* ── Left panel ── */}
      <div
        className="hidden lg:flex flex-col flex-shrink-0"
        style={{ width: '46%', background: '#08080f', position: 'relative', overflow: 'hidden' }}
      >
        {/* Noise texture overlay */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1, opacity: 0.035,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '180px',
        }} />

        {/* Top brand */}
        <div className="relative z-10 flex items-center gap-2.5 p-10">
          <div style={{
            width: 30, height: 30, borderRadius: 9,
            background: 'linear-gradient(135deg, #7A2E14, #5C2410)',
            boxShadow: '0 2px 10px rgba(196, 85, 45,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#F5E4DA', letterSpacing: '-0.02em', fontFamily: 'monospace' }}>
              co//
            </span>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: 500, letterSpacing: '-0.02em' }}>
            coheren.ai
          </span>
        </div>

        {/* Center — small sphere + copy */}
        <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-12 pb-10 gap-8">
          {/* Sphere */}
          <div style={{ position: 'relative', width: 420, height: 420, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
            <DitheringShader
              shape="sphere"
              type="random"
              colorBack="#060612"
              colorFront="#7A2E14"
              pxSize={2}
              speed={0.9}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            />
            {/* Subtle rim light */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              boxShadow: 'inset 0 0 0 1px rgba(221, 161, 137,0.15)',
              background: 'radial-gradient(circle at 68% 28%, rgba(221, 161, 137,0.08) 0%, transparent 60%)',
            }} />
          </div>

          {/* Glow beneath sphere */}
          <div style={{
            position: 'absolute',
            width: 480, height: 140,
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(196, 85, 45,0.15) 0%, transparent 70%)',
            filter: 'blur(24px)',
            pointerEvents: 'none',
          }} />

          {/* Copy */}
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ color: 'rgba(255,255,255,0.88)', fontSize: 22, fontWeight: 300, letterSpacing: '-0.03em', lineHeight: 1.4, margin: 0 }}>
              Turn any goal into<br />one task per day.
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 12, lineHeight: 1.6, fontWeight: 300 }}>
              AI-built roadmap. Adapts as you grow.
            </p>
          </div>

          {/* Value props — honest, no fabricated usage metrics. */}
          <div className="flex items-center gap-6">
            {[['Science-backed', 'Behavioral research'], ['One task', 'A day'], ['Free', 'To start']].map(([val, lbl]) => (
              <div key={lbl} style={{ textAlign: 'center' }}>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: 500, letterSpacing: '-0.03em', margin: 0 }}>{val}</p>
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, margin: '2px 0 0', fontWeight: 300 }}>{lbl}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Right panel — form ── */}
      <div className="flex flex-1 flex-col" style={{ background: '#fff', overflowY: 'auto' }}>

        {/* Back button */}
        <div className="flex items-center px-6 pt-8 md:px-10 md:pt-9">
          <button
            onClick={() => setStep(0)}
            className="flex items-center gap-1.5 transition-opacity hover:opacity-60"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#9ca3af', fontSize: 13 }}
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>
        </div>

        {/* Form centered */}
        <div className="flex flex-1 items-center justify-center px-5 py-8 md:px-8 md:py-10">
          <div style={{ width: '100%', maxWidth: 360 }}>

            <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.04em', color: '#0d0d10', margin: '0 0 6px' }}>
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h1>
            <p style={{ fontSize: 14, color: '#9ca3af', lineHeight: 1.6, margin: '0 0 32px' }}>
              {isSignUp ? 'Free forever · No credit card required' : 'Sign in to access your roadmap'}
            </p>

            {error && (
              <div style={{ fontSize: 13, borderRadius: 10, padding: '10px 14px', marginBottom: 20, background: '#fef2f2', color: '#b91c1c' }}>
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                padding: '11px 0', borderRadius: 11, border: '1.5px solid #e5e7eb',
                background: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: 14, fontWeight: 600, color: '#374151', letterSpacing: '-0.01em',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = '#fafafa'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
            >
              <GoogleIcon />
              Continue with Google
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
              <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
              <span style={{ fontSize: 12, color: '#9ca3af' }}>or</span>
              <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {isSignUp && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, letterSpacing: '0.04em', color: '#6b7280', marginBottom: 7, textTransform: 'uppercase' }}>
                    Full name
                  </label>
                  <input
                    type="text" placeholder="Alex Chen" value={name} required
                    onChange={(e) => setName(e.target.value)}
                    style={inputStyle}
                    onFocus={(e) => applyFocus(e.currentTarget)}
                    onBlur={(e) => applyBlur(e.currentTarget)}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, letterSpacing: '0.04em', color: '#6b7280', marginBottom: 7, textTransform: 'uppercase' }}>
                  Email
                </label>
                <input
                  type="email" placeholder="you@example.com" value={email} required autoFocus
                  onChange={(e) => setEmail(e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => applyFocus(e.currentTarget)}
                  onBlur={(e) => applyBlur(e.currentTarget)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, letterSpacing: '0.04em', color: '#6b7280', marginBottom: 7, textTransform: 'uppercase' }}>
                  Password
                </label>
                <input
                  type="password" placeholder="••••••••" value={password} required minLength={6}
                  onChange={(e) => setPassword(e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => applyFocus(e.currentTarget)}
                  onBlur={(e) => applyBlur(e.currentTarget)}
                />
              </div>

              <button
                type="submit" disabled={loading}
                style={{
                  width: '100%', padding: '12px 0', marginTop: 4,
                  borderRadius: 11, border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em',
                  background: loading ? '#F9EDE6' : 'linear-gradient(135deg, #C4552D 0%, #A8451F 100%)',
                  color: loading ? '#8A3A1F' : '#fff',
                  boxShadow: loading ? 'none' : '0 4px 18px rgba(196, 85, 45,0.35)',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.boxShadow = '0 6px 24px rgba(196, 85, 45,0.5)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = loading ? 'none' : '0 4px 18px rgba(196, 85, 45,0.35)'; e.currentTarget.style.transform = 'none'; }}
              >
                {loading
                  ? (isSignUp ? 'Creating account...' : 'Signing in...')
                  : (isSignUp ? 'Create account' : 'Sign in')}
              </button>
            </form>

            <p style={{ textAlign: 'center', fontSize: 13, marginTop: 24, color: '#9ca3af' }}>
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              <button
                onClick={() => setStep(isSignUp ? 4 : 3)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: tokens.colors.primary, padding: 0 }}
              >
                {isSignUp ? 'Sign in' : 'Sign up free'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', fontSize: 14, borderRadius: 10,
  border: '1.5px solid #e5e7eb', outline: 'none', color: '#111827',
  background: '#fafafa', boxSizing: 'border-box', transition: 'border-color 0.15s, background 0.15s',
};

function applyFocus(el: HTMLInputElement) {
  el.style.borderColor = '#C4552D';
  el.style.background = '#fff';
  el.style.boxShadow = '0 0 0 3px rgba(196, 85, 45,0.08)';
}

function applyBlur(el: HTMLInputElement) {
  el.style.borderColor = '#e5e7eb';
  el.style.background = '#fafafa';
  el.style.boxShadow = 'none';
}
