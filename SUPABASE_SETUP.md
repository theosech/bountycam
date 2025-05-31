# Supabase Setup Guide for BountyCam

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and create a new project
2. Save your project URL and anon key

## 2. Configure Environment Variables

Update the `.env.local` file with your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
```

Also update the `.mcp.json` file with the same credentials for Claude MCP integration:
- Replace `your_supabase_project_url` with your actual Supabase URL
- Replace `your_supabase_service_key` with your service key

## 3. Run Database Migrations

### Option A: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run each migration file in order:
   - `supabase/migrations/20240101000001_initial_schema.sql`
   - `supabase/migrations/20240101000002_rls_policies.sql`
   - `supabase/migrations/20240101000003_rpc_functions.sql`

### Option B: Using Supabase CLI

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Link your project:
   ```bash
   supabase link --project-ref your-project-id
   ```

3. Run migrations:
   ```bash
   supabase db push
   ```

## 4. Enable Authentication

1. In Supabase Dashboard, go to Authentication > Providers
2. Enable Email provider
3. Configure email templates as needed

## 5. Test the Setup

Run the seed script to create test data:

```bash
npm run seed
```

## Database Schema

### Tables

1. **users**
   - Extends Supabase auth.users
   - Stores points_balance (default: 1000)
   - Automatically created on signup

2. **bounties**
   - Geo-targeted tasks with point rewards
   - PostGIS location field for radius queries
   - Status: open, accepted, completed, cancelled

3. **sessions**
   - Tracks active streaming sessions
   - Links bounties to streamers
   - Approval mechanism for point transfer

### Key Functions

1. **nearby_bounties(lat, lng, radius_km)**
   - Returns bounties within specified radius
   - Default radius: 2km

2. **accept_bounty(bounty_id)**
   - Validates points balance
   - Creates session
   - Updates bounty status

3. **finish_session(session_id, approved)**
   - Completes the session
   - Transfers points if approved
   - Refunds if rejected

### Security

- Row Level Security (RLS) enabled on all tables
- Users can only see/modify their own data
- Point balance enforced at database level
- Automatic user profile creation on signup