import React from 'react';
import { Link } from 'react-router-dom';
import { Box, Typography, Button, Container, Grid, Chip } from '@mui/material';
import { School, Lock, Analytics } from '@mui/icons-material';
import logo from '../../assets/logo.png';

const HeroSection = () => {
  return (
    <Box component="section" sx={{ position: 'relative', minHeight: '850px', display: 'flex', alignItems: 'center', overflow: 'hidden', py: 10 }}>
      {/* Background Elements */}
      <Box sx={{ position: 'absolute', top: '25%', right: 0, width: 384, height: 384, bgcolor: 'primary.main', opacity: 0.05, filter: 'blur(120px)', borderRadius: '50%' }} />
      <Box sx={{ position: 'absolute', bottom: 0, left: '25%', width: 500, height: 500, bgcolor: 'tertiary.main', opacity: 0.05, filter: 'blur(150px)', borderRadius: '50%' }} />

      <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 10 }}>
        <Grid container spacing={6} alignItems="center">

          <Grid size={{ xs: 12, lg: 7 }} sx={{ position: 'relative', zIndex: 10 }}>
            <Chip
              icon={<School sx={{ fontSize: '1rem' }} />}
              label="Built by a Student, for Residents"
              sx={{
                mb: 4,
                px: 1,
                py: 2.5,
                bgcolor: 'rgba(0, 111, 240, 0.1)',
                color: 'primary.main',
                fontWeight: 600,
                fontSize: '0.875rem',
                border: 'none',
                '& .MuiChip-icon': { color: 'inherit' }
              }}
            />

            <Typography variant="h1" sx={{ mb: 3, fontSize: { xs: '3rem', lg: '4.5rem' }, color: 'text.primary' }}>
              SightX: <br />
              <Box component="span" sx={{
                background: 'linear-gradient(to right, #0057c0, #00685f)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: 'inline-block'
              }}>
                Intelligent Retinal Analysis
              </Box>
            </Typography>

            <Typography variant="body1" sx={{ mb: 5, color: 'text.secondary', fontSize: '1.125rem', maxWidth: '600px' }}>
              A Clinical Diagnostic Support Tool designed for medical residents to improve hospital efficiency.
              SightX acts as a screening buffer, identifying anomalies in fundus images before final specialist review.
            </Typography>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                component={Link}
                to="/login"
                sx={{ fontSize: '1.125rem' }}
              >
                Resident Login
              </Button>
              <Button
                variant="contained"
                color="secondary"
                sx={{ fontSize: '1.125rem', px: 4 }}
              >
                Request Access
              </Button>
            </Box>

            <Typography variant="caption" sx={{ mt: 4, color: 'text.secondary', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Lock sx={{ fontSize: '1rem' }} />
              Restricted Access: This research tool is only accessible by trained medical professionals.
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, lg: 5 }} sx={{ position: 'relative', mt: { xs: 8, lg: 0 } }}>
            <Box sx={{
              position: 'relative',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              aspectRatio: '1 / 1',
              maskImage: 'radial-gradient(ellipse 61% 61% at center, black 45%, transparent 85%)',
              WebkitMaskImage: 'radial-gradient(ellipse 61% 61% at center, black 45%, transparent 85%)',
            }}>
              <img
                src={logo}
                alt="SightX Logo"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </Box>

            {/* Floating Data Card */}
            <Box sx={{
              position: 'absolute',
              bottom: { xs: -20, lg: -24 },
              left: { xs: 16, lg: -40 },
              bgcolor: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(20px)',
              p: 3,
              borderRadius: '1rem',
              boxShadow: '0 20px 40px rgba(0, 87, 192, 0.12)',
              border: '1px solid rgba(255,255,255,0.4)',
              zIndex: 20,
              width: 320,
              display: 'flex',
              flexDirection: 'column',
              gap: 2.5
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Analytics sx={{ color: 'tertiary.main', fontSize: '1.5rem' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '0.02em' }}>Transparent Metrics</Typography>
              </Box>

              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>Critical Sensitivity (Safety)</Typography>
                  <Typography variant="caption" sx={{ color: 'tertiary.main', fontWeight: 800 }}>99.0%</Typography>
                </Box>
                <Box sx={{ height: 6, width: '100%', bgcolor: 'custom.surfaceContainerHigh', borderRadius: 3, overflow: 'hidden' }}>
                  <Box sx={{ height: '100%', bgcolor: 'tertiary.main', width: '99%' }} />
                </Box>
              </Box>

              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>Accuracy</Typography>
                  <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 800 }}>46.9%</Typography>
                </Box>
                <Box sx={{ height: 6, width: '100%', bgcolor: 'custom.surfaceContainerHigh', borderRadius: 3, overflow: 'hidden' }}>
                  <Box sx={{ height: '100%', bgcolor: 'primary.main', width: '46.9%' }} />
                </Box>
              </Box>

              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>False Negative Rate</Typography>
                  <Typography variant="caption" sx={{ color: '#008559', fontWeight: 800 }}>0.0%</Typography>
                </Box>
                <Box sx={{ height: 6, width: '100%', bgcolor: 'custom.surfaceContainerHigh', borderRadius: 3, overflow: 'hidden' }}>
                  <Box sx={{ height: '100%', bgcolor: '#008559', width: '100%' }} />
                </Box>
              </Box>
            </Box>
          </Grid>

        </Grid>
      </Container>
    </Box>
  );
};

export default HeroSection;
