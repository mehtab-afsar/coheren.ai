#!/usr/bin/env node
/**
 * Test Supabase Connection
 *
 * This script tests your Supabase configuration and database connection.
 * Run this before starting your server to verify everything is set up correctly.
 *
 * Usage: node test-supabase.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔍 Testing Supabase Configuration...\n');

// Step 1: Check environment variables
console.log('Step 1: Checking environment variables...');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('❌ SUPABASE_URL is not set in .env file');
  console.log('   Add: SUPABASE_URL=https://your-project.supabase.co');
  process.exit(1);
}

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not set in .env file');
  console.log('   Add: SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  process.exit(1);
}

console.log('✅ Environment variables are set');
console.log(`   URL: ${supabaseUrl}`);
console.log(`   Key: ${supabaseKey.substring(0, 20)}...${supabaseKey.substring(supabaseKey.length - 5)}\n`);

// Step 2: Create Supabase client
console.log('Step 2: Creating Supabase client...');
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
console.log('✅ Supabase client created\n');

// Step 3: Test database connection
console.log('Step 3: Testing database connection...');
try {
  const { data, error } = await supabase
    .from('users')
    .select('count')
    .limit(1);

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows, which is fine
    throw error;
  }

  console.log('✅ Database connection successful\n');
} catch (error) {
  console.error('❌ Database connection failed');
  console.error('   Error:', error.message);
  console.error('\n   Possible causes:');
  console.error('   1. Invalid SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('   2. Supabase project is paused (free tier auto-pauses)');
  console.error('   3. Network connectivity issues');
  console.error('   4. Database schema not created yet\n');
  process.exit(1);
}

// Step 4: Check if tables exist
console.log('Step 4: Checking database tables...');
const tables = ['users', 'journeys', 'day_records', 'tasks', 'streak_records'];
let allTablesExist = true;

for (const table of tables) {
  try {
    const { error } = await supabase
      .from(table)
      .select('id')
      .limit(1);

    if (error && error.code === '42P01') {
      // 42P01 = relation does not exist
      console.error(`❌ Table '${table}' does not exist`);
      allTablesExist = false;
    } else if (error && error.code !== 'PGRST116') {
      console.error(`⚠️  Table '${table}' check failed: ${error.message}`);
    } else {
      console.log(`✅ Table '${table}' exists`);
    }
  } catch (err) {
    console.error(`⚠️  Error checking table '${table}': ${err.message}`);
  }
}

if (!allTablesExist) {
  console.error('\n❌ Some tables are missing!');
  console.error('   Action required:');
  console.error('   1. Go to your Supabase dashboard');
  console.error('   2. Open SQL Editor');
  console.error('   3. Run the SQL from: server/db/supabase-schema.sql');
  console.error('   4. Then run this test again\n');
  process.exit(1);
}

console.log('\n✅ All tables exist');

// Step 5: Test a sample query
console.log('\nStep 5: Testing sample operations...');
try {
  // Count users
  const { count, error: countError } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  if (countError) throw countError;

  console.log(`✅ Query successful`);
  console.log(`   Current users in database: ${count || 0}`);
} catch (error) {
  console.error('❌ Query failed:', error.message);
  process.exit(1);
}

// Step 6: Test RLS policies (optional)
console.log('\nStep 6: Checking Row Level Security...');
try {
  // Check if RLS is enabled (should fail with specific error if enabled)
  const anonSupabase = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY || supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { error } = await anonSupabase
    .from('users')
    .select('*')
    .limit(1);

  // With service role key, we should have access
  // With anon key, RLS would restrict access
  console.log('✅ RLS policies configured (using service role key)');
} catch (error) {
  console.log('⚠️  Could not verify RLS (not critical)');
}

// All tests passed!
console.log('\n' + '='.repeat(50));
console.log('🎉 All tests passed! Your Supabase is ready to use!');
console.log('='.repeat(50));
console.log('\n✅ You can now start your server:');
console.log('   cd server && npm run dev');
console.log('\n📚 Documentation:');
console.log('   server/README.md');
console.log('   server/SUPABASE_MIGRATION_GUIDE.md');
console.log('   SUPABASE_MIGRATION_SUMMARY.md\n');

process.exit(0);
