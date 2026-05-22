# CloudDrive Lumina - Complete Setup & Collaboration Guide

## Quick Start (2 Minutes)

### Prerequisites
- Node.js v18+ installed
- Git for version control
- Windows/Mac/Linux OS

### Step 1: Clone Repository
```powershell
git clone https://github.com/copiliot3/cloud.git
cd cloud
```

### Step 2: Install Dependencies
```powershell
# Terminal 1 - Server
cd server
npm install

# Terminal 2 - Client
cd client
npm install
```

### Step 3: Run Both Servers
```powershell
# Terminal 1 - Backend (keep running)
cd server
npm run dev
# Output: ☁️  CloudDrive Lumina server running at http://localhost:3001

# Terminal 2 - Frontend (keep running)
cd client
npm run dev
# Output: Access at http://localhost:5173/
```

### Step 4: Access Application
Open browser to: **http://localhost:5173**

---

## Project Structure

```
cloud/
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── api/           # API client functions
│   │   ├── components/    # React components
│   │   ├── stores/        # Zustand state management
│   │   └── utils/         # Helper utilities
│   ├── package.json
│   └── vite.config.js
│
├── server/                 # Node.js backend (Express)
│   ├── routes/            # API endpoints
│   ├── services/          # Business logic
│   ├── middleware/        # Express middleware
│   ├── index.js           # Server entry point
│   ├── package.json
│   ├── shares.json        # Share data storage
│   └── recents.json       # Recent items cache
│
├── desktop-app/           # Electron desktop app
├── designs/               # UI/UX designs
├── RUN_GUIDE.md          # Running guide
└── SHARE_FEATURE_GUIDE.md # This guide
```

---

## Development Workflow

### For Team Collaboration

#### 1. **Creating a Feature Branch**
```powershell
# First, sync with main branch
git checkout main
git pull origin main

# Create your feature branch
git checkout -b feature/your-feature-name
# Example: git checkout -b feature/enhanced-share-ui
```

#### 2. **Making Changes**
```powershell
# Make your changes to the code
# Changes are auto-reloaded with:
# - Server: nodemon watches files
# - Client: Vite HMR (Hot Module Reload)

# Check what files changed
git status

# Stage your changes
git add .
# Or specific files
git add client/src/components/shared/ShareModal.jsx
```

#### 3. **Commit Changes**
```powershell
# Commit with descriptive message
git commit -m "feat: improve share modal UI with better permission labels"

# Good commit messages:
# feat: Add new feature
# fix: Bug fix
# docs: Documentation update
# refactor: Code restructuring
# style: Code formatting
```

#### 4. **Push to Remote**
```powershell
# Push your branch
git push origin feature/your-feature-name

# On first push, Git may ask you to track the branch
git push -u origin feature/your-feature-name
```

#### 5. **Create Pull Request (PR)**
- Go to GitHub: https://github.com/copiliot3/cloud
- Click "Pull Requests" tab
- Click "New Pull Request"
- Select your branch
- Add description of changes
- Request reviewers (your friend)
- Submit PR

#### 6. **Review & Merge**
- Your teammate reviews the code
- Make changes if requested
- Once approved, merge to main branch

### Git Commands Cheat Sheet
```powershell
# View all branches
git branch -a

# Switch to existing branch
git checkout branch-name

# Create and switch to new branch
git checkout -b new-branch-name

# View commit history
git log --oneline

# See what's changed
git diff

# Undo changes (not committed)
git checkout -- filename

# Undo last commit (keep changes)
git reset HEAD~1

# View remote URLs
git remote -v
```

---

## Ports & Access Points

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| Backend API | 3001 | http://localhost:3001/api | File operations, share management |
| Frontend | 5173 | http://localhost:5173 | Web application |
| DevTools | Varies | Automatic | React/Vite development tools |

---

## Stopping Services

### Terminal Commands
```powershell
# In respective terminal, press Ctrl+C to stop

# Or manually kill processes
# Stop backend
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess -Force

# Stop frontend
Stop-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess -Force
```

---

## Environment Setup (Optional)

### Create `.env` file in `server/` directory
```
PORT=3001
NODE_ENV=development
# Add other env vars as needed
```

### Create `.env.local` file in `client/` directory
```
VITE_API_URL=http://localhost:3001/api
VITE_APP_NAME=CloudDrive Lumina
```

---

## Testing the Share Feature

### Manual Testing Steps

1. **Navigate to a folder**
   - Click "My Files" → "Local Disk (C:)"
   - Wait for files to load

