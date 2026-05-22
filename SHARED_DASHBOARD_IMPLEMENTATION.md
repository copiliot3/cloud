# Shared Folder Dashboard Implementation

## Overview
The shared folder feature has been fully implemented with a complete dashboard experience. When someone accesses a shared link, they get a full-featured dashboard showing only the shared folder/item with proper privilege enforcement.

## Components Created/Updated

### 1. **SharedDashboard.jsx** (NEW)
Main component that provides the full dashboard layout for shared access
- Handles share loading and validation
- Manages file selection and operations
- Enforces read/write permissions
- Provides keyboard shortcuts (Ctrl+A, Delete, F2, F5, etc.)
- Shows proper error states

**Key Features:**
- Checks permissions (read vs read+write)
- Disables operations based on privileges
- Shows appropriate error messages
- Supports single file and folder shares
- Full keyboard navigation

### 2. **SharedTopbar.jsx** (NEW)
Toolbar for shared dashboard view
- Shows shared folder name and icon
- Displays current permission level (Read Only / Read & Write)
- Provides action buttons based on permissions:
  - **For all users:** Refresh, Download, View toggle
  - **For write access:** New Folder, Upload, Rename, Delete buttons
- Search is disabled in shared view
- Shows permission badge

### 3. **SharedFilesView.jsx** (NEW)
Main file display component for shared content
- Supports both Grid and List view modes
- Shows files and folders with proper icons
- Selection with Ctrl+Click and Shift+Click
- Right-click context menu support
- Drag-and-drop upload (when write enabled)
- Download buttons for individual files
- Breadcrumb navigation
- Shows empty folder message

**Features:**
- Grid view with item selection indicator
- List view with detailed info (size, date, type)
- Visual feedback for selected items
- Permission-aware file operations
- Drop zone for uploads
- Navigation to subfolders

### 4. **SharedUploadModal.jsx** (NEW)
Upload dialog specifically for shared folders
- Drag-and-drop file selection
- Browse file picker
- Shows file list with sizes
- Upload progress indicator
- Permission validation

### 5. **App.jsx** (UPDATED)
Changed to use SharedDashboard instead of SharedView when share parameter is present

## Permission System

### Read-Only Access (`permission: 'read'`)
Users can:
- View folder contents
- Navigate subfolders
- Download individual files
- Download entire folder as ZIP
- Switch between grid/list views
- Refresh content

Users CANNOT:
- Upload files
- Create folders
- Rename items
- Delete items
- Paste items

### Read & Write Access (`permission: 'write'`)
Users can do everything Read-Only users can do, PLUS:
- Upload files
- Create folders
- Rename items
- Delete items
- Modify folder structure

## Key Implementation Details

### Backend Enforcement
The backend (`shareService.js`) enforces permissions on all operations:
- `assertWritable(share)` - Validates write permission
- `sanitizeRelativePath()` - Prevents path traversal
- `resolveSharedPath()` - Validates paths are within shared scope
- All write operations check permission before executing

### Frontend Enforcement
The frontend enforces permissions through:
1. **UI Layer:** Hide/disable buttons based on `canWrite` flag
2. **Component Logic:** Check permissions before allowing operations
3. **Error Handling:** Show appropriate messages for denied operations
4. **API Calls:** Only send requests that are allowed

### File Operations
All file operations work with the shared API:
- **Upload:** Files uploaded to shared folder path
- **Delete:** Items removed (write-only)
- **Rename:** Items renamed (write-only)
- **Create:** Folders created (write-only)
- **Download:** Direct file download or ZIP
- **Navigate:** Browse subfolder contents

## Usage Flow

### For Share Creator:
1. Right-click file/folder in regular dashboard
2. Click "Share"
3. Select permission level (Read or Write)
4. Copy share link
5. Send link to others

### For Share Recipient:
1. Click shared link: `https://app.com/?share=SHARE_ID`
2. Redirects to SharedDashboard
3. See only the shared folder/item
4. Based on permissions, either:
   - **Read-only:** View files, download
   - **Read-write:** Also upload, create, delete, rename
