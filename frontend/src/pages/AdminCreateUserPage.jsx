import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  MenuItem, 
  Fade,
  Alert
} from '@mui/material';

/**
 * AdminCreateUserPage allows superusers to register new clinicians.
 * Includes form validation and automatic sign-out after successful creation
 * to allow the new user to sign in and verify their account.
 */
export default function AdminCreateUserPage() {
    const { logout, profile } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!profile || profile.role !== 'superuser') {
            navigate('/', { replace: true });
        }
    }, [profile, navigate]);

    const [formData, setFormData] = useState({
        email: '', password: '', firstName: '', lastName: '',
        practitionerId: '', role: 'clinician', clinicalUnit: ''
    });
    const [statusMsg, setStatusMsg] = useState('');
    const [isError, setIsError] = useState(false);

    if (!profile || profile.role !== 'superuser') {
        return null;
    }

    const handleCreate = async (e) => {
        e.preventDefault();
        setStatusMsg('Creating user...');
        setIsError(false);

        const { error } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
                data: {
                    first_name: formData.firstName,
                    last_name: formData.lastName,
                    practitioner_id: formData.practitionerId,
                    role: formData.role,
                    clinical_unit: formData.clinicalUnit
                }
            }
        });

        if (error) {
            setStatusMsg(`Error: ${error.message}`);
            setIsError(true);
            return;
        }

        setStatusMsg('Success! User Created. You are being logged out so they can log in.');
        setTimeout(async () => {
            await logout();
            navigate('/');
        }, 2500);
    };

    return (
        <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', minHeight: '80vh', alignItems: 'center' }}>
            <Paper elevation={3} sx={{ p: 5, width: '100%', maxWidth: 480, borderRadius: '1.25rem' }}>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, color: 'primary.dark' }}>
                    Register Clinician
                </Typography>
                <Typography sx={{ mb: 4, color: 'text.secondary' }}>
                    Please fill out the clinical credentials below.
                </Typography>

                <Box component="form" onSubmit={handleCreate} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField 
                            label="First Name" 
                            fullWidth 
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} 
                            required 
                        />
                        <TextField 
                            label="Last Name" 
                            fullWidth 
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} 
                            required 
                        />
                    </Box>

                    <TextField 
                        label="Clinician ID" 
                        fullWidth 
                        onChange={(e) => setFormData({ ...formData, practitionerId: e.target.value })} 
                        required 
                    />
                    <TextField 
                        label="Clinical Unit" 
                        fullWidth 
                        onChange={(e) => setFormData({ ...formData, clinicalUnit: e.target.value })} 
                        required 
                    />

                    <TextField
                        select
                        label="User Role"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        required
                    >
                        <MenuItem value="resident">Resident</MenuItem>
                        <MenuItem value="fellow">Fellow</MenuItem>
                        <MenuItem value="attending">Attending Physician</MenuItem>
                    </TextField>

                    <TextField 
                        type="email" 
                        label="Login Email" 
                        fullWidth 
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                        required 
                    />
                    <TextField 
                        type="password" 
                        label="Password" 
                        fullWidth 
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                        required 
                    />

                    <Button 
                        type="submit" 
                        variant="contained" 
                        sx={{ 
                            py: 1.5, 
                            mt: 2, 
                            fontWeight: 700,
                            background: 'linear-gradient(90deg, #0057c0 0%, #006ff0 100%)',
                            borderRadius: '0.75rem'
                        }}
                    >
                        Create User & Sign Out
                    </Button>
                </Box>

                {statusMsg && (
                    <Fade in={!!statusMsg}>
                        <Alert severity={isError ? "error" : "success"} sx={{ mt: 3, borderRadius: '0.75rem' }}>
                            {statusMsg}
                        </Alert>
                    </Fade>
                )}
            </Paper>
        </Box>
    )
}

