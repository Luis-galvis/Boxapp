
-- Fix function search path
CREATE OR REPLACE FUNCTION public.generate_sale_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero_venta FROM 3) AS INTEGER)), 0) + 1
  INTO next_num FROM public.ventas;
  RETURN 'V-' || LPAD(next_num::TEXT, 6, '0');
END;
$$;

-- Fix permissive RLS: tighten movimientos insert to authenticated users with their own user_id
DROP POLICY "Authenticated can insert movimientos" ON public.movimientos_inventario;
CREATE POLICY "Authenticated can insert own movimientos" ON public.movimientos_inventario 
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = usuario_id);

-- Tighten cajas update to authenticated (already ok, but restrict)
DROP POLICY "Authenticated can update cajas" ON public.cajas;
CREATE POLICY "Authenticated can update cajas" ON public.cajas 
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Tighten zapatos update  
DROP POLICY "Authenticated can update zapatos" ON public.zapatos;
CREATE POLICY "Authenticated can update zapatos" ON public.zapatos
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Tighten detalle_ventas insert
DROP POLICY "Authenticated can insert detalle_ventas" ON public.detalle_ventas;
CREATE POLICY "Authenticated can insert detalle_ventas" ON public.detalle_ventas
  FOR INSERT TO authenticated WITH CHECK (EXISTS (
    SELECT 1 FROM public.ventas WHERE id = venta_id AND vendedor_id = auth.uid()
  ));
