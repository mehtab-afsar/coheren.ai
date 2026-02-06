import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, UserPlus } from 'lucide-react';
import { signIn, signUp } from '../lib/supabase';
import { tokens } from '../design-system';

interface LoginProps {
  onSuccess: () => void;
}

export default function Login({ onSuccess }: LoginProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (isSignUp) {
        // Sign up
        const { data, error: signUpError } = await signUp(email, password, { full_name: fullName });

        if (signUpError) {
          setError(signUpError.message);
        } else if (data.user) {
          setSuccessMessage('Account created! Please check your email to verify your account.');
          // Auto-switch to login after 3 seconds
          setTimeout(() => {
            setIsSignUp(false);
            setSuccessMessage(null);
          }, 3000);
        }
      } else {
        // Sign in
        const { data, error: signInError } = await signIn(email, password);

        if (signInError) {
          setError(signInError.message);
        } else if (data.user) {
          onSuccess();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'white',
      padding: tokens.spacing.xl
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          backgroundColor: '#FFF8F0',
          borderRadius: tokens.borderRadius['2xl'],
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
          padding: tokens.spacing['2xl'],
          maxWidth: '450px',
          width: '100%'
        }}
      >
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: tokens.spacing['2xl']
        }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            style={{
              fontSize: '32px',
              fontWeight: 300,
              color: tokens.colors.text.primary,
              marginBottom: tokens.spacing.lg,
              letterSpacing: '-0.02em'
            }}
          >
            coheren.ai
          </motion.div>
          <h1 style={{
            fontSize: tokens.typography.sizes['2xl'],
            fontWeight: tokens.typography.weights.medium,
            color: tokens.colors.text.primary,
            marginBottom: tokens.spacing.xs
          }}>
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p style={{
            fontSize: tokens.typography.sizes.sm,
            color: tokens.colors.text.secondary
          }}>
            {isSignUp
              ? 'Start your journey to achieving your goals'
              : 'Continue your journey where you left off'
            }
          </p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: tokens.spacing.md,
              backgroundColor: '#FEE2E2',
              borderRadius: tokens.borderRadius.md,
              marginBottom: tokens.spacing.lg,
              color: '#991B1B',
              fontSize: tokens.typography.sizes.sm
            }}
          >
            {error}
          </motion.div>
        )}

        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: tokens.spacing.md,
              backgroundColor: '#D1FAE5',
              borderRadius: tokens.borderRadius.md,
              marginBottom: tokens.spacing.lg,
              color: '#065F46',
              fontSize: tokens.typography.sizes.sm
            }}
          >
            {successMessage}
          </motion.div>
        )}

        {/* Google Sign In - Disabled for local development */}
        {/* Uncomment after configuring Google OAuth in Supabase */}
        {/*
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleGoogleSignIn}
          disabled={loading}
          type="button"
          style={{
            width: '100%',
            padding: tokens.spacing.lg,
            backgroundColor: 'white',
            color: tokens.colors.text.primary,
            border: `2px solid ${tokens.colors.border}`,
            borderRadius: tokens.borderRadius.lg,
            fontSize: tokens.typography.sizes.base,
            fontWeight: tokens.typography.weights.medium,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: tokens.spacing.sm,
            opacity: loading ? 0.7 : 1,
            marginBottom: tokens.spacing.lg,
            transition: 'all 0.2s'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M19.6 10.227c0-.709-.064-1.39-.182-2.045H10v3.868h5.382a4.6 4.6 0 01-1.996 3.018v2.51h3.232c1.891-1.742 2.982-4.305 2.982-7.35z" fill="#4285F4"/>
            <path d="M10 20c2.7 0 4.964-.895 6.618-2.423l-3.232-2.509c-.895.6-2.04.955-3.386.955-2.605 0-4.81-1.76-5.595-4.123H1.064v2.59A9.996 9.996 0 0010 20z" fill="#34A853"/>
            <path d="M4.405 11.9c-.2-.6-.314-1.24-.314-1.9 0-.66.114-1.3.314-1.9V5.51H1.064A9.996 9.996 0 000 10c0 1.614.386 3.14 1.064 4.49l3.34-2.59z" fill="#FBBC05"/>
            <path d="M10 3.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C14.959.99 12.695 0 10 0 6.09 0 2.71 2.24 1.064 5.51l3.34 2.59C5.19 5.736 7.395 3.977 10 3.977z" fill="#EA4335"/>
          </svg>
          {isSignUp ? 'Sign up with Google' : 'Sign in with Google'}
        </motion.button>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: tokens.spacing.md,
          marginBottom: tokens.spacing.lg
        }}>
          <div style={{
            flex: 1,
            height: '1px',
            backgroundColor: tokens.colors.border
          }} />
          <span style={{
            fontSize: tokens.typography.sizes.sm,
            color: tokens.colors.text.tertiary
          }}>
            or
          </span>
          <div style={{
            flex: 1,
            height: '1px',
            backgroundColor: tokens.colors.border
          }} />
        </div>
        */}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <div style={{ marginBottom: tokens.spacing.lg }}>
              <label style={{
                display: 'block',
                fontSize: tokens.typography.sizes.sm,
                fontWeight: tokens.typography.weights.medium,
                color: tokens.colors.text.primary,
                marginBottom: tokens.spacing.xs
              }}>
                Full Name
              </label>
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center'
              }}>
                <UserPlus
                  size={20}
                  style={{
                    position: 'absolute',
                    left: tokens.spacing.md,
                    color: tokens.colors.text.tertiary
                  }}
                />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  required
                  style={{
                    width: '100%',
                    padding: `${tokens.spacing.md} ${tokens.spacing.md} ${tokens.spacing.md} 44px`,
                    border: `2px solid ${tokens.colors.border}`,
                    borderRadius: tokens.borderRadius.lg,
                    fontSize: tokens.typography.sizes.base,
                    color: tokens.colors.text.primary,
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = tokens.colors.primary}
                  onBlur={(e) => e.currentTarget.style.borderColor = tokens.colors.border}
                />
              </div>
            </div>
          )}

          <div style={{ marginBottom: tokens.spacing.lg }}>
            <label style={{
              display: 'block',
              fontSize: tokens.typography.sizes.sm,
              fontWeight: tokens.typography.weights.medium,
              color: tokens.colors.text.primary,
              marginBottom: tokens.spacing.xs
            }}>
              Email
            </label>
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}>
              <Mail
                size={20}
                style={{
                  position: 'absolute',
                  left: tokens.spacing.md,
                  color: tokens.colors.text.tertiary
                }}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={{
                  width: '100%',
                  padding: `${tokens.spacing.md} ${tokens.spacing.md} ${tokens.spacing.md} 44px`,
                  border: `2px solid ${tokens.colors.border}`,
                  borderRadius: tokens.borderRadius.lg,
                  fontSize: tokens.typography.sizes.base,
                  color: tokens.colors.text.primary,
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = tokens.colors.primary}
                onBlur={(e) => e.currentTarget.style.borderColor = tokens.colors.border}
              />
            </div>
          </div>

          <div style={{ marginBottom: tokens.spacing.xl }}>
            <label style={{
              display: 'block',
              fontSize: tokens.typography.sizes.sm,
              fontWeight: tokens.typography.weights.medium,
              color: tokens.colors.text.primary,
              marginBottom: tokens.spacing.xs
            }}>
              Password
            </label>
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}>
              <Lock
                size={20}
                style={{
                  position: 'absolute',
                  left: tokens.spacing.md,
                  color: tokens.colors.text.tertiary
                }}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                style={{
                  width: '100%',
                  padding: `${tokens.spacing.md} ${tokens.spacing.md} ${tokens.spacing.md} 44px`,
                  border: `2px solid ${tokens.colors.border}`,
                  borderRadius: tokens.borderRadius.lg,
                  fontSize: tokens.typography.sizes.base,
                  color: tokens.colors.text.primary,
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = tokens.colors.primary}
                onBlur={(e) => e.currentTarget.style.borderColor = tokens.colors.border}
              />
            </div>
            {isSignUp && (
              <p style={{
                fontSize: tokens.typography.sizes.xs,
                color: tokens.colors.text.tertiary,
                marginTop: tokens.spacing.xs
              }}>
                Must be at least 6 characters
              </p>
            )}
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: tokens.spacing.lg,
              backgroundColor: tokens.colors.primary,
              color: 'white',
              border: 'none',
              borderRadius: tokens.borderRadius.lg,
              fontSize: tokens.typography.sizes.base,
              fontWeight: tokens.typography.weights.semibold,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: tokens.spacing.sm,
              opacity: loading ? 0.7 : 1,
              marginBottom: tokens.spacing.lg
            }}
          >
            {loading ? (
              'Loading...'
            ) : isSignUp ? (
              <>
                <UserPlus size={20} />
                Create Account
              </>
            ) : (
              <>
                <LogIn size={20} />
                Sign In
              </>
            )}
          </motion.button>
        </form>

        {/* Toggle Sign Up / Sign In */}
        <div style={{
          textAlign: 'center',
          fontSize: tokens.typography.sizes.sm,
          color: tokens.colors.text.secondary
        }}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setSuccessMessage(null);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: tokens.colors.primary,
              fontWeight: tokens.typography.weights.semibold,
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
