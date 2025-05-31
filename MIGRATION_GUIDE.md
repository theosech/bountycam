# BountyCam Database Migration Guide

Your Supabase project is connected! Now you need to run the migration files to set up the database schema.

## Quick Setup Instructions

1. **Open Supabase Dashboard**
   - Go to: https://mrkagdenrvwgjbzatdfx.supabase.co
   - Navigate to **SQL Editor** in the left sidebar

2. **Run Migrations in Order**

   Copy and paste each migration file content into the SQL Editor and click "Run":

   ### Step 1: Initial Schema
   - File: `supabase/migrations/20240101000001_initial_schema.sql`
   - Creates: users, bounties, sessions tables
   - Enables: PostGIS for location queries

   ### Step 2: Row Level Security
   - File: `supabase/migrations/20240101000002_rls_policies.sql`  
   - Sets up: Security policies for all tables
   - Ensures: Users can only see/modify their own data

   ### Step 3: RPC Functions
   - File: `supabase/migrations/20240101000003_rpc_functions.sql`
   - Creates functions:
     - `nearby_bounties(lat, lng)` - Find bounties within 2km
     - `accept_bounty(bounty_id)` - Accept a bounty & create session
     - `finish_session(session_id, approved)` - Complete & pay out

3. **Verify Installation**
   
   Run this query to check all tables were created:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('users', 'bounties', 'sessions');
   ```

   You should see all 3 tables listed.

## Test the Functions

After migrations, test the nearby_bounties function:

```sql
-- Test nearby_bounties (should return empty array)
SELECT * FROM nearby_bounties(34.0522, -118.2437, 2.0);
```

## Next Steps

Once migrations are complete:

1. Create a test user account through the app
2. The app will automatically create a user profile with 1000 points
3. Start creating and accepting bounties!

## Troubleshooting

If you get an error about PostGIS:
- Go to **Database → Extensions** in Supabase
- Enable the "postgis" extension

If you get permission errors:
- Make sure you're logged into Supabase Dashboard
- Check that you're in the correct project