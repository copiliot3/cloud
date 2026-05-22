# Testing Shared Dashboard Implementation

## Quick Start

### Server is running at:
- **Backend API:** http://localhost:3001/api
- **Frontend:** http://localhost:5173

## Testing Steps

### 1. Generate a Share Link (Read-Only)

1. Go to http://localhost:5173 in your browser
2. Create or navigate to a test folder
3. Right-click on any folder
4. Select "Share" 
5. Choose "Read" permission
6. Copy the share link (format: `http://localhost:5173/?share=UUID`)

### 2. Test Read-Only Access

1. **In a new tab/incognito window:** Paste the share link
2. **Verify:**
   - ✅ Main dashboard layout loads with topbar
   - ✅ Only the shared folder visible
   - ✅ No sidebar
   - ✅ File grid/list display works
   - ✅ Can navigate subfolders via breadcrumbs
   - ✅ Can toggle grid/list views
   - ✅ Download button visible and works
   - ✅ Upload button NOT visible
   - ✅ New Folder button NOT visible
   - ✅ Delete buttons NOT visible
   - ✅ Permission badge shows "Read Only"

### 3. Generate a Share Link (Read & Write)

1. Go back to original tab
2. Right-click on a different folder
3. Select "Share"
4. Choose "Write" permission
5. Copy the new share link

### 4. Test Read & Write Access

1. **In a new tab/incognito window:** Paste the Write permission link
2. **Verify all Read features PLUS:**
   - ✅ Upload button visible and functional
   - ✅ New Folder button visible and functional
   - ✅ Can create new folders (test with prompt)
   - ✅ Can upload files (drag and drop OR click upload)
   - ✅ Can delete files/folders (select and press Delete or click delete button)
   - ✅ Can rename items (select item, press F2, or click rename)
   - ✅ Permission badge shows "Read & Write"

### 5. Test File Operations

#### Download Tests
- [ ] Download single file from list
- [ ] Download single file from grid
- [ ] Download entire folder as ZIP

#### Upload Tests (Write permission)
- [ ] Upload by clicking upload button
- [ ] Upload by drag-and-drop
- [ ] Upload multiple files at once
- [ ] Verify files appear in list after upload

#### Navigation Tests
- [ ] Click folder to navigate into it
- [ ] Use breadcrumb to go back
- [ ] Navigate multiple levels deep
- [ ] Breadcrumb shows correct path

#### Modification Tests (Write permission)
- [ ] Create new folder (prompt appears)
- [ ] Rename uploaded file
- [ ] Delete uploaded file
- [ ] Delete created folder

### 6. Test Error Cases

#### Invalid Share
- [ ] Try accessing non-existent share: `?share=invalid-uuid`
- [ ] Should show "Share Unavailable" error

#### Permission Denied (Read-only)
- [ ] Try uploading with read-only link
- [ ] Should show permission error toast
- [ ] Upload buttons should be disabled

### 7. Test UI/UX

#### Keyboard Shortcuts (Read & Write)
- [ ] Ctrl+A: Select all items
- [ ] Delete: Delete selected items (with confirmation)
- [ ] F2: Rename selected item
- [ ] F5: Refresh content
- [ ] Escape: Clear selection

#### View Modes
- [ ] Switch to Grid view: See items as cards with icons
- [ ] Switch to List view: See items in detailed list
- [ ] Both show selected state

#### Empty Folder (Write permission)
- [ ] Delete all files from a folder
- [ ] Should show "Folder is empty"
- [ ] Should show "Drop files here to upload" message

### 8. Test Permission Enforcement

#### Backend Validation
- [ ] Try to rename via browser console with read-only link
- [ ] Should get 403 Forbidden error
- [ ] Server should log permission denied

#### Frontend Validation
- [ ] Read-only link: Buttons are hidden
- [ ] Write link: All buttons visible and functional

### 9. Test Responsive Design

- [ ] Desktop (1920x1080): Full layout
- [ ] Tablet (768px): Responsive buttons
- [ ] Mobile (375px): Mobile-friendly buttons and layout

### 10. Test Browser Compatibility

- [ ] Chrome/Edge: All features work
- [ ] Firefox: All features work
- [ ] Safari: All features work

## Known Good Behaviors

### Read-Only Share Should:
1. ✅ Show file contents
2. ✅ Allow navigation
3. ✅ Allow download
4. ✅ Hide all write buttons
5. ✅ Show permission badge

### Write Permission Share Should:
1. ✅ Show all read features
2. ✅ Allow all file operations
3. ✅ Show all action buttons
4. ✅ Support drag-drop uploads
5. ✅ Show "Read & Write" badge

## Troubleshooting

### Issue: Files don't appear after upload
- **Solution:** Refresh the page (F5)

### Issue: Upload button not showing with write permission
- **Check:** Permission response from server
- **Action:** Open browser console and check API response

### Issue: Share link not working
- **Check:** Server is running (`npm start` in server folder)
- **Check:** Share ID is valid in URL

### Issue: Can't delete/rename in write mode
- **Check:** Server permissions for files
- **Action:** Try uploading a new test file and delete that

## Files to Check for Issues

### Frontend
- `client/src/components/shared/SharedDashboard.jsx`
- `client/src/components/shared/SharedTopbar.jsx`
- `client/src/components/shared/SharedFilesView.jsx`
- `client/src/App.jsx` (should route to SharedDashboard)

### Backend
- `server/services/shareService.js` (permission checks)
- `server/routes/share.js` (API endpoints)
- `server/shares.json` (share records)

## Success Criteria

✅ **Implementation Complete When:**
1. Share links work with proper dashboard layout
2. Read-only prevents all write operations
3. Write permission enables all operations
4. UI properly shows/hides buttons based on permission
5. All file operations complete successfully
6. No console errors
7. Responsive design works
8. Error states display correctly

## Performance Notes

- Large folder listing: May take time to render (100+ items)
- Large file upload: Progress shows correctly
- ZIP download: Shows download progress

## Next Steps After Testing

1. If all tests pass: Feature is production-ready
2. If issues found: Debug using console and check server logs
3. Update documentation with any discovered edge cases
4. Deploy to production
