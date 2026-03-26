import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Link,
  InputLabel,
  Slide,
  Fade,
  IconButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAuth } from '../../context/AuthContext';

export default function LoginForm({ darkMode = false }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState(1); // 1 = email, 2 = password
  const [isScanning, setIsScanning] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const [authError, setAuthError] = useState('');

  const handleContinue = (e) => {
    e.preventDefault();
    if (email.trim()) {
      setStep(2);
    }
  };

  const handleLogin = async (e) => { // <-- MAKE THIS A ASYNC FUNCTION
    e.preventDefault();
    setAuthError('');
    setIsScanning(true);

    try {
      // 1. Attempt the real login
      await login(email, password);

      // 2. Play the scanning animation slightly
      setTimeout(() => {
        setIsScanning(false);
        navigate('/dashboard'); // Proceed to dashboard
      }, 1500);
    } catch (err) {
      // If Supabase rejects them (wrong password, etc.)
      setIsScanning(false);
      setAuthError(err.message);
    }
  };

  const handleBack = () => {
    setStep(1);
    setAuthError(''); // This also clears out the red error box when they go back!
  };


  // ── Color tokens based on mode ──
  const c = darkMode
    ? {
      heading: '#aec6ff',
      cardBg: 'rgba(20, 25, 35, 0.85)',
      cardBorder: 'rgba(174, 198, 255, 0.08)',
      cardShadow: '0 20px 60px rgba(0,0,0,0.4)',
      textPrimary: '#e0e4ef',
      textSecondary: '#8b92a8',
      inputBg: 'rgba(255,255,255,0.06)',
      linkColor: '#aec6ff',
      linkHover: '#d8e2ff',
      scanGlow: 'rgba(174, 198, 255, 0.3)',
    }
    : {
      heading: '#0057c0',
      cardBg: '#ffffff',
      cardBorder: 'rgba(23,28,34,0.03)',
      cardShadow: '0 20px 40px rgba(0,87,192,0.06)',
      textPrimary: '#171c22',
      textSecondary: '#414755',
      inputBg: '#e4e8f0',
      linkColor: '#0057c0',
      linkHover: '#004397',
      scanGlow: 'rgba(0, 87, 192, 0.2)',
    };

  const focusGlowSx = {
    transition: 'box-shadow 0.3s ease, background-color 0.3s ease',
    '&.Mui-focused': {
      bgcolor: darkMode ? 'rgba(174, 198, 255, 0.08)' : 'rgba(0, 111, 240, 0.04)',
      boxShadow: darkMode
        ? '0 0 0 3px rgba(174, 198, 255, 0.15), 0 0 20px rgba(174, 198, 255, 0.1)'
        : '0 0 0 3px rgba(0, 87, 192, 0.12), 0 0 20px rgba(0, 87, 192, 0.08)',
      '@keyframes focus-pulse': {
        '0%, 100%': {
          boxShadow: darkMode
            ? '0 0 0 3px rgba(174, 198, 255, 0.15), 0 0 20px rgba(174, 198, 255, 0.1)'
            : '0 0 0 3px rgba(0, 87, 192, 0.12), 0 0 20px rgba(0, 87, 192, 0.08)',
        },
        '50%': {
          boxShadow: darkMode
            ? '0 0 0 4px rgba(174, 198, 255, 0.22), 0 0 28px rgba(174, 198, 255, 0.15)'
            : '0 0 0 4px rgba(0, 87, 192, 0.18), 0 0 28px rgba(0, 87, 192, 0.12)',
        },
      },
      animation: 'focus-pulse 2s ease-in-out infinite',
    },
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 440 }}>
      {/* ── Branding Header ── */}
      <Box sx={{ textAlign: 'center', mb: 5 }}>
        <Typography
          variant="h1"
          sx={{
            fontSize: '1.875rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '-0.04em',
            color: c.heading,
            mb: 1,
          }}
        >
          Clinical Login Portal
        </Typography>
      </Box>

      {/* ── Login Card ── */}
      <Paper
        elevation={1}
        sx={{
          p: { xs: 4, md: 5 },
          borderRadius: '1.25rem',
          bgcolor: c.cardBg,
          boxShadow: c.cardShadow,
          border: `1px solid ${c.cardBorder}`,
          backdropFilter: darkMode ? 'blur(20px)' : 'none',
          position: 'relative',
          overflow: 'hidden',
          minHeight: 320,
        }}
      >
        {/* ── Scanning overlay ── */}
        {isScanning && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: darkMode ? 'rgba(10,14,22,0.9)' : 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(4px)',
            }}
          >
            {/* Scanning ring */}
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                border: '3px solid transparent',
                borderTopColor: c.heading,
                borderRightColor: darkMode ? 'rgba(174,198,255,0.3)' : 'rgba(0,87,192,0.2)',
                '@keyframes scan-spin': {
                  to: { transform: 'rotate(360deg)' },
                },
                animation: 'scan-spin 0.8s linear infinite',
                mb: 2,
              }}
            />
            {/* Scanning progress bar */}
            <Box
              sx={{
                width: 160,
                height: 3,
                bgcolor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,87,192,0.08)',
                borderRadius: 2,
                overflow: 'hidden',
                mb: 1.5,
              }}
            >
              <Box
                sx={{
                  height: '100%',
                  bgcolor: c.heading,
                  borderRadius: 2,
                  '@keyframes scan-bar': {
                    '0%': { width: '0%' },
                    '100%': { width: '100%' },
                  },
                  animation: 'scan-bar 2.2s ease-out forwards',
                }}
              />
            </Box>
            <Typography sx={{ color: c.textSecondary, fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Verifying Credentials...
            </Typography>
          </Box>
        )}

        {/* ── Step 1: Email ── */}
        {step === 1 && (
          <Fade in timeout={400}>
            <Box>
              <Box sx={{ mb: 4 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em', color: c.textPrimary }}>
                  Secure Access
                </Typography>
                <Typography sx={{ color: c.textSecondary, fontSize: '0.875rem', mt: 0.5 }}>
                  Enter your email to continue.
                </Typography>
              </Box>

              <Box component="form" onSubmit={handleContinue} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box>
                  <InputLabel
                    htmlFor="login-email"
                    sx={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: c.textSecondary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      mb: 1,
                      ml: 0.5,
                    }}
                  >
                    Email
                  </InputLabel>
                  <TextField
                    id="login-email"
                    type="email"
                    placeholder="dr.bibesh@sightx.com"
                    fullWidth
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    slotProps={{
                      input: {
                        sx: {
                          bgcolor: c.inputBg,
                          color: c.textPrimary,
                          borderRadius: '0.75rem',
                          px: 2,
                          py: 0.5,
                          fontSize: '0.875rem',
                          ...focusGlowSx,
                        },
                      },
                    }}
                  />
                </Box>

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  sx={{
                    py: 1.75,
                    borderRadius: '0.75rem',
                    fontWeight: 700,
                    fontSize: '0.9375rem',
                    background: darkMode
                      ? 'linear-gradient(90deg, #2a5db0 0%, #3a7ff0 100%)'
                      : 'linear-gradient(90deg, #0057c0 0%, #006ff0 100%)',
                    boxShadow: `0 4px 12px ${c.scanGlow}`,
                    '&:hover': {
                      boxShadow: `0 8px 20px ${c.scanGlow}`,
                    },
                    '&:active': {
                      transform: 'scale(0.98)',
                    },
                    transition: 'all 0.2s',
                  }}
                >
                  Continue
                </Button>
              </Box>
            </Box>
          </Fade>
        )}

        {/* ── Step 2: Password ── */}
        {step === 2 && (
          <Fade in timeout={400}>
            <Box>
              <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <IconButton
                  onClick={handleBack}
                  size="small"
                  sx={{
                    mt: 0.25,
                    color: c.textSecondary,
                    '&:hover': { color: c.heading, bgcolor: darkMode ? 'rgba(174,198,255,0.08)' : 'rgba(0,87,192,0.06)' },
                  }}
                >
                  <ArrowBackIcon sx={{ fontSize: 20 }} />
                </IconButton>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em', color: c.textPrimary }}>
                    Welcome Back
                  </Typography>
                  <Typography sx={{ color: c.textSecondary, fontSize: '0.875rem', mt: 0.5 }}>
                    {email}
                  </Typography>
                </Box>
              </Box>

              {authError && (
                <Fade in={!!authError}>
                  <Box
                    sx={{
                      mb: 3,
                      p: 1.5,
                      borderRadius: '0.5rem',
                      bgcolor: darkMode ? 'rgba(244, 67, 54, 0.1)' : 'rgba(211, 47, 47, 0.08)',
                      border: '1px solid',
                      borderColor: darkMode ? 'rgba(244, 67, 54, 0.3)' : 'rgba(211, 47, 47, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Typography sx={{ color: darkMode ? '#ffb4ab' : '#d32f2f', fontSize: '0.8rem', fontWeight: 600 }}>
                      Incorrect email or password. Please try again.
                    </Typography>
                  </Box>
                </Fade>
              )}

              <Box component="form" onSubmit={handleLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', ml: 0.5, mb: 1 }}>
                    <InputLabel
                      htmlFor="login-password"
                      sx={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: c.textSecondary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                      }}
                    >
                      Password
                    </InputLabel>
                    <Link
                      href="#"
                      underline="none"
                      sx={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: c.linkColor,
                        '&:hover': { color: c.linkHover },
                        transition: 'color 0.2s',
                      }}
                    >
                      Forgot Password?
                    </Link>
                  </Box>
                  <TextField
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    fullWidth
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    slotProps={{
                      input: {
                        sx: {
                          bgcolor: c.inputBg,
                          color: c.textPrimary,
                          borderRadius: '0.75rem',
                          px: 2,
                          py: 0.5,
                          fontSize: '0.875rem',
                          ...focusGlowSx,
                        },
                      },
                    }}
                  />
                </Box>

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={isScanning}
                  sx={{
                    py: 1.75,
                    borderRadius: '0.75rem',
                    fontWeight: 700,
                    fontSize: '0.9375rem',
                    background: darkMode
                      ? 'linear-gradient(90deg, #2a5db0 0%, #3a7ff0 100%)'
                      : 'linear-gradient(90deg, #0057c0 0%, #006ff0 100%)',
                    boxShadow: `0 4px 12px ${c.scanGlow}`,
                    '&:hover': {
                      boxShadow: `0 8px 20px ${c.scanGlow}`,
                    },
                    '&:active': {
                      transform: 'scale(0.98)',
                    },
                    '&.Mui-disabled': {
                      background: darkMode
                        ? 'linear-gradient(90deg, #2a5db0 0%, #3a7ff0 100%)'
                        : 'linear-gradient(90deg, #0057c0 0%, #006ff0 100%)',
                      color: 'rgba(255,255,255,0.5)',
                    },
                    transition: 'all 0.2s',
                  }}
                >
                  Login
                </Button>
              </Box>
            </Box>
          </Fade>
        )}
      </Paper>
    </Box>
  );
}
