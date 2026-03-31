import { useState, useRef, useEffect } from 'react';
import { Box, Typography, Button } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SettingsIcon from '@mui/icons-material/Settings';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import HelpIcon from '@mui/icons-material/Help';
import PrintIcon from '@mui/icons-material/Print';
import DashboardLayout from '../components/layout/DashboardLayout';
import { TextField, MenuItem } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

/**
 * RetinalScanPage is the core diagnostic interface of SightX.
 * Handles image uploads, AI inference requests, and clinical verification persistence.
 */
export default function RetinalScanPage() {

  const { session, profile } = useAuth(); // Assume session and profile exist
  const [patientName, setPatientName] = useState('');
  const [patientId, setPatientId] = useState('');
  const [finalDiagnosis, setFinalDiagnosis] = useState('');

  const [scanResult, setScanResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const fileInputRef = useRef(null);

  // Auto-populate the Final Diagnosis field with the AI's prediction
  useEffect(() => {
    if (scanResult) {
      setFinalDiagnosis(scanResult.tier);
    }
  }, [scanResult]);

  const handleConfirmScan = async () => {
    const { error } = await supabase
      .from('patient_scans')
      .insert([
        {
          patient_name: patientName,
          patient_id: patientId,
          practitioner_id: session.user.id, // Implicit tracking
          clinician_name: `${profile.first_name} ${profile.last_name}`,
          ai_diagnosis: scanResult.tier,
          final_diagnosis: finalDiagnosis
        }
      ]);
    if (!error) {
      setIsSuccess(true);
      // Reset everything for the next patient
      setScanResult(null);
      setPatientName('');
      setPatientId('');
      setFinalDiagnosis('');

      // Clear the success message after 3 seconds
      setTimeout(() => {
        setIsSuccess(false);
      }, 3000);
    } else {
      console.error('Save failed:', error);
    }
  };

  const processFile = async (file) => {
    if (!file) return;
    setIsProcessing(true);
    const formData = new FormData();
    formData.append('image', file);
    try {
      // Send to our Node.js Backend API
      const response = await fetch('http://localhost:5001/api/scan/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      setScanResult(data);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (event) => {
    processFile(event.target.files[0]);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    if (isProcessing) return;
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      processFile(event.dataTransfer.files[0]);
      event.dataTransfer.clearData();
    }
  };

  return (
    <DashboardLayout>
      <Box sx={{ maxWidth: 1152, mx: 'auto', width: '100%', p: { xs: 3, md: 4 }, pb: 12 }}>
        {/* ── Hero / Header ── */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { md: 'flex-end' },
            gap: 3,
            mb: 6,
          }}
        >
          <Box>
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
              Retinal Scan Analysis
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
              Resident screening portal for high resolution fundus images.
            </Typography>
            <Typography
              sx={{
                fontSize: '0.625rem',
                fontWeight: 700,
                color: 'rgba(186,26,26,0.7)',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                mt: 1,
              }}
            >
              Tool for use by trained medical professionals only.
            </Typography>
          </Box>
        </Box>

        {/* ── Diagnostic Bento Grid ── */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
            gap: 3,
            mb: 3,
          }}
        >
          {/* Upload Zone / Confirmation Form */}
          {!scanResult ? (
            <Box
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              sx={{
                position: 'relative',
                minHeight: 480,
                borderRadius: '0.75rem',
                border: '2px dashed',
                borderColor: '#c1c6d7',
                bgcolor: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                transition: 'all 0.3s',
                cursor: isProcessing || isSuccess ? 'default' : 'pointer',
                pointerEvents: isProcessing || isSuccess ? 'none' : 'auto',
                '&:hover': {
                  borderColor: 'rgba(0,87,192,0.4)',
                  bgcolor: 'rgba(0,87,192,0.03)',
                },
              }}
            >
              <input
                type="file"
                accept="image/jpeg, image/png"
                style={{ display: 'none' }}
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              {/* Radial glow */}
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 0.1,
                  background:
                    'radial-gradient(circle at center, #0057c0, transparent 70%)',
                  pointerEvents: 'none',
                }}
              />
              <Box sx={{ zIndex: 1, textAlign: 'center' }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    bgcolor: isSuccess ? 'rgba(0,131,120,0.1)' : 'rgba(0,87,192,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                    transition: 'transform 0.3s',
                    '&:hover': { transform: 'scale(1.1)' },
                  }}
                >
                  {isSuccess ? (
                    <CheckCircleIcon sx={{ fontSize: 40, color: '#008378' }} />
                  ) : (
                    <CloudUploadIcon sx={{ fontSize: 40, color: '#0057c0' }} />
                  )}
                </Box>
                <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: isSuccess ? '#00685f' : '#171c22', mb: 0.5 }}>
                  {isProcessing ? 'Processing Scan...' : isSuccess ? 'Patient Record Saved!' : 'Upload Fundus Image'}
                </Typography>
                <Typography sx={{ color: '#414755', fontSize: '0.875rem', mb: 3 }}>
                  {isSuccess ? 'Database successfully synced.' : 'Drag and drop high resolution clinical exports'}
                </Typography>
                {!isSuccess && (
                  <Button
                    variant="contained"
                    sx={{
                      px: 4,
                      py: 1.5,
                      borderRadius: '0.75rem',
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #0057c0 0%, #006ff0 100%)',
                      boxShadow: '0 8px 20px rgba(0,87,192,0.2)',
                      '&:active': { transform: 'scale(0.95)' },
                    }}
                  >
                    Browse Clinical Files
                  </Button>
                )}
              </Box>
            </Box>
          ) : (
            <Box
              sx={{
                bgcolor: '#ffffff',
                borderRadius: '0.75rem',
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 480,
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
              }}
            >
              {/* Severity accent bar */}
              <Box
                sx={{
                  height: 4,
                  background: scanResult
                    ? scanResult.tier === 'Doctor Visit Mandatory'
                      ? 'linear-gradient(90deg, #dc2626, #ef4444)'
                      : scanResult.tier === 'Doctor Visit Required'
                        ? 'linear-gradient(90deg, #d97706, #f59e0b)'
                        : 'linear-gradient(90deg, #16a34a, #22c55e)'
                    : 'linear-gradient(90deg, #e2e8f0, #cbd5e1)',
                }}
              />

              <Box sx={{ p: { xs: 3, md: 4 }, flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: '0.625rem',
                        bgcolor: 'rgba(0,104,95,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <CheckCircleIcon sx={{ fontSize: 18, color: '#00685f' }} />
                    </Box>
                    <Box>
                      <Typography
                        sx={{
                          fontSize: '0.6875rem',
                          fontWeight: 800,
                          color: '#64748b',
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                        }}
                      >
                        Clinical Confirmation
                      </Typography>
                    </Box>
                  </Box>
                  <Typography sx={{ fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.5, mt: 1 }}>
                    Review the AI assessment and confirm the patient record before saving.
                  </Typography>
                </Box>

                {/* AI Diagnosis Badge */}
                {scanResult && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      p: 2,
                      mb: 3,
                      borderRadius: '0.625rem',
                      bgcolor: scanResult.tier === 'Doctor Visit Mandatory'
                        ? 'rgba(220,38,38,0.06)'
                        : scanResult.tier === 'Doctor Visit Required'
                          ? 'rgba(217,119,6,0.06)'
                          : 'rgba(22,163,74,0.06)',
                      border: '1px solid',
                      borderColor: scanResult.tier === 'Doctor Visit Mandatory'
                        ? 'rgba(220,38,38,0.15)'
                        : scanResult.tier === 'Doctor Visit Required'
                          ? 'rgba(217,119,6,0.15)'
                          : 'rgba(22,163,74,0.15)',
                    }}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: scanResult.tier === 'Doctor Visit Mandatory'
                          ? '#dc2626'
                          : scanResult.tier === 'Doctor Visit Required'
                            ? '#d97706'
                            : '#16a34a',
                        flexShrink: 0,
                      }}
                    />
                    <Box>
                      <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        AI Assessment
                      </Typography>
                      <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: '#171c22' }}>
                        {scanResult.tier}
                      </Typography>
                    </Box>
                  </Box>
                )}

                {/* Form Fields */}
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    fullWidth
                    label="Patient Full Name"
                    variant="outlined"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '0.625rem',
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#0057c0',
                          borderWidth: 2,
                        },
                      },
                      '& .MuiInputLabel-root.Mui-focused': { color: '#0057c0' },
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Patient / Medical ID"
                    variant="outlined"
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '0.625rem',
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#0057c0',
                          borderWidth: 2,
                        },
                      },
                      '& .MuiInputLabel-root.Mui-focused': { color: '#0057c0' },
                    }}
                  />
                  <TextField
                    select
                    fullWidth
                    label="Clinician Overriding Diagnosis"
                    variant="outlined"
                    value={finalDiagnosis}
                    onChange={(e) => setFinalDiagnosis(e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '0.625rem',
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#0057c0',
                          borderWidth: 2,
                        },
                      },
                      '& .MuiInputLabel-root.Mui-focused': { color: '#0057c0' },
                    }}
                  >
                    <MenuItem value="Doctor Visit Optional">Doctor Visit Optional</MenuItem>
                    <MenuItem value="Doctor Visit Required">Doctor Visit Required</MenuItem>
                    <MenuItem value="Doctor Visit Mandatory">Doctor Visit Mandatory</MenuItem>
                  </TextField>
                </Box>

                {/* Submit Button */}
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleConfirmScan}
                  disabled={!patientName || !patientId}
                  sx={{
                    mt: 3,
                    py: 1.75,
                    borderRadius: '0.75rem',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    letterSpacing: '0.02em',
                    background: 'linear-gradient(135deg, #00685f 0%, #008378 100%)',
                    boxShadow: '0 4px 14px rgba(0,104,95,0.25)',
                    transition: 'all 0.3s',
                    '&:hover': {
                      boxShadow: '0 6px 20px rgba(0,104,95,0.35)',
                      transform: 'translateY(-1px)',
                    },
                    '&:active': { transform: 'scale(0.98)' },
                    '&.Mui-disabled': {
                      background: '#e2e8f0',
                      color: '#94a3b8',
                      boxShadow: 'none',
                    },
                  }}
                >
                  Save Patient Record
                </Button>

                {/* Disclaimer */}
                <Typography
                  sx={{
                    fontSize: '0.625rem',
                    color: '#94a3b8',
                    textAlign: 'center',
                    mt: 2,
                    lineHeight: 1.5,
                  }}
                >
                  This record will be permanently saved. Only licensed practitioners may confirm diagnoses.
                </Typography>
              </Box>
            </Box>
          )}

          {/* Right Column: Status + Protocol stacked */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Live Monitoring Card */}
            <Box
              sx={{
                p: 3,
                bgcolor: '#f0f4fc',
                borderRadius: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden',
                /* ── Keyframes ── */
                '@keyframes hourglass-spin': {
                  '0%': { transform: 'rotate(0deg)' },
                  '40%': { transform: 'rotate(180deg)' },
                  '100%': { transform: 'rotate(180deg)' },
                },
                '@keyframes shimmer-bar': {
                  '0%': { transform: 'translateX(-100%)' },
                  '100%': { transform: 'translateX(200%)' },
                },
                '@keyframes pulse-ready': {
                  '0%': { boxShadow: '0 0 0 0 rgba(0,131,120, 0.4)' },
                  '70%': { boxShadow: '0 0 0 6px rgba(0,131,120, 0)' },
                  '100%': { boxShadow: '0 0 0 0 rgba(0,131,120, 0)' },
                },
                '@keyframes pulse-processing': {
                  '0%': { boxShadow: '0 0 0 0 rgba(0,87,192, 0.4)' },
                  '70%': { boxShadow: '0 0 0 6px rgba(0,87,192, 0)' },
                  '100%': { boxShadow: '0 0 0 0 rgba(0,87,192, 0)' },
                },
                '@keyframes fade-in': {
                  '0%': { opacity: 0, transform: 'translateY(6px)' },
                  '100%': { opacity: 1, transform: 'translateY(0)' },
                },
              }}
            >
              <Box>
                {/* ── Status Badge ── */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 3,
                  }}
                >
                  <Box
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      bgcolor: isProcessing ? '#0057c0' : scanResult ? '#00685f' : '#008378',
                      color: '#f4fffc',
                      fontSize: '0.625rem',
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      letterSpacing: '0.12em',
                      borderRadius: '1.5rem',
                      animation: isProcessing
                        ? 'pulse-processing 1.5s infinite'
                        : 'pulse-ready 2s infinite',
                    }}
                  >
                    {isProcessing ? 'Processing Image' : scanResult ? 'Analysis Complete' : 'System Ready'}
                  </Box>
                </Box>

                {/* ── Animated Icon ── */}
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2.5,
                    bgcolor: isProcessing
                      ? 'rgba(0,87,192,0.1)'
                      : scanResult
                        ? 'rgba(0,131,120,0.1)'
                        : 'rgba(0,0,0,0.04)',
                    transition: 'background-color 0.4s',
                    animation: 'fade-in 0.4s ease-out',
                  }}
                >
                  {isProcessing ? (
                    <HourglassEmptyIcon
                      sx={{
                        fontSize: 32,
                        color: '#0057c0',
                        animation: 'hourglass-spin 1.2s ease-in-out infinite',
                      }}
                    />
                  ) : scanResult ? (
                    <CheckCircleIcon sx={{ fontSize: 32, color: '#008378' }} />
                  ) : (
                    <SettingsIcon sx={{ fontSize: 32, color: '#94a3b8' }} />
                  )}
                </Box>

                {/* ── Dynamic Title ── */}
                <Typography
                  key={isProcessing ? 'proc' : scanResult ? 'done' : 'idle'}
                  sx={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    lineHeight: 1.3,
                    mb: 1,
                    textAlign: 'center',
                    animation: 'fade-in 0.35s ease-out',
                  }}
                >
                  {isProcessing
                    ? 'Analyzing fundus image…'
                    : scanResult
                      ? 'Analysis complete'
                      : 'Waiting for diagnostic input'}
                </Typography>

                {/* ── Dynamic Subtitle ── */}
                <Typography
                  key={isProcessing ? 's-proc' : scanResult ? 's-done' : 's-idle'}
                  sx={{
                    fontSize: '0.875rem',
                    color: '#414755',
                    lineHeight: 1.6,
                    textAlign: 'center',
                    animation: 'fade-in 0.35s ease-out 0.05s both',
                  }}
                >
                  {isProcessing
                    ? 'Inference Engine Active'
                    : scanResult
                      ? 'Inference Engine Returned Results.'
                      : 'Inference Engine Inactive.'}
                </Typography>
              </Box>

              {/* ── Shimmer Progress Bar (processing only) ── */}
              {isProcessing && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 4,
                    bgcolor: 'rgba(0,87,192,0.12)',
                    overflow: 'hidden',
                    borderRadius: '0 0 0.75rem 0.75rem',
                  }}
                >
                  <Box
                    sx={{
                      width: '40%',
                      height: '100%',
                      background: 'linear-gradient(90deg, transparent, #0057c0, transparent)',
                      animation: 'shimmer-bar 1.4s ease-in-out infinite',
                    }}
                  />
                </Box>
              )}
            </Box>

            {/* Scan Protocol Card */}
            <Box
              sx={{
                p: 3,
                bgcolor: '#ffffff',
                borderRadius: '0.75rem',
                border: '1px solid #e2e8f0',
                flex: 1,
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.6875rem',
                  fontWeight: 800,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  mb: 2,
                }}
              >
                Scan Protocol
              </Typography>

              {/* Image Quality Checklist */}
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#171c22', mb: 1 }}>
                Image Requirements
              </Typography>
              {[
                'Centered optic disc',
                'Adequate & even illumination',
                'Minimum 1024 × 1024 px',
                'JPEG or PNG format only',
              ].map((item) => (
                <Box key={item} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Box
                    sx={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      bgcolor: '#94a3b8',
                      flexShrink: 0,
                    }}
                  />
                  <Typography sx={{ fontSize: '0.75rem', color: '#414755', lineHeight: 1.5 }}>
                    {item}
                  </Typography>
                </Box>
              ))}

              {/* Triage Tier Legend */}
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#171c22', mt: 2.5, mb: 1 }}>
                Triage Tiers
              </Typography>
              {[
                { tier: 'Doctor Visit Optional', color: '#16a34a', desc: 'No immediate follow-up needed' },
                { tier: 'Doctor Visit Required', color: '#d97706', desc: 'Schedule specialist review' },
                { tier: 'Doctor Visit Mandatory', color: '#dc2626', desc: 'Urgent referral indicated' },
              ].map((t) => (
                <Box key={t.tier} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 0.75 }}>
                  <Box
                    sx={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      bgcolor: t.color,
                      flexShrink: 0,
                      mt: '4px',
                    }}
                  />
                  <Box>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#171c22', lineHeight: 1.3 }}>
                      {t.tier}
                    </Typography>
                    <Typography sx={{ fontSize: '0.6875rem', color: '#64748b', lineHeight: 1.4 }}>
                      {t.desc}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>

        {/* ── Results Bento Bottom (2 cards) ── */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
            gap: 3,
            '@keyframes result-slide-in': {
              '0%':   { opacity: 0, transform: 'translateY(8px)' },
              '100%': { opacity: 1, transform: 'translateY(0)' },
            },
            '@keyframes skeleton-pulse': {
              '0%':   { opacity: 0.4 },
              '50%':  { opacity: 1 },
              '100%': { opacity: 0.4 },
            },
          }}
        >
          {/* Card 1: Primary Triage Result */}
          <Box
            sx={{
              bgcolor: '#ffffff',
              p: 0,
              borderRadius: '0.75rem',
              boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              transition: 'box-shadow 0.3s, border-color 0.3s',
              '&:hover': {
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                borderColor: '#cbd5e1',
              },
            }}
          >
            {/* Accent top bar — color reflects severity */}
            <Box
              sx={{
                height: 4,
                background: scanResult
                  ? scanResult.tier === 'Doctor Visit Mandatory'
                    ? 'linear-gradient(90deg, #dc2626, #ef4444)'
                    : scanResult.tier === 'Doctor Visit Required'
                      ? 'linear-gradient(90deg, #d97706, #f59e0b)'
                      : 'linear-gradient(90deg, #16a34a, #22c55e)'
                  : 'linear-gradient(90deg, #e2e8f0, #cbd5e1)',
                transition: 'background 0.5s',
              }}
            />
            <Box sx={{ p: 3.5 }}>
              {/* Header row */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 3,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: '0.625rem',
                      bgcolor: scanResult ? 'rgba(0,104,95,0.1)' : 'rgba(0,0,0,0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background-color 0.3s',
                    }}
                  >
                    <CheckCircleIcon sx={{ fontSize: 18, color: scanResult ? '#00685f' : '#94a3b8' }} />
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
                    Primary Triage
                  </Typography>
                </Box>
                {/* Live status dot */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      bgcolor: scanResult ? '#16a34a' : '#94a3b8',
                      transition: 'background-color 0.3s',
                    }}
                  />
                  <Typography sx={{ fontSize: '0.625rem', fontWeight: 600, color: '#94a3b8' }}>
                    {scanResult ? 'RESULT READY' : 'AWAITING INPUT'}
                  </Typography>
                </Box>
              </Box>

              {/* Result display */}
              <Typography
                key={scanResult ? 'has-result' : 'no-result'}
                sx={{
                  fontSize: '1.5rem',
                  fontWeight: 900,
                  letterSpacing: '-0.02em',
                  color: scanResult
                    ? scanResult.tier === 'Doctor Visit Mandatory'
                      ? '#dc2626'
                      : scanResult.tier === 'Doctor Visit Required'
                        ? '#b45309'
                        : '#15803d'
                    : '#171c22',
                  mb: 0.75,
                  animation: scanResult ? 'result-slide-in 0.4s ease-out' : 'none',
                }}
              >
                {scanResult ? scanResult.tier : 'Awaiting Scan'}
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.8125rem',
                  color: '#64748b',
                  lineHeight: 1.5,
                }}
              >
                {scanResult ? scanResult.action : 'Upload a fundus image to receive a triage recommendation.'}
              </Typography>
            </Box>
          </Box>

          {/* Card 2: Metric Scoreboard */}
          <Box
            sx={{
              bgcolor: '#ffffff',
              p: 0,
              borderRadius: '0.75rem',
              boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              transition: 'box-shadow 0.3s, border-color 0.3s',
              '&:hover': {
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                borderColor: '#cbd5e1',
              },
            }}
          >
            {/* Accent top bar */}
            <Box
              sx={{
                height: 4,
                background: scanResult
                  ? 'linear-gradient(90deg, #0057c0, #3b82f6)'
                  : 'linear-gradient(90deg, #e2e8f0, #cbd5e1)',
                transition: 'background 0.5s',
              }}
            />
            <Box sx={{ p: 3.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '0.625rem',
                    bgcolor: scanResult ? 'rgba(0,87,192,0.1)' : 'rgba(0,0,0,0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background-color 0.3s',
                  }}
                >
                  <SettingsIcon sx={{ fontSize: 18, color: scanResult ? '#0057c0' : '#94a3b8' }} />
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
                  Diagnostic Metrics
                </Typography>
              </Box>

              {/* Metric rows */}
              {[
                { label: 'Inference Time', value: scanResult ? `${scanResult.inference_time_ms} ms` : '—', accent: '#0057c0', icon: '⏱' },
                { label: 'Confidence Score', value: scanResult ? `${(scanResult.confidence * 100).toFixed(1)}%` : '—', accent: '#7c3aed', icon: '◎' },
                { label: 'Raw Model Grade', value: scanResult ? scanResult.raw_model_grade_label : '—', accent: '#00685f', icon: '◈' },
              ].map((m, i) => (
                <Box
                  key={m.label}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    py: 1.5,
                    px: 1.5,
                    mx: -1.5,
                    borderRadius: '0.5rem',
                    borderLeft: `3px solid ${scanResult ? m.accent : '#e2e8f0'}`,
                    mb: i < 2 ? 1 : 0,
                    bgcolor: scanResult ? `${m.accent}08` : 'transparent',
                    transition: 'all 0.3s',
                    '&:hover': {
                      bgcolor: scanResult ? `${m.accent}12` : 'rgba(0,0,0,0.02)',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: '0.875rem', lineHeight: 1 }}>{m.icon}</Typography>
                    <Typography sx={{ color: '#414755', fontSize: '0.8125rem', fontWeight: 500 }}>
                      {m.label}
                    </Typography>
                  </Box>
                  <Typography
                    sx={{
                      fontWeight: 800,
                      color: scanResult ? m.accent : '#cbd5e1',
                      fontSize: '0.9375rem',
                      fontFamily: scanResult ? '"SF Mono", "Fira Code", monospace' : 'inherit',
                      letterSpacing: scanResult ? '0.02em' : 'normal',
                      animation: isProcessing ? 'skeleton-pulse 1.2s ease-in-out infinite' : 'none',
                    }}
                  >
                    {isProcessing ? '···' : m.value}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
    </DashboardLayout>
  );
}
