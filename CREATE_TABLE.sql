-- Create user_data table for CodeCadets Extension
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/bpxoowtrrvxdbazqtkez/sql/new

-- Drop table if exists (for testing - remove this line in production)
-- DROP TABLE IF EXISTS user_data CASCADE;

-- Create the table
-- IMPORTANT: PostgreSQL converts unquoted identifiers to lowercase
-- So userId becomes userid, xpState becomes xpstate, etc.
-- Use lowercase column names for best PostgREST compatibility
CREATE TABLE IF NOT EXISTS user_data (
  userid TEXT PRIMARY KEY,  -- Lowercase (PostgreSQL converts unquoted identifiers)
  xpstate JSONB DEFAULT '{}'::jsonb,
  achievements JSONB DEFAULT '{}'::jsonb,
  completion_data JSONB DEFAULT '{}'::jsonb,
  avatarimage TEXT,
  avatardata JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists (for re-running)
DROP POLICY IF EXISTS "Allow all operations" ON user_data;

-- Create policy to allow all operations (for simplicity)
-- NOTE: For production, you should restrict this to only allow users to access their own data
CREATE POLICY "Allow all operations"
ON user_data
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_data_userid ON user_data(userid);

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists (for re-running)
DROP TRIGGER IF EXISTS update_user_data_updated_at ON user_data;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_user_data_updated_at 
BEFORE UPDATE ON user_data 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Verify table was created
SELECT * FROM user_data LIMIT 1;

