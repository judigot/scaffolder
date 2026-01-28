# Manual Testing Guide: Chat Branch Checkout + Remote Coding Agent

## Prerequisites

✅ OpenCode running on port 4096  
✅ Backend running on port 3000  
✅ Logged into Auth0  
✅ At least one repository cloned

---

## Test 1: Setup Test Repository

### 1.1 Create a Test Repository (If Needed)

**Option A: Use existing repo**

- Open http://localhost:3000
- Click "Repositories" tab
- Check if you have any repos listed

**Option B: Add a test repo**

```bash
# In browser:
1. Click "+ Add" button
2. Enter: "judigot/test-repo" (or any public repo you own)
3. Wait for clone to complete
4. Should see repo in tabs
```

### 1.2 Verify Clone Location

```bash
# Check workspace directory
ls -la /home/ubuntu/scaffolder-workspaces/

# Should see: judigot/test-repo (or your repo)
```

---

## Test 2: Chat Branch Checkout

### 2.1 Prepare Mock Data

The app has mock chats with branches already. Let's verify:

**In browser:**

1. Open http://localhost:3000
2. Click "Repositories" tab
3. Select "Scaffolder Demo" repo (mock data)
4. You should see sprints with chats

### 2.2 Test Auto-Checkout

**Steps:**

1. Click "Code" tab (bottom)
2. File tree shows current branch files
3. Click a chat in the sidebar (e.g., "Dark mode" chat)
4. **Expected:** File tree should update to show that branch's files
5. Check breadcrumb shows new branch name

**Verification:**

```bash
# If using real repo (not mock), check actual git state:
cd /home/ubuntu/scaffolder-workspaces/judigot/test-repo
git branch --show-current
# Should match the branch from the chat you clicked
```

### 2.3 Test Multiple Checkouts

**Steps:**

1. Click "Chat A" (with branch: feat/feature-a)
2. Wait for file tree to update
3. Click "Chat B" (with branch: feat/feature-b)
4. **Expected:** File tree updates again
5. Rapid-click between chats
6. **Expected:** Should handle multiple checkouts gracefully

---

## Test 3: Remote Coding Agent (Branch Creation)

### 3.1 Create a New Chat

**In browser:**

1. Make sure you're on a **real repository** (not mock data)
2. Click "+ New Chat" button
3. Chat panel opens with empty conversation

### 3.2 Test Agent Creates Branch

**Send this message:**

```
Add a README.md file with project description. Include sections for:
- Project name
- What it does
- How to install
- How to use
```

**Expected behavior:**

1. Agent receives system prompt automatically
2. Agent analyzes request
3. Agent creates branch: `feat/add-readme`
4. Agent creates/edits README.md
5. Agent commits changes
6. Agent responds with summary:
   ```
   ✓ Branch: feat/add-readme
   ✓ Files: 1 modified (README.md)
   ✓ Commits: 1 commit on branch
   ```

**Verification:**

```bash
cd /home/ubuntu/scaffolder-workspaces/<owner>/<repo>

# Check branch was created
git branch -a | grep feat/add-readme

# Check commit was made
git log feat/add-readme --oneline -1

# View the changes
git show feat/add-readme
```

### 3.3 Test Agent Follows Git Rules

**Send this message:**

```
Commit this change directly to main branch
```

**Expected:**

- Agent should **refuse** and explain it never commits to main
- Agent should suggest creating a feature branch instead

### 3.4 Test Agent Branch Naming

**Test different request types:**

| Request                   | Expected Branch Name       |
| ------------------------- | -------------------------- |
| "Add user authentication" | `feat/user-authentication` |
| "Fix login bug"           | `fix/login-bug`            |
| "Refactor API client"     | `refactor/api-client`      |

### 3.5 Test Agent with Vague Request

**Send this message:**

```
Make it better
```

**Expected:**

- Agent should ask for clarification
- Should NOT create a branch yet
- Should ask: "What would you like me to improve?"

---

## Test 4: Chat + Branch Integration

