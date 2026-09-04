# Expense Voucher Management System

Full Stack Developer Internship Assignment — Prachay Securities Private Limited (PSPL)

Digitizes ABC Company's paper-based expense voucher process: employees create and submit
vouchers, the Director approves or rejects them, and the Accounts Team tracks everything
for reimbursement. Three roles, one REST API, one React SPA.

## Tech Stack

| Layer    | Technology |
|----------|------------|
| Frontend | React 18 (Vite), React Router v6, Axios, plain CSS |
| Backend  | Node.js, Express.js |
| ORM      | Sequelize |
| Database | PostgreSQL |
| Auth     | JWT (`jsonwebtoken`) + `bcryptjs` password hashing |
| Uploads  | Multer, disk storage |

## Project Structure

```
expense-voucher-system/
├── backend/
│   ├── config/db.js            Sequelize connection (dialect from .env)
│   ├── models/                 User, Voucher (+ associations)
│   ├── middleware/              auth.js (JWT + role guard), upload.js (Multer)
│   ├── controllers/             authController, voucherController, dashboardController
│   ├── routes/                  authRoutes, voucherRoutes, dashboardRoutes
│   ├── utils/                    generateVoucherNumber.js, seed.js
│   ├── uploads/signatures/      uploaded signature images
│   ├── app.js / server.js
│   └── .env.example
└── frontend/
    └── src/
        ├── api/axios.js         JWT-attaching Axios instance, 401 auto-logout
        ├── context/AuthContext.jsx
        ├── components/          ProtectedRoute, Layout, StatusBadge, VoucherList
        ├── pages/
        │   ├── Login.jsx, DashboardRouter.jsx
        │   ├── employee/        EmployeeDashboard, VoucherForm (create+edit), MyVouchers
        │   ├── director/        DirectorDashboard, PendingApprovals
        │   ├── accounts/        AccountsDashboard
        │   └── shared/          AllVouchers, VoucherDetails (role-aware actions)
        └── App.jsx / main.jsx / index.css
```

## Voucher Workflow

```
DRAFT --(employee submits, signature required)--> PENDING_APPROVAL
                                                          |
                              +---------------------------+---------------------------+
                              |                                                       |
                    Director approves                                       Director rejects
                 (director signature required)                          (rejection reason required)
                              |                                                       |
                              v                                                       v
                          APPROVED                                               REJECTED
                     (permanently read-only,                                (employee sees reason,
                      visible to Accounts)                                    read-only)
```

Employees may edit/delete only their own **Draft** vouchers. Once submitted, a voucher is
read-only for the employee. Only the Director can approve/reject, and only from
`PENDING_APPROVAL`. Approved/Rejected vouchers have no further transitions.

## Database Schema

### `users`

| Column     | Type                                    | Notes |
|------------|-------------------------------------------|-------|
| id         | INTEGER PK                                 | |
| name       | STRING NOT NULL                            | |
| email      | STRING NOT NULL UNIQUE                     | login identifier |
| password   | STRING NOT NULL                            | bcrypt hash, 10 rounds |
| role       | ENUM('EMPLOYEE','DIRECTOR','ACCOUNTS')      | default `EMPLOYEE` |
| employeeId | STRING nullable                            | optional HR code |
| department | STRING nullable                            | |
| createdAt / updatedAt | DATE (auto)                     | |

### `vouchers`

