import { Box, Typography, Button } from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import FilterListIcon from '@mui/icons-material/FilterList';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TableChartIcon from '@mui/icons-material/TableChart';
import { useState, useEffect } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

/* ── Severity Helpers ── */
const getSeverity = (diagnosis) => {
  if (!diagnosis) return 'default';
  if (diagnosis.includes('Mandatory')) return 'critical';
  if (diagnosis.includes('Required')) return 'warning';
  return 'nominal';
};

const severityConfig = {
  critical: { dot: '#dc2626', bg: 'rgba(220,38,38,0.07)', text: '#991b1b', border: 'rgba(220,38,38,0.15)' },
  warning:  { dot: '#d97706', bg: 'rgba(217,119,6,0.07)', text: '#92400e', border: 'rgba(217,119,6,0.15)' },
  nominal:  { dot: '#16a34a', bg: 'rgba(22,163,74,0.07)', text: '#166534', border: 'rgba(22,163,74,0.15)' },
  default:  { dot: '#94a3b8', bg: 'rgba(0,0,0,0.03)',     text: '#64748b', border: 'rgba(0,0,0,0.08)' },
};

const formatDate = (dateString) => {
  const d = new Date(dateString);
  return {
    date: d.toLocaleDateString(),
    time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
};

/**
 * AccountsPage displays the practitioner profile, diagnostic statistics,
 * and a comprehensive scan history log.
 */
export default function AccountsPage() {
  const { session, profile } = useAuth();
  const [scans, setScans] = useState([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 4;

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

  /* ── Computed Stats ── */
  const overrideCount = scans.filter((s) => s.ai_diagnosis !== s.final_diagnosis).length;
  const overrideRate = scans.length > 0 ? ((overrideCount / scans.length) * 100).toFixed(1) : '0.0';
  const urgentCount = scans.filter((s) => s.final_diagnosis?.includes('Mandatory')).length;

  /* ── Filtered Scans ── */
  const filteredScans = activeFilter === 'All'
    ? scans
    : scans.filter((s) => s.final_diagnosis?.includes(activeFilter));

  /* ── Pagination ── */
  const totalPages = Math.max(1, Math.ceil(filteredScans.length / ROWS_PER_PAGE));
  const paginatedScans = filteredScans.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  const handleFilterChange = (label) => {
    setActiveFilter(label);
    setCurrentPage(1);
  };

  return (
    <DashboardLayout>
      <Box sx={{ maxWidth: 1152, mx: 'auto', width: '100%', p: { xs: 3, md: 4 }, pb: 12 }}>
        {/* ── Page Header ── */}
        <Box sx={{ mb: 6 }}>
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '2rem', md: '2.75rem' },
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: '#171c22',
              lineHeight: 1.1,
            }}
          >
            Practitioner Account
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
            Profile overview, diagnostic statistics, and scan session history.
          </Typography>
        </Box>

        {/* ── Profile + Stats Grid ── */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '1fr 2fr' },
            gap: 3,
            mb: 4,
          }}
        >
          {/* ── Profile Card ── */}
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
            {/* Accent bar */}
            <Box sx={{ height: 4, background: 'linear-gradient(90deg, #0057c0, #3b82f6)' }} />

            <Box sx={{ p: 3.5 }}>
              {/* Header */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
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
                  <AccountCircleIcon sx={{ fontSize: 18, color: '#0057c0' }} />
                </Box>
                <Typography
                  sx={{
                    fontSize: '0.6875rem',
                    fontWeight: 800,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}
                >
                  Practitioner Profile
                </Typography>
              </Box>

              {/* Name + Role */}
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <Typography sx={{ fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#171c22' }}>
                    {profile ? `${profile.first_name} ${profile.last_name}` : '—'}
                  </Typography>
                  <VerifiedIcon sx={{ fontSize: 18, color: '#0057c0' }} />
                </Box>
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 2,
                    py: 0.5,
                    bgcolor: 'rgba(0,87,192,0.08)',
                    color: '#0057c0',
                    borderRadius: '1.5rem',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    mt: 1.5,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}
                >
                  {profile ? profile.role : '—'}
                </Box>
              </Box>

              {/* Info rows */}
              {[
                {
                  label: 'Last Session',
                  value: scans.length > 0
                    ? `${formatDate(scans[0].created_at).date} • ${formatDate(scans[0].created_at).time}`
                    : 'No sessions',
                  accent: '#0057c0',
                },
                { label: 'Clinical Unit', value: profile ? profile.clinical_unit : '—', accent: '#7c3aed' },
                { label: 'Practitioner ID', value: profile ? profile.practitioner_id : '—', accent: '#00685f', mono: true },
              ].map((item, i) => (
                <Box
                  key={item.label}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    py: 1.5,
                    borderBottom: i < 2 ? '1px solid #f1f5f9' : 'none',
                  }}
                >
                  <Typography sx={{ color: '#64748b', fontSize: '0.8125rem', fontWeight: 500 }}>
                    {item.label}
                  </Typography>
                  <Typography
                    sx={{
                      fontWeight: 600,
                      fontSize: item.mono ? '0.75rem' : '0.8125rem',
                      fontFamily: item.mono ? '"SF Mono", "Fira Code", monospace' : 'inherit',
                      color: '#171c22',
                    }}
                  >
                    {item.value}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* ── Stats Grid ── */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Hero stat: Total Scans */}
            <Box
              sx={{
                background: 'linear-gradient(135deg, #0057c0 0%, #1d4ed8 100%)',
                p: 3.5,
                borderRadius: '0.75rem',
                color: '#ffffff',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0,87,192,0.3)',
                flex: 1,
              }}
            >
              <Box sx={{ zIndex: 1, position: 'relative' }}>
                <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Total Retinal Scans
                </Typography>
                <Typography
                  sx={{
                    fontSize: '3rem',
                    fontWeight: 900,
                    letterSpacing: '-0.04em',
                    mt: 0.5,
                    lineHeight: 1,
                  }}
                >
                  {scans.length}
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', mt: 1 }}>
                  Lifetime diagnostic sessions performed
                </Typography>
              </Box>
              {/* Decorative */}
              <AnalyticsIcon
                sx={{
                  position: 'absolute',
                  right: -20,
                  bottom: -20,
                  fontSize: 140,
                  opacity: 0.1,
                  transform: 'rotate(12deg)',
                }}
              />
            </Box>

            {/* Secondary stats row */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
              {/* Override Rate */}
              <Box
                sx={{
                  bgcolor: '#ffffff',
                  borderRadius: '0.75rem',
                  border: '1px solid #e2e8f0',
                  overflow: 'hidden',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                  transition: 'box-shadow 0.3s, border-color 0.3s',
                  '&:hover': { boxShadow: '0 8px 32px rgba(0,0,0,0.1)', borderColor: '#cbd5e1' },
                }}
              >
                <Box sx={{ height: 4, background: 'linear-gradient(90deg, #7c3aed, #a78bfa)' }} />
                <Box sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <SwapHorizIcon sx={{ fontSize: 16, color: '#7c3aed' }} />
                    <Typography sx={{ fontSize: '0.6875rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Override Rate
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: '2rem', fontWeight: 900, color: '#171c22', letterSpacing: '-0.03em', lineHeight: 1 }}>
                    {overrideRate}%
                  </Typography>
                  <Typography sx={{ fontSize: '0.6875rem', color: '#64748b', mt: 1 }}>
                    {overrideCount} of {scans.length} scans overridden
                  </Typography>
                </Box>
              </Box>

              {/* Urgent Cases */}
              <Box
                sx={{
                  bgcolor: '#ffffff',
                  borderRadius: '0.75rem',
                  border: '1px solid #e2e8f0',
                  overflow: 'hidden',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                  transition: 'box-shadow 0.3s, border-color 0.3s',
                  '&:hover': { boxShadow: '0 8px 32px rgba(0,0,0,0.1)', borderColor: '#cbd5e1' },
                }}
              >
                <Box sx={{ height: 4, background: 'linear-gradient(90deg, #dc2626, #ef4444)' }} />
                <Box sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <WarningAmberIcon sx={{ fontSize: 16, color: '#dc2626' }} />
                    <Typography sx={{ fontSize: '0.6875rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Urgent Cases
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: '2rem', fontWeight: 900, color: '#171c22', letterSpacing: '-0.03em', lineHeight: 1 }}>
                    {urgentCount}
                  </Typography>
                  <Typography sx={{ fontSize: '0.6875rem', color: '#64748b', mt: 1 }}>
                    Patients flagged for mandatory visit
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* ── Scan History Table ── */}
        <Box
          sx={{
            bgcolor: '#ffffff',
            borderRadius: '0.75rem',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          }}
        >
          {/* Accent bar */}
          <Box sx={{ height: 4, background: 'linear-gradient(90deg, #0057c0, #3b82f6)' }} />

          {/* Table header area */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 3.5,
              py: 2.5,
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
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
                <TableChartIcon sx={{ fontSize: 18, color: '#0057c0' }} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.6875rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Scan History
                </Typography>
                <Typography sx={{ fontSize: '0.6875rem', color: '#94a3b8', mt: 0.25 }}>
                  {filteredScans.length} of {scans.length} sessions shown
                </Typography>
              </Box>
            </Box>
            <Button
              size="small"
              onClick={() => setShowFilters(!showFilters)}
              sx={{
                minWidth: 36,
                height: 36,
                p: 0,
                bgcolor: showFilters ? 'rgba(0,87,192,0.1)' : 'rgba(0,0,0,0.04)',
                borderRadius: '0.625rem',
                color: showFilters ? '#0057c0' : '#64748b',
                border: showFilters ? '1px solid rgba(0,87,192,0.2)' : '1px solid transparent',
                transition: 'all 0.2s',
                '&:hover': { bgcolor: showFilters ? 'rgba(0,87,192,0.15)' : 'rgba(0,0,0,0.08)' },
              }}
            >
              <FilterListIcon sx={{ fontSize: 16 }} />
            </Button>
          </Box>

          {/* Filter Bar */}
          {showFilters && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 3.5,
                py: 1.5,
                borderBottom: '1px solid #f1f5f9',
                bgcolor: '#f8fafc',
              }}
            >
              <Typography sx={{ fontSize: '0.625rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', mr: 1 }}>
                Filter:
              </Typography>
              {[
                { label: 'All', color: '#64748b' },
                { label: 'Optional', color: '#16a34a' },
                { label: 'Required', color: '#d97706' },
                { label: 'Mandatory', color: '#dc2626' },
              ].map((f) => (
                <Box
                  key={f.label}
                  onClick={() => handleFilterChange(f.label)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 1.5,
                    py: 0.5,
                    borderRadius: '1.5rem',
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    bgcolor: activeFilter === f.label ? `${f.color}14` : 'transparent',
                    color: activeFilter === f.label ? f.color : '#94a3b8',
                    border: `1px solid ${activeFilter === f.label ? `${f.color}30` : 'transparent'}`,
                    '&:hover': {
                      bgcolor: `${f.color}10`,
                      color: f.color,
                    },
                  }}
                >
                  {f.label !== 'All' && (
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: f.color, opacity: activeFilter === f.label ? 1 : 0.4 }} />
                  )}
                  {f.label}
                </Box>
              ))}
            </Box>
          )}

          {/* Table */}
          {filteredScans.length === 0 ? (
            /* Empty State */
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <AnalyticsIcon sx={{ fontSize: 48, color: '#e2e8f0', mb: 2 }} />
              <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#171c22', mb: 0.5 }}>
                {scans.length === 0 ? 'No scans recorded yet' : 'No matching scans'}
              </Typography>
              <Typography sx={{ fontSize: '0.8125rem', color: '#64748b' }}>
                {scans.length === 0 ? 'Complete a retinal scan analysis to see results here.' : 'Try adjusting your filter criteria.'}
              </Typography>
            </Box>
          ) : (
            <>
              <Box component="table" sx={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <Box
                  component="thead"
                  sx={{
                    bgcolor: '#f8fafc',
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  <Box component="tr">
                    {['Date & Time', 'Patient', 'AI Diagnosis', 'Clinician Diagnosis'].map((h, i) => (
                      <Box
                        component="th"
                        key={h}
                        sx={{
                          px: 3.5,
                          py: 2,
                          fontSize: '0.625rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.12em',
                          color: '#64748b',
                          textAlign: i === 3 ? 'right' : 'left',
                        }}
                      >
                        {h}
                      </Box>
                    ))}
                  </Box>
                </Box>
                <Box component="tbody">
                  {paginatedScans.map((row) => {
                    const { date, time } = formatDate(row.created_at);
                    const aiSeverity = getSeverity(row.ai_diagnosis);
                    const finalSeverity = getSeverity(row.final_diagnosis);
                    const aiStyle = severityConfig[aiSeverity];
                    const finalStyle = severityConfig[finalSeverity];

                    return (
                      <Box
                        component="tr"
                        key={row.id}
                        sx={{
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background-color 0.2s',
                          '&:hover': { bgcolor: 'rgba(0,87,192,0.02)' },
                          '&:last-child': { borderBottom: 'none' },
                        }}
                      >
                        {/* Date/Time */}
                        <Box component="td" sx={{ px: 3.5, py: 2.5 }}>
                          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, color: '#171c22' }}>
                            {date}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: '0.6875rem',
                              color: '#94a3b8',
                              fontFamily: '"SF Mono", "Fira Code", monospace',
                              mt: 0.25,
                            }}
                          >
                            {time}
                          </Typography>
                        </Box>

                        {/* Patient */}
                        <Box component="td" sx={{ px: 3.5, py: 2.5 }}>
                          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#171c22' }}>
                            {row.patient_name}
                          </Typography>
                        </Box>

                        {/* AI Diagnosis */}
                        <Box component="td" sx={{ px: 3.5, py: 2.5 }}>
                          <Box
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.75,
                              px: 1.5,
                              py: 0.5,
                              borderRadius: '1.5rem',
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              bgcolor: aiStyle.bg,
                              color: aiStyle.text,
                              border: `1px solid ${aiStyle.border}`,
                            }}
                          >
                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: aiStyle.dot }} />
                            {row.ai_diagnosis}
                          </Box>
                        </Box>

                        {/* Final Diagnosis */}
                        <Box component="td" sx={{ px: 3.5, py: 2.5, textAlign: 'right' }}>
                          <Box
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.75,
                              px: 1.5,
                              py: 0.5,
                              borderRadius: '1.5rem',
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              bgcolor: finalStyle.bg,
                              color: finalStyle.text,
                              border: `1px solid ${finalStyle.border}`,
                            }}
                          >
                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: finalStyle.dot }} />
                            {row.final_diagnosis}
                          </Box>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Box>

              {/* Pagination Footer */}
              <Box
                sx={{
                  px: 3.5,
                  py: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px solid #f1f5f9',
                }}
              >
                <Typography sx={{ fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 500 }}>
                  Showing {Math.min((currentPage - 1) * ROWS_PER_PAGE + 1, filteredScans.length)}–{Math.min(currentPage * ROWS_PER_PAGE, filteredScans.length)} of {filteredScans.length} records
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {/* Prev */}
                  <Box
                    component="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    sx={{
                      width: 28,
                      height: 28,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '0.5rem',
                      border: 'none',
                      cursor: currentPage === 1 ? 'default' : 'pointer',
                      bgcolor: 'rgba(0,0,0,0.04)',
                      color: currentPage === 1 ? '#cbd5e1' : '#64748b',
                      transition: 'all 0.2s',
                      '&:hover': { bgcolor: currentPage === 1 ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.08)' },
                    }}
                  >
                    <ChevronLeftIcon sx={{ fontSize: 14 }} />
                  </Box>

                  {/* Page numbers */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Box
                      key={page}
                      component="button"
                      onClick={() => setCurrentPage(page)}
                      sx={{
                        width: 28,
                        height: 28,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '0.5rem',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '0.6875rem',
                        bgcolor: currentPage === page ? '#0057c0' : 'rgba(0,0,0,0.04)',
                        color: currentPage === page ? '#ffffff' : '#64748b',
                        transition: 'all 0.2s',
                        '&:hover': {
                          bgcolor: currentPage === page ? '#0057c0' : 'rgba(0,0,0,0.08)',
                        },
                      }}
                    >
                      {page}
                    </Box>
                  ))}

                  {/* Next */}
                  <Box
                    component="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    sx={{
                      width: 28,
                      height: 28,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '0.5rem',
                      border: 'none',
                      cursor: currentPage === totalPages ? 'default' : 'pointer',
                      bgcolor: 'rgba(0,0,0,0.04)',
                      color: currentPage === totalPages ? '#cbd5e1' : '#64748b',
                      transition: 'all 0.2s',
                      '&:hover': { bgcolor: currentPage === totalPages ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.08)' },
                    }}
                  >
                    <ChevronRightIcon sx={{ fontSize: 14 }} />
                  </Box>
                </Box>
              </Box>
            </>
          )}
        </Box>
      </Box>
    </DashboardLayout>
  );
}