### 4.1 Test Chat-to-Branch Association

**After agent creates a branch:**

1. Note the branch name agent created (e.g., `feat/add-readme`)
2. Switch to Code tab
3. Click the chat where agent worked
4. **Expected:** File tree should auto-checkout `feat/add-readme`
5. Should see README.md in file tree

**Current limitation:**

- `chat.branch` is NOT auto-updated yet (future enhancement)
- You need to manually add branch to mock data to test checkout

### 4.2 Manually Test Branch Badge

**To test branch badges in chat tree:**

Edit mock data to add branch:

```typescript
// src/components/AI/chat-app/mockData.ts
{
  id: "chat-test-1",
  title: "Test Feature",
  branch: "feat/add-readme",  // Add this
  messages: [],
  // ...
}
```

Refresh browser, should see "feat/add-readme" badge on chat row.

---

## Test 5: Error Handling

### 5.1 Test Checkout Without Local Clone

**Steps:**

1. Add a repo (clone it)
2. Delete the local clone:
   ```bash
   rm -rf /home/ubuntu/scaffolder-workspaces/<owner>/<repo>
   ```
3. Click a chat with a branch
4. **Expected:** Error toast "Local clone not found"

### 5.2 Test Agent Without OpenCode

**Steps:**

1. Stop OpenCode: `pkill opencode`
2. Try sending a chat message
3. **Expected:** Error message in chat
4. Restart: `opencode serve --port 4096`

### 5.3 Test Branch Doesn't Exist

**Steps:**

1. Manually set a chat's branch to non-existent branch
2. Click that chat on Code tab
3. **Expected:** Error toast "Branch not found"

---

## Test 6: System Prompt Verification

### 6.1 Verify Prompt is Sent

**Check network tab:**

1. Open browser DevTools (F12)
2. Go to Network tab
3. Send a chat message
4. Find `POST /api/opencode/chat` request
5. Check request payload
6. **Expected:** Should include `systemPrompt` field

**Request body should look like:**

```json
{
  "message": "Add a README file",
  "sessionId": "...",
  "directory": "/home/ubuntu/scaffolder-workspaces/...",
  "systemPrompt": "You are a remote coding agent..."
}
```

### 6.2 Test Different Repos Get Same Prompt

**Steps:**

1. Chat in Repo A → check prompt sent
2. Chat in Repo B → check prompt sent
3. **Expected:** Same system prompt for both

---

## Test 7: End-to-End Workflow

### Complete Feature Development Test

**Scenario:** Build a simple feature from scratch

**Steps:**

1. **Create chat**
   - Click "+ New Chat"
   - Name: "Add contact form"

2. **Request feature**

   ```
   Create a simple contact form with:
   - Name field
   - Email field
   - Message textarea
   - Submit button

   Save to src/components/ContactForm.tsx
   ```

3. **Agent creates branch**
   - Expected: `feat/add-contact-form`

4. **Agent creates file**
   - Creates `src/components/ContactForm.tsx`
   - Commits with message

5. **Switch to Code tab**
   - Click the chat
   - See `feat/add-contact-form` checked out
   - See ContactForm.tsx in file tree

6. **Verify git state**

   ```bash
   cd /home/ubuntu/scaffolder-workspaces/<repo>
   git log --oneline --all
   git diff main feat/add-contact-form
   ```

7. **Request changes**

   ```
   Add form validation to the contact form
   ```

8. **Agent commits again**
   - Same branch
   - New commit
   - Updates chat with summary

9. **Final verification**
   ```bash
   git log feat/add-contact-form --oneline
   # Should show 2 commits
   ```

---

## Test 8: Performance & UX

### 8.1 Test File Tree Refresh Speed

**Steps:**

1. Click chat with branch A
2. Measure time until file tree updates
3. **Expected:** < 2 seconds

### 8.2 Test Multiple Rapid Clicks

**Steps:**

1. Rapidly click between 5 different chats
2. **Expected:** No crashes, queue handled properly

