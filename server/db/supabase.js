import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key for server-side operations

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables!');
  console.error('   Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase client with service role key
// Service role key bypasses Row Level Security, needed for server operations
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Test connection on startup
async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned, which is fine
      throw error;
    }

    console.log('✅ Supabase connected successfully');
  } catch (error) {
    console.error('❌ Supabase connection error:', error.message);
    console.error('   Make sure you have:');
    console.error('   1. Created a Supabase project');
    console.error('   2. Run the schema SQL in your Supabase SQL Editor');
    console.error('   3. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  }
}

testConnection();

export default supabase;
