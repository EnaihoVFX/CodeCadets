# Understanding Supabase API Keys

## The Key You Gave Me:
```
sb_secret_Gl7MwMatr430GTlhieDy6Q_YVxp_653
```
❌ **This is the WRONG type of key!**

## Why This Key is Wrong:

### Service Role Secret Key (`sb_secret_...`)
- ❌ **Full admin access** to your database
- ❌ **Bypasses Row Level Security** (RLS)
- ❌ **NEVER expose in client-side code** (like Chrome extensions)
- ❌ **For server-side use only**
- ⚠️ If this gets exposed, anyone can modify/delete your database!

## The Key You Need:

### Anon/Public Key (`eyJ...`)
- ✅ **Limited permissions** (controlled by RLS)
- ✅ **Safe for client-side code**
- ✅ **Designed for browser/extensions**
- ✅ **Can't bypass security rules**
- ✅ **Starts with `eyJ...`** (it's a JWT token)

## How to Find the Correct Key:

### Step 1: Go to Supabase API Settings
👉 https://supabase.com/dashboard/project/bpxoowtrrvxdbazqtkez/settings/api

### Step 2: Look for TWO Different Keys:

```
┌─────────────────────────────────────────────────┐
│ Project API keys                                │
├─────────────────────────────────────────────────┤
│                                                 │
│ 🔑 anon public                                  │
│ eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...        │ ← YOU NEED THIS ✅
│ [Reveal] [Copy]                                 │
│                                                 │
│ 🔒 service_role secret                          │
│ sb_secret_Gl7MwMatr430GTlhieDy6Q_YVxp_653      │ ← NOT THIS ❌
│ [Reveal] [Copy]                                 │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Step 3: Copy the `anon public` Key
- Click the **Copy** button next to `anon public`
- It's a very long string starting with `eyJ...`
- Usually 200+ characters long

### Step 4: Use It in supabase-config.js

Replace this:
```javascript
supabaseKey: 'YOUR-ANON-KEY-HERE',
```

With your actual anon key:
```javascript
supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJweG9vd3RycnZ4ZGJhenF0a2V6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTc4NTY3ODQsImV4cCI6MjAzMzQzMjc4NH0.xxxxxxxxxxxxxxxxxxxxx',
```

## Visual Comparison:

| Feature | Anon Key (✅ Use This) | Service Role Key (❌ Don't Use) |
|---------|------------------------|--------------------------------|
| Starts with | `eyJ...` | `sb_secret_...` |
| Length | ~200+ characters | ~50-100 characters |
| Purpose | Client-side apps | Server-side only |
| Security | Limited by RLS | Full admin access |
| Safe for extension? | ✅ Yes | ❌ No! |

## Summary:

**You gave me:** `sb_secret_...` (service_role secret key)  
**You need:** `eyJ...` (anon/public key)

They're both in your Supabase dashboard, but you need the **anon public** one!

Go get it: https://supabase.com/dashboard/project/bpxoowtrrvxdbazqtkez/settings/api










