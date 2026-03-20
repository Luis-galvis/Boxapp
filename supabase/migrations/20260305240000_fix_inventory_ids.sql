-- Migration to fix ID formatting and allow shared IDs

-- 1. Update the ID generator to remove 'Z' prefix for shoes and ensure 4-digit numeric padding
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
      prefix := ''; -- No prefix for shoes
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

-- 2. Create RPC to fetch next formatted ID (used for shared IDs across multiple DB rows)
CREATE OR REPLACE FUNCTION public.get_next_product_id(p_tipo TEXT)
RETURNS TEXT
LANGUAGE plpgsql
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
    seq_name := 'cajas' THEN
    seq_name := 'caja_identifier_seq';
    prefix := 'C';
  END IF;

  SELECT nextval(seq_name) INTO next_val;
  RETURN prefix || LPAD(next_val::TEXT, 4, '0');
END;
$$;

-- 3. Cleanup existing 'Z' IDs for shoes
UPDATE public.zapatos 
SET identificador_interno = SUBSTRING(identificador_interno FROM 2)
WHERE identificador_interno LIKE 'Z%';
