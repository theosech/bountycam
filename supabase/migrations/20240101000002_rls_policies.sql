-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bounties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Users table policies
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Bounties table policies
-- Anyone authenticated can view all bounties
CREATE POLICY "Anyone can view bounties" ON public.bounties
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users can create bounties if they have enough points
CREATE POLICY "Users can create bounties" ON public.bounties
    FOR INSERT WITH CHECK (
        auth.uid() = creator_id AND
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND points_balance >= (
                SELECT amount FROM public.bounties WHERE id = bounties.id
            )
        )
    );

-- Only creator can update their own bounties (before they're accepted)
CREATE POLICY "Creators can update own bounties" ON public.bounties
    FOR UPDATE USING (
        auth.uid() = creator_id AND 
        status = 'open'
    );

-- Sessions table policies
-- Users can view sessions they're part of
CREATE POLICY "Users can view own sessions" ON public.sessions
    FOR SELECT USING (
        auth.uid() = streamer_id OR
        auth.uid() IN (
            SELECT creator_id FROM public.bounties WHERE id = bounty_id
        )
    );

-- System can create sessions (via RPC function)
CREATE POLICY "System can create sessions" ON public.sessions
    FOR INSERT WITH CHECK (true);

-- Streamers and bounty creators can update sessions
CREATE POLICY "Participants can update sessions" ON public.sessions
    FOR UPDATE USING (
        auth.uid() = streamer_id OR
        auth.uid() IN (
            SELECT creator_id FROM public.bounties WHERE id = bounty_id
        )
    );