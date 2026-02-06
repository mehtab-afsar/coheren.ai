#!/bin/bash

# Verification script to check database data
# Run with: ./scripts/verify-db-data.sh

echo "🔍 Verifying Database Data..."
echo ""

# Check if Docker is running
if ! docker ps > /dev/null 2>&1; then
    echo "❌ Docker is not running"
    echo "   Please start Docker Desktop and try again"
    exit 1
fi

# Check if Supabase container is running
if ! docker ps --filter "name=supabase_db_consist" --format "{{.Names}}" | grep -q "supabase_db_consist"; then
    echo "❌ Supabase database container is not running"
    echo "   Start Supabase containers with: docker start \$(docker ps -a -q --filter \"name=supabase\")"
    exit 1
fi

echo "✅ Docker and Supabase are running"
echo ""

# Check auth.users
echo "📊 Checking auth.users table..."
USERS_COUNT=$(docker exec supabase_db_consist psql -U postgres -d postgres -t -c "SELECT COUNT(*) FROM auth.users;" 2>/dev/null | tr -d ' ')
echo "   Users in auth.users: $USERS_COUNT"

if [ "$USERS_COUNT" -gt 0 ]; then
    echo ""
    echo "   User emails:"
    docker exec supabase_db_consist psql -U postgres -d postgres -c "SELECT email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 5;" 2>/dev/null
fi

echo ""

# Check profiles
echo "📊 Checking profiles table..."
PROFILES_COUNT=$(docker exec supabase_db_consist psql -U postgres -d postgres -t -c "SELECT COUNT(*) FROM profiles;" 2>/dev/null | tr -d ' ')
echo "   Profiles created: $PROFILES_COUNT"

if [ "$PROFILES_COUNT" -gt 0 ]; then
    echo ""
    echo "   Profile data:"
    docker exec supabase_db_consist psql -U postgres -d postgres -c "SELECT id, full_name, created_at FROM profiles ORDER BY created_at DESC LIMIT 5;" 2>/dev/null
fi

echo ""

# Check user_goals
echo "📊 Checking user_goals table..."
GOALS_COUNT=$(docker exec supabase_db_consist psql -U postgres -d postgres -t -c "SELECT COUNT(*) FROM user_goals;" 2>/dev/null | tr -d ' ')
echo "   Goals created: $GOALS_COUNT"

if [ "$GOALS_COUNT" -gt 0 ]; then
    echo ""
    echo "   Goal data:"
    docker exec supabase_db_consist psql -U postgres -d postgres -c "SELECT id, user_id, goal_text, status, created_at FROM user_goals ORDER BY created_at DESC LIMIT 5;" 2>/dev/null
fi

echo ""

# Check roadmaps
echo "📊 Checking roadmaps table..."
ROADMAPS_COUNT=$(docker exec supabase_db_consist psql -U postgres -d postgres -t -c "SELECT COUNT(*) FROM roadmaps;" 2>/dev/null | tr -d ' ')
echo "   Roadmaps created: $ROADMAPS_COUNT"

if [ "$ROADMAPS_COUNT" -gt 0 ]; then
    echo ""
    echo "   Roadmap data:"
    docker exec supabase_db_consist psql -U postgres -d postgres -c "SELECT id, goal_id, created_at FROM roadmaps ORDER BY created_at DESC LIMIT 5;" 2>/dev/null
fi

echo ""

# Check daily_tasks
echo "📊 Checking daily_tasks table..."
TASKS_COUNT=$(docker exec supabase_db_consist psql -U postgres -d postgres -t -c "SELECT COUNT(*) FROM daily_tasks;" 2>/dev/null | tr -d ' ')
echo "   Tasks created: $TASKS_COUNT"

if [ "$TASKS_COUNT" -gt 0 ]; then
    echo ""
    echo "   Task data:"
    docker exec supabase_db_consist psql -U postgres -d postgres -c "SELECT id, user_id, day_number, task_text, is_completed FROM daily_tasks ORDER BY created_at DESC LIMIT 5;" 2>/dev/null
fi

echo ""

# Summary
echo "📋 Summary:"
echo "   ✓ Auth users: $USERS_COUNT"
echo "   ✓ Profiles: $PROFILES_COUNT"
echo "   ✓ Goals: $GOALS_COUNT"
echo "   ✓ Roadmaps: $ROADMAPS_COUNT"
echo "   ✓ Tasks: $TASKS_COUNT"
echo ""

# Check for mismatches
if [ "$USERS_COUNT" -ne "$PROFILES_COUNT" ]; then
    echo "⚠️  WARNING: Mismatch between users ($USERS_COUNT) and profiles ($PROFILES_COUNT)"
    echo "   Some users may be missing profiles!"
    echo ""
fi

if [ "$PROFILES_COUNT" -gt 0 ] && [ "$GOALS_COUNT" -eq 0 ]; then
    echo "⚠️  WARNING: Profiles exist but no goals found"
    echo "   Users may have signed up but not completed onboarding"
    echo ""
fi

echo "✅ Verification complete!"
echo ""
echo "💡 To view specific data:"
echo "   npm run db:connect"
echo "   Then run SQL queries manually"
echo ""
