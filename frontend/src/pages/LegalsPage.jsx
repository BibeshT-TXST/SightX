import { Box, Typography } from '@mui/material';
import PolicyIcon from '@mui/icons-material/Policy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DashboardLayout from '../components/layout/DashboardLayout';

export default function LegalsPage() {
  return (
    <DashboardLayout>
      <Box sx={{ maxWidth: 800, mx: 'auto', width: '100%', p: { xs: 3, md: 6 }, pb: 12 }}>
        {/* ── Hero Header ── */}
        <Box sx={{ mb: 6 }}>
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '2rem', md: '2.75rem' },
              fontWeight: 800,
              color: '#171c22',
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
              mb: 3,
            }}
          >
            Clinical Data Integrity &amp;
            <br />
            <Box component="span" sx={{ color: '#006ff0' }}>
              Documentation Standards.
            </Box>
          </Typography>

          {/* Mandatory Disclaimer */}
          <Box
            sx={{
              bgcolor: 'rgba(219,234,254,0.5)',
              borderLeft: '4px solid #0057c0',
              p: 3,
              borderRadius: '0 0.75rem 0.75rem 0',
              mb: 4,
            }}
          >
            <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', mb: 0.5 }}>
              Mandatory Disclaimer
            </Typography>
            <Typography sx={{ color: '#414755', lineHeight: 1.7 }}>
              SightX is a clinical decision support tool built for trained medical professionals
              and residents. It does not replace professional medical judgments. All AI generated
              results must be verified by a certified practitioner before any clinical action is
              taken.
            </Typography>
          </Box>

          <Typography
            sx={{
              color: '#414755',
              fontSize: '1.1rem',
              lineHeight: 1.7,
              maxWidth: 640,
              fontWeight: 500,
            }}
          >
            We take data protection seriously. Below is how SightX handles patient data and
            retinal images throughout the screening workflow.
          </Typography>
        </Box>

        {/* ── Data Privacy ── */}
        <Box
          sx={{
            bgcolor: '#ffffff',
            p: 4,
            borderRadius: '0.75rem',
            border: '1px solid rgba(193,198,215,0.15)',
            boxShadow: '0 20px 40px rgba(0,123,255,0.04)',
            mb: 3,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3 }}>
            <Box sx={{ p: 1.5, bgcolor: 'rgba(0,87,192,0.1)', borderRadius: '0.75rem', color: '#0057c0' }}>
              <PolicyIcon />
            </Box>
            <Box>
              <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                Data Privacy
              </Typography>
              <Typography sx={{ fontSize: '0.875rem', color: '#414755', fontWeight: 500 }}>
                Last Updated: March 2026
              </Typography>
            </Box>
          </Box>
          <Typography sx={{ color: '#414755', lineHeight: 1.7, mb: 2 }}>
            SightX does not retain, store, or redistribute uploaded retinal images. All image
            data is processed in-memory for analysis and is immediately discarded once the
            diagnostic result is generated.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {[
              'Patient identifiers are fully anonymized, no PII is extracted or stored at any point.',
              'Uploaded images are scrubbed from memory after analysis and are never used for model training or any secondary purpose.',
              'Scan result metadata is encrypted at rest and accessible only to the authenticated practitioner who initiated the session.',
            ].map((text) => (
              <Box key={text} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <CheckCircleIcon sx={{ color: '#00685f', fontSize: 16, mt: 0.5, flexShrink: 0 }} />
                <Typography sx={{ color: '#414755', fontSize: '0.9rem' }}>{text}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* ── Service Guidelines ── */}
        <Box
          sx={{
            bgcolor: 'rgba(240,244,252,0.5)',
            p: 5,
            borderRadius: '0.75rem',
            border: '1px solid rgba(193,198,215,0.1)',
          }}
        >
          <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', mb: 4 }}>
            Service Guidelines
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              {
                num: '1',
                title: 'Use of Diagnostic Tools',
                text: 'SightX tools are intended as clinical decision support only and do not replace professional medical judgment. Residents must have all automated detections verified by a certified practitioner.',
              },
              {
                num: '2',
                title: 'Professional Responsibility',
                text: 'Medical professionals are responsible for the clinical interpretation of results. Credentials must be maintained and kept confidential to protect institutional access.',
              },
              {
                num: '3',
                title: 'Operational Availability',
                text: 'Service uptime is maintained to support around the clock hospital operations. Maintenance windows are scheduled during low utilization periods to minimize disruption.',
              },
            ].map((article) => (
              <Box key={article.num}>
                <Typography
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 900,
                    color: '#414755',
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    mb: 1.5,
                  }}
                >
                  {article.num}. {article.title}
                </Typography>
                <Typography sx={{ color: '#414755', lineHeight: 1.7, fontSize: '0.875rem' }}>
                  {article.text}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* ── Footer ── */}
        <Box sx={{ mt: 10, pt: 6, borderTop: '1px solid rgba(193,198,215,0.1)', textAlign: 'center' }}>
          <Typography
            sx={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'rgba(65,71,85,0.4)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}
          >
            © 2026 SightX Clinical Systems • Technical &amp; Operational Documentation
          </Typography>
        </Box>
      </Box>
    </DashboardLayout>
  );
}
