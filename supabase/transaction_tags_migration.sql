-- Migración Fase 4: Sistema de Etiquetas (#tags) en transacciones
-- Ejecutar en el SQL Editor de Supabase (operación segura e idempotente, no borra datos existentes)

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Índice GIN para búsquedas rápidas por etiqueta
CREATE INDEX IF NOT EXISTS idx_transactions_tags ON transactions USING GIN (tags);
