-- Migración Fase 1: Jerarquía de 2 niveles (Grupo -> Subcategoría), Tipo de flujo, Naturaleza contable y Archivado
-- Ejecutar en el SQL Editor de Supabase (operación segura e idempotente, no borra datos existentes)

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS "parentId" TEXT REFERENCES categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "isGroup" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS kind TEXT CHECK (kind IN ('expense', 'income', 'financing')),
  ADD COLUMN IF NOT EXISTS nature TEXT CHECK (nature IN ('essential', 'discretionary', 'debt', 'extraordinary')),
  ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN DEFAULT false;

-- Índice para acelerar consultas jerárquicas por grupo padre
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories("parentId");
