# 🚀 Quick Start Guide - Central Approval System

## 📦 What's Included

This complete implementation includes:

### ✅ Backend API (Node.js + Express)
- ✓ 22 files ready to use
- ✓ Complete REST API implementation
- ✓ Flow Engine with business logic
- ✓ DOA (Delegation of Authority) management
- ✓ Notification service
- ✓ Authentication & validation middleware
- ✓ Unit tests with Jest

### ✅ Database
- ✓ Complete MySQL schema (9 tables)
- ✓ Migration scripts
- ✓ Sample seed data for testing

### ✅ Frontend UI
- ✓ React components with Ant Design
- ✓ API client service
- ✓ My Tasks page (pending approvals)
- ✓ Beautiful HTML mockup for preview

### ✅ Documentation
- ✓ Comprehensive README
- ✓ API documentation
- ✓ Database schema documentation
- ✓ Testing guide

---

## 🎯 5-Minute Setup

### Step 1: Database Setup (2 minutes)
```bash
# Create database
mysql -u root -p
CREATE DATABASE approval_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;

# Run migrations
cd backend
mysql -u root -p approval_system < migrations/001_create_tables.sql
mysql -u root -p approval_system < migrations/002_seed_data.sql
```

### Step 2: Backend Setup (2 minutes)
```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
nano .env  # Edit database credentials

# Start server
npm run dev
```

### Step 3: Test the API (1 minute)
```bash
# Health check
curl http://localhost:3000/health

# Get sample flows
curl http://localhost:3000/api/v1/approval/flows
```

---

## 🎨 View the UI Mockup

Open `UI_MOCKUP.html` in your browser to see:
- Pending approval dashboard
- Stats cards
- Approval queue table
- Timeline visualization
- Action buttons

---

## 📚 Example Usage

### Start an Approval Flow
```javascript
const response = await fetch('http://localhost:3000/api/v1/approval/instances', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    flow_template_id: 'FLOW_PO_STD',
    module_code: 'PURCHASE',
    document_id: 'PO-2024-001',
    document_type: 'PO',
    requester_id: 'USR001',
    document_data: {
      po_number: 'PO-2024-001',
      amount: 250000,
      vendor: 'ABC Supplier',
      items: [
        { item: 'Laptop Dell', qty: 10, price: 25000 }
      ]
    }
  })
});

const result = await response.json();
console.log(result);
// {
//   "success": true,
//   "data": {
//     "instance_id": "abc-123",
//     "status": "IN_PROGRESS",
//     "current_step": { ... }
//   }
// }
```

### Approve a Request
```javascript
await fetch('http://localhost:3000/api/v1/approval/instances/abc-123/approve', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    comments: 'Approved as requested'
  })
});
```

---

## 📂 File Structure

```
approval-system/
├── backend/
│   ├── src/
│   │   ├── controllers/        # API endpoints
│   │   ├── services/           # Business logic
│   │   ├── models/             # Database models
│   │   ├── middleware/         # Auth & validation
│   │   ├── routes/             # API routes
│   │   └── config/             # Configuration
│   ├── migrations/             # Database scripts
│   ├── tests/                  # Unit tests
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── pages/              # Page components
│   │   ├── services/           # API client
│   │   └── utils/              # Helpers
│   └── package.json
│
├── UI_MOCKUP.html              # Preview UI
└── README.md                   # Full documentation
```

---

## 🔥 Key Features

### 1. Flexible Flow Configuration
```json
{
  "steps": [
    {
      "step_order": 1,
      "step_name": "Manager Approval",
      "step_type": "SEQUENTIAL",
      "approval_type": "SINGLE",
      "timeout_hours": 24,
      "can_rollback": false
    }
  ]
}
```

### 2. DOA (Delegation of Authority)
```json
{
  "conditions": {
    "rules": [
      { "level": "MANAGER", "min_amount": 0, "max_amount": 100000 },
      { "level": "DIRECTOR", "min_amount": 500001, "max_amount": 2000000 },
      { "level": "CEO", "min_amount": 2000001, "max_amount": null }
    ]
  }
}
```

### 3. Multiple Step Types
- **Sequential**: One after another
- **Parallel**: Multiple approvers at once
- **Conditional**: Based on conditions (e.g., amount)

### 4. Rollback Support
```javascript
await approvalApi.rollback(instanceId, {
  rollback_to_step: 'STEP_PO_02',
  reason: 'Need to revise vendor information'
});
```

---

## 🧪 Sample Data Included

The seed data includes:
- ✓ 6 sample users (with different roles)
- ✓ 2 flow templates (PO and Expense)
- ✓ 1 DOA rule with 4 authority levels
- ✓ Complete flow configurations

### Sample Users
| User ID | Name | Position | Email |
|---------|------|----------|-------|
| USR001 | Alice Employee | STAFF | alice@company.com |
| USR002 | Bob Manager | MANAGER | bob@company.com |
| USR003 | Charlie Head | DEPT_HEAD | charlie@company.com |
| USR006 | Frank CEO | CEO | frank@company.com |

---

## 🎓 Next Steps

### 1. Customize Flows
Edit `002_seed_data.sql` or use the API to create your own flows

### 2. Integrate with Your Systems
```javascript
// In your Purchase Order module
const approval = await approvalApi.startApprovalFlow({
  flow_template_id: 'FLOW_PO_STD',
  module_code: 'PURCHASE',
  document_id: poId,
  document_data: poData
});
```

### 3. Setup Notifications
Configure SMTP in `.env`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### 4. Deploy to Production
- Use PM2 or Docker for backend
- Build frontend: `npm run build`
- Setup Nginx reverse proxy
- Configure SSL certificate

---

## 📞 Support

Need help?
- Read the full `README.md` for detailed documentation
- Check API examples in the documentation
- Review test cases for usage patterns

---

## 🎉 You're Ready!

Your approval system is ready to use with:
- ✅ Complete backend API
- ✅ Database schema
- ✅ Sample data
- ✅ Frontend components
- ✅ UI mockup
- ✅ Tests
- ✅ Documentation

**Start coding! 🚀**

---

Made with ❤️ for Enterprise Workflow Management

# Central Approval Management System

## 📖 Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Deployment](#deployment)

---

## 🎯 Overview

A comprehensive, centralized approval management system with configurable workflows, DOA (Delegation of Authority) management, and support for multiple modules/programs.

### Key Capabilities
- ✅ Configurable approval flows
- ✅ Central DOA management
- ✅ Support for multiple modules (Purchase, Expense, HR, etc.)
- ✅ Rollback functionality
- ✅ Delegation support
- ✅ Real-time notifications
- ✅ Complete audit trail
- ✅ RESTful API

---

## 🚀 Features

### Flow Management
- Create custom approval flows
- Support for Sequential, Parallel, and Conditional steps
- Skip conditions for dynamic routing
- Configurable timeouts and SLAs

### DOA (Delegation of Authority)
- Amount-based authority rules
- Temporary delegation
- Authority verification
- Multi-level approval support

### Approval Actions
- Approve/Reject
- Delegate to others
- Request additional information
- Rollback to previous steps
- Cancel requests

### Notifications
- Email notifications
- Real-time alerts
- Timeout warnings
- Configurable templates

---

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MySQL 8.0+
- **ORM**: mysql2 (with connection pooling)
- **Authentication**: JWT
- **Email**: Nodemailer
- **Testing**: Jest + Supertest

### Frontend
- **Framework**: React 18+
- **UI Library**: Ant Design
- **Build Tool**: Vite
- **HTTP Client**: Axios
- **Charts**: Recharts
- **Date**: Day.js

---

## 📁 Project Structure

```
approval-system/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js           # Database configuration
│   │   ├── controllers/
│   │   │   ├── ApprovalController.js # Approval endpoints
│   │   │   └── DOAController.js      # DOA endpoints
│   │   ├── models/
│   │   │   ├── FlowTemplate.js       # Flow template model
│   │   │   └── ApprovalInstance.js   # Approval instance model
│   │   ├── services/
│   │   │   ├── ApprovalService.js    # Business logic
│   │   │   ├── DOAService.js         # DOA logic
│   │   │   └── NotificationService.js # Email notifications
│   │   ├── middleware/
│   │   │   ├── auth.js               # Authentication
│   │   │   └── validation.js         # Request validation
│   │   ├── routes/
│   │   │   └── approval.routes.js    # API routes
│   │   └── index.js                  # Main server file
│   ├── migrations/
│   │   ├── 001_create_tables.sql     # Database schema
│   │   └── 002_seed_data.sql         # Sample data
│   ├── tests/
│   │   └── approval.service.test.js  # Unit tests
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ApprovalCard.jsx      # Approval item card
│   │   │   └── FlowDiagram.jsx       # Flow visualization
│   │   ├── pages/
│   │   │   ├── MyTasks.jsx           # Pending approvals
│   │   │   ├── MyRequests.jsx        # My submitted requests
│   │   │   ├── FlowManagement.jsx    # Flow configuration
│   │   │   └── DOAManagement.jsx     # DOA configuration
│   │   ├── services/
│   │   │   └── approvalApi.js        # API client
│   │   ├── utils/
│   │   │   └── helpers.js            # Utility functions
│   │   └── App.jsx                   # Main app component
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

## 💻 Installation

### Prerequisites
- Node.js 18+ and npm
- MySQL 8.0+
- Git

### Clone Repository
```bash
git clone <repository-url>
cd approval-system
```

### Backend Setup
```bash
cd backend
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Frontend Setup
```bash
cd frontend
npm install

# Create .env for frontend
echo "VITE_API_BASE_URL=http://localhost:3000/api/v1" > .env
```

---

## 🗄️ Database Setup

### 1. Create Database
```bash
mysql -u root -p
```

