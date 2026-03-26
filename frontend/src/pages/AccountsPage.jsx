import { Box, Typography, Avatar, Button } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import VerifiedIcon from '@mui/icons-material/Verified';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import FilterListIcon from '@mui/icons-material/FilterList';
import DownloadIcon from '@mui/icons-material/Download';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DashboardLayout from '../components/layout/DashboardLayout';

const SCAN_ROWS = [
  {
    date: '[Date]',
    time: '[Time]',
    patient: '[Patient Name]',
    diagnosis: '[AI Diagnosis]',
    diagnosisColor: 'tertiary',
    finalDiagnosis: '[Final Diagnosis]',
    finalDiagnosisColor: 'tertiary',
  },
  {
    date: '[Date]',
    time: '[Time]',
    patient: '[Patient Name]',
    diagnosis: '[AI Diagnosis]',
    diagnosisColor: 'error',
    finalDiagnosis: '[Final Diagnosis]',
    finalDiagnosisColor: 'error',
  },
  {
    date: '[Date]',
    time: '[Time]',
    patient: '[Patient Name]',
    diagnosis: '[AI Diagnosis]',
    diagnosisColor: 'tertiary',
    finalDiagnosis: '[Final Diagnosis]',
    finalDiagnosisColor: 'tertiary',
  },
];

const diagnosisStyles = {
  tertiary: { bgcolor: '#008378', color: '#f4fffc' },
  error: { bgcolor: '#ffdad6', color: '#93000a' },
};

