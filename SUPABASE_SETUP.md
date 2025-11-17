# Supabase Setup Guide

## Step 1: Get Your Supabase Credentials

1. Go to [Supabase](https://supabase.com) and sign in (or create an account)
2. Create a new project or select an existing one
3. Go to **Settings** → **API**
4. Copy your:
   - **Project URL** (under "Project URL")
   - **anon/public key** (under "Project API keys" → "anon public")

## Step 2: Create Environment Variables

Create a `.env.local` file in the root of your project with:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Replace `your_supabase_project_url` and `your_supabase_anon_key` with the values from Step 1.

## Step 3: Create the Database Table

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy and paste the SQL from `supabase-schema.sql`
3. Click **Run** to execute the SQL

This will create the `journal_entries` table with the necessary structure.

## Step 4: Restart Your Development Server

After setting up the environment variables, restart your Next.js dev server:

```bash
npm run dev
```

Your journal app should now be connected to Supabase!

## Notes

- The current setup allows anyone to read/write entries (for development)
- For production, you should add authentication and user-specific Row Level Security policies
- The `.env.local` file is already in `.gitignore` and won't be committed to Git