```sql
CREATE DATABASE approval_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'approval_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON approval_system.* TO 'approval_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 2. Run Migrations
```bash
cd backend

# Run migration 001 - Create tables
mysql -u approval_user -p approval_system < migrations/001_create_tables.sql

# Run migration 002 - Seed data
mysql -u approval_user -p approval_system < migrations/002_seed_data.sql
```

### 3. Verify Installation
```bash
mysql -u approval_user -p approval_system

# Check tables
SHOW TABLES;

# Check sample data
SELECT * FROM users;
SELECT * FROM approval_flow_templates;
```

---

## 🏃 Running the Application

### Development Mode

#### Start Backend
```bash
cd backend
npm run dev

# Server will start on http://localhost:3000
```

#### Start Frontend
```bash
cd frontend
npm run dev

# UI will be available on http://localhost:5173
```

### Production Mode

#### Build Frontend
```bash
cd frontend
npm run build

# Dist folder will be created
```

#### Start Backend
```bash
cd backend
NODE_ENV=production npm start
```

---

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication
All API requests require JWT authentication token in the header:
```
Authorization: Bearer <token>
```

### Core Endpoints

#### Start Approval Flow
```http
POST /approval/instances
Content-Type: application/json

{
  "flow_template_id": "FLOW_PO_STD",
  "module_code": "PURCHASE",
  "document_id": "PO-2024-001",
  "document_type": "PO",
  "requester_id": "USR001",
  "document_data": {
    "po_number": "PO-2024-001",
    "amount": 250000,
    "vendor": "ABC Supplier"
  }
}
```

#### Get My Pending Tasks
```http
GET /approval/my-tasks?module_code=PURCHASE&limit=50
```

#### Approve
```http
POST /approval/instances/{instanceId}/approve
Content-Type: application/json

{
  "comments": "Approved as requested"
}
```

#### Reject
```http
POST /approval/instances/{instanceId}/reject
Content-Type: application/json

{
  "comments": "Budget insufficient",
  "reject_reason": "BUDGET_INSUFFICIENT"
}
```

#### Delegate
```http
POST /approval/instances/{instanceId}/delegate
Content-Type: application/json

{
  "to_approver_id": "USR003",
  "delegation_reason": "Out of office",
  "comments": "Please review on my behalf"
}
```

#### Rollback
```http
POST /approval/instances/{instanceId}/rollback
Content-Type: application/json

{
  "rollback_to_step": "STEP_PO_02",
  "reason": "Need to revise vendor information"
}
```

### Flow Template Endpoints

#### Create Flow Template
```http
POST /approval/flows
Content-Type: application/json

{
  "flow_name": "Purchase Order - Standard",
  "module_code": "PURCHASE",
  "description": "Standard PO approval flow",
  "steps": [
    {
      "step_order": 1,
      "step_name": "Manager Approval",
      "step_type": "SEQUENTIAL",
      "approval_type": "SINGLE",
      "timeout_hours": 24,
      "approvers": [
        {
          "approver_type": "DYNAMIC",
          "approver_value": "REQUESTER_MANAGER"
        }
      ]
    }
  ]
}
```

#### Get Flow Templates
```http
GET /approval/flows?module_code=PURCHASE&is_active=true
```

### DOA Endpoints

#### Create DOA Rule
```http
POST /approval/doa/rules
Content-Type: application/json

{
  "rule_name": "Purchase Order Authority",
  "module_code": "PURCHASE",
  "document_type": "PO",
  "conditions": {
    "type": "AMOUNT_BASED",
    "rules": [
      {
        "level": "MANAGER",
        "min_amount": 0,
        "max_amount": 100000
      },
      {
        "level": "CEO",
        "min_amount": 1000001,
        "max_amount": null
      }
    ]
  }
}
```

#### Check Authority
```http
POST /approval/doa/check-authority
Content-Type: application/json

{
  "user_id": "USR002",
  "module_code": "PURCHASE",
  "document_type": "PO",
  "amount": 250000
}
```

---

## 🧪 Testing

### Run Unit Tests
```bash
cd backend
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test approval.service.test.js
```

### Test Coverage Goals
- Unit Tests: > 80%
- Integration Tests: > 70%
- E2E Tests: Critical paths

### Sample Test Results
```
PASS  tests/approval.service.test.js
  ApprovalService
    startApprovalFlow
      ✓ should start a new approval flow successfully (25ms)
      ✓ should throw error when flow template not found (10ms)
    processApproval
      ✓ should approve successfully and move to next step (30ms)
      ✓ should reject and complete the approval (15ms)
      ✓ should complete approval when no more steps (20ms)
    rollbackToStep
      ✓ should rollback to previous step successfully (18ms)
      ✓ should throw error when rollback not allowed (12ms)

Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total
```

---

## 🚢 Deployment

### Environment Variables (Production)
```env
# Production .env
NODE_ENV=production
PORT=3000

DB_HOST=prod-db-server.com
DB_PORT=3306
DB_NAME=approval_system
DB_USER=approval_prod
DB_PASSWORD=strong_password_here

JWT_SECRET=super-secret-production-key
JWT_EXPIRES_IN=24h

SMTP_HOST=smtp.company.com
SMTP_PORT=587
SMTP_USER=noreply@company.com
SMTP_PASSWORD=email_password

CORS_ORIGIN=https://approval.company.com
```

### Docker Deployment (Optional)
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "src/index.js"]
```

### Build and Run
```bash
docker build -t approval-system-backend .
docker run -d -p 3000:3000 --env-file .env approval-system-backend
```

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name approval.company.com;

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        root /var/www/approval-frontend/dist;
        try_files $uri /index.html;
    }
}
```

---

## 📊 Database Schema Summary

### Core Tables
1. **approval_flow_templates** - Flow definitions
2. **approval_flow_steps** - Flow steps configuration
3. **approval_step_approvers** - Approver assignments per step
4. **doa_rules** - DOA rules and conditions
5. **doa_assignments** - User authority assignments
6. **approval_instances** - Active approval requests
7. **approval_actions** - Approval/rejection history
8. **approval_history** - Audit trail
9. **approval_notifications** - Email queue

---

## 🎯 Usage Examples

### Example 1: Start Purchase Order Approval
```javascript
// In your Purchase Order module
const approvalApi = require('./services/approvalApi');

async function submitPurchaseOrder(poData) {
  // Create PO first
  const po = await createPO(poData);
  
  // Start approval flow
  const approval = await approvalApi.startApprovalFlow({
    flow_template_id: 'FLOW_PO_STD',
    module_code: 'PURCHASE',
    document_id: po.po_id,
    document_type: 'PO',
    requester_id: currentUser.id,
    document_data: {
      po_number: po.po_number,
      amount: po.total_amount,
      vendor: po.vendor_name,
      items: po.items
    },
    metadata: {
      priority: 'NORMAL',
      department: currentUser.department
    }
  });
  
  return approval;
}
```

### Example 2: Check User Authority
```javascript
async function checkUserCanApprove(userId, poAmount) {
  const result = await approvalApi.checkAuthority({
    user_id: userId,
    module_code: 'PURCHASE',
    document_type: 'PO',
    amount: poAmount
  });
  
  if (result.data.has_authority) {
    console.log(`User can approve up to ${result.data.max_amount}`);
    return true;
  }
  
  return false;
}
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is proprietary software. All rights reserved.

---

## 📞 Support

For support and questions:
- Email: support@company.com
- Documentation: https://docs.company.com/approval-system
- Issue Tracker: https://github.com/company/approval-system/issues

---

## 🎉 Acknowledgments

- Built with ❤️ by the Platform Team
- Thanks to all contributors and testers

---

## 📝 Changelog

### Version 1.0.0 (2024-01-17)
- ✨ Initial release
- ✅ Core approval flow engine
- ✅ DOA management
- ✅ Web UI for approvers
- ✅ Email notifications
- ✅ Complete audit trail

---

