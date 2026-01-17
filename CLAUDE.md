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

## Notification System - MANDATORY

**ทุกการแจ้งเตือน (Email, MS Teams, In-App) ต้องใช้ `notification-service.ts` เท่านั้น**

Location: `/lib/services/notification-service.ts`

### Main Functions:

| Function | Description |
|----------|-------------|
| `sendNotification(payload)` | Send via any channel (EMAIL, MS_TEAMS, IN_APP, ALL) |
| `sendEmail(payload)` | Send email only |
| `sendTeamsMessage(payload)` | Send MS Teams message |
| `createInAppNotification(userId, type, id, message)` | Create in-app notification |

### Template Functions (Pre-built):

| Function | Description |
|----------|-------------|
| `sendApprovalNotification(data)` | Notify approver about pending approval |
| `sendApprovalResultNotification(data)` | Notify requester about approval result |
| `sendTaskAssignmentNotification(data)` | Notify assignee about new task |

### Test Functions:

| Function | Description |
|----------|-------------|
| `testEmailConnection()` | Test SMTP connection |
| `testTeamsWebhook(url?)` | Test MS Teams webhook |

### Usage Example:

```typescript
import {
    sendNotification,
    sendApprovalNotification,
    sendTaskAssignmentNotification
} from '@/lib/services/notification-service'

// Generic notification
await sendNotification({
    subject: 'Test Subject',
    body: 'Test message',
    channel: 'ALL', // or 'EMAIL', 'MS_TEAMS', 'IN_APP'
    recipients: [
        { email: 'user@example.com', name: 'User Name', userId: 'xxx' }
    ],
    priority: 'HIGH'
})

// Approval notification (pre-built template)
await sendApprovalNotification({
    approverEmail: 'approver@example.com',
    approverName: 'Approver Name',
    documentType: 'Purchase Order',
    documentId: 'PO-001',
    documentTitle: 'Office Supplies',
    requesterName: 'Requester Name'
})
```

### Rules:

1. **NEVER** send emails or webhooks directly - always use notification-service
2. **ALWAYS** add new notification templates to `notification-service.ts`
3. Configuration is stored in `pms.system_configs` table
4. Run `scripts/07_create_notification_tables.sql` to setup tables

### Configuration Keys:

- `EMAIL_SMTP_HOST`, `EMAIL_SMTP_PORT`, `EMAIL_SMTP_USER`, etc.
- `MS_TEAMS_WEBHOOK_URL`
- `NOTIFICATION_EMAIL_ENABLED`, `NOTIFICATION_TEAMS_ENABLED`

---

## Approval System - Central Service

**ระบบอนุมัติทั้งหมดต้องใช้ `approval-service.ts` และ `approval-actions.ts`**

Location:
- `/lib/services/approval-service.ts` - Core approval flow engine
- `/lib/actions/approval-actions.ts` - Server actions for API
- `/lib/actions/doa-actions.ts` - DOA (Delegation of Authority) management

### Main Functions (approval-actions.ts):

| Function | Description |
|----------|-------------|
| `submitForApproval(input)` | Start new approval flow |
| `approveRequest(instanceId, comments?)` | Approve pending request |
| `rejectRequest(instanceId, comments?)` | Reject pending request |
| `delegateApproval(instanceId, delegatedTo, reason?)` | Delegate to another user |
| `rollbackApproval(instanceId, reason?)` | Rollback to previous step |
| `cancelApproval(instanceId, reason?)` | Cancel approval request |

### Query Functions:

| Function | Description |
|----------|-------------|
| `fetchMyPendingApprovals(moduleCode?)` | Get user's pending approvals |
| `fetchApprovalInstance(instanceId)` | Get approval instance details |
| `fetchDocumentApprovalStatus(documentId, moduleCode)` | Check approval status |
| `fetchMySubmittedApprovals(moduleCode?, status?)` | Get my submitted requests |
| `fetchApprovalHistory(documentId, moduleCode)` | Get approval history |
| `fetchApprovalStats()` | Get dashboard statistics |

