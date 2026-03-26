import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AdminCreateUserPage() {
    const { logout, profile } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!profile || profile.role !== 'superuser') {
            navigate('/', { replace: true });
            // 'replace: true' destroys the browser history
        }
    }, [profile, navigate]);

    // Added role and clinicalUnit to our state
    const [formData, setFormData] = useState({
        email: '', password: '', firstName: '', lastName: '',
        practitionerId: '', role: 'clinician', clinicalUnit: ''
    });
    const [statusMsg, setStatusMsg] = useState('');

    if (!profile || profile.role !== 'superuser') {
        return null;
    }

    const handleCreate = async (e) => {
        e.preventDefault();
        setStatusMsg('Creating user...');

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
            return;
        }

        setStatusMsg('Success! User Created. You are being logged out so they can log in.');
        setTimeout(async () => {
            await logout();
            navigate('/');
        }, 2500);
    };

    return (
        <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '100%', maxWidth: '400px' }}>
                <h1>Register Clinician</h1>
                <p style={{ marginBottom: '2rem' }}>Please fill out your details below.</p>

                <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <input style={{ flex: 1 }} type="text" placeholder="First Name" onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} required />
                        <input style={{ flex: 1 }} type="text" placeholder="Last Name" onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} required />
                    </div>

                    <input type="text" placeholder="Clinician ID" onChange={(e) => setFormData({ ...formData, practitionerId: e.target.value })} required />
                    <input type="text" placeholder="Clinical Unit" onChange={(e) => setFormData({ ...formData, clinicalUnit: e.target.value })} required />

                    <select
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        value={formData.role}
                        required
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    >
                        <option value="" disabled>Select User Role...</option>
                        <option value="resident">Resident</option>
                        <option value="fellow">Fellow</option>
                        <option value="attending">Attending Physician</option>
                    </select>

                    <input type="email" placeholder="Login Email" onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                    <input type="password" placeholder="Password" onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />

                    <button type="submit" style={{ padding: '10px', marginTop: '10px', backgroundColor: '#0057c0', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        Create User & Sign Out
                    </button>
                </form>
                <p style={{ marginTop: '1rem', fontWeight: 'bold' }}>{statusMsg}</p>
            </div>
        </div>
    )
}