5. Navigate subfolders as needed
6. All operations confined to shared item

## URL Pattern
Shared links use the query parameter: `?share=SHARE_ID`

Example: `http://localhost:5173/?share=550e8400-e29b-41d4-a716-446655440000`

## UI/UX Features

### Layout
- Full dashboard layout preserved (topbar, main area)
- Sidebar hidden for shared view (cleaner interface)
- No navigation to other sections
- Only shows the shared content

### File Display
- Two view modes: Grid and List
- Grid: Icon + name + size/items count
- List: Icon + name + details + download button
- Selection with visual feedback
- Breadcrumb for folder navigation

### Permission Indicator
- Blue badge shows "Read & Write" or "Read Only"
- Visible in topbar
- Also shown in footer
- User always aware of access level

### Empty States
- Clear message when folder is empty
- Suggestion to drag files if write enabled
- Professional error states

### Context Menu (For future)
- Right-click operations respect permissions
- Download, Rename, Delete only if allowed
- Share and Copy disabled in shared view

## Error Handling

### Common Errors
1. **Share Not Found:** 404 - Shows "Share Unavailable" message
2. **Permission Denied:** 403 - Operation blocked with clear message
3. **Path Traversal:** 400 - Prevented by validation
4. **Network Error:** Shows user-friendly error message

### Recovery
- Refresh button to reload content
- Back button to go to home (if in own session)
- Toast notifications for all errors

## Security Considerations

1. **Path Validation:**
   - All paths validated server-side
   - No absolute paths allowed
   - No .. (parent directory) access
   - Paths must be within shared scope

2. **Permission Enforcement:**
   - Server checks permission on EVERY write operation
   - Frontend doesn't trust user - all checked server-side
   - Invalid requests rejected with 403

3. **Isolation:**
   - Users can only see/access shared item
   - No access to file system outside share
   - No ability to view other shares
   - No account/identity required

## Technical Stack

### Frontend
- React 18
- Vite (bundler)
- Stores: useUIStore (for modals, permissions)
- Material Symbols icons
- Tailwind CSS

### Backend
- Express.js
- Node.js filesystem APIs
- UUID for share IDs
- Multer for file uploads
- Archiver for ZIP downloads

### Data Storage
- `server/shares.json` - Persistent share metadata
- No database required
- UUID-based unique IDs

## Testing Checklist

- [ ] Generate share link with Read permission
- [ ] Access link in new tab
- [ ] Verify can view files but not upload
- [ ] Verify upload button is hidden
- [ ] Verify delete button is hidden
- [ ] Generate share link with Write permission
- [ ] Access link
- [ ] Verify can upload files
- [ ] Verify can create folders
- [ ] Verify can rename items
- [ ] Verify can delete items
- [ ] Download individual file
- [ ] Download entire folder as ZIP
- [ ] Navigate to subfolders
- [ ] Test breadcrumb navigation
- [ ] Toggle between grid/list views
- [ ] Test keyboard shortcuts (Ctrl+A, Delete, F2)
- [ ] Test drag-and-drop upload
- [ ] Test permission error messages
- [ ] Test expired/invalid share links
- [ ] Test on mobile (responsive layout)

## Future Enhancements

1. **Expiration Dates:** Auto-expire shares after X days
2. **Password Protection:** Add password to shares
3. **Download Limits:** Restrict number of downloads
4. **Analytics:** Track share usage
5. **Comments:** Add commenting on items
6. **Previews:** Preview documents/images inline
7. **Custom Branding:** Personalize share page
8. **Watermarking:** Add watermarks to downloads
9. **Virus Scanning:** Scan uploaded files
10. **Activity Log:** Track all actions in shared folder

## Performance Notes

- Lazy loading for large folders
- Pagination could be added for 1000+ items
- ZIP download streams for large folders
- Upload chunking for large files (future)

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Responsive layout
- IE11: Not supported

## Known Limitations

1. Search disabled in shared view (can be enabled)
2. No favorites/star functionality in shared view
3. No trash/recycle bin for shared deletes
4. Shared items cannot be shared again (no chain sharing)
5. Share creator must keep original files for link to work
