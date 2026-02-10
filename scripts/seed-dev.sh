#!/bin/bash
# ============================================================================
# Coheren Dev Seed Script
# Seeds the local Supabase with a realistic test user and full journey data
# ============================================================================

set -e  # Exit on error

echo ""
echo "🌱 Coheren Dev Seed Script"
echo "=========================="
echo ""

# Check if Supabase is running
echo "⚙️  Checking Supabase status..."
if ! npx supabase status > /dev/null 2>&1; then
  echo "❌ Supabase is not running. Starting it..."
  npx supabase start
  echo "✅ Supabase started."
else
  echo "✅ Supabase is already running."
fi

echo ""
echo "📊 Running seed SQL..."
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f "$(dirname "$0")/../supabase/seed.sql"

echo ""
echo "✅ Seed data inserted!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔑 Login credentials:"
echo "   ADMIN: mehtabafsar346@gmail.com / Moon@123"
echo "   TEST:  seed@coheren.dev / SeedPass123!"
echo ""
echo "📚 Seeded journey:"
echo "   Goal: Learn JavaScript and build my first web app"
echo "   Current day: 8 (DOM Basics: Reading the Webpage)"
echo "   Streak: 7 days"
echo "   Days completed: 1-6 with YouTube resources"
echo ""
echo "🎯 After logging in, run this in the browser console to"
echo "   populate the app state (step 2 = dashboard, day 8):"
echo ""
echo "   Copy and paste the command from seed.sql (look for"
echo "   localStorage.setItem near the bottom) into your browser"
echo "   console, then reload."
echo ""
echo "   Or use the quick version:"
cat << 'EOF'
─────────────────────────────────────────────────────────────────
Browser console command (paste after logging in as seed@coheren.dev):

const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
const endDate = new Date(Date.now() + 77 * 24 * 60 * 60 * 1000).toISOString();
localStorage.setItem('consist-storage', JSON.stringify({
  state: {
    user: null,
    isAuthenticated: false,
    step: 2,
    currentDay: 8,
    streak: 7,
    completionRate: 0,
    checkInTime: '08:00',
    lastCheckInDate: null,
    performanceHistory: [],
    universalProfile: {
      name: 'Alex Chen',
      energyPattern: 'morning'
    },
    currentGoal: {
      title: 'Learn JavaScript and build my first web app',
      category: 'technology',
      specificGoal: 'Build a musician gig finder web app',
      skillLevel: 'beginner',
      dailyTime: '45 minutes',
      timeline: '3 months'
    },
    roadmap: {
      title: 'Learn JavaScript and Build My First Web App',
      category: 'technology',
      duration: 84,
      dailyTime: '45 minutes',
      recommendedTime: '08:00',
      phases: [
        { title: 'JavaScript Foundations', weeks: '1-4', description: 'Core language concepts: variables, functions, control flow, and the browser console' },
        { title: 'DOM Manipulation', weeks: '5-8', description: 'Making webpages interactive: selecting elements, handling events, and updating content' },
        { title: 'First Web App Project', weeks: '9-12', description: 'Build and deploy a complete musician gig finder prototype' }
      ],
      startDate: startDate,
      endDate: endDate
    },
    tasks: []
  },
  version: 0
}));
location.reload();
─────────────────────────────────────────────────────────────────
EOF
echo ""
echo "🚀 Start the dev server: npm run dev"
echo ""
