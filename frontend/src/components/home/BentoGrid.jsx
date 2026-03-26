import React from 'react';
import { Box, Typography, Container, Grid, Paper, IconButton } from '@mui/material';
import { CameraAlt, LibraryBooks, Security, HealthAndSafety, Biotech, ArrowForward } from '@mui/icons-material';

const BentoGrid = () => {
  return (
    <Box component="section" sx={{ py: 12, bgcolor: 'custom.surface' }}>
      <Container maxWidth="xl">
        <Box sx={{ mb: 8, textAlign: 'center', maxWidth: 800, mx: 'auto' }}>
          <Typography variant="h2" sx={{ mb: 2, fontSize: '2.5rem', color: 'text.primary' }}>
            Development Insights
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', fontSize: '1.125rem' }}>
            A project focused on bridging the gap between clinical intake and specialist consultation through automated screening.
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Feature Card 1 — Hero overhaul */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper sx={{
              p: 5,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              bgcolor: 'custom.surfaceContainerLow',
              borderRadius: '1.5rem',
              transition: 'background-color 0.5s ease',
              '&:hover': { bgcolor: 'custom.surfaceContainerLowest', boxShadow: '0 20px 40px rgba(0, 87, 192, 0.06)' }
            }}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
                  <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: '0.1em', fontSize: '0.7rem' }}>
                    Core Capability
                  </Typography>
                </Box>

                <Typography variant="h2" sx={{ fontSize: { xs: '2rem', md: '2.75rem' }, fontWeight: 800, lineHeight: 1.15, mb: 3, color: 'text.primary' }}>
                  Automated detection
                </Typography>

                <Typography variant="body1" sx={{ color: 'text.secondary', fontSize: '1rem', lineHeight: 1.75, maxWidth: 560 }}>
                  Deep learning architectures process raw retinal scans to surface early stage markers, enabling clinicians to triage and prioritize high risk patients before specialist review.
                </Typography>
              </Box>
            </Paper>
          </Grid>

          {/* Feature Card 2 */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{
              p: 4,
              height: '100%',
              bgcolor: 'custom.surfaceContainerLow',
              borderRadius: '1.5rem',
              transition: 'all 0.5s ease',
              '&:hover': { bgcolor: 'custom.surfaceContainerLowest', boxShadow: '0 20px 40px rgba(0, 87, 192, 0.06)' }
            }}>
              <LibraryBooks sx={{ fontSize: 40, color: 'tertiary.main', mb: 3 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Resident Support Flow
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Empowering medical residents with preliminary diagnostic indicators to streamline patient intake and data availability.
              </Typography>
            </Paper>
          </Grid>

          {/* Feature Card 3 */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{
              p: 4,
              height: '100%',
              bgcolor: 'custom.surfaceContainerLow',
              borderRadius: '1.5rem',
              transition: 'all 0.5s ease',
              '&:hover': { bgcolor: 'custom.surfaceContainerLowest', boxShadow: '0 20px 40px rgba(0, 87, 192, 0.06)' }
            }}>
              <Security sx={{ fontSize: 40, color: 'secondary.main', mb: 3 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Clinician Screening
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Designed as a mandatory buffer tool to flag high-risk scans for immediate doctor review, reducing diagnostic bottlenecks.
              </Typography>
            </Paper>
          </Grid>

          {/* Feature Card 4 */}
          <Grid size={{ xs: 12, md: 2 }}>
            <Paper sx={{
              p: 4,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              bgcolor: 'custom.surfaceContainerLow',
              borderRadius: '1.5rem',
              transition: 'all 0.5s ease',
              '&:hover': { bgcolor: 'custom.surfaceContainerLowest', boxShadow: '0 20px 40px rgba(0, 87, 192, 0.06)' }
            }}>
              <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: 'secondary.main', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
                <HealthAndSafety sx={{ fontSize: 32 }} />
              </Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>HIPAA Compliant</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Patient data handled with full regulatory compliance</Typography>
            </Paper>
          </Grid>

          {/* Feature Card 5 */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{
              p: 4,
              height: '100%',
              bgcolor: 'custom.surfaceContainerHigh',
              borderRadius: '1.5rem',
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 4,
              alignItems: 'center'
            }}>
              <Box sx={{ width: { xs: '100%', md: '50%' } }}>
                <Typography variant="h3" sx={{ fontSize: '1.5rem', mb: 2 }}>The Screening Buffer Role</Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
                  The primary goal of this application is to create an effective pre-screening layer. By filtering scans before they reach a specialist, we increase patient availability and clinical throughput.
                </Typography>
              </Box>

              <Box sx={{
                width: { xs: '100%', md: '50%' },
                height: 192,
                bgcolor: 'custom.surface',
                borderRadius: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,87,192,0.1), rgba(0,104,95,0.1))' }} />
                <Biotech sx={{ fontSize: 120, color: 'rgba(0,87,192,0.3)', position: 'relative', zIndex: 10 }} />
              </Box>
            </Paper>
          </Grid>

        </Grid>
      </Container>
    </Box>
  );
};

export default BentoGrid;
