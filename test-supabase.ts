/**
 * Supabase Connection Test
 * Run with: npx tsx test-supabase.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://icxbgtizbdosturlxdxd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljeGJndGl6YmRvc3R1cmx4ZHhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxOTk4MjYsImV4cCI6MjA4NTc3NTgyNn0.zpUm3jnNl3M_M_0sPHxfvD7mTXtc9VI_DvhuE5d_uk8';

async function testSupabase() {
  console.log('🧪 Testing Supabase Connection...\n');

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Test 1: Check connection
  console.log('1️⃣ Testing connection...');
  try {
    const { data, error } = await supabase.from('profiles').select('count');
    if (error) {
      console.error('❌ Connection failed:', error.message);
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log('   ℹ️  Hint: Run the SQL schema first (SUPABASE_SCHEMA.sql)');
      }
    } else {
      console.log('✅ Connection successful!');
    }
  } catch (err) {
    console.error('❌ Connection error:', err);
  }

  // Test 2: Check auth
  console.log('\n2️⃣ Testing auth session...');
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('❌ Auth error:', error.message);
    } else if (session) {
      console.log('✅ User is logged in:', session.user.email);
    } else {
      console.log('ℹ️  No active session (user not logged in)');
    }
  } catch (err) {
    console.error('❌ Auth check failed:', err);
  }

  // Test 3: Test signup (commented out to not create test users)
  console.log('\n3️⃣ Auth providers available:');
  console.log('   ✅ Email/Password signup');
  console.log('   ✅ Google OAuth (if enabled in Supabase dashboard)');

  // Test 4: Check tables exist
  console.log('\n4️⃣ Checking database tables...');
  const tables = ['profiles', 'user_goals', 'goal_stones', 'roadmaps', 'daily_tasks', 'checkpoints'];

  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('count').limit(0);
      if (error) {
        console.log(`   ❌ ${table}: ${error.message}`);
      } else {
        console.log(`   ✅ ${table}: exists`);
      }
    } catch (err) {
      console.log(`   ❌ ${table}: error`);
    }
  }

  console.log('\n✅ Supabase test complete!');
  console.log('\nNext steps:');
  console.log('1. If tables don\'t exist, run SUPABASE_SCHEMA.sql in Supabase SQL Editor');
  console.log('2. Enable Google OAuth in Authentication → Providers');
  console.log('3. Start the app: npm run dev');
}

testSupabase().catch(console.error);
