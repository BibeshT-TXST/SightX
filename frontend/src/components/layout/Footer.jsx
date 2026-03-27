import React from 'react';
import { Box, Typography, Container, Grid, Link } from '@mui/material';
import { Info, Lock } from '@mui/icons-material';

/**
 * Footer component displays the global mission statement, ethical engineering
 * disclosures, and project links.
 */
const Footer = () => {
  return (
    <Box component="footer" sx={{ bgcolor: 'custom.surface', py: 10, borderTop: '1px solid', borderColor: 'custom.surfaceContainerHigh' }}>
      <Container maxWidth="xl">
        <Grid container spacing={6} sx={{ mb: 10 }}>

          <Grid size={{ xs: 12, md: 3 }}>
            <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: '-0.05em', color: 'primary.dark', mb: 3 }}>
              Built to Assist
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
              SightX is a clinical decision support tool designed to augment, never substitute, the judgment of qualified medical professionals.
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: '-0.05em', color: 'text.secondary', mb: 3 }}>
              Mission
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
              Early detection of diabetic retinopathy through accessible, AI-assisted fundus screening in clinical environments
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: '-0.05em', color: 'text.secondary', mb: 3 }}>
              Ethical Engineering
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
              All detections require verification by a certified practitioner. Patient data is anonymized, encrypted, and handled in strict accordance with institutional privacy standards.
            </Typography>
          </Grid>

        </Grid>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: 'center', pt: 4, borderTop: '1px solid', borderColor: 'custom.surfaceContainerHigh' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            © {new Date().getFullYear()} SightX Project. For educational and research purposes only.
          </Typography>
          <Box sx={{ display: 'flex', gap: 4, mt: { xs: 2, md: 0 } }}>
            <Link href="https://github.com/BibeshT-TXST/SightX" underline="none" sx={{ color: 'text.secondary', fontSize: '0.75rem', '&:hover': { color: 'primary.main' } }}>GitHub</Link>
            <Link href="https://www.linkedin.com/in/bibesh-timalsina-a7a9482b9/" underline="none" sx={{ color: 'text.secondary', fontSize: '0.75rem', '&:hover': { color: 'primary.main' } }}>LinkedIn</Link>
            <Link href="https://darkmatterstech.blogspot.com/" underline="none" sx={{ color: 'text.secondary', fontSize: '0.75rem', '&:hover': { color: 'primary.main' } }}>Project Blog</Link>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