Made with ❤️ for Enterprise Approval Management

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Approval System - UI Mockup</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: #f0f2f5;
            color: #333;
        }
        
        /* Header */
        .header {
            background: #001529;
            color: white;
            padding: 0 24px;
            height: 64px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .header-logo {
            font-size: 20px;
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .header-user {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .avatar {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: #1890ff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
        }
        
        /* Container */
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 24px;
        }
        
        /* Page Title */
        .page-title {
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .page-title h1 {
            font-size: 24px;
            font-weight: 600;
        }
        
        /* Stats Cards */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }
        
        .stat-card {
            background: white;
            padding: 24px;
            border-radius: 8px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            border: 1px solid #f0f0f0;
        }
        
        .stat-label {
            color: #999;
            font-size: 14px;
            margin-bottom: 8px;
        }
        
        .stat-value {
            font-size: 32px;
            font-weight: bold;
            color: #1890ff;
        }
        
        .stat-trend {
            font-size: 12px;
            color: #52c41a;
            margin-top: 8px;
        }
        
        /* Card */
        .card {
            background: white;
            border-radius: 8px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            border: 1px solid #f0f0f0;
            margin-bottom: 24px;
        }
        
        .card-header {
            padding: 16px 24px;
            border-bottom: 1px solid #f0f0f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .card-title {
            font-size: 16px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .card-body {
            padding: 24px;
        }
        
        /* Table */
        .table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .table th {
            background: #fafafa;
            padding: 12px 16px;
            text-align: left;
            font-weight: 600;
            font-size: 14px;
            border-bottom: 2px solid #f0f0f0;
        }
        
        .table td {
            padding: 16px;
            border-bottom: 1px solid #f0f0f0;
        }
        
        .table tr:hover {
            background: #fafafa;
        }
        
        /* Badge */
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
        }
        
        .badge-success {
            background: #f6ffed;
            color: #52c41a;
            border: 1px solid #b7eb8f;
        }
        
        .badge-warning {
            background: #fffbe6;
            color: #faad14;
            border: 1px solid #ffe58f;
        }
        
        .badge-danger {
            background: #fff2f0;
            color: #ff4d4f;
            border: 1px solid #ffccc7;
        }
        
        .badge-info {
            background: #e6f7ff;
            color: #1890ff;
            border: 1px solid #91d5ff;
        }
        
        /* Button */
        .btn {
            padding: 8px 16px;
            border-radius: 6px;
            border: 1px solid #d9d9d9;
            background: white;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.3s;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }
        
        .btn:hover {
            border-color: #1890ff;
            color: #1890ff;
        }
        
        .btn-primary {
            background: #1890ff;
            color: white;
            border-color: #1890ff;
        }
        
        .btn-primary:hover {
            background: #40a9ff;
            border-color: #40a9ff;
            color: white;
        }
        
        .btn-danger {
            background: #ff4d4f;
            color: white;
            border-color: #ff4d4f;
        }
        
        .btn-danger:hover {
            background: #ff7875;
            border-color: #ff7875;
        }
        
        .btn-sm {
            padding: 4px 12px;
            font-size: 12px;
        }
        
        /* Actions */
        .actions {
            display: flex;
            gap: 8px;
        }
        
        /* Tabs */
        .tabs {
            display: flex;
            gap: 8px;
            border-bottom: 1px solid #f0f0f0;
            margin-bottom: 24px;
        }
        
        .tab {
            padding: 12px 24px;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: all 0.3s;
        }
        
        .tab:hover {
            color: #1890ff;
        }
        
        .tab.active {
            color: #1890ff;
            border-bottom-color: #1890ff;
        }
        
        /* Timeline */
        .timeline {
            position: relative;
            padding-left: 32px;
        }
        
        .timeline::before {
            content: '';
            position: absolute;
            left: 8px;
            top: 0;
            bottom: 0;
            width: 2px;
            background: #f0f0f0;
        }
        
        .timeline-item {
            position: relative;
            padding-bottom: 24px;
        }
        
        .timeline-item::before {
            content: '';
            position: absolute;
            left: -28px;
            top: 4px;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #1890ff;
            border: 2px solid white;
            box-shadow: 0 0 0 2px #1890ff;
        }
        
        .timeline-item.success::before {
            background: #52c41a;
            box-shadow: 0 0 0 2px #52c41a;
        }
        
        .timeline-item.danger::before {
            background: #ff4d4f;
            box-shadow: 0 0 0 2px #ff4d4f;
        }
        
        .timeline-content {
            background: #fafafa;
            padding: 12px;
            border-radius: 6px;
        }
        
        .timeline-title {
            font-weight: 600;
            margin-bottom: 4px;
        }
        
        .timeline-meta {
            font-size: 12px;
            color: #999;
            margin-top: 4px;
        }
        
        /* Filter Bar */
        .filter-bar {
            display: flex;
            gap: 12px;
            margin-bottom: 16px;
            flex-wrap: wrap;
        }
        
        .filter-bar select,
        .filter-bar input {
            padding: 8px 12px;
            border: 1px solid #d9d9d9;
            border-radius: 6px;
            font-size: 14px;
        }
        
        /* Empty State */
        .empty-state {
            text-align: center;
            padding: 64px 24px;
            color: #999;
        }
        
        .empty-state svg {
            width: 64px;
            height: 64px;
            margin-bottom: 16px;
            opacity: 0.5;
        }
        
        /* Responsive */
        @media (max-width: 768px) {
            .stats-grid {
                grid-template-columns: 1fr;
            }
            
            .table {
                font-size: 12px;
            }
            
            .table th,
            .table td {
                padding: 8px;
            }
        }
    </style>
</head>
<body>
    <!-- Header -->
    <div class="header">
        <div class="header-logo">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
            </svg>
            <span>Approval System</span>
        </div>
        <div class="header-user">
            <span>Bob Manager</span>
            <div class="avatar">BM</div>
        </div>
    </div>

    <!-- Main Container -->
    <div class="container">
        <!-- Page Title -->
        <div class="page-title">
            <h1>📋 My Pending Approvals</h1>
            <button class="btn btn-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                </svg>
                Refresh
            </button>
        </div>

        <!-- Stats Cards -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Total Pending</div>
                <div class="stat-value">8</div>
                <div class="stat-trend">↑ 2 from yesterday</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">This Week</div>
                <div class="stat-value">23</div>
                <div class="stat-trend">↑ 15% from last week</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Overdue</div>
                <div class="stat-value" style="color: #ff4d4f;">2</div>
                <div class="stat-trend" style="color: #ff4d4f;">Requires attention</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Avg. Response Time</div>
                <div class="stat-value" style="font-size: 24px;">4.2h</div>
                <div class="stat-trend">↓ 12% faster</div>
            </div>
        </div>

        <!-- Tabs -->
        <div class="tabs">
            <div class="tab active">All Tasks (8)</div>
            <div class="tab">Purchase Orders (5)</div>
            <div class="tab">Expenses (2)</div>
            <div class="tab">HR Requests (1)</div>
        </div>

        <!-- Main Card -->
        <div class="card">
            <div class="card-header">
                <div class="card-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                    </svg>
                    Approval Queue
                </div>
                <div class="filter-bar">
                    <select>
                        <option>All Modules</option>
                        <option>Purchase</option>
                        <option>Expense</option>
                        <option>HR</option>
                    </select>
                    <input type="text" placeholder="Search documents..." />
                </div>
            </div>
            <div class="card-body" style="padding: 0;">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Document</th>
                            <th>Requester</th>
                            <th>Amount</th>
                            <th>Current Step</th>
                            <th>Priority</th>
                            <th>Time</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>
                                <div><strong>PO-2024-001</strong></div>
                                <div style="font-size: 12px; color: #999;">PO • PURCHASE</div>
                            </td>
                            <td>Alice Employee</td>
                            <td><strong>฿250,000</strong></td>
                            <td>Manager Approval</td>
                            <td><span class="badge badge-warning">HIGH</span></td>
                            <td>
                                <div style="font-size: 12px; color: #999;">2 hours ago</div>
                                <div style="font-size: 11px; color: #52c41a;">✓ On time</div>
                            </td>
                            <td>
                                <div class="actions">
                                    <button class="btn btn-primary btn-sm" title="Approve">✓</button>
                                    <button class="btn btn-danger btn-sm" title="Reject">✕</button>
                                    <button class="btn btn-sm" title="Delegate">⇄</button>
                                    <button class="btn btn-sm" title="Details">ⓘ</button>
                                </div>
                            </td>
                        </tr>
                        <tr style="background: #fff2f0;">
                            <td>
                                <div><strong>PO-2024-002</strong></div>
                                <div style="font-size: 12px; color: #999;">PO • PURCHASE</div>
                            </td>
                            <td>John Staff</td>
                            <td><strong>฿1,200,000</strong></td>
                            <td>Manager Approval</td>
                            <td><span class="badge badge-danger">URGENT</span></td>
                            <td>
                                <div style="font-size: 12px; color: #ff4d4f;">26 hours ago</div>
                                <div style="font-size: 11px; color: #ff4d4f;">⚠ Timeout!</div>
                            </td>
                            <td>
                                <div class="actions">
                                    <button class="btn btn-primary btn-sm">✓</button>
                                    <button class="btn btn-danger btn-sm">✕</button>
                                    <button class="btn btn-sm">⇄</button>
                                    <button class="btn btn-sm">ⓘ</button>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <div><strong>EXP-2024-015</strong></div>
                                <div style="font-size: 12px; color: #999;">EXPENSE • EXPENSE</div>
                            </td>
                            <td>Sarah Sales</td>
                            <td><strong>฿8,500</strong></td>
                            <td>Manager Approval</td>
                            <td><span class="badge badge-info">NORMAL</span></td>
                            <td>
                                <div style="font-size: 12px; color: #999;">5 hours ago</div>
                                <div style="font-size: 11px; color: #52c41a;">✓ On time</div>
                            </td>
                            <td>
                                <div class="actions">
                                    <button class="btn btn-primary btn-sm">✓</button>
                                    <button class="btn btn-danger btn-sm">✕</button>
                                    <button class="btn btn-sm">⇄</button>
                                    <button class="btn btn-sm">ⓘ</button>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <div><strong>PO-2024-003</strong></div>
                                <div style="font-size: 12px; color: #999;">PO • PURCHASE</div>
                            </td>
                            <td>Mike Marketing</td>
                            <td><strong>฿75,000</strong></td>
                            <td>Manager Approval</td>
                            <td><span class="badge badge-info">NORMAL</span></td>
                            <td>
                                <div style="font-size: 12px; color: #999;">1 hour ago</div>
                                <div style="font-size: 11px; color: #52c41a;">✓ On time</div>
                            </td>
                            <td>
                                <div class="actions">
                                    <button class="btn btn-primary btn-sm">✓</button>
                                    <button class="btn btn-danger btn-sm">✕</button>
                                    <button class="btn btn-sm">⇄</button>
                                    <button class="btn btn-sm">ⓘ</button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Approval Details Card (Example) -->
        <div class="card">
            <div class="card-header">
                <div class="card-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                    </svg>
                    Approval Flow: PO-2024-001
                </div>
                <button class="btn">Close</button>
            </div>
            <div class="card-body">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px;">
                    <!-- Left: Details -->
                    <div>
                        <h3 style="margin-bottom: 16px;">Document Details</h3>
                        <table style="width: 100%;">
                            <tr>
                                <td style="padding: 8px 0; color: #999;">Document ID</td>
                                <td style="padding: 8px 0;"><strong>PO-2024-001</strong></td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #999;">Flow</td>
                                <td style="padding: 8px 0;">Purchase Order - Standard</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #999;">Current Step</td>
                                <td style="padding: 8px 0;"><span class="badge badge-warning">Manager Approval</span></td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #999;">Status</td>
                                <td style="padding: 8px 0;"><span class="badge badge-info">IN_PROGRESS</span></td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #999;">Requester</td>
                                <td style="padding: 8px 0;">Alice Employee</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #999;">Amount</td>
                                <td style="padding: 8px 0;"><strong>฿250,000</strong></td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #999;">Request Date</td>
                                <td style="padding: 8px 0;">2024-01-17 14:30</td>
                            </tr>
                        </table>
                    </div>
                    
                    <!-- Right: Timeline -->
                    <div>
                        <h3 style="margin-bottom: 16px;">Approval History</h3>
                        <div class="timeline">
                            <div class="timeline-item success">
                                <div class="timeline-content">
                                    <div class="timeline-title">Request Submitted</div>
                                    <div>Created by Alice Employee</div>
                                    <div class="timeline-meta">2024-01-17 14:30</div>
                                </div>
                            </div>
                            <div class="timeline-item" style="opacity: 0.6;">
                                <div class="timeline-content">
                                    <div class="timeline-title">Manager Approval</div>
                                    <div>Pending - Bob Manager</div>
                                    <div class="timeline-meta">Waiting...</div>
                                </div>
                            </div>
                            <div class="timeline-item" style="opacity: 0.4;">
                                <div class="timeline-content">
                                    <div class="timeline-title">Department Head Approval</div>
                                    <div>Pending - Charlie Head</div>
                                    <div class="timeline-meta">Next step</div>
                                </div>
                            </div>
                            <div class="timeline-item" style="opacity: 0.4;">
                                <div class="timeline-content">
                                    <div class="timeline-title">Finance Review</div>
                                    <div>Pending - Diana Finance</div>
                                    <div class="timeline-meta">Next step</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>

# ระบบจัดการการอนุมัติกลาง (Central Approval Management System)

## 📋 Overview
ระบบจัดการ Approval Flow แบบ Centralized ที่สามารถ Config ได้ยืดหยุ่น รองรับหลายโปรแกรม/Module และมี DOA (Delegation of Authority) กลาง

---

## 🏗️ สถาปัตยกรรมระบบ (System Architecture)

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Purchase │  │ Expense  │  │   HR     │  │  Other   │   │
│  │  System  │  │  System  │  │  System  │  │  Modules │   │
│  └─────┬────┘  └─────┬────┘  └─────┬────┘  └─────┬────┘   │
└────────┼─────────────┼─────────────┼─────────────┼─────────┘
         │             │             │             │
         └─────────────┴─────────────┴─────────────┘
                            │
         ┌──────────────────▼──────────────────┐
         │   Central Approval API Gateway      │
         └──────────────────┬──────────────────┘
                            │
    ┌───────────────────────┼───────────────────────┐
    │                       │                       │
┌───▼────┐          ┌───────▼────────┐      ┌──────▼──────┐
│ Flow   │          │   Approval     │      │    DOA      │
│ Engine │◄────────►│   Management   │◄────►│   Engine    │
└───┬────┘          └────────────────┘      └─────────────┘
    │
┌───▼─────────────────────────────────────────────────────┐
│              Database Layer                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐│
│  │  Flow    │  │ Approval │  │   DOA    │  │  Audit  ││
│  │  Config  │  │   Data   │  │  Rules   │  │   Log   ││
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘│
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Database Schema

### 1. **approval_flow_templates** - Template การอนุมัติ
```sql
CREATE TABLE approval_flow_templates (
    flow_template_id VARCHAR(50) PRIMARY KEY,
    flow_name VARCHAR(200) NOT NULL,
    module_code VARCHAR(50) NOT NULL, -- 'PURCHASE', 'EXPENSE', 'HR', etc.
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(50),
    updated_at TIMESTAMP,
    INDEX idx_module (module_code, is_active)
);

-- ตัวอย่างข้อมูล
INSERT INTO approval_flow_templates VALUES
('PO_STANDARD', 'Purchase Order - Standard Flow', 'PURCHASE', 'Flow สำหรับ PO ปกติ', TRUE, 'admin', NOW(), NULL, NULL),
('PO_URGENT', 'Purchase Order - Urgent Flow', 'PURCHASE', 'Flow สำหรับ PO เร่งด่วน', TRUE, 'admin', NOW(), NULL, NULL),
('EXP_TRAVEL', 'Travel Expense Flow', 'EXPENSE', 'Flow สำหรับค่าเดินทาง', TRUE, 'admin', NOW(), NULL, NULL);
```

### 2. **approval_flow_steps** - ขั้นตอนการอนุมัติ
```sql
CREATE TABLE approval_flow_steps (
    step_id VARCHAR(50) PRIMARY KEY,
    flow_template_id VARCHAR(50) NOT NULL,
    step_order INT NOT NULL, -- ลำดับขั้นตอน 1, 2, 3...
    step_name VARCHAR(200) NOT NULL,
    step_type VARCHAR(50) NOT NULL, -- 'SEQUENTIAL', 'PARALLEL', 'CONDITIONAL'
    approval_type VARCHAR(50), -- 'SINGLE', 'ALL', 'ANY', 'MAJORITY'
    can_reject BOOLEAN DEFAULT TRUE,
    can_delegate BOOLEAN DEFAULT TRUE,
    can_rollback BOOLEAN DEFAULT FALSE, -- สามารถถอยกลับได้หรือไม่
    timeout_hours INT, -- ระยะเวลาที่ต้องอนุมัติ (ชั่วโมง)
    is_mandatory BOOLEAN DEFAULT TRUE,
    skip_condition JSON, -- เงื่อนไขการข้าม step
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (flow_template_id) REFERENCES approval_flow_templates(flow_template_id),
    INDEX idx_flow_order (flow_template_id, step_order)
);

-- ตัวอย่างข้อมูล
INSERT INTO approval_flow_steps VALUES
('PO_STD_S1', 'PO_STANDARD', 1, 'Line Manager Approval', 'SEQUENTIAL', 'SINGLE', TRUE, TRUE, FALSE, 24, TRUE, NULL, NOW()),
('PO_STD_S2', 'PO_STANDARD', 2, 'Department Head Approval', 'SEQUENTIAL', 'SINGLE', TRUE, TRUE, TRUE, 48, TRUE, NULL, NOW()),
('PO_STD_S3', 'PO_STANDARD', 3, 'Finance Review', 'PARALLEL', 'ALL', TRUE, FALSE, FALSE, 24, TRUE, NULL, NOW()),
('PO_STD_S4', 'PO_STANDARD', 4, 'CEO Approval', 'CONDITIONAL', 'SINGLE', TRUE, FALSE, FALSE, 72, FALSE, '{"amount": ">= 1000000"}', NOW());
```

### 3. **approval_step_approvers** - ผู้อนุมัติในแต่ละ Step
```sql
CREATE TABLE approval_step_approvers (
    approver_id VARCHAR(50) PRIMARY KEY,
    step_id VARCHAR(50) NOT NULL,
    approver_type VARCHAR(50) NOT NULL, -- 'USER', 'ROLE', 'POSITION', 'DOA_RULE', 'DYNAMIC'
    approver_value VARCHAR(200), -- User ID, Role Code, Position Code, DOA Rule ID
    approver_order INT, -- ลำดับใน parallel approval
    is_required BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (step_id) REFERENCES approval_flow_steps(step_id),
    INDEX idx_step (step_id)
);

-- ตัวอย่างข้อมูล
INSERT INTO approval_step_approvers VALUES
('APP_001', 'PO_STD_S1', 'DYNAMIC', 'REQUESTER_MANAGER', 1, TRUE, NOW()),
('APP_002', 'PO_STD_S2', 'DYNAMIC', 'DEPT_HEAD', 1, TRUE, NOW()),
('APP_003', 'PO_STD_S3', 'ROLE', 'FINANCE_REVIEWER', 1, TRUE, NOW()),
('APP_004', 'PO_STD_S3', 'ROLE', 'PROCUREMENT_REVIEWER', 2, TRUE, NOW()),
('APP_005', 'PO_STD_S4', 'DOA_RULE', 'DOA_PURCHASE', 1, TRUE, NOW());
```

### 4. **doa_rules** - กฎ DOA (Delegation of Authority)
```sql
CREATE TABLE doa_rules (
    doa_rule_id VARCHAR(50) PRIMARY KEY,
    rule_name VARCHAR(200) NOT NULL,
    module_code VARCHAR(50) NOT NULL,
    document_type VARCHAR(50), -- 'PO', 'EXPENSE', 'LEAVE', etc.
    conditions JSON NOT NULL, -- เงื่อนไขการใช้งาน
    description TEXT,
    priority INT DEFAULT 0, -- ลำดับความสำคัญ (ยิ่งสูงยิ่งมีลำดับก่อน)
    is_active BOOLEAN DEFAULT TRUE,
    effective_date DATE,
    expiry_date DATE,
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(50),
    updated_at TIMESTAMP,
    INDEX idx_module_type (module_code, document_type, is_active)
);

-- ตัวอย่างข้อมูล
INSERT INTO doa_rules VALUES
('DOA_PURCHASE', 'Purchase Order DOA', 'PURCHASE', 'PO', 
 '{"rules": [
    {"position": "MANAGER", "min_amount": 0, "max_amount": 100000},
    {"position": "DEPT_HEAD", "min_amount": 100001, "max_amount": 500000},
    {"position": "DIRECTOR", "min_amount": 500001, "max_amount": 1000000},
    {"position": "CEO", "min_amount": 1000001, "max_amount": null}
  ]}', 
 'DOA สำหรับ Purchase Order ตามจำนวนเงิน', 1, TRUE, '2024-01-01', NULL, 'admin', NOW(), NULL, NULL);
```

### 5. **doa_assignments** - การมอบอำนาจ
```sql
CREATE TABLE doa_assignments (
    assignment_id VARCHAR(50) PRIMARY KEY,
    doa_rule_id VARCHAR(50) NOT NULL,
    user_id VARCHAR(50) NOT NULL, -- ผู้ที่ได้รับอำนาจ
    position_code VARCHAR(50), -- ตำแหน่ง
    department_code VARCHAR(50), -- แผนก
    min_amount DECIMAL(15,2),
    max_amount DECIMAL(15,2),
    conditions JSON, -- เงื่อนไขเพิ่มเติม
    is_active BOOLEAN DEFAULT TRUE,
    effective_date DATE NOT NULL,
    expiry_date DATE,
    delegated_from VARCHAR(50), -- มอบอำนาจจากใคร (ถ้ามี)
    delegation_reason TEXT,
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doa_rule_id) REFERENCES doa_rules(doa_rule_id),
    INDEX idx_user (user_id, is_active),
    INDEX idx_doa_rule (doa_rule_id)
);
```

### 6. **approval_instances** - Instance การอนุมัติจริง
```sql
CREATE TABLE approval_instances (
    instance_id VARCHAR(50) PRIMARY KEY,
    flow_template_id VARCHAR(50) NOT NULL,
    module_code VARCHAR(50) NOT NULL,
    document_id VARCHAR(50) NOT NULL, -- เอกสารที่ขออนุมัติ (PO_ID, EXP_ID, etc.)
    document_type VARCHAR(50) NOT NULL,
    requester_id VARCHAR(50) NOT NULL,
    request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    current_step_id VARCHAR(50),
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, APPROVED, REJECTED, CANCELLED, ROLLED_BACK
    completion_date TIMESTAMP,
    document_data JSON, -- ข้อมูลเอกสารสำหรับตัดสินใจ
    metadata JSON, -- ข้อมูลเพิ่มเติม
    FOREIGN KEY (flow_template_id) REFERENCES approval_flow_templates(flow_template_id),
    INDEX idx_document (module_code, document_id),
    INDEX idx_requester (requester_id, status),
    INDEX idx_status (status, request_date)
);
```

### 7. **approval_actions** - การดำเนินการอนุมัติ
```sql
CREATE TABLE approval_actions (
    action_id VARCHAR(50) PRIMARY KEY,
    instance_id VARCHAR(50) NOT NULL,
    step_id VARCHAR(50) NOT NULL,
    step_order INT NOT NULL,
    approver_id VARCHAR(50) NOT NULL,
    action_type VARCHAR(50) NOT NULL, -- APPROVE, REJECT, DELEGATE, ROLLBACK, REQUEST_INFO
    action_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    comments TEXT,
    delegated_to VARCHAR(50), -- ถ้ามีการมอบหมาย
    delegation_reason TEXT,
    attachments JSON,
    response_time_hours INT, -- เวลาที่ใช้ในการตอบกลับ
    ip_address VARCHAR(50),
    user_agent TEXT,
    FOREIGN KEY (instance_id) REFERENCES approval_instances(instance_id),
    INDEX idx_instance (instance_id, step_order),
    INDEX idx_approver (approver_id, action_date)
);
```

### 8. **approval_history** - ประวัติการเปลี่ยนแปลง
```sql
CREATE TABLE approval_history (
    history_id VARCHAR(50) PRIMARY KEY,
    instance_id VARCHAR(50) NOT NULL,
    from_step_id VARCHAR(50),
    to_step_id VARCHAR(50),
    from_status VARCHAR(50),
    to_status VARCHAR(50),
    changed_by VARCHAR(50) NOT NULL,
    change_reason TEXT,
    change_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSON,
    FOREIGN KEY (instance_id) REFERENCES approval_instances(instance_id),
    INDEX idx_instance (instance_id, change_date)
);
```

### 9. **approval_notifications** - การแจ้งเตือน
```sql
CREATE TABLE approval_notifications (
    notification_id VARCHAR(50) PRIMARY KEY,
    instance_id VARCHAR(50) NOT NULL,
    notification_type VARCHAR(50) NOT NULL, -- PENDING_APPROVAL, APPROVED, REJECTED, TIMEOUT_WARNING, DELEGATED
    recipient_id VARCHAR(50) NOT NULL,
    recipient_email VARCHAR(200),
    subject VARCHAR(500),
    message TEXT,
    sent_date TIMESTAMP,
    read_date TIMESTAMP,
    is_sent BOOLEAN DEFAULT FALSE,
    retry_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (instance_id) REFERENCES approval_instances(instance_id),
    INDEX idx_recipient (recipient_id, is_sent, sent_date)
);
```

---

## 🔧 API Design

### 1. Flow Management APIs

#### 1.1 สร้าง Flow Template
```http
POST /api/v1/approval/flows
Content-Type: application/json

{
  "flow_name": "Purchase Order - Standard Flow",
  "module_code": "PURCHASE",
  "description": "Flow สำหรับ PO ปกติ",
  "steps": [
    {
      "step_order": 1,
      "step_name": "Line Manager Approval",
      "step_type": "SEQUENTIAL",
      "approval_type": "SINGLE",
      "can_reject": true,
      "can_delegate": true,
      "can_rollback": false,
      "timeout_hours": 24,
      "approvers": [
        {
          "approver_type": "DYNAMIC",
          "approver_value": "REQUESTER_MANAGER"
        }
      ]
    },
    {
      "step_order": 2,
      "step_name": "Department Head Approval",
      "step_type": "SEQUENTIAL",
      "approval_type": "SINGLE",
      "can_reject": true,
      "can_delegate": true,
      "can_rollback": true,
      "timeout_hours": 48,
      "approvers": [
        {
          "approver_type": "DYNAMIC",
          "approver_value": "DEPT_HEAD"
        }
      ]
    }
  ]
}
```

#### 1.2 ดึงรายการ Flow Templates
```http
GET /api/v1/approval/flows?module_code=PURCHASE&is_active=true
```

#### 1.3 แก้ไข Flow Template
```http
PUT /api/v1/approval/flows/{flow_template_id}
```

#### 1.4 ลบ Flow Template
```http
DELETE /api/v1/approval/flows/{flow_template_id}
```

### 2. DOA Management APIs

#### 2.1 สร้าง DOA Rule
```http
POST /api/v1/approval/doa/rules
Content-Type: application/json

{
  "rule_name": "Purchase Order DOA",
  "module_code": "PURCHASE",
  "document_type": "PO",
  "conditions": {
    "rules": [
      {
        "position": "MANAGER",
        "min_amount": 0,
        "max_amount": 100000
      },
      {
        "position": "DEPT_HEAD",
        "min_amount": 100001,
        "max_amount": 500000
      },
      {
        "position": "CEO",
        "min_amount": 500001,
        "max_amount": null
      }
    ]
  },
  "priority": 1,
  "effective_date": "2024-01-01"
}
```

#### 2.2 มอบอำนาจ (Assignment)
```http
POST /api/v1/approval/doa/assignments
Content-Type: application/json

{
  "doa_rule_id": "DOA_PURCHASE",
  "user_id": "USR001",
  "position_code": "MANAGER",
  "department_code": "DEPT_IT",
  "min_amount": 0,
  "max_amount": 100000,
  "effective_date": "2024-01-01",
  "expiry_date": "2024-12-31"
}
```

#### 2.3 มอบหมายชั่วคราว (Temporary Delegation)
```http
POST /api/v1/approval/doa/delegate
Content-Type: application/json

{
  "from_user_id": "USR001",
  "to_user_id": "USR002",
  "doa_rule_id": "DOA_PURCHASE",
  "delegation_reason": "ลาพักร้อน",
  "effective_date": "2024-06-01",
  "expiry_date": "2024-06-15"
}
```

#### 2.4 ตรวจสอบอำนาจอนุมัติ
```http
POST /api/v1/approval/doa/check-authority
Content-Type: application/json

{
  "user_id": "USR001",
  "module_code": "PURCHASE",
  "document_type": "PO",
  "amount": 250000,
  "additional_conditions": {
    "department": "IT",
    "category": "SOFTWARE"
  }
}

Response:
{
  "has_authority": true,
  "doa_rule_id": "DOA_PURCHASE",
  "assignment_id": "ASSIGN_001",
  "approval_level": "DEPT_HEAD",
  "min_amount": 100001,
  "max_amount": 500000
}
```

### 3. Approval Process APIs

#### 3.1 เริ่มต้น Approval Process
```http
POST /api/v1/approval/instances
Content-Type: application/json

{
  "flow_template_id": "PO_STANDARD",
  "module_code": "PURCHASE",
  "document_id": "PO-2024-001",
  "document_type": "PO",
  "requester_id": "USR001",
  "document_data": {
    "po_number": "PO-2024-001",
    "vendor": "ABC Supplier",
    "amount": 250000,
    "items": [
      {
        "item_name": "Laptop Dell",
        "quantity": 10,
        "unit_price": 25000
      }
    ]
  },
  "metadata": {
    "priority": "NORMAL",
    "department": "IT"
  }
}

Response:
{
  "instance_id": "INST_001",
  "status": "IN_PROGRESS",
  "current_step": {
    "step_id": "PO_STD_S1",
    "step_name": "Line Manager Approval",
    "approvers": [
      {
        "user_id": "USR_MGR001",
        "user_name": "John Manager",
        "email": "john@company.com"
      }
    ],
    "timeout_date": "2024-01-19T10:00:00Z"
  }
}
```

#### 3.2 อนุมัติ
```http
POST /api/v1/approval/instances/{instance_id}/approve
Content-Type: application/json

{
  "approver_id": "USR_MGR001",
  "comments": "อนุมัติตามที่เสนอ",
  "attachments": [
    {
      "file_name": "approval_note.pdf",
      "file_url": "https://..."
    }
  ]
}
```

#### 3.3 ปฏิเสธ
```http
POST /api/v1/approval/instances/{instance_id}/reject
Content-Type: application/json

{
  "approver_id": "USR_MGR001",
  "comments": "งบประมาณไม่เพียงพอ",
  "reject_reason": "BUDGET_INSUFFICIENT"
}
```

#### 3.4 มอบหมาย (Delegate)
```http
POST /api/v1/approval/instances/{instance_id}/delegate
Content-Type: application/json

{
  "from_approver_id": "USR_MGR001",
  "to_approver_id": "USR_MGR002",
  "delegation_reason": "ติดประชุมนอกสถานที่",
  "comments": "กรุณาช่วยพิจารณาแทน"
}
```

#### 3.5 ขอข้อมูลเพิ่มเติม
```http
POST /api/v1/approval/instances/{instance_id}/request-info
Content-Type: application/json

{
  "approver_id": "USR_MGR001",
  "request_to": "USR001",
  "questions": [
    "กรุณาแนบใบเสนอราคาเปรียบเทียบเพิ่มเติม",
    "ต้องการใช้งานเมื่อไหร่"
  ]
}
```

#### 3.6 ถอยกลับ (Rollback)
```http
POST /api/v1/approval/instances/{instance_id}/rollback
Content-Type: application/json

{
  "requested_by": "USR_MGR002",
  "rollback_to_step": "PO_STD_S1",
  "reason": "พบข้อมูลไม่ถูกต้อง ต้องแก้ไข",
  "comments": "กรุณาตรวจสอบราคาใหม่"
}
```

#### 3.7 ยกเลิก
```http
POST /api/v1/approval/instances/{instance_id}/cancel
Content-Type: application/json

{
  "cancelled_by": "USR001",
  "cancel_reason": "ผู้ขายยกเลิกการเสนอราคา"
}
```

#### 3.8 ดูสถานะ
```http
GET /api/v1/approval/instances/{instance_id}

Response:
{
  "instance_id": "INST_001",
  "flow_name": "Purchase Order - Standard Flow",
  "document_id": "PO-2024-001",
  "requester": {
    "user_id": "USR001",
    "user_name": "Alice Requester"
  },
  "status": "IN_PROGRESS",
  "request_date": "2024-01-17T10:00:00Z",
  "current_step": {
    "step_id": "PO_STD_S2",
    "step_name": "Department Head Approval",
    "step_order": 2,
    "approvers": [
      {
        "user_id": "USR_HEAD001",
        "user_name": "Bob Head",
        "pending": true
      }
    ]
  },
  "completed_steps": [
    {
      "step_id": "PO_STD_S1",
      "step_name": "Line Manager Approval",
      "approver": "John Manager",
      "action": "APPROVED",
      "action_date": "2024-01-17T14:30:00Z",
      "comments": "อนุมัติตามที่เสนอ"
    }
  ],
  "pending_steps": [
    {
      "step_id": "PO_STD_S2",
      "step_name": "Department Head Approval"
    },
    {
      "step_id": "PO_STD_S3",
      "step_name": "Finance Review"
    }
  ]
}
```

#### 3.9 ดูรายการรอการอนุมัติของตัวเอง
```http
GET /api/v1/approval/my-tasks?user_id=USR_MGR001&status=PENDING

Response:
{
  "total": 5,
  "items": [
    {
      "instance_id": "INST_001",
      "module_code": "PURCHASE",
      "document_id": "PO-2024-001",
      "document_type": "PO",
      "requester_name": "Alice Requester",
      "request_date": "2024-01-17T10:00:00Z",
      "current_step_name": "Line Manager Approval",
      "amount": 250000,
      "priority": "NORMAL",
      "timeout_date": "2024-01-18T10:00:00Z",
      "time_remaining_hours": 16
    }
  ]
}
```

---

## 🎯 Flow Engine Logic

### Flow Processing Algorithm

```javascript
// Pseudo-code for Flow Engine

class ApprovalFlowEngine {
  
  async startApprovalFlow(instanceData) {
    // 1. สร้าง instance
    const instance = await this.createInstance(instanceData);
    
    // 2. หา first step
    const firstStep = await this.getFirstStep(instance.flow_template_id);
    
    // 3. resolve approvers
    const approvers = await this.resolveApprovers(
      firstStep, 
      instance.document_data,
      instance.requester_id
    );
    
    // 4. ส่ง notification
    await this.sendNotifications(instance, firstStep, approvers);
    
    // 5. update instance
    await this.updateInstance(instance.instance_id, {
      current_step_id: firstStep.step_id,
      status: 'IN_PROGRESS'
    });
    
    return instance;
  }
  
  async processApproval(instanceId, approverId, action, data) {
    // 1. validate
    const instance = await this.getInstance(instanceId);
    const currentStep = await this.getStep(instance.current_step_id);
    
    if (!this.canApprove(currentStep, approverId)) {
      throw new Error('Not authorized to approve');
    }
    
    // 2. บันทึก action
    await this.recordAction(instanceId, currentStep.step_id, approverId, action, data);
    
    // 3. ตรวจสอบว่า step นี้เสร็จหรือยัง
    const stepCompleted = await this.isStepCompleted(instance, currentStep);
    
    if (!stepCompleted) {
      return { status: 'WAITING_FOR_OTHER_APPROVERS' };
    }
    
    // 4. ถ้า step เสร็จ และเป็น REJECT
    if (action === 'REJECT') {
      await this.updateInstance(instanceId, { status: 'REJECTED' });
      await this.sendRejectionNotifications(instance, data.comments);
      return { status: 'REJECTED' };
    }
    
    // 5. หา next step
    const nextStep = await this.getNextStep(
      instance.flow_template_id, 
      currentStep.step_order,
      instance.document_data
    );
    
    // 6. ถ้าไม่มี next step = อนุมัติสมบูรณ์
    if (!nextStep) {
      await this.updateInstance(instanceId, { 
        status: 'APPROVED',
        completion_date: new Date()
      });
      await this.sendCompletionNotifications(instance);
      return { status: 'APPROVED' };
    }
    
    // 7. ถ้ามี next step = ดำเนินการต่อ
    const nextApprovers = await this.resolveApprovers(
      nextStep, 
      instance.document_data,
      instance.requester_id
    );
    
    await this.updateInstance(instanceId, {
      current_step_id: nextStep.step_id
    });
    
    await this.sendNotifications(instance, nextStep, nextApprovers);
    
    return { status: 'MOVED_TO_NEXT_STEP', next_step: nextStep };
  }
  
  async resolveApprovers(step, documentData, requesterId) {
    const approvers = [];
    
    for (const approverConfig of step.approvers) {
      switch (approverConfig.approver_type) {
        case 'USER':
          // Fixed user
          approvers.push({ user_id: approverConfig.approver_value });
          break;
          
        case 'ROLE':
          // Get users by role
          const roleUsers = await this.getUsersByRole(approverConfig.approver_value);
          approvers.push(...roleUsers);
          break;
          
        case 'POSITION':
          // Get users by position
          const posUsers = await this.getUsersByPosition(approverConfig.approver_value);
          approvers.push(...posUsers);
          break;
          
        case 'DYNAMIC':
          // Resolve dynamically
          if (approverConfig.approver_value === 'REQUESTER_MANAGER') {
            const manager = await this.getManager(requesterId);
            approvers.push({ user_id: manager.user_id });
          } else if (approverConfig.approver_value === 'DEPT_HEAD') {
            const requester = await this.getUser(requesterId);
            const deptHead = await this.getDepartmentHead(requester.department_code);
            approvers.push({ user_id: deptHead.user_id });
          }
          break;
          
        case 'DOA_RULE':
          // Resolve by DOA
          const doaApprovers = await this.resolveByDOA(
            approverConfig.approver_value,
            documentData
          );
          approvers.push(...doaApprovers);
          break;
      }
    }
    
    return approvers;
  }
  
  async resolveByDOA(doaRuleId, documentData) {
    // 1. Get DOA rule
    const rule = await this.getDOARule(doaRuleId);
    
    // 2. Extract amount
    const amount = documentData.amount || 0;
    
    // 3. Find matching assignments
    const assignments = await this.getDOAAssignments(doaRuleId);
    
    // 4. Filter by conditions
    const matchingAssignments = assignments.filter(assignment => {
      return amount >= (assignment.min_amount || 0) && 
             (assignment.max_amount === null || amount <= assignment.max_amount) &&
             assignment.is_active &&
             this.isEffective(assignment);
    });
    
    // 5. Sort by priority/hierarchy
    matchingAssignments.sort((a, b) => a.min_amount - b.min_amount);
    
    // 6. Return approvers
    return matchingAssignments.map(a => ({
      user_id: a.user_id,
      doa_level: this.getPositionLevel(a.position_code)
    }));
  }
  
  async rollbackToStep(instanceId, targetStepId, reason, requestedBy) {
    const instance = await this.getInstance(instanceId);
    const targetStep = await this.getStep(targetStepId);
    const currentStep = await this.getStep(instance.current_step_id);
    
    // 1. Validate rollback permission
    if (!currentStep.can_rollback) {
      throw new Error('Rollback not allowed for this step');
    }
    
    if (targetStep.step_order >= currentStep.step_order) {
      throw new Error('Can only rollback to previous steps');
    }
    
    // 2. Record history
    await this.recordHistory(instanceId, {
      from_step_id: currentStep.step_id,
      to_step_id: targetStep.step_id,
      from_status: instance.status,
      to_status: 'ROLLED_BACK',
      changed_by: requestedBy,
      change_reason: reason
    });
    
    // 3. Clear subsequent actions
    await this.clearActionsAfterStep(instanceId, targetStep.step_order);
    
    // 4. Update instance
    await this.updateInstance(instanceId, {
      current_step_id: targetStep.step_id,
      status: 'IN_PROGRESS'
    });
    
    // 5. Notify relevant parties
    await this.sendRollbackNotifications(instance, targetStep, reason);
    
    return { status: 'ROLLED_BACK', current_step: targetStep };
  }
}
```

---

## 📱 Integration Example

### Purchase Order Module Integration

```javascript
// PurchaseOrderService.js

class PurchaseOrderService {
  
  async createPurchaseOrder(poData, createdBy) {
    // 1. สร้าง PO
    const po = await this.savePO(poData, createdBy);
    
    // 2. กำหนด flow template
    const flowTemplateId = this.determineFlowTemplate(po);
    
    // 3. เริ่ม approval flow
    const approvalInstance = await approvalAPI.startApprovalFlow({
      flow_template_id: flowTemplateId,
      module_code: 'PURCHASE',
      document_id: po.po_id,
      document_type: 'PO',
      requester_id: createdBy,
      document_data: {
        po_number: po.po_number,
        vendor: po.vendor,
        amount: po.total_amount,
        items: po.items,
        delivery_date: po.delivery_date,
        department: po.department_code
      },
      metadata: {
        priority: po.priority,
        category: po.category
      }
    });
    
    // 4. Update PO with approval instance
    await this.updatePO(po.po_id, {
      approval_instance_id: approvalInstance.instance_id,
      approval_status: 'PENDING'
    });
    
    return { po, approvalInstance };
  }
  
  determineFlowTemplate(po) {
    // Logic to select appropriate flow
    if (po.is_urgent) {
      return 'PO_URGENT';
    } else if (po.total_amount > 1000000) {
      return 'PO_HIGH_VALUE';
    } else {
      return 'PO_STANDARD';
    }
  }
  
  async handleApprovalCallback(instanceId, status, data) {
    // Webhook/callback from approval system
    const po = await this.getPOByApprovalInstance(instanceId);
    
    switch (status) {
      case 'APPROVED':
        await this.updatePO(po.po_id, {
          approval_status: 'APPROVED',
          approved_date: new Date(),
          status: 'READY_TO_PROCESS'
        });
        await this.sendToVendor(po);
        break;
        
      case 'REJECTED':
        await this.updatePO(po.po_id, {
          approval_status: 'REJECTED',
          rejected_date: new Date(),
          rejected_reason: data.reason,
          status: 'CANCELLED'
        });
        await this.notifyRequester(po, 'REJECTED');
        break;
        
      case 'ROLLED_BACK':
        await this.updatePO(po.po_id, {
          approval_status: 'PENDING_REVISION',
          status: 'DRAFT'
        });
        await this.notifyRequester(po, 'NEEDS_REVISION');
        break;
    }
  }
}
```

---

## 🔐 Security & Authorization

### Role-Based Access Control (RBAC)

```javascript
// Permissions matrix
const PERMISSIONS = {
  'ADMIN': {
    can_create_flow: true,
    can_edit_flow: true,
    can_delete_flow: true,
    can_manage_doa: true,
    can_view_all_approvals: true,
    can_override_approval: true
  },
  'FLOW_MANAGER': {
    can_create_flow: true,
    can_edit_flow: true,
    can_delete_flow: false,
    can_manage_doa: true,
    can_view_all_approvals: true,
    can_override_approval: false
  },
  'APPROVER': {
    can_create_flow: false,
    can_edit_flow: false,
    can_delete_flow: false,
    can_manage_doa: false,
    can_view_all_approvals: false,
    can_approve: true,
    can_delegate: true
  },
  'USER': {
    can_create_request: true,
    can_view_own_requests: true,
    can_cancel_own_requests: true
  }
};
```

---

## 📊 Reports & Analytics

### สร้าง Dashboard รายงาน

```sql
-- 1. สถิติการอนุมัติตาม Module
SELECT 
    module_code,
    COUNT(*) as total_requests,
    SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) as approved,
    SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) as rejected,
    SUM(CASE WHEN status = 'PENDING' OR status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as pending,
    AVG(TIMESTAMPDIFF(HOUR, request_date, completion_date)) as avg_completion_hours
FROM approval_instances
WHERE request_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY module_code;

-- 2. Performance ของ Approver
SELECT 
    aa.approver_id,
    u.user_name,
    COUNT(*) as total_approvals,
    AVG(aa.response_time_hours) as avg_response_hours,
    SUM(CASE WHEN aa.action_type = 'APPROVE' THEN 1 ELSE 0 END) as approved_count,
    SUM(CASE WHEN aa.action_type = 'REJECT' THEN 1 ELSE 0 END) as rejected_count
FROM approval_actions aa
JOIN users u ON aa.approver_id = u.user_id
WHERE aa.action_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY aa.approver_id, u.user_name
ORDER BY avg_response_hours ASC;

-- 3. Timeout/Overdue Requests
SELECT 
    ai.instance_id,
    ai.document_id,
    ai.module_code,
    afs.step_name,
    ai.request_date,
    TIMESTAMPDIFF(HOUR, ai.request_date, NOW()) as pending_hours,
    afs.timeout_hours
FROM approval_instances ai
JOIN approval_flow_steps afs ON ai.current_step_id = afs.step_id
WHERE ai.status IN ('PENDING', 'IN_PROGRESS')
    AND TIMESTAMPDIFF(HOUR, ai.request_date, NOW()) > afs.timeout_hours;

-- 4. Bottleneck Analysis
SELECT 
    afs.step_name,
    COUNT(*) as stuck_count,
    AVG(TIMESTAMPDIFF(HOUR, ai.request_date, NOW())) as avg_wait_hours
FROM approval_instances ai
JOIN approval_flow_steps afs ON ai.current_step_id = afs.step_id
WHERE ai.status = 'IN_PROGRESS'
GROUP BY afs.step_id, afs.step_name
ORDER BY stuck_count DESC
LIMIT 10;
```

---

## 🚀 Implementation Considerations

### 1. Performance Optimization
- **Caching**: Cache flow templates, DOA rules
- **Indexing**: Index approval_instances by status, document_id
- **Async Processing**: ใช้ message queue สำหรับ notifications
- **Database Partitioning**: Partition approval_actions by date

### 2. Scalability
- **Microservices**: แยก Flow Engine, DOA Engine, Notification Service
- **Event-Driven**: ใช้ Event Bus (Kafka/RabbitMQ) สำหรับ inter-service communication
- **Horizontal Scaling**: Scale approval API servers

### 3. Monitoring & Alerting
- Track approval SLA breaches
- Monitor system performance
- Alert on stuck approvals
- Dashboard สำหรับ management

### 4. Audit Trail
- เก็บ complete history ของทุก action
- Immutable audit logs
- Compliance reporting

---

## 📦 Technology Stack Recommendations

### Backend
- **API**: Node.js (Express/NestJS) หรือ Java (Spring Boot)
- **Database**: PostgreSQL หรือ MySQL
- **Cache**: Redis
- **Message Queue**: RabbitMQ หรือ Kafka
- **Search**: Elasticsearch (สำหรับ advanced search)

### Frontend
- **Framework**: React หรือ Vue.js
- **UI Library**: Ant Design, Material-UI
- **State Management**: Redux หรือ Zustand
- **Charts**: Chart.js, Recharts

### DevOps
- **Container**: Docker
- **Orchestration**: Kubernetes
- **CI/CD**: GitLab CI หรือ Jenkins
- **Monitoring**: Prometheus + Grafana

---

## 📝 Configuration Examples

### Flow Configuration (JSON)
```json
{
  "flow_template_id": "PO_STANDARD",
  "flow_name": "Purchase Order - Standard Flow",
  "module_code": "PURCHASE",
  "steps": [
    {
      "step_order": 1,
      "step_name": "Line Manager Approval",
      "step_type": "SEQUENTIAL",
      "approval_type": "SINGLE",
      "can_reject": true,
      "can_delegate": true,
      "can_rollback": false,
      "timeout_hours": 24,
      "approvers": [
        {
          "approver_type": "DYNAMIC",
          "approver_value": "REQUESTER_MANAGER",
          "approver_order": 1
        }
      ]
    },
    {
      "step_order": 2,
      "step_name": "Finance & Procurement Review",
      "step_type": "PARALLEL",
      "approval_type": "ALL",
      "can_reject": true,
      "can_delegate": false,
      "can_rollback": true,
      "timeout_hours": 48,
      "approvers": [
        {
          "approver_type": "ROLE",
          "approver_value": "FINANCE_REVIEWER",
          "approver_order": 1
        },
        {
          "approver_type": "ROLE",
          "approver_value": "PROCUREMENT_REVIEWER",
          "approver_order": 2
        }
      ]
    },
    {
      "step_order": 3,
      "step_name": "Executive Approval",
      "step_type": "CONDITIONAL",
      "approval_type": "SINGLE",
      "can_reject": true,
      "can_delegate": false,
      "can_rollback": false,
      "timeout_hours": 72,
      "is_mandatory": false,
      "skip_condition": {
        "field": "amount",
        "operator": "<",
        "value": 1000000
      },
      "approvers": [
        {
          "approver_type": "DOA_RULE",
          "approver_value": "DOA_EXECUTIVE",
          "approver_order": 1
        }
      ]
    }
  ]
}
```

### DOA Configuration (JSON)
```json
{
  "doa_rule_id": "DOA_PURCHASE",
  "rule_name": "Purchase Order DOA",
  "module_code": "PURCHASE",
  "document_type": "PO",
  "priority": 1,
  "conditions": {
    "type": "AMOUNT_BASED",
    "rules": [
      {
        "level": "MANAGER",
        "position_codes": ["MGR", "TEAM_LEAD"],
        "min_amount": 0,
        "max_amount": 100000,
        "additional_conditions": {
          "department": ["IT", "MARKETING"],
          "category": ["SUPPLIES", "SOFTWARE"]
        }
      },
      {
        "level": "DEPT_HEAD",
        "position_codes": ["DEPT_HEAD", "AVP"],
        "min_amount": 100001,
        "max_amount": 500000,
        "additional_conditions": {}
      },
      {
        "level": "DIRECTOR",
        "position_codes": ["DIRECTOR", "VP"],
        "min_amount": 500001,
        "max_amount": 2000000,
        "additional_conditions": {}
      },
      {
        "level": "CEO",
        "position_codes": ["CEO", "PRESIDENT"],
        "min_amount": 2000001,
        "max_amount": null,
        "additional_conditions": {}
      }
    ]
  }
}
```

---

## 🎓 Best Practices

### 1. Flow Design
✅ ออกแบบ flow ให้ชัดเจน เข้าใจง่าย
✅ มี parallel approval เมื่อเป็นไปได้เพื่อเร่งความเร็ว
✅ กำหนด timeout ที่เหมาะสม
✅ มี escalation mechanism
✅ Support conditional steps

### 2. DOA Management
✅ Review DOA rules เป็นประจำ
✅ มี audit trail สำหรับการเปลี่ยนแปลง DOA
✅ Support temporary delegation
✅ มี expiry date สำหรับ assignments

### 3. User Experience
✅ Notification ที่ชัดเจน มีข้อมูลครบถ้วน
✅ Mobile-friendly interface
✅ Quick action buttons (Approve/Reject ได้เร็ว)
✅ Show progress visualization
✅ Easy document access

### 4. System Integration
✅ Webhook/Callback mechanism
✅ RESTful API design
✅ Event-driven architecture
✅ Error handling & retry mechanism
✅ API versioning

---

## 📞 Support & Maintenance

### Monitoring Checklist
- [ ] SLA compliance (approval response time)
- [ ] System uptime
- [ ] API response time
- [ ] Database performance
- [ ] Queue depth
- [ ] Notification delivery rate
- [ ] Error rate & types

### Regular Maintenance
- [ ] Archive old approval instances
- [ ] Clean up expired delegations
- [ ] Review & optimize slow queries
- [ ] Update flow templates as needed
- [ ] Audit security & access logs

---

## 🎉 Summary

ระบบนี้ให้ความสามารถ:
✅ **Centralized** - จัดการ approval flow ทั้งหมดในที่เดียว
✅ **Configurable** - Config flow ได้ง่าย ไม่ต้อง hard-code
✅ **Flexible** - รองรับหลาย module/program
✅ **DOA Support** - มีระบบ DOA กลางที่ยืดหยุ่น
✅ **Rollback** - สามารถถอยกลับได้เมื่อต้องการ
✅ **Scalable** - ขยายได้ตามความต้องการ
✅ **Auditable** - มี audit trail ครบถ้วน

พร้อมใช้งานได้ทันทีและปรับแต่งได้ตามความต้องการ! 🚀

# 🚀 Quick Start Guide - Central Approval System

## 📦 What's Included

This complete implementation includes:

### ✅ Backend API (Node.js + Express)
- ✓ 22 files ready to use
- ✓ Complete REST API implementation
- ✓ Flow Engine with business logic
- ✓ DOA (Delegation of Authority) management
- ✓ Notification service
- ✓ Authentication & validation middleware
- ✓ Unit tests with Jest

### ✅ Database
- ✓ Complete MySQL schema (9 tables)
- ✓ Migration scripts
- ✓ Sample seed data for testing

### ✅ Frontend UI
- ✓ React components with Ant Design
- ✓ API client service
- ✓ My Tasks page (pending approvals)
- ✓ Beautiful HTML mockup for preview

### ✅ Documentation
- ✓ Comprehensive README
- ✓ API documentation
- ✓ Database schema documentation
- ✓ Testing guide

---

## 🎯 5-Minute Setup

### Step 1: Database Setup (2 minutes)
```bash
# Create database
mysql -u root -p
CREATE DATABASE approval_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;

# Run migrations
cd backend
mysql -u root -p approval_system < migrations/001_create_tables.sql
mysql -u root -p approval_system < migrations/002_seed_data.sql
```

### Step 2: Backend Setup (2 minutes)
```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
nano .env  # Edit database credentials

# Start server
npm run dev
```

### Step 3: Test the API (1 minute)
```bash
# Health check
curl http://localhost:3000/health

# Get sample flows
curl http://localhost:3000/api/v1/approval/flows
```

---

## 🎨 View the UI Mockup

Open `UI_MOCKUP.html` in your browser to see:
- Pending approval dashboard
- Stats cards
- Approval queue table
- Timeline visualization
- Action buttons

---

## 📚 Example Usage

### Start an Approval Flow
```javascript
const response = await fetch('http://localhost:3000/api/v1/approval/instances', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    flow_template_id: 'FLOW_PO_STD',
    module_code: 'PURCHASE',
    document_id: 'PO-2024-001',
    document_type: 'PO',
    requester_id: 'USR001',
    document_data: {
      po_number: 'PO-2024-001',
      amount: 250000,
      vendor: 'ABC Supplier',
      items: [
        { item: 'Laptop Dell', qty: 10, price: 25000 }
      ]
    }
  })
});

const result = await response.json();
console.log(result);
// {
//   "success": true,
//   "data": {
//     "instance_id": "abc-123",
//     "status": "IN_PROGRESS",
//     "current_step": { ... }
//   }
// }
```

### Approve a Request
```javascript
await fetch('http://localhost:3000/api/v1/approval/instances/abc-123/approve', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    comments: 'Approved as requested'
  })
});
```

---

## 📂 File Structure

```
approval-system/
├── backend/
│   ├── src/
│   │   ├── controllers/        # API endpoints
│   │   ├── services/           # Business logic
│   │   ├── models/             # Database models
│   │   ├── middleware/         # Auth & validation
│   │   ├── routes/             # API routes
│   │   └── config/             # Configuration
│   ├── migrations/             # Database scripts
│   ├── tests/                  # Unit tests
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── pages/              # Page components
│   │   ├── services/           # API client
│   │   └── utils/              # Helpers
│   └── package.json
│
├── UI_MOCKUP.html              # Preview UI
└── README.md                   # Full documentation
```

---

## 🔥 Key Features

### 1. Flexible Flow Configuration
```json
{
  "steps": [
    {
      "step_order": 1,
      "step_name": "Manager Approval",
      "step_type": "SEQUENTIAL",
      "approval_type": "SINGLE",
      "timeout_hours": 24,
      "can_rollback": false
    }
  ]
}
```

### 2. DOA (Delegation of Authority)
```json
{
  "conditions": {
    "rules": [
      { "level": "MANAGER", "min_amount": 0, "max_amount": 100000 },
      { "level": "DIRECTOR", "min_amount": 500001, "max_amount": 2000000 },
      { "level": "CEO", "min_amount": 2000001, "max_amount": null }
    ]
  }
}
```

### 3. Multiple Step Types
- **Sequential**: One after another
- **Parallel**: Multiple approvers at once
- **Conditional**: Based on conditions (e.g., amount)

### 4. Rollback Support
```javascript
await approvalApi.rollback(instanceId, {
  rollback_to_step: 'STEP_PO_02',
  reason: 'Need to revise vendor information'
});
```

---

## 🧪 Sample Data Included

The seed data includes:
- ✓ 6 sample users (with different roles)
- ✓ 2 flow templates (PO and Expense)
- ✓ 1 DOA rule with 4 authority levels
- ✓ Complete flow configurations

### Sample Users
| User ID | Name | Position | Email |
|---------|------|----------|-------|
| USR001 | Alice Employee | STAFF | alice@company.com |
| USR002 | Bob Manager | MANAGER | bob@company.com |
| USR003 | Charlie Head | DEPT_HEAD | charlie@company.com |
| USR006 | Frank CEO | CEO | frank@company.com |

---

## 🎓 Next Steps

### 1. Customize Flows
Edit `002_seed_data.sql` or use the API to create your own flows

### 2. Integrate with Your Systems
```javascript
// In your Purchase Order module
const approval = await approvalApi.startApprovalFlow({
  flow_template_id: 'FLOW_PO_STD',
  module_code: 'PURCHASE',
  document_id: poId,
  document_data: poData
});
```

### 3. Setup Notifications
Configure SMTP in `.env`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### 4. Deploy to Production
- Use PM2 or Docker for backend
- Build frontend: `npm run build`
- Setup Nginx reverse proxy
- Configure SSL certificate

---

## 📞 Support

Need help?
- Read the full `README.md` for detailed documentation
- Check API examples in the documentation
- Review test cases for usage patterns

---

## 🎉 You're Ready!

Your approval system is ready to use with:
- ✅ Complete backend API
- ✅ Database schema
- ✅ Sample data
- ✅ Frontend components
- ✅ UI mockup
- ✅ Tests
- ✅ Documentation

**Start coding! 🚀**

---

Made with ❤️ for Enterprise Workflow Management