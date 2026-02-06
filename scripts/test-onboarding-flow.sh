#!/bin/bash

# Coheren Onboarding Flow Test Script
# This script tests the complete user journey from signup to dashboard

set -e  # Exit on error

echo "🧪 Coheren Onboarding Flow Test"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test checklist
echo "📋 Test Checklist:"
echo ""
echo "1. Database Schema"
echo "2. Supabase Connection"
echo "3. Dev Server Build"
echo "4. Manual Onboarding Flow Test"
echo ""

# Step 1: Reset database with new schema
echo "${YELLOW}Step 1: Resetting database with fixed schema...${NC}"
cd /Users/mohammedmehtabafsar/Desktop/consist
supabase db reset

if [ $? -eq 0 ]; then
    echo "${GREEN}✅ Database reset successful${NC}"
else
    echo "${RED}❌ Database reset failed${NC}"
    exit 1
fi
echo ""

# Step 2: Check if Supabase is running
echo "${YELLOW}Step 2: Checking Supabase status...${NC}"
supabase status

if [ $? -eq 0 ]; then
    echo "${GREEN}✅ Supabase is running${NC}"
else
    echo "${RED}❌ Supabase is not running. Starting...${NC}"
    supabase start
fi
echo ""

# Step 3: Build check (verify no TypeScript errors)
echo "${YELLOW}Step 3: Running TypeScript type check...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo "${GREEN}✅ Build successful - no TypeScript errors${NC}"
else
    echo "${RED}❌ Build failed - check TypeScript errors above${NC}"
    exit 1
fi
echo ""

# Step 4: Manual test instructions
echo "${YELLOW}Step 4: Manual Onboarding Flow Test${NC}"
echo ""
echo "Please test the following flow manually:"
echo ""
echo "🔹 AUTH & SIGNUP"
echo "   1. Open http://localhost:5173"
echo "   2. Click 'Start Your Journey' or 'Get Started'"
echo "   3. Sign up with test email: test-$(date +%s)@example.com"
echo "   4. Check console for: 'Auth event: SIGNED_IN'"
echo ""
echo "🔹 CHAT ONBOARDING"
echo "   5. Start typing your goal (e.g., 'I want to learn boxing')"
echo "   6. Continue providing details:"
echo "      - Category: fitness/skill/knowledge"
echo "      - Name: Your name"
echo "      - Skill level: beginner/intermediate/advanced"
echo "      - Timeline: 30 days"
echo "      - Daily time: 30 minutes"
echo "   7. ✅ Verify chat DOES NOT close prematurely while typing"
echo "   8. ✅ Verify chat closes ONLY after all data is collected"
echo "   9. Check console for: '✅ AI mentioned plan AND we have all required data'"
echo ""
echo "🔹 STONE QUESTIONS"
echo "   10. Answer each stone question"
echo "   11. For multiple choice: ✅ Verify clicking option advances"
echo "   12. For text input: ✅ Verify typing DOES NOT auto-advance"
echo "   13. For text input: ✅ Verify 'Next' button appears and works"
echo "   14. Complete all stone questions"
echo ""
echo "🔹 DATABASE SYNC"
echo "   15. Watch console logs for:"
echo "       - '🚀 Starting complete roadmap generation...'"
echo "       - '📝 Step 1/4: Creating goal...'"
echo "       - '✅ Step 1/4: Goal created: <uuid>'"
echo "       - '📝 Step 2/4: Saving stones...'"
echo "       - '✅ Step 2/4: Stones saved'"
echo "       - '📝 Step 3/4: Creating roadmap...'"
echo "       - '✅ Step 3/4: Roadmap created: <uuid>'"
echo "       - '📝 Step 4/4: Saving tasks...'"
echo "       - '✅ Step 4/4: Tasks saved'"
echo "   16. ✅ Verify NO hanging at any step"
echo "   17. ✅ Verify NO errors in console"
echo "   18. If hanging occurs, check Network tab for failed requests"
echo ""
echo "🔹 DASHBOARD"
echo "   19. ✅ Verify dashboard loads with roadmap"
echo "   20. ✅ Verify today's task is displayed"
echo "   21. ✅ Verify task has:"
echo "       - Title"
echo "       - Description"
echo "       - Steps"
echo "       - Tips"
echo "       - Duration"
echo "       - Success criteria"
echo "   22. Click 'Complete' on a task"
echo "   23. ✅ Verify task feedback modal appears"
echo "   24. Submit feedback"
echo "   25. ✅ Verify task is marked as completed"
echo ""
echo "🔹 DATA VERIFICATION"
echo "   26. Open Supabase Studio: http://localhost:54323"
echo "   27. Check tables have data:"
echo "       - profiles"
echo "       - user_goals (should have 1 row)"
echo "       - goal_stones (should have 5-8 rows)"
echo "       - roadmaps (should have 1 row)"
echo "       - daily_tasks (should have 30-90 rows)"
echo "   28. ✅ Verify data matches what you entered"
echo ""
echo "${GREEN}================================${NC}"
echo "${GREEN}Test script complete!${NC}"
echo ""
echo "📝 Report any issues found during manual testing."
echo "🐛 If database hangs, check:"
echo "   - Browser DevTools > Network tab > Failed requests"
echo "   - Browser DevTools > Console > Error messages"
echo "   - Terminal running 'npm run dev' > API errors"
echo ""
