import { Box, Typography } from '@mui/material';
import PolicyIcon from '@mui/icons-material/Policy';
import GavelIcon from '@mui/icons-material/Gavel';
import ShieldIcon from '@mui/icons-material/Shield';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import DashboardLayout from '../components/layout/DashboardLayout';

/**
 * LegalsPage contains the mandatory clinical disclaimers, data privacy policies,
 * and service guidelines for the SightX platform.
 */
export default function LegalsPage() {
  return (
    <DashboardLayout>
      <Box sx={{ maxWidth: 900, mx: 'auto', width: '100%', p: { xs: 3, md: 4 }, pb: 12 }}>
        {/* ── Page Header ── */}
        <Box sx={{ mb: 6 }}>
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '2rem', md: '2.75rem' },
              fontWeight: 800,
              color: '#171c22',
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
            }}
          >
            Legal & Compliance
          </Typography>
          <Typography
            sx={{
              color: '#414755',
              maxWidth: 560,
              fontSize: '1.1rem',
              lineHeight: 1.6,
              mt: 1,
            }}
          >
            Clinical disclaimers, data privacy policies, and service guidelines.
          </Typography>
        </Box>

        {/* ── Mandatory Disclaimer Banner ── */}
        <Box
          sx={{
            bgcolor: '#ffffff',
            borderRadius: '0.75rem',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            mb: 3,
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          }}
        >
          <Box sx={{ height: 4, background: 'linear-gradient(90deg, #dc2626, #ef4444)' }} />
          <Box sx={{ p: 3.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '0.625rem',
                  bgcolor: 'rgba(220,38,38,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldIcon sx={{ fontSize: 18, color: '#dc2626' }} />
              </Box>
              <Typography
                sx={{
                  fontSize: '0.6875rem',
                  fontWeight: 800,
                  color: '#dc2626',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                Mandatory Disclaimer
              </Typography>
            </Box>
            <Typography sx={{ color: '#414755', lineHeight: 1.8, fontSize: '0.9375rem' }}>
              SightX is a clinical decision support tool built for trained medical professionals
              and residents. It does not replace professional medical judgment. All AI-generated
              results must be verified by a certified practitioner before any clinical action is
              taken.
            </Typography>
          </Box>
        </Box>

        {/* ── Two-Column Grid: Privacy + Guidelines ── */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 3,
            mb: 3,
          }}
        >
          {/* Data Privacy Card */}
          <Box
            sx={{
              bgcolor: '#ffffff',
              borderRadius: '0.75rem',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
              transition: 'box-shadow 0.3s',
              '&:hover': { boxShadow: '0 8px 32px rgba(0,0,0,0.1)' },
            }}
          >
            <Box sx={{ height: 4, background: 'linear-gradient(90deg, #0057c0, #3b82f6)' }} />
            <Box sx={{ p: 3.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '0.625rem',
                    bgcolor: 'rgba(0,87,192,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <PolicyIcon sx={{ fontSize: 18, color: '#0057c0' }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.6875rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Data Privacy
                  </Typography>
                  <Typography sx={{ fontSize: '0.5625rem', color: '#94a3b8', mt: 0.25 }}>
                    Last updated March 2026
                  </Typography>
                </Box>
              </Box>

              <Typography sx={{ color: '#414755', lineHeight: 1.7, fontSize: '0.8125rem', mb: 2.5 }}>
                SightX does not retain, store, or redistribute uploaded retinal images. All image
                data is processed in-memory and immediately discarded after analysis.
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {[
                  'Patient identifiers are fully anonymized, no PII is extracted or stored.',
                  'Uploaded images are scrubbed from memory after analysis.',
                  'Scan metadata is encrypted at rest and accessible only to the authenticated practitioner.',
                ].map((text) => (
                  <Box key={text} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
                    <CheckCircleIcon sx={{ color: '#16a34a', fontSize: 14, mt: '3px', flexShrink: 0 }} />
                    <Typography sx={{ color: '#414755', fontSize: '0.75rem', lineHeight: 1.6 }}>{text}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>

          {/* Service Guidelines Card */}
          <Box
            sx={{
              bgcolor: '#ffffff',
              borderRadius: '0.75rem',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
              transition: 'box-shadow 0.3s',
              '&:hover': { boxShadow: '0 8px 32px rgba(0,0,0,0.1)' },
            }}
          >
            <Box sx={{ height: 4, background: 'linear-gradient(90deg, #7c3aed, #a78bfa)' }} />
            <Box sx={{ p: 3.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '0.625rem',
                    bgcolor: 'rgba(124,58,237,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <GavelIcon sx={{ fontSize: 18, color: '#7c3aed' }} />
                </Box>
                <Typography sx={{ fontSize: '0.6875rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Service Guidelines
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {[
                  {
                    num: '01',
                    title: 'Use of Diagnostic Tools',
                    text: 'SightX tools are intended as clinical decision support only. Residents must have all automated detections verified by a certified practitioner.',
                  },
                  {
                    num: '02',
                    title: 'Professional Responsibility',
                    text: 'Medical professionals are responsible for the clinical interpretation of results. Credentials must be maintained and kept confidential.',
                  },
                  {
                    num: '03',
                    title: 'Operational Availability',
                    text: 'Service uptime is maintained to support 24/7 hospital operations. Maintenance windows are scheduled during low utilization periods.',
                  },
                ].map((article) => (
                  <Box key={article.num}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                      <Typography
                        sx={{
                          fontSize: '0.625rem',
                          fontWeight: 900,
                          color: '#7c3aed',
                          fontFamily: '"SF Mono", "Fira Code", monospace',
                        }}
                      >
                        {article.num}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#171c22',
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                        }}
                      >
                        {article.title}
                      </Typography>
                    </Box>
                    <Typography sx={{ color: '#64748b', lineHeight: 1.7, fontSize: '0.75rem', pl: 2.5 }}>
                      {article.text}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </Box>

        {/* ── Compliance Badge ── */}
        <Box
          sx={{
            bgcolor: '#ffffff',
            borderRadius: '0.75rem',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          }}
        >
          <Box sx={{ height: 4, background: 'linear-gradient(90deg, #16a34a, #22c55e)' }} />
          <Box
            sx={{
              p: 3.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '0.625rem',
                  bgcolor: 'rgba(22,163,74,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <VerifiedUserIcon sx={{ fontSize: 18, color: '#16a34a' }} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.6875rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Compliance Status
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: '#414755', mt: 0.25 }}>
                  All data handling practices meet institutional standards
                </Typography>
              </Box>
            </Box>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
                px: 2,
                py: 0.5,
                bgcolor: 'rgba(22,163,74,0.08)',
                color: '#16a34a',
                borderRadius: '1.5rem',
                fontSize: '0.6875rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                border: '1px solid rgba(22,163,74,0.15)',
              }}
            >
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#16a34a' }} />
              Compliant
            </Box>
          </Box>
        </Box>

        {/* ── Footer ── */}
        <Box sx={{ mt: 8, pt: 4, borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
          <Typography
            sx={{
              fontSize: '0.625rem',
              fontWeight: 600,
              color: '#94a3b8',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            © 2026 SightX Clinical Systems • Technical & Operational Documentation
          </Typography>
        </Box>
      </Box>
    </DashboardLayout>
  );
}
