
-- 1. Update Roles Enum
-- Note: ALTER TYPE ADD VALUE cannot be executed in a transaction block in some versions,
-- depends on how Supabase handles migrations. We use DO block if needed.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cajero';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'call_center';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'asistente_punto';

-- 2. Locations and Warehouses
CREATE TABLE public.locales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  direccion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.bodegas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  local_id UUID REFERENCES public.locales(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Customers (Compradores)
CREATE TABLE public.compradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  numero_documento TEXT UNIQUE NOT NULL,
  direccion TEXT,
  telefono TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Sequences for internal identifiers
CREATE SEQUENCE IF NOT EXISTS zapato_identifier_seq;
CREATE SEQUENCE IF NOT EXISTS caja_identifier_seq;

-- 5. Add internal identifier to existing tables
ALTER TABLE public.zapatos ADD COLUMN identificador_interno TEXT;
ALTER TABLE public.cajas ADD COLUMN identificador_interno TEXT;

-- 6. Function for auto-identifier
CREATE OR REPLACE FUNCTION public.generate_internal_identifier()
RETURNS TRIGGER AS $$
DECLARE
  seq_name TEXT;
  next_val INTEGER;
BEGIN
  IF NEW.identificador_interno IS NULL THEN
    IF TG_TABLE_NAME = 'zapatos' THEN
      seq_name := 'zapato_identifier_seq';
    ELSE
      seq_name := 'caja_identifier_seq';
    END IF;
    
    SELECT nextval(seq_name) INTO next_val;
    NEW.identificador_interno := LPAD(next_val::TEXT, 4, '0');
  ELSE
    -- If provided (from Excel), update the sequence if necessary
    IF TG_TABLE_NAME = 'zapatos' THEN
      PERFORM setval('zapato_identifier_seq', GREATEST(currval('zapato_identifier_seq'), CAST(NEW.identificador_interno AS INTEGER)), true);
    ELSE
      PERFORM setval('caja_identifier_seq', GREATEST(currval('caja_identifier_seq'), CAST(NEW.identificador_interno AS INTEGER)), true);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for auto-identifier
CREATE TRIGGER trigger_zapato_identifier
BEFORE INSERT ON public.zapatos
FOR EACH ROW EXECUTE FUNCTION public.generate_internal_identifier();

CREATE TRIGGER trigger_caja_identifier
BEFORE INSERT ON public.cajas
FOR EACH ROW EXECUTE FUNCTION public.generate_internal_identifier();

-- 7. Referral Notes (Remisiones)
CREATE TABLE public.remisiones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_remision TEXT NOT NULL,
  fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
  comprador_id UUID REFERENCES public.compradores(id),
  comprador_nombre_manual TEXT,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'entregado', 'anulado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.detalle_remisiones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  remision_id UUID REFERENCES public.remisiones(id) ON DELETE CASCADE,
  zapato_id UUID REFERENCES public.zapatos(id),
  modelo TEXT NOT NULL,
  talla TEXT NOT NULL,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Updates to Sales (Ventas)
ALTER TABLE public.ventas ADD COLUMN comprador_id UUID REFERENCES public.compradores(id);
ALTER TABLE public.ventas ADD COLUMN comprador_numero_documento TEXT;
ALTER TABLE public.ventas ADD COLUMN comprador_direccion TEXT;
ALTER TABLE public.ventas ADD COLUMN comprador_nombre TEXT;
ALTER TABLE public.ventas ADD COLUMN local_id UUID REFERENCES public.locales(id);

-- 9. Orders (Pedidos)
CREATE TABLE public.pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id UUID REFERENCES public.ventas(id) ON DELETE CASCADE,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'despachado', 'cancelado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Enable RLS and add policies
ALTER TABLE public.locales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bodegas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remisiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalle_remisiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view locales" ON public.locales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage locales" ON public.locales FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view bodegas" ON public.bodegas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage bodegas" ON public.bodegas FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view compradores" ON public.compradores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage compradores" ON public.compradores FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can view remisiones" ON public.remisiones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert remisiones" ON public.remisiones FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can view detalle_remisiones" ON public.detalle_remisiones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert detalle_remisiones" ON public.detalle_remisiones FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can view pedidos" ON public.pedidos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can update pedidos" ON public.pedidos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can insert pedidos" ON public.pedidos FOR INSERT TO authenticated WITH CHECK (true);

-- Function to handle auto-creation of pedido after sale
CREATE OR REPLACE FUNCTION public.handle_new_sale_pedido()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.pedidos (venta_id, estado)
  VALUES (NEW.id, 'pendiente');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_new_sale_pedido
AFTER INSERT ON public.ventas
FOR EACH ROW EXECUTE FUNCTION public.handle_new_sale_pedido();