export default function AccountsPage() {
  return (
    <DashboardLayout>
      <Box sx={{ maxWidth: 1280, mx: 'auto', width: '100%', p: { xs: 3, md: 5 }, pb: 12 }}>
        {/* ── Profile Overview Section ── */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '1fr 2fr' },
            gap: 4,
            alignItems: 'start',
            mb: 5,
          }}
        >
          {/* Profile Card */}
          <Box
            sx={{
              bgcolor: '#ffffff',
              borderRadius: '0.75rem',
              p: 4,
              boxShadow: '0 20px 40px rgba(0,87,192,0.04)',
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                [ Name ]
              </Typography>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 1.5,
                  py: 0.5,
                  bgcolor: '#008378',
                  color: '#f4fffc',
                  borderRadius: '1.5rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  mt: 1,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                [ Role ]
              </Box>

              <Box
                sx={{
                  mt: 3,
                  pt: 3,
                  borderTop: '1px solid rgba(193,198,215,0.15)',
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                }}
              >
                {[
                  { label: 'Last Session', value: '[ Date • Time ]' },
                  { label: 'Clinical Unit', value: '[ Unit ]' },
                  { label: 'Practitioner ID', value: '[ ID ]', mono: true },
                ].map((item) => (
                  <Box
                    key={item.label}
                    sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}
                  >
                    <Typography sx={{ color: '#414755', fontSize: '0.875rem' }}>
                      {item.label}
                    </Typography>
                    <Typography
                      sx={{
                        fontWeight: 500,
                        fontSize: item.mono ? '0.75rem' : '0.875rem',
                        fontFamily: item.mono ? 'monospace' : 'inherit',
                      }}
                    >
                      {item.value}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>

          {/* Stats Cards */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: 2,
            }}
          >
            {/* Scans Performed */}
            <Box
              sx={{
                bgcolor: '#0057c0',
                p: 3,
                borderRadius: '0.75rem',
                color: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: 192,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <Box sx={{ zIndex: 1 }}>
                <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', fontWeight: 500 }}>
                  Retinal Scans Performed
                </Typography>
                <Typography
                  sx={{
                    fontSize: '2.5rem',
                    fontWeight: 800,
                    letterSpacing: '-0.04em',
                    mt: 0.5,
                  }}
                >
                  [ Number ]
                </Typography>
              </Box>

              {/* Decorative icon */}
              <AnalyticsIcon
                sx={{
                  position: 'absolute',
                  right: -16,
                  bottom: -16,
                  fontSize: 120,
                  opacity: 0.15,
                  transform: 'rotate(12deg)',
                }}
              />
            </Box>
          </Box>
        </Box>

        {/* ── Recent Retinal Scans Table ── */}
        <Box sx={{ mb: 3 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: { md: 'flex-end' },
              justifyContent: 'space-between',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 2,
              px: 1,
              mb: 3,
            }}
          >
            <Box>
              <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                Recent Retinal Scans
              </Typography>
              <Typography sx={{ color: '#414755', fontSize: '0.875rem' }}>
                Screening log and diagnostic session history
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                sx={{
                  minWidth: 40,
                  p: 1,
                  bgcolor: '#e4e8f0',
                  borderRadius: '0.75rem',
                  color: '#171c22',
                  '&:hover': { bgcolor: '#dee3eb' },
                }}
              >
                <FilterListIcon fontSize="small" />
              </Button>
            </Box>
          </Box>

          <Box
            sx={{
              bgcolor: '#ffffff',
              borderRadius: '0.75rem',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,87,192,0.04)',
            }}
          >
            {/* Table */}
            <Box component="table" sx={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <Box
                component="thead"
                sx={{
                  bgcolor: 'rgba(240,244,252,0.5)',
                  borderBottom: '1px solid rgba(193,198,215,0.15)',
                }}
              >
                <Box component="tr">
                  {['Date & Time', 'Patient Name', 'AI Diagnosis', 'Final Diagnosis'].map(
                    (h, i) => (
                      <Box
                        component="th"
                        key={h}
                        sx={{
                          px: i === 0 || i === 3 ? 4 : 3,
                          py: 2.5,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.12em',
                          color: '#414755',
                          textAlign: i === 3 ? 'right' : 'left',
                        }}
                      >
                        {h}
                      </Box>
                    ),
                  )}
                </Box>
              </Box>
              <Box component="tbody">
                {SCAN_ROWS.map((row) => (
                  <Box
                    component="tr"
                    key={row.patient}
                    sx={{
                      borderBottom: '1px solid rgba(193,198,215,0.08)',
                      transition: 'background-color 0.2s',
                      '&:hover': { bgcolor: 'rgba(240,244,252,0.3)' },
                    }}
                  >
                    <Box component="td" sx={{ px: 4, py: 2.5 }}>
                      <Typography sx={{ fontSize: '0.875rem', fontWeight: 700 }}>
                        {row.date}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: '0.6875rem',
                          color: 'rgba(65,71,85,0.7)',
                          fontFamily: 'monospace',
                        }}
                      >
                        {row.time}
                      </Typography>
                    </Box>

                    <Box component="td" sx={{ px: 3, py: 2.5 }}>
                      <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                        {row.patient}
                      </Typography>
                    </Box>
                    <Box component="td" sx={{ px: 3, py: 2.5 }}>
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.75,
                          px: 1.5,
                          py: 0.5,
                          borderRadius: '1.5rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          ...diagnosisStyles[row.diagnosisColor],
                        }}
                      >
                        {row.diagnosis}
                      </Box>
                    </Box>
                    <Box component="td" sx={{ px: 4, py: 2.5, textAlign: 'right' }}>
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.75,
                          px: 1.5,
                          py: 0.5,
                          borderRadius: '1.5rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          ...diagnosisStyles[row.finalDiagnosisColor],
                        }}
                      >
                        {row.finalDiagnosis}
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Pagination Footer */}
            <Box
              sx={{
                bgcolor: 'rgba(240,244,252,0.2)',
                px: 4,
                py: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography sx={{ fontSize: '0.75rem', color: '#414755', fontWeight: 500 }}>
                Showing [ number of scans] of [ total number of scans]
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {[
                  { content: <ChevronLeftIcon sx={{ fontSize: 16 }} />, active: false },
                  { content: '1', active: true },
                  { content: '2', active: false },
                  { content: <ChevronRightIcon sx={{ fontSize: 16 }} />, active: false },
                ].map((btn, i) => (
                  <Box
                    key={i}
                    component="button"
                    sx={{
                      width: 32,
                      height: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '0.5rem',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      bgcolor: btn.active ? '#0057c0' : 'rgba(222,227,235,0.4)',
                      color: btn.active ? '#ffffff' : '#414755',
                      '&:hover': {
                        bgcolor: btn.active ? '#0057c0' : '#dee3eb',
                      },
                    }}
                  >
                    {btn.content}
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </DashboardLayout>
  );
}