### Flow Template Management:

| Function | Description |
|----------|-------------|
| `fetchFlowTemplates(moduleCode?)` | Get all flow templates |
| `fetchFlowTemplateWithSteps(flowCode)` | Get template with steps |
| `createFlowTemplate(data)` | Create new template |
| `updateFlowTemplate(id, data)` | Update template |
| `addFlowStep(data)` | Add step to template |
| `addStepApprover(data)` | Add approver to step |

### DOA Functions (doa-actions.ts):

| Function | Description |
|----------|-------------|
| `fetchDOARules(moduleCode?)` | Get DOA rules |
| `createDOARule(data)` | Create DOA rule |
| `fetchDOAAssignments(ruleId?, userId?)` | Get assignments |
| `fetchMyDOAAssignments()` | Get my authority |
| `createDOAAssignment(data)` | Assign DOA to user |
| `delegateMyAuthority(data)` | Delegate my authority |
| `checkUserAuthority(userId, moduleCode, docType, amount?)` | Check user authority |
| `findDOAApprover(moduleCode, docType, amount)` | Find approver by DOA |

### Usage Example:

```typescript
import {
    submitForApproval,
    approveRequest,
    fetchMyPendingApprovals
} from '@/lib/actions/approval-actions'

// Submit document for approval
const result = await submitForApproval({
    flow_code: 'PROJECT_CHARTER',
    module_code: 'PROJECT',
    document_id: 'proj-123',
    document_type: 'PROJECT_CHARTER',
    document_title: 'New Project XYZ',
    document_data: { budget: 500000 },
    priority: 'HIGH'
})

// Approve
const approveResult = await approveRequest(instanceId, 'Approved')

// Get pending approvals
const pending = await fetchMyPendingApprovals('PROJECT')
```

### Approval Flow Types:

| Type | Description |
|------|-------------|
| `SEQUENTIAL` | Step-by-step approval |
| `PARALLEL` | Multiple approvers at same time |
| `CONDITIONAL` | Skip based on conditions |

### Approval Types:

| Type | Description |
|------|-------------|
| `SINGLE` | One approver is enough |
| `ALL` | All must approve |
| `ANY` | Any one can approve |
| `MAJORITY` | >50% must approve |

### Approver Types:

| Type | Description |
|------|-------------|
| `USER` | Fixed user ID |
| `ROLE` | Users with specific role |
| `POSITION` | Users with position code |
| `DOA_RULE` | Resolve by DOA rule |
| `DYNAMIC` | Dynamic resolution (REQUESTER_MANAGER, DEPT_HEAD, PROJECT_MANAGER) |

### Rules:

1. **ALWAYS** use `approval-actions.ts` for approval operations
2. **NEVER** insert directly to approval tables - use the service
3. Run `scripts/08_create_approval_system_tables.sql` to setup tables
4. Flow templates are configured via code or admin UI
5. DOA rules define who can approve based on amount/hierarchy
6. Notifications are sent automatically via `notification-service`

### Database Tables:

- `pms.approval_flow_templates` - Flow definitions
- `pms.approval_flow_steps` - Step configurations
- `pms.approval_step_approvers` - Approver assignments
- `pms.doa_rules` - DOA rules
- `pms.doa_assignments` - Authority assignments
- `pms.approval_instances` - Active approval requests
- `pms.approval_instance_approvers` - Resolved approvers
- `pms.approval_actions` - Action history
- `pms.approval_history` - Status change audit

---

## Project Structure

- `/lib/services/` - Central service functions (file-service, notification-service, approval-service)
- `/lib/actions/` - Server actions (approval-actions, doa-actions, etc.)
- `/components/` - React components
- `/app/(main)/` - Main app pages
- `/scripts/` - SQL migration scripts

---

## Language

- UI text: Thai (ภาษาไทย)
- Code comments: English
- Variable names: English
