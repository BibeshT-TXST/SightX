import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; // Import our new database client

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // We now store a "session" object instead of just true/false
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. On first load, check if the user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Listen continuously for login/logout events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Cleanup the listener when the app closes
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
    <AuthContext.Provider value={{ session, isAuthenticated, login, logout, loading }}>
      {/* Wait until we check their session before deciding what to draw on screen */}
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

