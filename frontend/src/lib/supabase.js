// File: frontend/src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePubKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Initialize the connection using the publishable key
export const supabase = createClient(supabaseUrl, supabasePubKey)
