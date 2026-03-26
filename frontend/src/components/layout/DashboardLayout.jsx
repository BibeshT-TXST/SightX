import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, Fade } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import GavelIcon from '@mui/icons-material/Gavel';
import LogoutIcon from '@mui/icons-material/Logout';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';
import { useAuth } from '../../context/AuthContext';

const SIDEBAR_WIDTH = 256;

const NAV_ITEMS = [
  { label: 'Retinal Scan Analysis', icon: <VisibilityIcon />, path: '/dashboard' },
  { label: 'Accounts', icon: <AccountCircleIcon />, path: '/dashboard/accounts' },
  { label: 'Legals', icon: <GavelIcon />, path: '/dashboard/legals' },
];

const navLinkBase = {
  display: 'flex',
  alignItems: 'center',
  gap: 1.5,
  px: 2,
  py: 1.5,
  borderRadius: '0.75rem',
  textDecoration: 'none',
  fontSize: '0.875rem',
  fontWeight: 500,
  transition: 'all 0.3s ease',
};

export default function DashboardLayout({ children }) {
  const { logout, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      {/* ── Small Screen Blocker ── */}
      <Box
        sx={{
          display: { xs: 'flex', md: 'none' },
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          bgcolor: '#f8fafc',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          p: 4,
        }}
      >
        <DesktopWindowsIcon sx={{ fontSize: 64, color: '#0057c0', mb: 3, opacity: 0.6 }} />
        <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: '#171c22', mb: 1, letterSpacing: '-0.02em' }}>
          Desktop Required
        </Typography>
        <Typography sx={{ color: '#414755', maxWidth: 360, lineHeight: 1.7 }}>
          SightX Clinical is a diagnostic tool designed for desktop use.
          Please access this application from a device with a minimum screen width of 900px.
        </Typography>
      </Box>

      {/* ── Desktop Layout ── */}
      <Box sx={{ display: { xs: 'none', md: 'flex' }, minHeight: '100vh', bgcolor: 'custom.surface' }}>
        {/* ── Sidebar ── */}
        <Box
          component="aside"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            width: SIDEBAR_WIDTH,
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            zIndex: 40,
            bgcolor: '#f8fafc',
            p: 2,
            gap: 1,
          }}
        >
          {/* Branding */}
          <Box sx={{ mb: 4, px: 1, py: 2 }}>
            <Typography
              sx={{
                fontSize: '1.25rem',
                fontWeight: 900,
                color: '#1e3a5f',
                letterSpacing: '-0.04em',
              }}
            >
              SightX Clinical
            </Typography>
            <Typography
              sx={{
                fontSize: '0.625rem',
                fontWeight: 500,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                mt: 0.5,
              }}
            >
              Diagnostic Portal
            </Typography>
          </Box>

          {/* Navigation */}
          <Box component="nav" sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/dashboard'}
                style={{ textDecoration: 'none' }}
              >
                {({ isActive }) => (
                  <Box
                    sx={{
                      ...navLinkBase,
                      color: isActive ? '#1d4ed8' : '#475569',
                      bgcolor: isActive ? '#ffffff' : 'transparent',
                      boxShadow: isActive
                        ? '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)'
                        : 'none',
                      fontWeight: isActive ? 600 : 500,
                      '&:hover': {
                        color: isActive ? '#1d4ed8' : '#2563eb',
                        bgcolor: isActive ? '#ffffff' : 'rgba(59,130,246,0.06)',
                      },
                    }}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Box>
                )}
              </NavLink>
            ))}
          </Box>

          {/* Bottom Actions */}
          <Box sx={{ pt: 2, borderTop: '1px solid', borderColor: 'rgba(226,232,240,0.6)' }}>
            <Box
              onClick={handleSignOut}
              sx={{
                ...navLinkBase,
                mt: 2,
                color: '#475569',
                cursor: 'pointer',
                '&:hover': { color: '#dc2626', bgcolor: 'rgba(220,38,38,0.06)' },
              }}
            >
              <LogoutIcon fontSize="small" />
              <span>Sign Out</span>
            </Box>
          </Box>
        </Box>

        {/* ── Main Area ── */}
        <Box
          component="main"
          sx={{
            flex: 1,
            ml: `${SIDEBAR_WIDTH}px`,
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
          }}
        >
          {/* Top App Bar */}
          <Box
            component="header"
            sx={{
              position: 'sticky',
              top: 0,
              zIndex: 30,
              height: 64,
              bgcolor: 'rgba(255,255,255,0.8)',
              backdropFilter: 'blur(20px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 4,
            }}
          >
            <Typography
              sx={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#414755',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
              }}
            >
              Diagnostic Terminal v1.0.0
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#171c22' }}>
                {profile ? `${profile.first_name} ${profile.last_name}` : 'Account holder Name'}
              </Typography>
              <Typography sx={{ fontSize: '0.625rem', color: '#414755', textTransform: 'capitalize' }}>
                {profile ? profile.role : 'Account holder Role'}
              </Typography>
            </Box>
          </Box>

          {/* Page Content with fade transition */}
          <Fade key={location.pathname} in timeout={350}>
            <Box sx={{ flex: 1, overflowY: 'auto' }}>
              {children}
            </Box>
          </Fade>
        </Box>
      </Box>
    </>
  );
}
