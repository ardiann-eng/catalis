import { createClient } from '@supabase/supabase-js';

// Supabase configuration from environment variables
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://anzsbqqippijhemwxkqh.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuenNicXFpcHBpamhlbXd4a3FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMDM1MTQsImV4cCI6MjA3Njc3OTUxNH0.6l1Bt9_5_5ohFeH8IN6mP9jU0pFUToHMmV1NwQEeP-Q';

// Debug: Log environment variables (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('Supabase URL:', supabaseUrl);
  console.log('Supabase Key exists:', !!supabaseKey);
}

// Validate environment variables
if (!supabaseUrl || supabaseUrl === 'undefined' || !supabaseUrl.startsWith('http')) {
  console.error('❌ Invalid SUPABASE_URL:', supabaseUrl);
  console.error('Environment variables:', {
    REACT_APP_SUPABASE_URL: process.env.REACT_APP_SUPABASE_URL,
    hasKey: !!process.env.REACT_APP_SUPABASE_ANON_KEY
  });
  throw new Error(
    'Supabase URL tidak valid. Pastikan REACT_APP_SUPABASE_URL sudah di-set di environment variables.'
  );
}

if (!supabaseKey || supabaseKey === 'undefined') {
  console.error('❌ Invalid SUPABASE_KEY');
  throw new Error(
    'Supabase Key tidak valid. Pastikan REACT_APP_SUPABASE_ANON_KEY sudah di-set di environment variables.'
  );
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;