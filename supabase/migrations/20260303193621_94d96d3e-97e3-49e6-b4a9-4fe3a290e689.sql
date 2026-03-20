
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Proveedores (suppliers)
CREATE TABLE public.proveedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view proveedores" ON public.proveedores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage proveedores" ON public.proveedores FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Facturas de compra (purchase invoices)
CREATE TABLE public.facturas_compra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_factura TEXT NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  proveedor_id UUID REFERENCES public.proveedores(id),
  proveedor_nombre TEXT,
  tipo_producto TEXT NOT NULL CHECK (tipo_producto IN ('cajas', 'zapatos')),
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(12,2) NOT NULL CHECK (precio_unitario >= 0),
  total NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  bodega_destino TEXT DEFAULT 'interna',
  registrado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.facturas_compra ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view facturas" ON public.facturas_compra FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert facturas" ON public.facturas_compra FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Cajas
CREATE TABLE public.cajas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo TEXT NOT NULL,
  referencia TEXT,
  estado TEXT NOT NULL DEFAULT 'cerrada' CHECK (estado IN ('cerrada', 'abierta')),
  factura_id UUID REFERENCES public.facturas_compra(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cajas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view cajas" ON public.cajas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can update cajas" ON public.cajas FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can insert cajas" ON public.cajas FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Zapatos
CREATE TABLE public.zapatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo TEXT NOT NULL,
  talla TEXT NOT NULL,
  cantidad INTEGER NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
  caja_id UUID REFERENCES public.cajas(id),
  factura_id UUID REFERENCES public.facturas_compra(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.zapatos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view zapatos" ON public.zapatos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can update zapatos" ON public.zapatos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can insert zapatos" ON public.zapatos FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Movimientos de inventario
CREATE TABLE public.movimientos_inventario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida', 'apertura_caja')),
  producto_tipo TEXT NOT NULL CHECK (producto_tipo IN ('caja', 'zapato')),
  producto_id UUID,
  cantidad INTEGER NOT NULL,
  descripcion TEXT,
  usuario_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.movimientos_inventario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view movimientos" ON public.movimientos_inventario FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert movimientos" ON public.movimientos_inventario FOR INSERT TO authenticated WITH CHECK (true);

-- Ventas
CREATE TABLE public.ventas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_venta TEXT NOT NULL,
  fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  vendedor_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view ventas" ON public.ventas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert ventas" ON public.ventas FOR INSERT TO authenticated WITH CHECK (auth.uid() = vendedor_id);

-- Detalle de ventas
CREATE TABLE public.detalle_ventas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id UUID REFERENCES public.ventas(id) ON DELETE CASCADE NOT NULL,
  zapato_id UUID REFERENCES public.zapatos(id) NOT NULL,
  modelo TEXT NOT NULL,
  talla TEXT NOT NULL,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(12,2) NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.detalle_ventas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view detalle_ventas" ON public.detalle_ventas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert detalle_ventas" ON public.detalle_ventas FOR INSERT TO authenticated WITH CHECK (true);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', NEW.email), NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to generate sale number
CREATE OR REPLACE FUNCTION public.generate_sale_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero_venta FROM 3) AS INTEGER)), 0) + 1
  INTO next_num FROM public.ventas;
  RETURN 'V-' || LPAD(next_num::TEXT, 6, '0');
END;
$$;
