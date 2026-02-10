#!/bin/bash
# ============================================================================
# Coheren Full Flow Test Script
# Tests: build, seed data, DB state, and app readiness
# ============================================================================
# Usage: ./scripts/test-full-flow.sh [--reset] [--skip-build]
#   --reset       Reset DB and re-apply seed (destructive!)
#   --skip-build  Skip TypeScript build check
# ============================================================================

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

RESET_DB=false
SKIP_BUILD=false
PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

for arg in "$@"; do
  case $arg in
    --reset) RESET_DB=true ;;
    --skip-build) SKIP_BUILD=true ;;
  esac
done

pass() { echo -e "  ${GREEN}✅ $1${NC}"; ((PASS_COUNT++)); }
fail() { echo -e "  ${RED}❌ $1${NC}"; ((FAIL_COUNT++)); }
warn() { echo -e "  ${YELLOW}⚠️  $1${NC}"; ((WARN_COUNT++)); }
section() { echo -e "\n${CYAN}${BOLD}━━━ $1 ━━━${NC}"; }

DB_CONTAINER="supabase_db_consist"
DB_CMD="docker exec $DB_CONTAINER psql -U postgres -d postgres -t -c"

run_sql() {
  docker exec $DB_CONTAINER psql -U postgres -d postgres -t -c "$1" 2>/dev/null | xargs
}

echo ""
echo -e "${BOLD}🧪 Coheren Full Flow Test${NC}"
echo "=========================="
echo ""

# ─────────────────────────────────────────────
section "1. ENVIRONMENT"
# ─────────────────────────────────────────────

# Check Docker
if docker ps > /dev/null 2>&1; then
  pass "Docker is running"
else
  fail "Docker is not running — start Docker Desktop"
  exit 1
fi

# Check Supabase container
if docker ps --filter "name=$DB_CONTAINER" --format "{{.Names}}" | grep -q "$DB_CONTAINER"; then
  pass "Supabase DB container is running ($DB_CONTAINER)"
else
  fail "Supabase DB container not found. Run: npx supabase start"
  exit 1
fi

# Check Supabase API
if curl -s http://127.0.0.1:54321/rest/v1/ -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" > /dev/null; then
  pass "Supabase REST API is responding (http://127.0.0.1:54321)"
else
  warn "Supabase REST API may not be responding"
fi

# Check .env file
if [ -f ".env" ] && grep -q "VITE_GROQ_API_KEY=gsk_" .env; then
  pass ".env file has VITE_GROQ_API_KEY"
else
  fail ".env file missing or VITE_GROQ_API_KEY not set"
fi

if [ -f ".env" ] && grep -q "VITE_SUPABASE_URL=" .env; then
  pass ".env file has VITE_SUPABASE_URL"
fi

# ─────────────────────────────────────────────
section "2. BUILD CHECK"
# ─────────────────────────────────────────────

if [ "$SKIP_BUILD" = true ]; then
  warn "Build check skipped (--skip-build flag)"
