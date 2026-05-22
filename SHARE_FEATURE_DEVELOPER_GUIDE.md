# CloudDrive Lumina - Share Feature Developer Guide

## Architecture Overview

The share feature is built on a modular architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser/Frontend                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  ShareModal Component (UI)                             │ │
│  │  - Permission selection                                │ │
│  │  - Link generation display                             │ │
│  │  - Copy to clipboard                                   │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           ↕
                      API Layer
                           ↕
┌─────────────────────────────────────────────────────────────┐
│                    Server/Backend                           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Share Routes (/api/share/*)                           │ │
│  │  - POST /          (create share)                      │ │
│  │  - GET /:id        (get share info)                    │ │
│  │  - GET /list/:id   (list directory)                    │ │
│  │  - GET /raw/:id    (download file)                     │ │
│  │  - POST /upload/:id (upload files)                     │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ↕                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  ShareService (Business Logic)                         │ │
│  │  - Permission validation                               │ │
│  │  - Path traversal prevention                           │ │
│  │  - File operations                                     │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ↕                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Persistent Storage                                    │ │
│  │  - shares.json (share metadata)                        │ │
│  │  - File system (actual content)                        │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Deep Dive

### 1. Frontend: ShareModal.jsx

**Location**: `client/src/components/shared/ShareModal.jsx`

**Responsibilities**:
- Display share interface
- Handle permission selection
- Generate share links
- Copy functionality
- Error handling

**Key Functions**:
```javascript
// Auto-generates share link when permission changes
useEffect(() => {
  if (!visible || !item?.path) return;
  const generate = async () => {
    const result = await shareApi.create(item.path, permission);
    setLink(result.link);
  };
  generate();
}, [visible, item?.path, permission]);

// Copy to clipboard
const copyLink = async () => {
  await navigator.clipboard.writeText(link);
  setCopied(true);
};
```

**State Management**:
- `permission`: "read" or "write"
- `loading`: Generation in progress
- `link`: Generated share URL
- `copied`: Clipboard feedback

**UI Flow**:
1. User opens ShareModal
2. Selects read/write permission
3. Link auto-generates
4. Shows option to copy
5. User clicks copy button
6. Confirmation shown

---

### 2. API Client: shareApi.js

**Location**: `client/src/api/shareApi.js`

**Functions**:

```javascript
// Create new share
shareApi.create(path, permission)
// POST /api/share { path, permission }
// Returns: { success: true, share, link }

// Get share details
shareApi.get(id)
// GET /api/share/:id
// Returns: { success: true, share }

// List directory in share
shareApi.list(id, path = '')
// GET /api/share/list/:id?path=...
// Returns: { success: true, share, items, path }

// Upload files to share
shareApi.upload(id, path, files, onProgress)
// POST /api/share/upload/:id (FormData)
// With progress callback

// Get raw file URL
shareApi.rawUrl(id, path)
// GET /api/share/raw/:id
// Direct download URL

// Get zip download URL
shareApi.zipUrl(id, path)
// GET /api/share/download-zip/:id
// ZIP download URL
```

---

### 3. Backend: Share Routes

**Location**: `server/routes/share.js`

**Endpoints**:

#### POST /api/share - Create Share
```javascript
router.post('/', async (req, res) => {
  const { path: filePath, permission = 'read' } = req.body;
  const share = await shareService.createShare(filePath, permission);
  res.json({ success: true, share, link: publicLink(req, share.id) });
});
```

#### GET /api/share/:id - Get Share Info
```javascript
router.get('/:id', async (req, res) => {
  const share = await shareService.getShare(req.params.id);
  res.json({ success: true, share });
});
```

#### GET /api/share/raw/:id - Download File
```javascript
router.get('/raw/:id', async (req, res) => {
  const target = share.isDirectory 
    ? shareService.resolveSharedPath(share, req.query.path)
    : share.path;
  res.download(target, path.basename(target));
});
```

#### GET /api/share/list/:id - List Directory
```javascript
router.get('/list/:id', async (req, res) => {
  const result = await shareService.listSharedDirectory(
    req.params.id, 
    req.query.path || ''
  );
  res.json({ success: true, ...result });
});
```

#### POST /api/share/upload/:id - Upload Files
```javascript
router.post('/upload/:id', upload.array('files', 50), 
  async (req, res) => {
    const result = await shareService.saveUploadedFiles(
      req.params.id,
      req.body.path || '',
      req.files
    );
    res.json(result);
  }
);
```

---

### 4. Backend: ShareService

**Location**: `server/services/shareService.js`

**Core Functions**:

#### createShare(filePath, permission)
```javascript
async function createShare(filePath, permission = 'read') {
  // Validate permission
  if (!['read', 'write'].includes(permission)) {
    throw new Error('permission must be read or write');
  }
  
  // Create share record
  const share = {
    id: crypto.randomUUID(),
    path: path.resolve(filePath),
    permission,
    isDirectory: stats.isDirectory(),
    createdAt: new Date().toISOString()
  };
  
  // Persist to shares.json
  shares.unshift(share);
  saveShares(shares);
  
  return share;
}
```

#### resolveSharedPath(share, relativePath)
```javascript
function resolveSharedPath(share, relativePath = '') {
  const root = path.resolve(share.path);
  const rel = sanitizeRelativePath(relativePath);
  const target = rel ? path.resolve(root, rel) : root;
  
  // Security: Ensure target is within share root
  if (!isInside(root, target)) {
    throw new Error('Path is outside the shared scope');
  }
  
  return target;
}
```

#### assertWritable(share)
```javascript
function assertWritable(share) {
  if (share.permission !== 'write') {
    throw new Error('This share is read-only');
  }
}
```

#### sanitizeRelativePath(relativePath)
```javascript
function sanitizeRelativePath(relativePath = '') {
  const normalized = String(relativePath || '').replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  
  // Prevent path traversal
  if (parts.some(part => part === '..')) {
    throw new Error('Path traversal is not allowed');
  }
  
  return parts.join(path.sep);
}
```

---

## Security Measures

### 1. Path Traversal Prevention
```javascript
// ✅ Good - Blocked
?path=../../sensitive/file.txt

// ✅ Good - Blocked
?path=/absolute/path/file.txt

// ✅ Good - Allowed
?path=subfolder/file.txt
```

**Implementation**:
- Normalize paths using `path.resolve()`
- Check that resolved path is inside root
- Use `isInside()` utility

### 2. Permission Enforcement
```javascript
// Every write operation checks:
assertWritable(share);  // Throws if not 'write' permission
```

### 3. Input Validation
```javascript
if (!['read', 'write'].includes(permission)) {
  throw new Error('Invalid permission');
}

if (!Array.isArray(paths) || paths.length === 0) {
  throw new Error('Paths array required');
}
```

---

## Data Flow Examples

### Share Creation Flow
```
User Action: Right-click file → Share
       ↓
ShareModal opened with file data
       ↓
User selects permission (read/write)
       ↓
shareApi.create(path, permission) called
       ↓
POST /api/share → server receives
       ↓
shareService.createShare() processes
       ↓
Share record added to shares.json
       ↓
UUID generated, link returned to client
       ↓
Link displayed in modal
       ↓
User copies link
```

### Shared Access Flow
```
Recipient opens share link: ?share=<uuid>
       ↓
Frontend loads shared view component
       ↓
shareApi.get(shareId) called
       ↓
GET /api/share/<uuid> → server validates
       ↓
Share found and file exists check
       ↓
Share data returned with item metadata
       ↓
UI displays shared folder/file
       ↓
If write permission: upload/delete buttons shown
If read permission: only view/download shown
```

### File Upload Flow (Write-enabled)
```
User selects files to upload
       ↓
shareApi.upload(id, path, files, onProgress)
       ↓
FormData created with file data
       ↓
POST /api/share/upload/<uuid> with files
       ↓
Server validates share is write-enabled
       ↓
shareService.saveUploadedFiles() processes
       ↓
Files written to share path
       ↓
Success response returned
       ↓
UI refreshes file list
```

---

## Extending the Feature

### Add Time-Limited Shares

**Step 1**: Modify ShareService
```javascript
// Add expiration support
const share = {
  id: crypto.randomUUID(),
  path: normalizedPath,
  permission,
  isDirectory: stats.isDirectory(),
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + expirationMs).toISOString() // NEW
};
```

**Step 2**: Check expiration on access
```javascript
async function getShare(shareId) {
  const share = loadShares().find(item => item.id === shareId);
  
  // NEW: Check expiration
  if (share.expiresAt && new Date() > new Date(share.expiresAt)) {
    throw new Error('Share link has expired');
  }
  
  // ... rest of code
}
```

**Step 3**: Update ShareModal UI
```javascript
// Add expiration options to permission UI
<button>Never Expires</button>
<button>Expires in 1 Day</button>
<button>Expires in 1 Week</button>
<button>Custom Date</button>
```

### Add Password Protection

**Step 1**: Update share record
```javascript
const share = {
  // ... existing fields
  password: password ? hashPassword(password) : null
};
```

**Step 2**: Validate password on access
```javascript
router.post('/validate-password/:id', (req, res) => {
  const { password } = req.body;
  const share = shareService.getShare(req.params.id);
  
  if (share.password && !validatePassword(password, share.password)) {
    return res.status(403).json({ success: false, error: 'Invalid password' });
  }
  
  res.json({ success: true });
});
```

### Add Share Analytics

**Step 1**: Track access
```javascript
// In share record
{
  accessCount: 0,
  lastAccessedAt: null,
  lastAccessedBy: null  // IP or user agent
}
```

**Step 2**: Update on access
```javascript
share.accessCount++;
share.lastAccessedAt = new Date().toISOString();
share.lastAccessedBy = req.ip;
saveShares(shares);
```

**Step 3**: Display in management UI
```
Share Statistics:
- Views: 42
- Last accessed: 2 hours ago
- Size: 1.2 GB
- Type: Folder
```

---

## Database Structure

### Current (shares.json)
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "path": "C:\\Users\\User\\Documents\\Project",
    "permission": "write",
    "isDirectory": true,
    "createdAt": "2026-05-21T10:30:00.000Z"
  }
]
```

### Future: SQL Database
```sql
CREATE TABLE shares (
  id VARCHAR(36) PRIMARY KEY,
  path TEXT NOT NULL,
  permission ENUM('read', 'write') DEFAULT 'read',
  isDirectory BOOLEAN DEFAULT false,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expiresAt TIMESTAMP NULL,
  password_hash VARCHAR(255) NULL,
  access_count INT DEFAULT 0,
  last_accessed TIMESTAMP NULL,
  owner_id INT,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);
```

---

## Error Handling

### Common Errors & Responses

| Error | HTTP Status | Message |
|-------|-------------|---------|
| Share not found | 404 | "Share link not found" |
| Expired share | 404 | "Shared item no longer exists" |
| Permission denied | 403 | "This share is read-only" |
| Invalid path | 400 | "Path traversal is not allowed" |
| File too large | 413 | "Payload too large" |
| Invalid permission | 400 | "permission must be read or write" |

### Error Handling in Service
```javascript
try {
  const share = await shareService.getShare(shareId);
} catch (err) {
  if (err.status === 404) {
    return res.status(404).json({ success: false, error: err.message });
  }
  if (err.status === 403) {
    return res.status(403).json({ success: false, error: err.message });
  }
  // Generic error
  res.status(500).json({ success: false, error: 'Server error' });
}
```

---

## Testing

### Unit Tests (Recommended)
```javascript
describe('ShareService', () => {
  describe('createShare', () => {
    test('creates share with read permission', () => {
      // Test code
    });
    
    test('creates share with write permission', () => {
      // Test code
    });
    
    test('rejects invalid permission', () => {
      // Test code
    });
  });
  
  describe('resolveSharedPath', () => {
    test('prevents path traversal', () => {
      // Test code
    });
    
    test('allows valid relative paths', () => {
      // Test code
    });
  });
});
```

### Integration Tests
```javascript
describe('Share API', () => {
  test('POST /api/share creates share', async () => {
    const response = await request(app)
      .post('/api/share')
      .send({ path: '/test/folder', permission: 'read' });
    
    expect(response.status).toBe(200);
    expect(response.body.share.id).toBeDefined();
  });
});
```

---

## Performance Optimization

### Caching Strategies
```javascript
// Cache share lookups
const shareCache = new Map();

function getShare(shareId) {
  if (shareCache.has(shareId)) {
    return shareCache.get(shareId);
  }
  
  const share = loadShares().find(s => s.id === shareId);
  shareCache.set(shareId, share);
  
  return share;
}

// Invalidate cache on changes
function invalidateCache(shareId) {
  shareCache.delete(shareId);
}
```

### Batch Operations
```javascript
// Instead of individual file operations
// Use batch operations for multiple files
async function saveUploadedFiles(shareId, path, files) {
  // Process all files in single operation
  // Write to batch location, then move
}
```

---

## Deployment Considerations

### Environment Variables
```bash
SHARES_FILE=./shares.json
MAX_SHARE_SIZE=2GB
SHARE_EXPIRATION_DAYS=30
SHARE_PASSWORD_REQUIRED=false
```

### Backup Strategy
```bash
# Daily backup shares.json
0 2 * * * cp /app/shares.json /backup/shares.$(date +%Y%m%d).json
```

### Monitoring
```javascript
// Log all share operations
logger.info('Share created', { id, permission, path });
logger.info('Share accessed', { id, accessCount });
logger.warn('Permission denied', { id, attempted: 'write' });
```

---

## Version History

- **v1.0.0** (May 2026): Initial implementation
  - Basic read/write sharing
  - Permission enforcement
  - Path traversal prevention

---

**Happy coding! For questions, open an issue on GitHub.** 🚀
