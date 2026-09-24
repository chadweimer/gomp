BEGIN;

CREATE OR REPLACE FUNCTION sync_seq(table_name TEXT, col_name TEXT)
RETURNS VOID AS $$
DECLARE
  seq_name TEXT;
  max_val   BIGINT;
  query_str TEXT;
  row_rec   RECORD;
BEGIN
  -- Step 1: Get the sequence name associated with the column
  SELECT pg_get_serial_sequence(table_name, col_name) INTO seq_name;

  -- Exit early if no sequence exists (avoid errors)
  IF seq_name IS NULL THEN
    RAISE NOTICE 'No sequence associated with %."%"', table_name, col_name;
    RETURN;
  END IF;

  -- Step 2: Build dynamic query to get MAX(col) safely
  -- Use format() with %I for proper identifier quoting (prevents SQL injection)
  query_str := format('SELECT COALESCE(MAX(%I), 1)::BIGINT AS val FROM %I', col_name, table_name);

  -- Execute dynamic query and capture result via a record variable
  EXECUTE query_str INTO row_rec;
  max_val := row_rec.val;

  -- Step 3: Update the sequence
  PERFORM setval(seq_name, max_val);

  RAISE NOTICE 'Updated sequence % for %."%" to %', seq_name, table_name, col_name, max_val;
END;
$$ LANGUAGE plpgsql;

COMMIT;