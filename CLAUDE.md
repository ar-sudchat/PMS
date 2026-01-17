# PMS Project Rules for Claude

## File Operations - MANDATORY

**ทุกการดำเนินการเกี่ยวกับไฟล์ต้องใช้ `file-service.ts` เท่านั้น**

Location: `/lib/services/file-service.ts`

### Available Functions:

| Function | Description |
|----------|-------------|
| `uploadFile(fileData, originalName, subFolder?)` | Upload file to storage |
| `readFile(filePath)` | Read file content |
| `deleteFile(filePath)` | Delete file |
| `fileExists(filePath)` | Check if file exists |
| `getFileInfo(filePath)` | Get file metadata |
| `listFiles(subFolder?)` | List files in directory |
| `copyFile(sourcePath, destPath)` | Copy file |
| `moveFile(sourcePath, destPath)` | Move/rename file |
| `createDirectory(dirPath)` | Create directory |
| `deleteDirectory(dirPath, recursive?)` | Delete directory |
| `getFileAsBase64(filePath)` | Get file as base64 |
| `getFileDataUrl(filePath)` | Get file as data URL |

### Utility Functions:

| Function | Description |
|----------|-------------|
| `formatFileSize(bytes)` | Format bytes to human readable |
| `isAllowedExtension(filename, extensions[])` | Validate file extension |
| `isAllowedSize(size, maxSizeInMB)` | Validate file size |

### Usage Example:

```typescript
import {
    uploadFile,
    readFile,
    deleteFile,
    formatFileSize
} from '@/lib/services/file-service'

// Upload
const result = await uploadFile(buffer, 'document.pdf', 'projects')

// Read
const fileResult = await readFile('projects/document.pdf')

// Delete
const deleteResult = await deleteFile('projects/document.pdf')
```

### Rules:

1. **NEVER** use `fs` module directly for file operations in components or actions
2. **ALWAYS** import from `@/lib/services/file-service`
3. **ALWAYS** add new file-related functions to `file-service.ts` if needed
4. File paths support tilde (~) expansion for Mac/Linux
5. All functions include authentication check via `getCurrentUser()`
6. Storage path is configurable via Settings page

---

## File Storage Configuration

Location: `/lib/actions/config-actions.ts`

- `getFileStorageConfig()` - Get current storage config
- `updateFileStorageConfig()` - Update storage paths
- `testFileStorageConnection(path)` - Test path connectivity

Storage paths are configured in Settings > File Storage Settings tab.

---

## Project Structure

- `/lib/services/` - Central service functions
- `/lib/actions/` - Server actions
- `/components/` - React components
- `/app/(main)/` - Main app pages

---

## Language

- UI text: Thai (ภาษาไทย)
- Code comments: English
- Variable names: English
