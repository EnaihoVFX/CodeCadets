# ⚠️ IMPORTANT: Wrong Key Type!

You provided a **service_role secret key** (`sb_secret_...`), but you need the **anon/public key** instead.

## Why This Matters:

- **Service Role Key** (`sb_secret_...`): Has FULL admin access to your database. **NEVER expose this in client-side code!**
- **Anon/Public Key** (`eyJ...`): Safe for client-side use, restricted by Row Level Security (RLS) policies.

## Get the Correct Key:

1. **Go to API Settings:**
   - https://supabase.com/dashboard/project/bpxoowtrrvxdbazqtkez/settings/api

2. **Find the Correct Key:**
   - Look for the section **"Project API keys"**
   - Find the key labeled **`anon` `public`**
   - It will look like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJweG9vd3RycnZ4ZGJhenF0a2V6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTc4NTY3ODQsImV4cCI6MjAzMzQzMjc4NH0.xxxxxxxxx`
   - **NOT** the one labeled `service_role` `secret`

3. **Update the Config:**
   - Open `supabase-config.js`
   - Replace the `supabaseKey` value with your **anon/public key**
   - The correct key starts with `eyJ...` (JWT token format)

## Visual Guide:

In Supabase Dashboard → Settings → API, you'll see:

```
Project API keys
├── anon public ← USE THIS ONE! ✅
└── service_role secret ← NOT THIS! ❌
```

## What to Do Now:

1. ✅ Go get your anon/public key
2. ✅ Replace it in `supabase-config.js`
3. ✅ **NEVER commit the service_role key to Git**
4. ✅ Add `supabase-config.js` to `.gitignore` if it contains any real keys

## Security Best Practice:

For production, consider:
- Using environment variables
- Keeping keys in Chrome's secure storage
- Using Supabase's built-in authentication instead of exposing keys










