# Fixing "Could not find the 'userId' column" Error

## Error Explanation

The error `"Could not find the 'userId' column"` or `"column user_data.xpState does not exist"` occurs because **PostgreSQL converts unquoted identifiers to lowercase**.

When you create a table with:
- `userId` (unquoted) → PostgreSQL stores it as `userid` (lowercase)
- `xpState` (unquoted) → PostgreSQL stores it as `xpstate` (lowercase)

PostgREST (Supabase's REST API) then looks for the lowercase versions, causing errors if your code uses camelCase.

## Common Causes

1. **Table doesn't exist**: The `user_data` table hasn't been created in your Supabase database
2. **Column name case mismatch**: PostgreSQL converts unquoted identifiers to lowercase (`userId` → `userid`, `xpState` → `xpstate`)
3. **Schema cache out of sync**: PostgREST's schema cache needs to be refreshed

## Solutions

### Solution 1: Create the Table (If it doesn't exist)

Run the SQL script in your Supabase SQL Editor:

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Run the SQL from `CREATE_TABLE.sql`

### Solution 2: Use Lowercase Column Names (Recommended)

**PostgreSQL converts unquoted identifiers to lowercase**, so you should use lowercase column names. Update your table:

```sql
-- Drop the existing table if needed (WARNING: This deletes all data!)
DROP TABLE IF EXISTS user_data CASCADE;

-- Create with lowercase column names (PostgreSQL standard)
CREATE TABLE user_data (
  userid TEXT PRIMARY KEY,  -- Lowercase (not userId or user_id)
  xpstate JSONB DEFAULT '{}'::jsonb,  -- Lowercase (not xpState)
  achievements JSONB DEFAULT '{}'::jsonb,
  completion_data JSONB DEFAULT '{}'::jsonb,
  avatarimage TEXT,
  avatardata JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all operations"
ON user_data
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index
CREATE INDEX IF NOT EXISTS idx_user_data_userid ON user_data(userid);
```

**Note**: The code has been updated to automatically use lowercase column names, so this should work immediately.

### Solution 3: Refresh PostgREST Schema Cache

If the table exists but PostgREST can't see it:

1. Go to Supabase Dashboard → **Settings** → **API**
2. Click **"Reload Schema"** or **"Refresh Schema Cache"**
3. Wait a few seconds for the cache to update

### Solution 4: Verify Table Exists

Check if your table exists:

```sql
-- Check if table exists
SELECT * FROM information_schema.tables 
WHERE table_name = 'user_data';

-- Check column names
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_data';
```

## Code Updates

The code has been updated to automatically try both `userId` and `user_id` column names as a fallback. This should help if you have either naming convention.

## Verification Steps

1. **Check table exists**: Run `SELECT * FROM user_data LIMIT 1;` in SQL Editor
2. **Check column name**: Verify the exact column name (case-sensitive)
3. **Test API**: Try accessing the table via REST API:
   ```
   GET https://your-project.supabase.co/rest/v1/user_data?select=*
   ```
4. **Check browser console**: Look for more detailed error messages

## Still Having Issues?

If the error persists:

1. **Check Supabase logs**: Dashboard → Logs → API Logs
2. **Verify API key**: Make sure you're using the correct anon key
3. **Check RLS policies**: Ensure Row Level Security allows your operations
4. **Contact support**: The table might need to be recreated with the correct schema

## Recommended Approach

For best compatibility with PostgREST, use **lowercase** column names (`userid`, `xpstate`) instead of camelCase (`userId`, `xpState`). 

**Why?** PostgreSQL automatically converts unquoted identifiers to lowercase:
- `userId` (unquoted) → stored as `userid`
- `xpState` (unquoted) → stored as `xpstate`

The code has been updated to automatically handle this, so it will work with either naming convention, but using lowercase is the PostgreSQL standard and most reliable.

