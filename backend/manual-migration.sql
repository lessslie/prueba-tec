-- Manual migration script to add isPausedLocally column
-- Only run this if TypeORM synchronize doesn't work in production

-- Check if the column already exists before adding it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'publications'
      AND column_name = 'is_paused_locally'
  ) THEN
    ALTER TABLE publications
    ADD COLUMN is_paused_locally BOOLEAN NOT NULL DEFAULT FALSE;

    RAISE NOTICE 'Column is_paused_locally added successfully';
  ELSE
    RAISE NOTICE 'Column is_paused_locally already exists';
  END IF;
END $$;