### 8.3 Test Large Repositories

**Steps:**

1. Clone a large repo (e.g., React, Next.js)
2. Test checkout between branches
3. **Expected:** Still responsive (may be slower)

---

## Quick Verification Checklist

Use this checklist for each test run:

### Setup

- [ ] OpenCode running (port 4096)
- [ ] Backend running (port 3000)
- [ ] Logged into Auth0
- [ ] At least 1 repo cloned

### Chat Branch Checkout

- [ ] Clicking chat switches branch
- [ ] File tree refreshes after checkout
- [ ] Branch badge displays correctly
- [ ] Multiple checkouts work

### Remote Agent

- [ ] Agent creates branches (`feat/`, `fix/`)
- [ ] Agent creates/edits files
- [ ] Agent commits changes
- [ ] Agent provides clear summaries
- [ ] Agent refuses to commit to main
- [ ] Agent asks for clarification when vague

### Integration

- [ ] System prompt sent in API request
- [ ] Checkout works after agent creates branch
- [ ] Error handling works (no clone, no branch)

### End-to-End

- [ ] Can develop complete feature via chat
- [ ] Git history looks clean
- [ ] Files created correctly

---

## Common Issues & Solutions

### Issue: "Local clone not found"

**Solution:**

```bash
# Re-clone the repo
# Or check workspace path in code
```

### Issue: Agent doesn't create branch

**Solution:**

- Check OpenCode is running
- Check system prompt is sent (DevTools)
- Try more explicit request: "Create a new branch and add..."

### Issue: File tree doesn't refresh

**Solution:**

- Check Code tab is active
- Check chat has `branch` property set
- Check console for errors

### Issue: Checkout fails silently

**Solution:**

```bash
# Check repo has branch
cd /home/ubuntu/scaffolder-workspaces/<repo>
git branch -a

# Check for uncommitted changes
git status
```

---

## Success Criteria

✅ **Chat Branch Checkout:**

- Clicking chat switches to its branch
- File tree shows branch's files
- Works with multiple chats

✅ **Remote Coding Agent:**

- Creates branches automatically
- Follows naming conventions
- Commits with good messages
- Never commits to main
- Provides clear summaries

✅ **Integration:**

- System prompt sent correctly
- Agent-created branches can be checked out
- Error handling works

✅ **User Experience:**

- Fast response times (< 2s)
- No crashes or freezes
- Clear error messages

---

## Next Steps After Testing

If all tests pass:

1. ✅ Merge PR #34
2. 📝 Document any issues found
3. 🚀 Plan Phase 2 (auto-extract branch names)
4. 💡 Consider Octokit migration for PR creation

If tests fail:

1. 📋 Document failure cases
2. 🐛 Create issues for bugs
3. 🔧 Fix and retest
4. 📖 Update documentation

---

## Test Results Template

Use this to record your test results:

```
Date: ____________________
Tester: __________________
Environment: Local / Vercel Preview

## Test Results

### Chat Branch Checkout
- [ ] PASS / [ ] FAIL - Basic checkout
- [ ] PASS / [ ] FAIL - Multiple checkouts
- [ ] PASS / [ ] FAIL - Branch badges
Notes: ___________________________________

### Remote Agent
- [ ] PASS / [ ] FAIL - Creates branches
- [ ] PASS / [ ] FAIL - Commits changes
- [ ] PASS / [ ] FAIL - Follows git rules
- [ ] PASS / [ ] FAIL - Provides summaries
Notes: ___________________________________

### Integration
- [ ] PASS / [ ] FAIL - System prompt sent
- [ ] PASS / [ ] FAIL - End-to-end workflow
- [ ] PASS / [ ] FAIL - Error handling
Notes: ___________________________________

## Issues Found
1. ___________________________________
2. ___________________________________
3. ___________________________________

## Overall Assessment
[ ] Ready to merge
[ ] Needs fixes
[ ] Blocked by: _______________________
```

---

**Happy Testing!** 🧪✨
