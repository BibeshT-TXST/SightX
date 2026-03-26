import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function AdminCreateUserPage() {
    const { logout } = useAuth();
    const [formData, setFormData] = useState({ email: '', password: '', firstName: '', lastName: '', practitionerId: '' });
    const [statusMsg, setStatusMsg] = useState('');

    const handleCreate = async (e) => {
        e.preventDefault();
        setStatusMsg('Creating user...');

        // 1. Send the signup request with the Metadata attached!
        const { error } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
                data: {
                    first_name: formData.firstName,
                    last_name: formData.lastName,
                    practitioner_id: formData.practitionerId
                    // The Database Trigger grabs these 3 exactly, and defaults the role to 'clinician'!
                }
            }
        });

        if (error) {
            setStatusMsg(`Error: ${error.message}`);
            return;
        }

        // 2. The Super User is now accidentally logged out! 
        // Wait for the new session to lock in, then intentionally sign out to dump them to login.
        setStatusMsg('Success! User Created. You have been logged out.');
        setTimeout(() => {
            logout();
            // Depending on your routing, logout() might auto-kick them to '/login'
        }, 2000);
    };

    return (
        <div style={{ padding: '2rem' }}>
            <h1>Super User Portal: Add Clinician</h1>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '300px' }}>
                <input type="text" placeholder="First Name" onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} required />
                <input type="text" placeholder="Last Name" onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} required />
                <input type="text" placeholder="Clinician ID (e.g. DOC-123)" onChange={(e) => setFormData({ ...formData, practitionerId: e.target.value })} required />
                <input type="email" placeholder="Login Email" onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                <input type="password" placeholder="Temp Password" onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />

                <button type="submit">Create User & Sign Out</button>
            </form>
            <p>{statusMsg}</p>
        </div>
    )
}

