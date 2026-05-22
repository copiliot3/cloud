# CloudDrive Lumina - Share Feature Guide

## Overview
CloudDrive Lumina has a **fully functional share feature** that allows you to share files and folders with others via generated links. Users can access shared content with different permission levels.

---

## Features

### 1. **Read-Only Sharing**
- Share files or folders with view-only access
- Users can:
  - View files and folder structures
  - Download files
  - Download entire folders as ZIP
  - Preview content
- Users **cannot**:
  - Modify, delete, or rename items
  - Upload new files

### 2. **Read & Write Sharing**
- Share files or folders with full edit access
- Users can:
  - View all files and folders
  - Download files and folders
  - Upload new files
  - Create new folders
  - Rename items
  - Delete items (move to trash)
  - Modify existing files

### 3. **Security Features**
- **UUID-based Links**: Each share gets a unique 36-character identifier
- **Path Traversal Prevention**: Users cannot navigate outside shared scope
- **Permission Enforcement**: Server validates permissions on every request
- **Persistent Storage**: Shares are stored in `server/shares.json`

---

## How to Use

### Share a File/Folder

1. **Navigate** to your file or folder in the application
2. **Right-click** on the item (or use context menu)
3. **Select "Share"** from the options
4. **Choose Permission Level**:
   - **Read-Only** (default): Recipients can only view
   - **Read & Write**: Recipients can modify content
5. **Click "Generate Link"** or let it auto-generate
6. **Copy Link** using the copy button or Ctrl+C
7. **Share** the link via email, chat, etc.

### Access a Shared Item

1. Receive a share link like: `http://localhost:5173/?share=<unique-id>`
2. **Open the link** in your browser
3. You'll see the shared file/folder interface
4. Access is based on the permission level set during sharing

---

## Share Link Format

```
http://localhost:5173/?share=550e8400-e29b-41d4-a716-446655440000
```

### Public Link Structure
When deployed with a domain:
```
https://yourdomain.com/?share=550e8400-e29b-41d4-a716-446655440000
```

---

## Share Information Structure

Each share stored in `server/shares.json`:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "path": "/full/path/to/file-or-folder",
  "permission": "read",
  "isDirectory": false,
  "createdAt": "2026-05-21T10:30:00.000Z"
}
```

---

## API Endpoints

### Create Share
```
POST /api/share
Body: { "path": "/path/to/item", "permission": "read" | "write" }
Response: { "success": true, "share": {...}, "link": "http://..." }
```

### Get Share Info
```
GET /api/share/:id
Response: { "success": true, "share": {...} }
```

### List Shared Directory
```
GET /api/share/list/:id?path=/optional/subpath
Response: { "success": true, "share": {...}, "items": [...], "path": "..." }
```

### Download File
```
GET /api/share/raw/:id?path=/subpath/file.txt
Downloads: File as attachment
```

### Download as ZIP
```
GET /api/share/download-zip/:id?path=/optional/subpath
Downloads: ZIP archive
```

### Upload Files (Write-enabled shares only)
```
POST /api/share/upload/:id
Body: FormData with files and optional path
Response: { "success": true, ... }
```

---

## Configuration

### Server Configuration
- **Port**: 3001 (default)
- **Share Storage**: `server/shares.json`
- **Max Upload Size**: 2GB per file
- **Max Files Per Upload**: 50 files

### Client Configuration
- **Port**: 5173 (Vite dev server)
- **API Base URL**: Auto-configured to `http://localhost:3001/api`

---

## Tips

- 📋 Share links are **permanent** as long as the source file exists
- 🔗 If you delete the original file, the share link becomes invalid
- 🔐 Share links are **not encrypted** - treat them like passwords
- 📱 Share links work on **mobile browsers** too
- 🔄 Changes made via shared write-access are **immediately visible** to the owner
- 💾 Shares persist across server restarts (stored in JSON)

---

## Troubleshooting

### Share Link Not Working
- ✅ Verify the source file/folder still exists
- ✅ Check the share ID is correct
- ✅ Ensure the server is running

### Can't Upload to Shared Folder
- ✅ Make sure it was shared with "Read & Write" permission
- ✅ Check your file size (max 2GB)
- ✅ Verify you're not uploading more than 50 files at once

### Permission Denied Error
- ✅ You tried to write to a read-only share
- ✅ You tried to delete an item you don't have write access to

---

## Best Practices

1. **Use Read-Only** for:
   - Sharing final reports or documents
   - Public resources
   - Content you don't want modified

2. **Use Read & Write** for:
   - Team collaboration folders
   - Project files being edited
   - Shared resources that need updates

3. **Share Security**:
   - Don't share sensitive data via publicly accessible URLs
   - Regenerate share links if you suspect compromise
   - Audit who has access to important shared items

---

## Environment Variables (Optional)

In `server/index.js`, you can configure:

```javascript
const PORT = process.env.PORT || 3001;
const SHARES_FILE = process.env.SHARES_FILE || 'shares.json';
```

---

## Examples

### Share a Presentation (Read-Only)
```
1. Navigate to C:/Documents/Presentation.pptx
2. Right-click → Share
3. Select "Read-Only"
4. Copy the generated link
5. Email to recipients
→ They can view and download, but cannot modify
```

### Share a Project Folder (Read & Write)
```
1. Navigate to C:/Projects/TeamProject
2. Right-click → Share
3. Select "Read & Write"
4. Copy the link
5. Share with team members
→ Team can upload new files, edit content, organize structure
```

---

## For Developers

### Adding New Share Features

The share system is modular and can be extended:

**Backend (`server/services/shareService.js`)**:
- Add new permission types
- Implement time-limited shares
- Add download count tracking
- Implement password protection

**Frontend (`client/src/components/shared/ShareModal.jsx`)**:
- Add advanced sharing options
- Implement share history
- Add analytics tracking
- Create share management dashboard

### Share Service Methods

```javascript
// Create a new share
await shareService.createShare(filePath, permission)

// Get share details
await shareService.getShare(shareId)

// List directory contents in a share
await shareService.listSharedDirectory(shareId, relativePath)

// Validate write permissions
shareService.assertWritable(share)

// Resolve path within share boundaries
shareService.resolveSharedPath(share, relativePath)
```

---

## Version Information

- **Application**: CloudDrive Lumina
- **Share Feature Version**: 1.0.0
- **Last Updated**: May 21, 2026
- **Tested Platforms**: Windows 11, Chrome, Edge