| Column             | Type                                                       | Notes |
|--------------------|---------------------------------------------------------------|-------|
| id                 | INTEGER PK                                                     | |
| voucherNumber      | STRING UNIQUE                                                   | auto-generated `EV-<year>-<00001>` |
| voucherDate        | DATEONLY                                                        | set at creation |
| expenseDate        | DATEONLY NOT NULL                                               | mandatory |
| departmentName     | STRING NOT NULL                                                  | mandatory |
| expenseTitle       | STRING NOT NULL                                                  | mandatory |
| expenseCategory    | STRING nullable                                                 | |
| expenseDescription | TEXT nullable                                                   | |
| amount             | DECIMAL(12,2) NOT NULL, > 0                                      | mandatory, must be > 0 |
| employeeUserId     | INTEGER FK -> users.id                                          | voucher owner |
| employeeName       | STRING NOT NULL                                                  | snapshotted at creation |
| employeeIdCode     | STRING nullable                                                 | optional |
| employeeSignature  | STRING (filename) nullable                                       | mandatory before submission |
| status             | ENUM('DRAFT','PENDING_APPROVAL','APPROVED','REJECTED')           | default `DRAFT` |
| directorSignature  | STRING (filename) nullable                                       | mandatory before approval |
| approvalDate       | DATE nullable                                                    | set on approve/reject |
| rejectionReason    | TEXT nullable                                                    | mandatory if rejected |
| approvedByUserId   | INTEGER FK -> users.id, nullable                                 | which Director actioned it |
| createdAt / updatedAt | DATE (auto)                                                  | audit trail |

**Associations:**
```js
Voucher.belongsTo(User, { as: 'employee', foreignKey: 'employeeUserId' });
Voucher.belongsTo(User, { as: 'approver', foreignKey: 'approvedByUserId' });
```

Tables are created automatically by `sequelize.sync()` on server start — no manual
migration step or SQL to run by hand, for any of the three supported dialects.

## Environment Variables

### `backend/.env` (see `backend/.env.example`)

| Variable | Example | Description |
|----------|---------|--------------|
| PORT | 5000 | API server port |
| DB_NAME | expense_voucher_db | PostgreSQL database name |
| DB_USER | postgres | |
| DB_PASSWORD | postgres | |
| DB_HOST | localhost | |
| DB_PORT | 5432 | |
| JWT_SECRET | (long random string) | sign/verify tokens |
| JWT_EXPIRES_IN | 1d | token lifetime |
| CLIENT_URL | http://localhost:5173 | CORS origin |

### `frontend/.env` (see `frontend/.env.example`)

| Variable | Example | Description |
|----------|---------|--------------|
| VITE_API_URL | http://localhost:5000/api | backend base URL |

## Setup & Run

### Prerequisites
- Node.js 18+
- PostgreSQL 13+ running locally (or a connection string to a hosted instance)

### Backend
```bash
cd backend
cp .env.example .env
# edit .env if your Postgres user/password/port differ from the defaults

createdb -U postgres expense_voucher_db   # or: psql -U postgres -c "CREATE DATABASE expense_voucher_db;"

npm install
npm run seed                # creates 3 demo users
npm run dev                 # http://localhost:5000
```
`server.js` calls `sequelize.sync()` on startup, which creates the `users` and `vouchers`
tables automatically — no manual migration step needed.

### Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev                 # http://localhost:5173
```

Verify: `GET http://localhost:5000/api/health` → `{"status":"ok"}`. Then open
`http://localhost:5173` and log in with a demo account.

## Demo Accounts

Created by `npm run seed` (password for all: `Password@123`):

| Role     | Email |
|----------|-------|
| Employee | employee@demo.com |
| Director | director@demo.com |
| Accounts | accounts@demo.com |

## API Documentation

Base URL: `http://localhost:5000/api`. Protected routes require `Authorization: Bearer <token>`.

### Auth
- `POST /auth/register` — public. Body: `{ name, email, password, role?, employeeId?, department? }` → `201` with `token`.
- `POST /auth/login` — public. Body: `{ email, password }` → `200` with `token`.
- `GET /auth/me` — any authenticated user → current user object.