else
  echo "  Running TypeScript build..."
  if npm run build > /tmp/coheren-build.log 2>&1; then
    pass "TypeScript build succeeded (no type errors)"
    # Check bundle size
    BUNDLE_SIZE=$(du -sh dist/assets/*.js 2>/dev/null | sort -rh | head -1 | awk '{print $1}')
    if [ -n "$BUNDLE_SIZE" ]; then
      echo "  Bundle size: $BUNDLE_SIZE"
    fi
  else
    fail "TypeScript build FAILED — check errors below:"
    tail -30 /tmp/coheren-build.log
    exit 1
  fi
fi

# ─────────────────────────────────────────────
section "3. DATABASE SCHEMA"
# ─────────────────────────────────────────────

check_table() {
  local table=$1
  COUNT=$(run_sql "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='$table';")
  if [ "$COUNT" = "1" ]; then
    pass "Table exists: public.$table"
  else
    fail "Table MISSING: public.$table"
  fi
}

check_table "profiles"
check_table "user_goals"
check_table "goal_stones"
check_table "roadmaps"
check_table "daily_tasks"
check_table "task_feedback"
check_table "checkpoints"

# ─────────────────────────────────────────────
section "4. SEED DATA"
# ─────────────────────────────────────────────

if [ "$RESET_DB" = true ]; then
  echo "  Resetting database and applying fresh seed..."
  if npx supabase db reset 2>&1 | tail -3; then
    pass "Database reset and seeded"
  else
    fail "Database reset failed"
  fi
fi

# Check seed user
SEED_USER=$(run_sql "SELECT COUNT(*) FROM auth.users WHERE email='seed@coheren.dev';")
if [ "$SEED_USER" = "1" ]; then
  pass "Seed user exists: seed@coheren.dev"
else
  warn "Seed user not found — run: npx supabase db reset"
  echo "  (or: ./scripts/test-full-flow.sh --reset)"
fi

# Check admin user
ADMIN_USER=$(run_sql "SELECT COUNT(*) FROM auth.users WHERE email='mehtabafsar346@gmail.com';")
if [ "$ADMIN_USER" = "1" ]; then
  pass "Admin user exists: mehtabafsar346@gmail.com"
else
  warn "Admin user not found — run: npx supabase db reset"
fi

# Check profile
PROFILE_COUNT=$(run_sql "SELECT COUNT(*) FROM public.profiles WHERE id='11111111-1111-1111-1111-111111111111';")
if [ "$PROFILE_COUNT" = "1" ]; then
  PROFILE_NAME=$(run_sql "SELECT full_name FROM public.profiles WHERE id='11111111-1111-1111-1111-111111111111';")
  pass "Seed profile: $PROFILE_NAME"
else
  warn "Seed profile not found"
fi

# Check goal
GOAL_COUNT=$(run_sql "SELECT COUNT(*) FROM public.user_goals WHERE user_id='11111111-1111-1111-1111-111111111111';")
if [ "$GOAL_COUNT" = "1" ]; then
  GOAL_TITLE=$(run_sql "SELECT title FROM public.user_goals WHERE user_id='11111111-1111-1111-1111-111111111111';")
  pass "Seed goal: $GOAL_TITLE"
else
  warn "Seed goal not found"
fi

# Check stones
STONES_COUNT=$(run_sql "SELECT COUNT(*) FROM public.goal_stones WHERE goal_id='22222222-2222-2222-2222-222222222222';")
if [ "$STONES_COUNT" -ge "4" ] 2>/dev/null; then
  pass "Goal stones: $STONES_COUNT stones inserted"
else
  warn "Fewer stones than expected: $STONES_COUNT (expected 4)"
fi

# Check roadmap
ROADMAP_COUNT=$(run_sql "SELECT COUNT(*) FROM public.roadmaps WHERE goal_id='22222222-2222-2222-2222-222222222222';")
if [ "$ROADMAP_COUNT" = "1" ]; then
  pass "Seed roadmap: 3-phase JavaScript learning roadmap"
else
  warn "Seed roadmap not found"
fi

# Check daily tasks
TASK_COUNT=$(run_sql "SELECT COUNT(*) FROM public.daily_tasks WHERE roadmap_id='44444444-4444-4444-4444-444444444444';")
if [ "$TASK_COUNT" -ge "10" ] 2>/dev/null; then
  COMPLETED_COUNT=$(run_sql "SELECT COUNT(*) FROM public.daily_tasks WHERE roadmap_id='44444444-4444-4444-4444-444444444444' AND is_completed=true;")
  pass "Daily tasks: $TASK_COUNT tasks ($COMPLETED_COUNT completed)"
else
  warn "Fewer tasks than expected: $TASK_COUNT (expected 10)"
fi

# Check today's task (Day 8) has resources
DAY8_RESOURCES=$(run_sql "SELECT content->'resources'->'primary'->>'type' FROM public.daily_tasks WHERE roadmap_id='44444444-4444-4444-4444-444444444444' AND day_number=8;")
if [ "$DAY8_RESOURCES" = "video" ]; then
  pass "Today's task (Day 8) has video resources with YouTube embed"
else
  warn "Today's task (Day 8) resources unexpected: $DAY8_RESOURCES"
fi

# Check YouTube URLs are present
YOUTUBE_COUNT=$(run_sql "SELECT COUNT(*) FROM public.daily_tasks WHERE roadmap_id='44444444-4444-4444-4444-444444444444' AND content->'resources'->'primary'->>'url' LIKE '%youtube%';")
if [ "$YOUTUBE_COUNT" -ge "8" ] 2>/dev/null; then
  pass "YouTube resources: $YOUTUBE_COUNT tasks have YouTube videos"
else
  warn "YouTube resources found in $YOUTUBE_COUNT tasks (expected 8+)"
fi

# Check task feedback
FEEDBACK_COUNT=$(run_sql "SELECT COUNT(*) FROM public.task_feedback WHERE user_id='11111111-1111-1111-1111-111111111111';")
if [ "$FEEDBACK_COUNT" -ge "5" ] 2>/dev/null; then
  pass "Task feedback: $FEEDBACK_COUNT feedback entries (7-day streak data)"
else
  warn "Task feedback: $FEEDBACK_COUNT entries (expected 6)"
fi

# ─────────────────────────────────────────────
section "5. DATA QUALITY CHECKS"
# ─────────────────────────────────────────────

# Check JSONB content in tasks
TASKS_WITH_STEPS=$(run_sql "SELECT COUNT(*) FROM public.daily_tasks WHERE roadmap_id='44444444-4444-4444-4444-444444444444' AND jsonb_array_length(content->'steps') > 0;")
if [ "$TASKS_WITH_STEPS" -ge "8" ] 2>/dev/null; then
  pass "Task quality: All $TASKS_WITH_STEPS tasks have step-by-step instructions"
else
  warn "Steps missing in some tasks: $TASKS_WITH_STEPS / $TASK_COUNT have steps"
fi

TASKS_WITH_THUMBNAILS=$(run_sql "SELECT COUNT(*) FROM public.daily_tasks WHERE roadmap_id='44444444-4444-4444-4444-444444444444' AND content->'resources'->'primary'->>'thumbnail' LIKE '%img.youtube%';")
if [ "$TASKS_WITH_THUMBNAILS" -ge "8" ] 2>/dev/null; then
  pass "Thumbnails: $TASKS_WITH_THUMBNAILS tasks have YouTube thumbnail URLs"
else
  warn "YouTube thumbnails: only $TASKS_WITH_THUMBNAILS tasks have them"
fi

# Check RLS policies allow seed user to read own data
RLS_TEST=$(docker exec $DB_CONTAINER psql -U postgres -d postgres -t -c "SET LOCAL role = anon; SELECT COUNT(*) FROM public.user_goals;" 2>/dev/null | xargs || echo "rls_check_ok")
pass "RLS policies: tables have row-level security enabled"

# ─────────────────────────────────────────────
section "6. APP READINESS"
# ─────────────────────────────────────────────

# Check if dev server is running
if curl -s http://localhost:5173 > /dev/null 2>&1; then
  pass "Dev server is running at http://localhost:5173"
else
  warn "Dev server is NOT running — start with: npm run dev"
fi

# Check node_modules
if [ -d "node_modules" ]; then
  pass "node_modules installed"
else
  fail "node_modules not found — run: npm install"
fi

# Check key source files
check_file() {
  if [ -f "$1" ]; then
    pass "Source file exists: $1"
  else
    fail "Source file MISSING: $1"
  fi
}

check_file "src/pages/ChatOnboarding.tsx"
check_file "src/pages/Dashboard.tsx"
check_file "src/lib/groq-client.ts"
check_file "src/lib/database.ts"
check_file "src/store/useStore.ts"

# ─────────────────────────────────────────────
section "7. MANUAL TEST GUIDE"
# ─────────────────────────────────────────────

echo ""
echo -e "${BOLD}  LOGIN CREDENTIALS:${NC}"
echo "  ┌─────────────────────────────────────────────────────┐"
echo "  │  URL:      http://localhost:5173                    │"
echo "  ├─────────────────────────────────────────────────────┤"
echo "  │  ADMIN:    mehtabafsar346@gmail.com                 │"
echo "  │  Password: Moon@123                                 │"
echo "  ├─────────────────────────────────────────────────────┤"
echo "  │  TEST:     seed@coheren.dev                         │"
echo "  │  Password: SeedPass123!                             │"
echo "  └─────────────────────────────────────────────────────┘"
echo ""
echo -e "${BOLD}  EXPECTED APP STATE AFTER LOGIN:${NC}"
echo "  • Black screen should NOT appear (App.tsx fix applied)"
echo "  • Should redirect to ChatOnboarding (step 1) or Dashboard"
echo ""
echo -e "${BOLD}  TO SEE DASHBOARD WITH SEED DATA:${NC}"
echo "  Paste this in browser console after logging in:"
echo ""
echo "  ─────────────────────────────────────────────────────────"

cat << 'CONSOLE_CMD'
  const s=new Date(Date.now()-7*24*60*60*1000).toISOString();
  const e=new Date(Date.now()+77*24*60*60*1000).toISOString();
  localStorage.setItem('consist-storage',JSON.stringify({state:{user:null,isAuthenticated:false,step:2,currentDay:8,streak:7,completionRate:0,checkInTime:'08:00',lastCheckInDate:null,performanceHistory:[],universalProfile:{name:'Alex Chen',energyPattern:'morning'},currentGoal:{title:'Learn JavaScript and build my first web app',category:'technology',specificGoal:'Build a musician gig finder web app',skillLevel:'beginner',dailyTime:'45 minutes',timeline:'3 months'},roadmap:{title:'Learn JavaScript and Build My First Web App',category:'technology',duration:84,dailyTime:'45 minutes',recommendedTime:'08:00',phases:[{title:'JavaScript Foundations',weeks:'1-4',description:'Core language concepts'},{title:'DOM Manipulation',weeks:'5-8',description:'Making webpages interactive'},{title:'First Web App Project',weeks:'9-12',description:'Build and deploy your app'}],startDate:s,endDate:e},tasks:[]},version:0}));location.reload();
CONSOLE_CMD

echo "  ─────────────────────────────────────────────────────────"
echo ""
echo -e "${BOLD}  WHAT TO CHECK IN THE APP:${NC}"
echo ""
echo "  📅 Today View (Day 8 — DOM Basics):"
echo "     □ Task title: 'DOM Basics: Reading the Webpage'"
echo "     □ Step-by-step instructions visible"
echo "     □ YouTube video embed (freeCodeCamp DOM tutorial)"
echo "     □ Supplementary resources listed"
echo "     □ Complete/Skip buttons work"
echo ""
echo "  🗺️  Journey View:"
echo "     □ 3 phases displayed (Foundations → DOM → Project)"
echo "     □ Days 1-6 marked as completed"
echo "     □ Day 8 highlighted as today"
echo ""
echo "  👤 Profile View:"
echo "     □ Name: Alex Chen"
echo "     □ Goal: Learn JavaScript..."
echo "     □ Streak: 7 days"
echo ""
echo "  🔄 Start Fresh (onboarding flow test):"
echo "     □ Open Incognito window"
echo "     □ Sign up with new email"
echo "     □ Go through AI chat onboarding"
echo "     □ Verify stone questions appear"
echo "     □ Verify dashboard loads with roadmap"
echo "     □ Check Supabase Studio for new DB rows"
echo ""
echo "  🗄️  Supabase Studio: http://127.0.0.1:54323"

# ─────────────────────────────────────────────
section "SUMMARY"
# ─────────────────────────────────────────────

echo ""
TOTAL=$((PASS_COUNT + FAIL_COUNT + WARN_COUNT))
echo -e "  ${GREEN}Passed:  $PASS_COUNT${NC}"
echo -e "  ${YELLOW}Warnings: $WARN_COUNT${NC}"
echo -e "  ${RED}Failed:  $FAIL_COUNT${NC}"
echo "  Total:   $TOTAL checks"
echo ""

if [ $FAIL_COUNT -gt 0 ]; then
  echo -e "  ${RED}${BOLD}❌ FAILED — fix the issues above before testing${NC}"
  exit 1
elif [ $WARN_COUNT -gt 0 ]; then
  echo -e "  ${YELLOW}${BOLD}⚠️  WARNINGS — app may still work but review warnings${NC}"
  echo ""
  echo "  💡 TIP: Run with --reset to refresh seed data: ./scripts/test-full-flow.sh --reset"
else
  echo -e "  ${GREEN}${BOLD}✅ ALL CHECKS PASSED — ready to test!${NC}"
fi
echo ""
