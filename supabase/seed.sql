-- Seed data for BountyCam testing

-- Create test users (you'll need to create these through Supabase Auth first)
-- For testing, you can manually insert users after creating auth accounts

-- Example test bounties (update user IDs after creating test accounts)
/*
INSERT INTO public.bounties (creator_id, title, description, amount, lat, lng, location)
VALUES 
  ('user-id-1', 'Film the sunset at Santa Monica Pier', 'Looking for a beautiful sunset timelapse', 50, 34.0094, -118.4973, ST_MakePoint(-118.4973, 34.0094)::geography),
  ('user-id-2', 'Live stream from Griffith Observatory', 'Show the city views and telescope area', 75, 34.1184, -118.3004, ST_MakePoint(-118.3004, 34.1184)::geography),
  ('user-id-1', 'Venice Beach street performers', 'Capture some street art and performances', 40, 33.9850, -118.4695, ST_MakePoint(-118.4695, 33.9850)::geography),
  ('user-id-2', 'Hollywood Walk of Fame tour', 'Quick walking tour showing the stars', 60, 34.1016, -118.3267, ST_MakePoint(-118.3267, 34.1016)::geography);
*/

-- Note: To properly seed data:
-- 1. Create test user accounts through Supabase Auth
-- 2. Get their user IDs from the auth.users table
-- 3. Update the user-id placeholders above
-- 4. Uncomment and run the INSERT statement