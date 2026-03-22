import React from 'react';
import { AppBar, Toolbar, Typography, Box, Button, Chip } from '@mui/material';
import logo from '../../assets/logo.png';

const TopNavBar = () => {
  return (
    <AppBar
      position="fixed"
      sx={{
        bgcolor: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 20px 40px rgba(0, 87, 192, 0.06)',
        color: 'text.primary',
      }}
    >
      <Toolbar sx={{ justifyContent: 'flex-start', px: { xs: 2, md: 6 }, height: 64, width: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              maskImage: 'radial-gradient(ellipse 61% 61% at center, black 45%, transparent 85%)',
              WebkitMaskImage: 'radial-gradient(ellipse 61% 61% at center, black 45%, transparent 85%)',
            }}>
              <img src={logo} alt="SightX Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </Box>
            <Typography
              variant="h6"
              component="div"
              sx={{
                fontWeight: 800,
                letterSpacing: '-0.05em',
                color: 'primary.dark',
                fontSize: '1.5rem'
              }}
            >
              SightX
            </Typography>
          </Box>

          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 3 }}>
            <Button
              sx={{ fontWeight: 600, color: 'primary.dark', px: 2, borderRadius: 2 }}
            >
              Home
            </Button>
            <Button
              target="_blank"
              sx={{
                fontWeight: 600,
                color: 'text.secondary',
                px: 2,
                borderRadius: 2,
                '&:hover': { bgcolor: 'surfaceContainerHigh' }
              }}
            >
              About
            </Button>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default TopNavBar;
