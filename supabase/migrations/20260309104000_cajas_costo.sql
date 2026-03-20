-- Add costo_unitario to cajas table
ALTER TABLE public.cajas ADD COLUMN IF NOT EXISTS costo_unitario NUMERIC(12,2) DEFAULT 0;
