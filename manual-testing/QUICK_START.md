# Quick Start: Testing Chat Branch Checkout + Remote Agent

## ⚡ 5-Minute Test

### 1. Check Services Running ✓

```bash
./manual-testing/quick-test.sh
# Choose option 5 for smoke test
```

### 2. Open App

```
http://localhost:3000
```

### 3. Test Basic Checkout

1. Click **"Repositories"** tab
2. Select **"Scaffolder Demo"** (mock data)
3. Switch to **"Code"** tab
4. Click different chats in sidebar
5. **Expected:** File tree updates each time

### 4. Test Remote Agent

1. Make sure you're on a **real repository** (not mock)
2. Click **"+ New Chat"**
3. Send this message:
   ```
   Create a simple README.md file with:
   - Project title
   - Description
   - Installation steps
   ```
4. **Expected:**
   - Agent creates `feat/add-readme` branch
   - Commits README.md
   - Responds with summary

### 5. Verify Git Changes

```bash
# Find your repo
cd /home/ubuntu/scaffolder-workspaces/<owner>/<repo>

# Check branch created
git branch -a | grep feat/add-readme

# View commit
git log feat/add-readme --oneline -1

# See changes
git show feat/add-readme
```

### 6. Test Checkout Integration

1. Click the chat where agent worked
2. Switch to **Code** tab
3. **Expected:** Auto-checkout to `feat/add-readme`
4. See README.md in file tree

---

## ✅ Success Checklist

- [ ] Smoke test passes (all green ✓)
- [ ] Can click between chats → file tree updates
- [ ] Agent creates branches (`feat/`, `fix/`)
- [ ] Agent commits changes with good messages
- [ ] Can checkout agent-created branches
- [ ] No errors in browser console

---

## 🐛 Found Issues?

Document them:

```
Issue: _____________________________
Expected: __________________________
Actual: ____________________________
Steps to reproduce: ________________
```

---

## 📚 Full Test Guide

For comprehensive testing, see:

```
manual-testing/test-chat-branch-checkout.md
```

---

## 🔧 Troubleshooting

**OpenCode not responding?**

```bash
pkill opencode
opencode serve --port 4096
```

**Backend not running?**

```bash
bun dev
```

**No repositories?**

- Add one via UI: "Repositories" → "+ Add" → "judigot/test-repo"

**Agent not creating branches?**

- Check DevTools Network tab for `systemPrompt` in request
- Check OpenCode is running: `curl http://localhost:4096/health`
- Try more explicit: "Create a new branch called feat/test and add a file"

---

## ⏱️ Expected Timings

| Action            | Time  |
| ----------------- | ----- |
| Checkout branch   | < 2s  |
| Agent responds    | 5-30s |
| File tree refresh | < 1s  |

---

## 🎯 What We're Testing

✅ **Chat Branch Checkout**

- Auto-checkout when clicking chat
- File tree refresh
- Branch badges

✅ **Remote Coding Agent**

- Creates branches automatically
- Follows git best practices
- Commits with good messages
- Never commits to main

✅ **Integration**

- System prompt sent correctly
- Agent-created branches work with checkout
- Error handling

---

**Ready to test?** Run the quick test script:

```bash
./manual-testing/quick-test.sh
```

Then open http://localhost:3000 and start clicking! 🚀
