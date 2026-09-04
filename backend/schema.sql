-- Expense Voucher Management System — PostgreSQL schema
-- This is a reference dump of what Sequelize's sequelize.sync() (server.js) creates
-- automatically on first run. You do not need to run this by hand for the app to work;
-- it is provided to satisfy the "database schema or migration files" submission requirement.

CREATE TYPE "enum_Users_role" AS ENUM ('EMPLOYEE', 'DIRECTOR', 'ACCOUNTS');
CREATE TYPE "enum_Vouchers_status" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');

CREATE TABLE "Users" (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role "enum_Users_role" NOT NULL DEFAULT 'EMPLOYEE',
  "employeeId" VARCHAR(255),
  department VARCHAR(255),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "Vouchers" (
  id SERIAL PRIMARY KEY,
  "voucherNumber" VARCHAR(255) NOT NULL UNIQUE,
  "voucherDate" DATE NOT NULL,
  "expenseDate" DATE NOT NULL,
  "departmentName" VARCHAR(255) NOT NULL,
  "expenseTitle" VARCHAR(255) NOT NULL,
  "expenseCategory" VARCHAR(255),
  "expenseDescription" TEXT,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0 AND amount <= 10000000),
  "employeeUserId" INTEGER NOT NULL REFERENCES "Users"(id) ON UPDATE CASCADE,
  "employeeName" VARCHAR(255) NOT NULL,
  "employeeIdCode" VARCHAR(255),
  "employeeSignature" VARCHAR(255),
  status "enum_Vouchers_status" NOT NULL DEFAULT 'DRAFT',
  "directorSignature" VARCHAR(255),
  "approvalDate" TIMESTAMPTZ,
  "rejectionReason" TEXT,
  "approvedByUserId" INTEGER REFERENCES "Users"(id) ON UPDATE CASCADE ON DELETE SET NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "vouchers_employee_user_id" ON "Vouchers" ("employeeUserId");
CREATE INDEX "vouchers_status" ON "Vouchers" ("status");
