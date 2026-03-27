import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; // Import our new database client

const AuthContext = createContext(null);

/**
 * AuthProvider component manages the global authentication state.
 * Interfaces with Supabase Auth to handle sessions and practitioner profiles.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Application components requiring auth context.
 */
export function AuthProvider({ children }) {
  // We now store a "session" object instead of just true/false
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    // Helper function to fetch the profile row when a session starts
    const fetchProfile = async (currentSession) => {
      if (!currentSession) {
        setProfile(null);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentSession.user.id)
        .single();

      setProfile(data);
      setLoading(false);
    };

    // 1. Initial Load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      fetchProfile(session); // Fetch their role before finishing the loading state!
    });

    // 2. Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      fetchProfile(session);
    });

    return () => subscription.unsubscribe();

  }, []);

  // Tell Supabase to authenticate this email & password
  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error; // If wrong password, throw an error to the UI
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  // The user is authenticated if a session object exists
  const isAuthenticated = !!session;

  return (
    <AuthContext.Provider value={{ session, profile, isAuthenticated, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

/**
 * Custom hook to access the authentication context.
 * 
 * @returns {Object} { session, profile, isAuthenticated, login, logout, loading }
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

