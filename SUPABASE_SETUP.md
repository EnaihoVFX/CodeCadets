# Supabase Setup Guide for CodeCadets Extension

This guide will walk you through setting up Supabase as your remote database for user-specific data storage.

## Step 1: Create Supabase Account

1. Go to https://supabase.com
2. Click **"Start your project"** or **"Sign Up"**
3. Sign up with GitHub (recommended) or email
4. Verify your email if needed

## Step 2: Create a New Project

1. Once logged in, click **"New Project"**
2. Fill in the details:
   - **Name**: `codecadets-extension` (or any name you prefer)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your users (e.g., `US East` or `EU West`)
   - **Pricing Plan**: Select **Free** tier
3. Click **"Create new project"**
4. Wait 2-3 minutes for the project to initialize

## Step 3: Get Your API Credentials

1. Once your project is ready, click on the **Settings** icon (⚙️) in the left sidebar
2. Click **"API"** in the settings menu
3. You'll see your project credentials. You need:
   - **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon/public key** (looks like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)
4. **Copy both of these** - you'll need them in the next step!

## Step 4: Create the Database Table

1. In Supabase, go to **"Table Editor"** in the left sidebar
2. Click **"Create a new table"**
3. Configure the table:
   - **Name**: `user_data`
   - **Description**: `User-specific data for CodeCadets extension`
4. Add the following columns (click "Add Column" for each):

   | Column Name | Type | Default Value | Nullable | Primary Key | Description |
   |------------|------|---------------|----------|-------------|-------------|
   | `userId` | `text` | - | ❌ No | ✅ Yes | User ID from CodeCadets Hub |
   | `xpState` | `jsonb` | `{}` | ✅ Yes | ❌ No | XP and level data |
   | `achievements` | `jsonb` | `{}` | ✅ Yes | ❌ No | Achievements data |
   | `completion_data` | `jsonb` | `{}` | ✅ Yes | ❌ No | Tutorial completion data |
   | `updated_at` | `timestamptz` | `now()` | ❌ No | ❌ No | Last update timestamp |
   | `created_at` | `timestamptz` | `now()` | ❌ No | ❌ No | Creation timestamp |

5. **Enable Row Level Security (RLS)**: 
   - Click on the table name in the left sidebar
   - Go to **"Authentication"** tab
   - Under **"Row Level Security"**, click **"Enable RLS"**
   - Then click **"New Policy"**:
     - **Policy name**: `Allow users to manage their own data`
     - **Allowed operation**: `All operations` (SELECT, INSERT, UPDATE, DELETE)
     - **Target roles**: `anon`, `authenticated`
     - **Policy definition**: 
       ```sql
       (auth.uid()::text = userId OR userId = current_setting('request.jwt.claims', true)::json->>'sub')
       ```
     - Actually, for simplicity, we can use a simpler policy. Click **"Create policy"** with:
       - **For full customization**: Use the SQL editor tab and paste:
         ```sql
         CREATE POLICY "Users can manage own data"
         ON user_data
         FOR ALL
         USING (true)
         WITH CHECK (true);
         ```
       - **Note**: For production, you should restrict this to only allow users to access their own data

6. Click **"Save"** to create the table

## Step 5: Configure Your Extension

1. Open your extension's `popup.js` or `background.js` file
2. Find where the database service is initialized (or add it)
3. Add this code to initialize Supabase:

```javascript
// Initialize Supabase when extension loads
async function setupSupabase() {
  // Replace these with YOUR Supabase credentials from Step 3
  await databaseService.initializeFirebase({
    supabaseUrl: 'https://xxxxxxxxxxxxx.supabase.co',  // Your Project URL
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',  // Your anon key
    useSupabase: true
  });
  
  console.log('Supabase initialized!');
}

// Call this when extension loads
setupSupabase();
```

4. **Update with your actual credentials** from Step 3

## Step 6: Test the Setup

1. Load your extension in Chrome (chrome://extensions/)
2. Open the extension popup
3. Go to the Profile page
4. Click the **SYNC** button
5. Check the browser console (F12) for any errors
6. Go back to Supabase → **Table Editor** → `user_data`
7. You should see a new row with your user data!

## Alternative: Quick Setup with SQL

If you prefer SQL, you can run this in Supabase's SQL Editor:

1. Go to **"SQL Editor"** in Supabase
2. Click **"New query"**
3. Paste this SQL:

```sql
-- Create user_data table
CREATE TABLE IF NOT EXISTS user_data (
  userId TEXT PRIMARY KEY,
  xpState JSONB DEFAULT '{}'::jsonb,
  achievements JSONB DEFAULT '{}'::jsonb,
  completion_data JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- Create policy (allows all operations for simplicity)
-- NOTE: For production, restrict this to only allow users to access their own data
CREATE POLICY "Allow all operations"
ON user_data
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_data_userId ON user_data(userId);

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_user_data_updated_at 
BEFORE UPDATE ON user_data 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();
```

4. Click **"Run"** (or press Ctrl+Enter)

## Troubleshooting

### Issue: "401 Unauthorized" error
- **Solution**: Check that you're using the **anon/public key**, not the service_role key
- Make sure RLS policies allow access

### Issue: "404 Not Found" error
- **Solution**: Check your Project URL is correct
- Make sure the table name is exactly `user_data`

### Issue: Data not syncing
- **Solution**: 
  1. Check browser console (F12) for errors
  2. Verify your Supabase credentials are correct
  3. Make sure the user ID is being scraped correctly
  4. Check Supabase logs: Settings → Logs

### Issue: "Permission denied"
- **Solution**: 
  1. Go to Supabase → Table Editor → user_data
  2. Click on "Authentication" tab
  3. Make sure Row Level Security has a policy that allows access

## Security Notes

⚠️ **Important**: The current setup uses the `anon` key which is public. For production:

1. **Use Row Level Security (RLS) policies** to restrict data access
2. **Consider using Supabase Auth** for proper user authentication
3. **Don't expose sensitive data** in the extension
4. **Use environment variables** or secure storage for API keys (consider using Supabase's service role key server-side only)

## Next Steps

- ✅ Test syncing data to Supabase
- ✅ Verify data appears in Supabase dashboard
- ✅ Test syncing from remote (load on different device/browser)
- ✅ Consider adding more sophisticated RLS policies

## Need Help?

- Supabase Docs: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- Check your extension's console logs for detailed error messages










