

-- 00. Storage for Photos
-- Note: This usually requires 'storage' schema which is enabled by default in Supabase.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('fotos', 'fotos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'fotos');
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'fotos');
CREATE POLICY "Authenticated Update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'fotos');
CREATE POLICY "Authenticated Delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'fotos');

-- 0. Suppliers (Proveedores)
CREATE TABLE IF NOT EXISTS public.proveedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  contacto TEXT,
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view proveedores" ON public.proveedores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage proveedores" ON public.proveedores FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Update facturas_compra to link to proveedores
ALTER TABLE public.facturas_compra ADD COLUMN IF NOT EXISTS proveedor_id UUID REFERENCES public.proveedores(id);

-- 1. Sizes Table
CREATE TABLE IF NOT EXISTS public.tallas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  valor TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Sales Invoices (Facturas de Venta)
CREATE TABLE IF NOT EXISTS public.facturas_venta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_factura TEXT UNIQUE NOT NULL,
  venta_id UUID REFERENCES public.ventas(id) ON DELETE CASCADE,
  fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
  total NUMERIC(12,2) NOT NULL,
  cliente_nombre TEXT,
  cliente_direccion TEXT,
  cliente_telefono TEXT,
  cliente_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Photo, Price and Location support
ALTER TABLE public.zapatos ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE public.zapatos ADD COLUMN IF NOT EXISTS precio_venta NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.zapatos ADD COLUMN IF NOT EXISTS costo_unitario NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.zapatos ADD COLUMN IF NOT EXISTS local_id UUID REFERENCES public.locales(id);
ALTER TABLE public.zapatos ADD COLUMN IF NOT EXISTS bodega_id UUID REFERENCES public.bodegas(id);

ALTER TABLE public.cajas ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE public.cajas ADD COLUMN IF NOT EXISTS local_id UUID REFERENCES public.locales(id);
ALTER TABLE public.cajas ADD COLUMN IF NOT EXISTS bodega_id UUID REFERENCES public.bodegas(id);

-- 4. Remisiones Identifier Sequence
CREATE SEQUENCE IF NOT EXISTS remision_identifier_seq;

-- Function to generate R-XXXX
CREATE OR REPLACE FUNCTION public.generate_remision_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_val INTEGER;
BEGIN
  SELECT nextval('remision_identifier_seq') INTO next_val;
  RETURN 'R-' || LPAD(next_val::TEXT, 4, '0');
END;
$$;

-- 5. RLS
ALTER TABLE public.tallas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facturas_venta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view tallas" ON public.tallas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage tallas" ON public.tallas FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view facturas_venta" ON public.facturas_venta FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert facturas_venta" ON public.facturas_venta FOR INSERT TO authenticated WITH CHECK (true);

-- 6. Trigger to auto-create factura_venta after sale (Optional but requested "se crea la factura")
CREATE OR REPLACE FUNCTION public.handle_new_sale_factura()
RETURNS TRIGGER AS $$
DECLARE
  next_factura_num TEXT;
BEGIN
  -- Simple sequential number for now, or use a separate sequence
  SELECT 'FV-' || LPAD((COUNT(*) + 1)::TEXT, 6, '0') INTO next_factura_num FROM public.facturas_venta;
  
  INSERT INTO public.facturas_venta (numero_factura, venta_id, total)
  VALUES (next_factura_num, NEW.id, NEW.total);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_new_sale_factura
AFTER INSERT ON public.ventas
FOR EACH ROW EXECUTE FUNCTION public.handle_new_sale_factura();

-- 7. Fix ID identifier prefixes
CREATE OR REPLACE FUNCTION public.generate_internal_identifier()
RETURNS TRIGGER AS $$
DECLARE
  seq_name TEXT;
  next_val INTEGER;
  prefix TEXT;
BEGIN
  IF NEW.identificador_interno IS NULL THEN
    IF TG_TABLE_NAME = 'zapatos' THEN
      seq_name := 'zapato_identifier_seq';
      prefix := ''; -- No prefix for shoes as requested
    ELSE
      seq_name := 'caja_identifier_seq';
      prefix := 'C';
    END IF;
    
    SELECT nextval(seq_name) INTO next_val;
    IF TG_TABLE_NAME = 'zapatos' THEN
      NEW.identificador_interno := LPAD(next_val::TEXT, 4, '0');
    ELSE
      NEW.identificador_interno := prefix || LPAD(next_val::TEXT, 4, '0');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Purchase Invoice Number Sequence
CREATE SEQUENCE IF NOT EXISTS factura_compra_number_seq;

CREATE OR REPLACE FUNCTION public.generate_purchase_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_val INTEGER;
BEGIN
  SELECT nextval('factura_compra_number_seq') INTO next_val;
  RETURN 'FC-' || LPAD(next_val::TEXT, 5, '0');
END;
$$;
