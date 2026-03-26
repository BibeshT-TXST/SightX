import { Box, Typography, Avatar, Button } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import VerifiedIcon from '@mui/icons-material/Verified';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import FilterListIcon from '@mui/icons-material/FilterList';
import DownloadIcon from '@mui/icons-material/Download';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useState, useEffect } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const diagnosisStyles = {
  tertiary: { bgcolor: '#008378', color: '#f4fffc' },
  error: { bgcolor: '#ffdad6', color: '#93000a' },
  warning: { bgcolor: '#ffddb3', color: '#8a4b00' },
};

const getDiagnosisColor = (diagnosis) => {
    if (!diagnosis) return 'tertiary';
    if (diagnosis.includes('Mandatory')) return 'error';
    if (diagnosis.includes('Required')) return 'warning';
    return 'tertiary';
};

const formatDate = (dateString) => {
    const d = new Date(dateString);
    return {
        date: d.toLocaleDateString(),
        time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
};

export default function AccountsPage() {
  const { session, profile } = useAuth();
  const [scans, setScans] = useState([]);

  useEffect(() => {
    async function fetchScans() {
      if (!session) return;
      const { data, error } = await supabase
        .from('patient_scans')
        .select('*')
        .eq('practitioner_id', session.user.id)
        .order('created_at', { ascending: false });
        
      if (!error && data) {
        setScans(data);
      } else {
        console.error('Error fetching scans:', error);
      }
    }
    fetchScans();
  }, [session]);

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
                {profile ? `${profile.first_name} ${profile.last_name}` : '[ Name ]'}
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
                {profile ? profile.role : '[ Role ]'}
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
                  { label: 'Last Session', value: scans.length > 0 ? `${formatDate(scans[0].created_at).date} • ${formatDate(scans[0].created_at).time}` : 'No sessions' },
                  { label: 'Clinical Unit', value: profile ? profile.clinical_unit : '[ Unit ]' },
                  { label: 'Practitioner ID', value: profile ? profile.practitioner_id : '[ ID ]', mono: true },
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
                  {scans.length}
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
                {scans.map((row) => {
                  const { date, time } = formatDate(row.created_at);
                  const aiColorKey = getDiagnosisColor(row.ai_diagnosis);
                  const finalColorKey = getDiagnosisColor(row.final_diagnosis);

                  return (
                  <Box
                    component="tr"
                    key={row.id}
                    sx={{
                      borderBottom: '1px solid rgba(193,198,215,0.08)',
                      transition: 'background-color 0.2s',
                      '&:hover': { bgcolor: 'rgba(240,244,252,0.3)' },
                    }}
                  >
                    <Box component="td" sx={{ px: 4, py: 2.5 }}>
                      <Typography sx={{ fontSize: '0.875rem', fontWeight: 700 }}>
                        {date}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: '0.6875rem',
                          color: 'rgba(65,71,85,0.7)',
                          fontFamily: 'monospace',
                        }}
                      >
                        {time}
                      </Typography>
                    </Box>

                    <Box component="td" sx={{ px: 3, py: 2.5 }}>
                      <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                        {row.patient_name}
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
                          ...diagnosisStyles[aiColorKey],
                        }}
                      >
                        {row.ai_diagnosis}
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
                          ...diagnosisStyles[finalColorKey],
                        }}
                      >
                        {row.final_diagnosis}
                      </Box>
                    </Box>
                  </Box>
                )})}
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
                Showing {scans.length} of {scans.length} scans
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
