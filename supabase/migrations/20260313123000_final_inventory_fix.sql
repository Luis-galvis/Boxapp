-- FINAL ROBUST INVENTORY LOGIC FIX
-- 1. Drop existing triggers to avoid conflicts
DROP TRIGGER IF EXISTS trigger_zapato_identifier ON public.zapatos;
DROP TRIGGER IF EXISTS trigger_caja_identifier ON public.cajas;

-- 2. Improved Trigger Function
CREATE OR REPLACE FUNCTION public.generate_internal_identifier()
RETURNS TRIGGER AS $$
DECLARE
  seq_name TEXT;
  next_val INTEGER;
  prefix TEXT;
  existing_id TEXT;
BEGIN
  -- If it's a shoe, attempt to reuse ID from same model
  IF TG_TABLE_NAME = 'zapatos' AND NEW.identificador_interno IS NULL THEN
    SELECT identificador_interno INTO existing_id
    FROM public.zapatos
    WHERE modelo = NEW.modelo
    LIMIT 1;

    IF existing_id IS NOT NULL THEN
      NEW.identificador_interno := existing_id;
      RETURN NEW;
    END IF;
  END IF;

  -- Default ID generation logic
  IF NEW.identificador_interno IS NULL THEN
    IF TG_TABLE_NAME = 'zapatos' THEN
      seq_name := 'zapato_identifier_seq';
      prefix := ''; -- NO PREFIX FOR SHOES
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

-- 3. Re-attach triggers
CREATE TRIGGER trigger_zapato_identifier
BEFORE INSERT ON public.zapatos
FOR EACH ROW EXECUTE FUNCTION public.generate_internal_identifier();

CREATE TRIGGER trigger_caja_identifier
BEFORE INSERT ON public.cajas
FOR EACH ROW EXECUTE FUNCTION public.generate_internal_identifier();

-- 4. Corrected RPC for Next ID
CREATE OR REPLACE FUNCTION public.get_next_product_id(p_tipo TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  seq_name TEXT;
  next_val INTEGER;
  prefix TEXT;
BEGIN
  IF p_tipo = 'zapatos' THEN
    seq_name := 'zapato_identifier_seq';
    prefix := '';
  ELSE
    seq_name := 'caja_identifier_seq';
    prefix := 'C';
  END IF;

  SELECT nextval(seq_name) INTO next_val;
  RETURN prefix || LPAD(next_val::TEXT, 4, '0');
END;
$$;

-- 5. Data Cleanup: Force remove 'Z' prefix from existing zapatos
UPDATE public.zapatos 
SET identificador_interno = REGEXP_REPLACE(identificador_interno, '^Z', '')
WHERE identificador_interno LIKE 'Z%';

-- 6. Grant sequence usage
GRANT USAGE, SELECT ON SEQUENCE zapato_identifier_seq TO authenticated, anon;
GRANT USAGE, SELECT ON SEQUENCE caja_identifier_seq TO authenticated, anon;
