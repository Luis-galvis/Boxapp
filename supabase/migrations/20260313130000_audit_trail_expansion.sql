-- Audit Trail Expansion
-- 1. Update movement types constraint
ALTER TABLE public.movimientos_inventario DROP CONSTRAINT IF EXISTS movimientos_inventario_tipo_check;
ALTER TABLE public.movimientos_inventario ADD CONSTRAINT movimientos_inventario_tipo_check 
  CHECK (tipo IN ('entrada', 'salida', 'apertura_caja', 'eliminacion', 'ajuste'));

-- 2. Ensure usuario_id is linked to auth.users (already is, but let's be sure)
-- No changes needed here if it's already there.

-- 3. Update existing check to include more product types if needed
ALTER TABLE public.movimientos_inventario DROP CONSTRAINT IF EXISTS movimientos_inventario_producto_tipo_check;
ALTER TABLE public.movimientos_inventario ADD CONSTRAINT movimientos_inventario_producto_tipo_check 
  CHECK (producto_tipo IN ('caja', 'zapato', 'multiple'));
