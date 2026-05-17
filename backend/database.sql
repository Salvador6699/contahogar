-- backend/database.sql
-- NOTA: No incluimos CREATE DATABASE porque en hostings compartidos como CDmon
-- la base de datos debe crearse desde el panel de control del hosting.

CREATE TABLE IF NOT EXISTS accounts (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    initialBalance DECIMAL(12,2) DEFAULT 0,
    linkedAccountId VARCHAR(100) NULL,
    logo LONGTEXT NULL
);

CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50) NULL,
    color VARCHAR(20) NULL,
    monthlyLimit DECIMAL(12,2) NULL,
    customIcon LONGTEXT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(100) PRIMARY KEY,
    date DATE NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    category VARCHAR(100) NOT NULL,
    type ENUM('income', 'expense') NOT NULL,
    accountId VARCHAR(100) NOT NULL,
    description TEXT NULL,
    isPending BOOLEAN DEFAULT 0,
    FOREIGN KEY (accountId) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recurring_transactions (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    type ENUM('income', 'expense') NOT NULL,
    category VARCHAR(100) NOT NULL,
    accountId VARCHAR(100) NOT NULL,
    frequency VARCHAR(50) NOT NULL,
    intervalMonths INT NULL,
    endAfterMonths INT NULL,
    startDate DATE NOT NULL,
    lastGeneratedDate DATE NULL,
    isActive BOOLEAN DEFAULT 1,
    FOREIGN KEY (accountId) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS budgets (
    id VARCHAR(100) PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    month VARCHAR(7) NOT NULL -- yyyy-MM
);

CREATE TABLE IF NOT EXISTS favorites (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    category VARCHAR(100) NOT NULL,
    accountId VARCHAR(100) NOT NULL,
    description TEXT NULL,
    type ENUM('income', 'expense') NOT NULL,
    icon VARCHAR(50) NULL,
    customIcon LONGTEXT NULL,
    FOREIGN KEY (accountId) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS savings_goals (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    targetAmount DECIMAL(12,2) NOT NULL,
    currentAmount DECIMAL(12,2) DEFAULT 0,
    deadline DATE NULL,
    accountId VARCHAR(100) NULL,
    color VARCHAR(20) NULL,
    category VARCHAR(100) NULL,
    FOREIGN KEY (accountId) REFERENCES accounts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value LONGTEXT NOT NULL
);
