-- Fix Identifiers: No 'Z' prefix for shoes, group by model name, 'C' for boxes
CREATE OR REPLACE FUNCTION public.generate_internal_identifier()
RETURNS TRIGGER AS $$
DECLARE
  seq_name TEXT;
  next_val INTEGER;
  prefix TEXT;
  existing_id TEXT;
BEGIN
  -- If TG_TABLE_NAME is 'zapatos', check if a shoe with the same model already exists
  IF TG_TABLE_NAME = 'zapatos' THEN
    SELECT identificador_interno INTO existing_id
    FROM public.zapatos
    WHERE modelo = NEW.modelo
    LIMIT 1;

    IF existing_id IS NOT NULL THEN
      NEW.identificador_interno := existing_id;
      RETURN NEW;
    END IF;
  END IF;

  -- Default logic if no existing ID found or if it's a box
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

-- Re-implement Purchase Invoice Generator with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.generate_purchase_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_val INTEGER;
BEGIN
  SELECT nextval('factura_compra_number_seq') INTO next_val;
  RETURN 'FC-' || LPAD(next_val::TEXT, 5, '0');
END;
$$;

-- Grant permissions to ensure RPC works for all users
GRANT EXECUTE ON FUNCTION public.generate_purchase_invoice_number() TO authenticated, anon;
GRANT USAGE, SELECT ON SEQUENCE factura_compra_number_seq TO authenticated, anon;
GRANT USAGE, SELECT ON SEQUENCE zapato_identifier_seq TO authenticated, anon;
GRANT USAGE, SELECT ON SEQUENCE caja_identifier_seq TO authenticated, anon;
GRANT USAGE, SELECT ON SEQUENCE remision_identifier_seq TO authenticated, anon;
