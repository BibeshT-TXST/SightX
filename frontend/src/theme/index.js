/**
 * SightX MUI Theme Configuration.
 * Defines the clinical design system, including custom color tokens,
 * typography scales based on the "Inter" typeface, and component-level overrides
 * for a premium, hospital-grade aesthetic.
 */
import { createTheme } from '@mui/material/styles';

const customColors = {
  surface: '#f7f9ff',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f0f4fc',
  surfaceContainer: '#eaeef6',
  surfaceContainerHigh: '#e4e8f0',
  surfaceContainerHighest: '#dee3eb',
  onSurface: '#171c22',
  onSurfaceVariant: '#414755',
  outline: '#727786',
  outlineVariant: '#c1c6d7',
  primaryContainer: '#006ff0',
  tertiaryContainer: '#008378',
  onTertiaryContainer: '#f4fffc',
  errorContainer: '#ffdad6',
  surfaceDim: '#d6dae2',
  surfaceTint: '#005ac5',
  background: '#f7f9ff',
};

const theme = createTheme({
  palette: {
    primary: {
      main: '#0057c0',
      light: '#006ff0',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#0060ab',
      light: '#63a8fe',
      contrastText: '#ffffff',
    },
    tertiary: {
      main: '#00685f', // This creates a custom palette color "tertiary"
      contrastText: '#ffffff',
    },
    background: {
      default: customColors.surface,
      paper: customColors.surfaceContainerLow,
    },
    text: {
      primary: customColors.onSurface,
      secondary: customColors.onSurfaceVariant,
    },
    custom: customColors,
  },
  typography: {
    fontFamily: '"Inter", sans-serif',
    h1: {
      fontWeight: 800,
      letterSpacing: '-0.02em',
      lineHeight: 1.1,
    },
    h2: {
      fontWeight: 900,
      letterSpacing: '-0.02em',
      lineHeight: 1.2,
    },
    h3: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    body1: {
      lineHeight: 1.6,
    },
    body2: {
      lineHeight: 1.6,
    },
    subtitle1: {
      letterSpacing: '0.05em', // "uppercase tracking-widest"
    },
    button: {
      textTransform: 'none',
      fontWeight: 700,
    }
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        body {
          background-color: ${customColors.surface};
          color: ${customColors.onSurface};
          font-family: 'Inter', sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        ::selection {
          background-color: #006ff0;
          color: white;
        }
      `,
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '0.75rem', // xl roundedness
          padding: '12px 32px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 10px 20px rgba(0, 87, 192, 0.15)',
          },
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #0057c0 0%, #006ff0 100%)',
          border: 'none',
        },
        containedSecondary: {
          backgroundColor: customColors.surfaceContainerHighest,
          color: customColors.onSurface,
          '&:hover': {
            backgroundColor: customColors.surfaceContainerHigh,
          }
        },
        text: { // Tertiary
          color: '#004397',
          '&:hover': {
            backgroundColor: 'transparent',
            boxShadow: '0 0 15px rgba(0, 90, 197, 0.2)', // subtle surface-tint glow
          }
        }
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: 'none',      // The "No-Line" Rule
          boxShadow: 'none',   // Rely on Tonal Layering
          transition: 'background-color 0.5s ease, box-shadow 0.3s ease',
        },
        elevation1: {
          boxShadow: '0 20px 40px rgba(0, 87, 192, 0.06)', // Deep inset or soft lift blue shadow
        }
      },
      defaultProps: {
        elevation: 0,
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: customColors.surfaceContainerLow,
          borderRadius: '1.5rem',
          border: 'none',
          boxShadow: 'none',
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: customColors.surfaceContainerHighest,
            borderRadius: '0.5rem',
            '& fieldset': {
              border: 'none',
            },
            '&:hover fieldset': {
              border: 'none',
            },
            '&.Mui-focused fieldset': {
              border: `1px solid rgba(0, 96, 171, 0.2)`, // 20% ghost border
              boxShadow: 'inset 0 0 10px rgba(0, 96, 171, 0.1)', // blue inner glow
            },
          },
        },
      },
    },
  },
});

export default theme;