### Vouchers
- `POST /vouchers` — EMPLOYEE. `multipart/form-data`: `expenseDate, departmentName, expenseTitle, expenseCategory?, expenseDescription?, amount, employeeIdCode?, employeeSignature (file)?, submit ("true"|"false")`. Creates a Draft (or submits directly if `submit=true` and a signature file is attached).
- `PUT /vouchers/:id` — EMPLOYEE, owner only, Draft only. Same fields, all optional (partial update).
- `DELETE /vouchers/:id` — EMPLOYEE, owner only, Draft only.
- `POST /vouchers/:id/submit` — EMPLOYEE, owner only. Moves an existing Draft (with a signature already on file) to Pending Approval.
- `GET /vouchers/mine` — EMPLOYEE. Own vouchers only. Supports search/filter/sort (below).
- `GET /vouchers/pending` — DIRECTOR. All `PENDING_APPROVAL` vouchers.
- `POST /vouchers/:id/approve` — DIRECTOR. `multipart/form-data`: `directorSignature (file)` (required unless already on file). Only from Pending Approval.
- `POST /vouchers/:id/reject` — DIRECTOR. Body: `{ rejectionReason }` (required). Only from Pending Approval.
- `GET /vouchers` — DIRECTOR, ACCOUNTS. All vouchers.
- `GET /vouchers/:id` — EMPLOYEE (own only, else `403`), DIRECTOR, ACCOUNTS.

**Search / filter / sort** (bonus, spec §7) — query params on `/vouchers`, `/vouchers/mine`, `/vouchers/pending`:
`search`, `voucherNumber`, `employeeName`, `department`, `category`, `status`, `dateFrom`,
`dateTo`, `amountMin`, `amountMax`, `sortBy` (`createdAt|amount|expenseDate|voucherNumber|status`), `order` (`asc|desc`).

Example: `GET /vouchers?status=PENDING_APPROVAL&department=Sales&sortBy=amount&order=desc`

### Dashboards
- `GET /dashboard/employee` — `{ totalVouchers, draftVouchers, pendingApproval, approvedVouchers, rejectedVouchers, totalAmountClaimed }`
- `GET /dashboard/director` — `{ pendingApprovalCount, approvedToday, rejectedToday, totalPendingAmount, recentActivity[] }`
- `GET /dashboard/accounts` — `{ totalVouchers, pendingApproval, approvedVouchers, rejectedVouchers, totalApprovedExpenseAmount, recentApprovedVouchers[] }`

### Static files
`GET /uploads/signatures/<filename>` — serves an uploaded signature image directly.

### Errors
All errors: `{ "message": "..." }` with status `400` (validation), `401` (auth), `403`
(forbidden/ownership), `404` (not found), `409` (duplicate email), `500` (server error).

## Validation Rules (enforced server-side)

- `departmentName`, `expenseTitle`, `expenseDate`, `amount` mandatory on create.
- `amount` must be strictly greater than 0.
- `employeeSignature` mandatory before submission.
- `directorSignature` mandatory before approval.
- `rejectionReason` mandatory (non-blank) on reject.
- Email must be valid format and unique.

## Assumptions

1. **Account provisioning** — the spec doesn't say who creates logins, so `POST /auth/register`
   is left open and a `seed.js` script provisions one demo account per role. A real
   deployment would restrict registration to an admin flow.
2. **"Submitted" vs "Pending Approval"** — the workflow diagram shows Submitted as a step
   before Pending Approval; both are treated as the same state (`PENDING_APPROVAL`) since a
   voucher becomes visible to the Director the instant it's submitted.
3. **No un-approve/un-reject** — Approved/Rejected are terminal states per the spec; no
   reversal endpoints exist.
4. **Accounts Team download/print** (optional in the spec) is left as a browser print /
   "Save as PDF" action on the voucher detail page rather than a server-side PDF endpoint.
5. **Signature files** limited to PNG/JPG/JPEG/WEBP, 2MB max.
6. **Voucher number format** `EV-<year>-<00001>`, sequential per year — the spec only
   requires uniqueness and auto-generation.

## Known Limitations

- `sequelize.sync()` is used instead of versioned migrations — fine for this scope; a
  production app should use `sequelize-cli` migrations.
- Signature files are served from an unauthenticated static route (filenames are
  unguessable but not access-controlled).
- No automated test suite, given the assignment timeline.
- No pagination on voucher list endpoints.
