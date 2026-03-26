import { useState, useRef, useEffect } from 'react';
import { Box, Typography, Button } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SettingsIcon from '@mui/icons-material/Settings';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HelpIcon from '@mui/icons-material/Help';
import PrintIcon from '@mui/icons-material/Print';
import DashboardLayout from '../components/layout/DashboardLayout';
import { TextField, MenuItem } from '@mui/material';
import { useAuth } from '../context/AuthContext'; 
import { supabase } from '../lib/supabase'; 

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
                height: 480,
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
            <Box sx={{ p: 4, bgcolor: '#ffffff', borderRadius: '0.75rem', border: '1px solid #c1c6d7', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: 480 }}>
                <Typography variant="h6" mb={2} fontWeight={700}>
                    Clinical Confirmation
                </Typography>
                
                <TextField 
                    fullWidth label="Patient Full Name" margin="normal"
                    value={patientName} onChange={(e) => setPatientName(e.target.value)} 
                />
                <TextField 
                    fullWidth label="Patient/Medical ID" margin="normal"
                    value={patientId} onChange={(e) => setPatientId(e.target.value)} 
                />
                
                <TextField 
                    select fullWidth label="Clinician Overriding Diagnosis" margin="normal"
                    value={finalDiagnosis} onChange={(e) => setFinalDiagnosis(e.target.value)} 
                >
                    <MenuItem value="Doctor Visit Optional">Doctor Visit Optional</MenuItem>
                    <MenuItem value="Doctor Visit Required">Doctor Visit Required</MenuItem>
                    <MenuItem value="Doctor Visit Mandatory">Doctor Visit Mandatory</MenuItem>
                </TextField>

                <Button 
                    fullWidth variant="contained" sx={{ mt: 3, pt: 1.5, pb: 1.5, background: 'linear-gradient(135deg, #00685f 0%, #008378 100%)' }}
                    onClick={handleConfirmScan}
                    disabled={!patientName || !patientId}
                >
                    Save Patient Record
                </Button>
            </Box>
          )}

          {/* Live Monitoring Card */}
          <Box
            sx={{
              p: 3,
              bgcolor: '#f0f4fc',
              borderRadius: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: { lg: 480 },
            }}
          >
            <Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 2,
                }}
              >
                <Box
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    bgcolor: isProcessing ? '#0057c0' : '#008378',
                    color: '#f4fffc',
                    fontSize: '0.625rem',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    borderRadius: '1.5rem',
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
                    animation: isProcessing ? 'pulse-processing 1.5s infinite' : 'pulse-ready 2s infinite',
                  }}
                >
                  {isProcessing ? 'Processing Image' : 'System Ready'}
                </Box>
              </Box>
              <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.3, mb: 1 }}>
                Waiting for diagnostic input
              </Typography>
              <Typography sx={{ fontSize: '0.875rem', color: '#414755', lineHeight: 1.6 }}>
                Inference engine inactive.
              </Typography>
            </Box>

          </Box>
        </Box>

        {/* ── Results Bento Bottom (3 cards) ── */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
            gap: 3,
          }}
        >
          {/* Card 1: Primary Triage Result */}
          <Box
            sx={{
              bgcolor: '#ffffff',
              p: 4,
              borderRadius: '0.75rem',
              boxShadow: '0 20px 40px rgba(0,87,192,0.06)',
              border: '1px solid transparent',
              transition: 'border-color 0.3s',
              '&:hover': { borderColor: 'rgba(0,87,192,0.1)' },
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                mb: 3,
              }}
            >
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: 'rgba(0,104,95,0.1)',
                  borderRadius: '0.75rem',
                }}
              >
                <CheckCircleIcon sx={{ color: '#00685f' }} />
              </Box>
              <Typography
                sx={{
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  color: '#94a3b8',
                }}
              >
                LAST SCAN: 14:20 PM
              </Typography>
            </Box>
            <Typography sx={{ fontSize: '1.1rem', fontWeight: 700, mb: 1 }}>
              Primary Result
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
              <Typography sx={{ fontSize: '1.875rem', fontWeight: 900, color: '#00685f' }}>
                {scanResult ? scanResult.tier : 'Awaiting Scan'}
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#414755' }}>
                {scanResult ? scanResult.action : 'Upload an image to begin'}
              </Typography>
            </Box>
          </Box>

          {/* Card 2: Metric Scoreboard */}
          <Box
            sx={{
              bgcolor: '#ffffff',
              p: 4,
              borderRadius: '0.75rem',
              boxShadow: '0 20px 40px rgba(0,87,192,0.06)',
            }}
          >
            <Typography
              sx={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#414755',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                mb: 2,
              }}
            >
              Metric Scoreboard
            </Typography>
            {[
              { label: 'Inference Time', value: scanResult ? `${scanResult.inference_time_ms} ms` : 'N/A', color: '#0057c0' },
              { label: 'Confidence Score', value: scanResult ? `${(scanResult.confidence * 100).toFixed(1)}%` : 'N/A', color: '#0057c0' },
              { label: 'Raw Model Grade', value: scanResult ? scanResult.raw_model_grade_label : 'N/A', color: '#00685f' },
            ].map((m) => (
              <Box
                key={m.label}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: 1,
                  fontSize: '0.875rem',
                }}
              >
                <Typography sx={{ color: '#414755', fontSize: '0.875rem' }}>
                  {m.label}
                </Typography>
                <Typography sx={{ fontWeight: 700, color: m.color, fontSize: '0.875rem' }}>
                  {m.value}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </DashboardLayout>
  );
}
