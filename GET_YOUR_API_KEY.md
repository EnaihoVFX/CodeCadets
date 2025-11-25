# Get Your Supabase API Key

Your Supabase project is: `bpxoowtrrvxdbazqtkez`

## Quick Steps:

1. **Go to your Supabase Dashboard:**
   - Open: https://supabase.com/dashboard/project/bpxoowtrrvxdbazqtkez

2. **Navigate to API Settings:**
   - Click on **Settings** (⚙️ icon) in the left sidebar
   - Click on **API** in the settings menu

3. **Copy Your API Keys:**
   - You'll see a section called **"Project API keys"**
   - Copy the **`anon` `public`** key (this is the one you need)
   - It looks like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJweG9vd3RycnZ4ZGJhenF0a2V6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTc4NTY3ODQsImV4cCI6MjAzMzQzMjc4NH0.abc123...`

4. **Update Your Extension:**
   - Open `supabase-config.js` in your project
   - Replace `YOUR-ANON-KEY-HERE` with your actual anon key
   - Save the file

5. **Create the Database Table:**
   - In Supabase, go to **SQL Editor** (left sidebar)
   - Click **"New query"**
   - Paste and run this SQL:

```sql
CREATE TABLE IF NOT EXISTS user_data (
  userId TEXT PRIMARY KEY,
  xpState JSONB DEFAULT '{}'::jsonb,
  achievements JSONB DEFAULT '{}'::jsonb,
  completion_data JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations"
ON user_data FOR ALL
USING (true) WITH CHECK (true);
```

6. **Test:**
   - Reload your extension
   - Open Profile page
   - Click SYNC button
   - Check Supabase → Table Editor → `user_data` to see your data!

## Direct Links:

- **Dashboard**: https://supabase.com/dashboard/project/bpxoowtrrvxdbazqtkez
- **API Settings**: https://supabase.com/dashboard/project/bpxoowtrrvxdbazqtkez/settings/api
- **SQL Editor**: https://supabase.com/dashboard/project/bpxoowtrrvxdbazqtkez/sql/new
- **Table Editor**: https://supabase.com/dashboard/project/bpxoowtrrvxdbazqtkez/editor