2. **Share a file/folder**
   - Right-click on any file or folder
   - Select "Share" from context menu
   - Choose permission level
   - Copy the generated link

3. **Test Read-Only Link**
   - Open link in new incognito window
   - Verify you can view but not modify
   - Try to delete (should fail)

4. **Test Read & Write Link**
   - Share same item with "Read & Write"
   - Copy new link
   - Open in incognito window
   - Verify you can upload and modify

---

## Troubleshooting

### Port Already in Use
```powershell
# Find what's using port 3001
Get-NetTCPConnection -LocalPort 3001 | Select ProcessName, OwningProcess

# Kill the process
Stop-Process -Id <ProcessId> -Force
```

### Dependencies Issues
```powershell
# Clear cache and reinstall
rm -r node_modules package-lock.json
npm install
```

### API Connection Error
```
Error: Cannot connect to http://localhost:3001
```
**Solution:**
- Ensure server is running: `npm run dev` in server folder
- Check if port 3001 is available
- Restart both server and client

### Files Not Loading
```
Issue: Files grid shows "Loading..." indefinitely
```
**Solution:**
- Check browser console for errors (F12)
- Verify server is running and accessible
- Check network tab in DevTools
- Restart both services

---

## Building for Production

### Frontend Build
```powershell
cd client
npm run build
# Outputs optimized files to dist/
```

### Deployment
```powershell
# On your server
cd server
npm install --production
npm start

# On static host (client dist)
# Upload contents of client/dist/ to hosting
```

---

## Performance Tips

1. **Clear large files before sharing**
   - Very large folders will take time to zip
   
2. **Monitor server logs**
   - Check `server/index.js` console for errors

3. **Use list view for many files**
   - Grid view with 1000+ files can be slow

4. **Regular commits**
   - Keep repository lean, don't commit node_modules

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Files not syncing | Pull latest: `git pull origin main` |
| Merge conflicts | Resolve in VS Code, then `git add` and `commit` |
| Lost work | Check `git reflog` to recover commits |
| Slow performance | Restart services and clear browser cache |
| Share links not working | Verify source file still exists |
| Cannot write to share | Verify it was shared with "Read & Write" |

---

## For Your Friend (Collaboration)

### Getting Started
1. Clone: `git clone https://github.com/copiliot3/cloud.git`
2. Install: `npm install` in both server & client folders
3. Run: `npm run dev` in separate terminals
4. Code: Make changes on your branch
5. Commit: `git commit -m "your message"`
6. Push: `git push origin your-branch`
7. Create: PR on GitHub for review

### Best Practices for Teamwork
- **Always work on branches**, never directly on main
- **Pull before pushing**: `git pull origin main` before new work
- **Write clear commit messages**
- **Test your changes** before pushing
- **Review each other's code** in PRs
- **Communicate via GitHub issues** for feature requests
- **Use the same code style** (ESLint configured)

### Code Review Checklist
- [ ] Code runs without errors
- [ ] No console warnings
- [ ] Follows existing code style
- [ ] Comments added for complex logic
- [ ] No hardcoded values
- [ ] Changes are tested

---

## Remote Access (Optional)

### Using Tailscale (Recommended)
```powershell
# Install Tailscale and login
# In terminal, run:
tailscale serve --bg 5173

# Share the URL generated with your team
# Access from any device on your Tailscale network
```

### Using LocalTunnel
```powershell
# Create public URL for frontend
npx -y localtunnel --port 5173

# URL will be displayed, share with team
# Example: https://random.loca.lt
```

---

## System Requirements

### Minimum
- Node.js 18.0+
- 500 MB free disk space
- 2 GB RAM

### Recommended
- Node.js 20.0+ (LTS)
- 2 GB free disk space
- 4+ GB RAM
- Modern browser (Chrome, Edge, Firefox)

---

## Getting Help

### Check Logs
```powershell
# Server logs
# Look in the terminal running: npm run dev

# Browser DevTools
# Press F12 → Console tab → Look for errors
```

### Reset Everything
```powershell
# If something is completely broken:
git clean -fd          # Remove untracked files
git reset --hard HEAD  # Reset to last commit
npm install           # Reinstall dependencies
npm run dev           # Start fresh
```

---

## Version Management

Current versions:
- **Frontend**: React 19.2, Vite 8.0
- **Backend**: Node.js, Express 4.21
- **Share Feature**: v1.0.0

---

**Ready to code? Start with Step 1 above! 🚀**

For detailed share feature documentation, see: [SHARE_FEATURE_GUIDE.md](./SHARE_FEATURE_GUIDE.md)
