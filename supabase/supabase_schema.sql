-- Esquema completo de la base de datos de ContaHogar
-- Ejecutar en el SQL Editor de Supabase para inicializar un nuevo proyecto

-- Eliminar tablas si existen para poder recrearlas en caso de error
DROP TABLE IF EXISTS loans CASCADE;
DROP TABLE IF EXISTS recurring_rules CASCADE;
DROP TABLE IF EXISTS savings_goals CASCADE;
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS budgets CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS cloud_snapshots CASCADE;

-- Crear tabla accounts
CREATE TABLE accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    "initialBalance" NUMERIC NOT NULL DEFAULT 0,
    "linkedAccountId" TEXT REFERENCES accounts(id) ON DELETE SET NULL,
    logo TEXT,
    "excludeFromTotals" BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla categories
CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    "monthlyLimit" NUMERIC,
    "customIcon" TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla transactions
CREATE TABLE transactions (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    amount NUMERIC NOT NULL,
    category TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    "accountId" TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    description TEXT,
    "isPending" BOOLEAN DEFAULT false,
    "isIgnored" BOOLEAN DEFAULT false,
    "linkedLoanId" TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla budgets
CREATE TABLE budgets (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    month TEXT NOT NULL, -- yyyy-MM
    "isAuto" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla favorites
CREATE TABLE favorites (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    category TEXT NOT NULL,
    "accountId" TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    icon TEXT,
    "customIcon" TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla savings_goals
CREATE TABLE savings_goals (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    "targetAmount" NUMERIC NOT NULL,
    "currentAmount" NUMERIC NOT NULL DEFAULT 0,
    deadline DATE,
    "accountId" TEXT REFERENCES accounts(id) ON DELETE SET NULL,
    color TEXT,
    category TEXT,
    priority INTEGER,
    "isIgnored" BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla recurring_rules
CREATE TABLE recurring_rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    category TEXT NOT NULL,
    "accountId" TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'yearly', 'custom')),
    "customInterval" INTEGER,
    "customIntervalUnit" TEXT CHECK ("customIntervalUnit" IN ('days', 'months', 'years')),
    "startDate" DATE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    "savingsPriority" INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla loans
CREATE TABLE loans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('loan', 'fractionation')),
    amount NUMERIC NOT NULL,
    installments INTEGER NOT NULL,
    "installmentAmount" NUMERIC NOT NULL,
    "setupFee" NUMERIC NOT NULL DEFAULT 0,
    "startDate" DATE NOT NULL,
    "accountId" TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('active', 'completed')),
    "isStarted" BOOLEAN DEFAULT false,
    "startingPaidAmount" NUMERIC DEFAULT 0,
    "originalTransactionData" JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla cloud_snapshots (Máquina del tiempo)
CREATE TABLE cloud_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data JSONB NOT NULL
);
