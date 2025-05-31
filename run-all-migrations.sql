-- BountyCam Complete Database Setup
-- Run this entire script in Supabase SQL Editor

-- =====================================================
-- STEP 1: ENABLE EXTENSIONS
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- =====================================================
-- STEP 2: CREATE TYPES AND TABLES
-- =====================================================

-- Create custom types
CREATE TYPE bounty_status AS ENUM ('open', 'accepted', 'completed', 'cancelled');
CREATE TYPE session_status AS ENUM ('active', 'completed', 'cancelled');

-- Create users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    points_balance INTEGER NOT NULL DEFAULT 1000 CHECK (points_balance >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create bounties table
CREATE TABLE public.bounties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    amount INTEGER NOT NULL CHECK (amount > 0),
    location GEOGRAPHY(Point, 4326) NOT NULL,
    lat FLOAT NOT NULL,
    lng FLOAT NOT NULL,
    status bounty_status NOT NULL DEFAULT 'open',
    accepted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create sessions table
CREATE TABLE public.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bounty_id UUID NOT NULL REFERENCES public.bounties(id) ON DELETE CASCADE,
    streamer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status session_status NOT NULL DEFAULT 'active',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    approved BOOLEAN,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_bounties_location ON public.bounties USING GIST (location);
CREATE INDEX idx_bounties_status ON public.bounties(status);
CREATE INDEX idx_bounties_creator ON public.bounties(creator_id);
CREATE INDEX idx_sessions_bounty ON public.sessions(bounty_id);
CREATE INDEX idx_sessions_streamer ON public.sessions(streamer_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bounties_updated_at BEFORE UPDATE ON public.bounties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on auth.users insert
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- STEP 3: ROW LEVEL SECURITY POLICIES
-- =====================================================

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

-- =====================================================
-- STEP 4: RPC FUNCTIONS
-- =====================================================

-- Function to find nearby bounties within 2km radius
CREATE OR REPLACE FUNCTION public.nearby_bounties(
    user_lat FLOAT,
    user_lng FLOAT,
    radius_km FLOAT DEFAULT 2.0
)
RETURNS TABLE (
    id UUID,
    creator_id UUID,
    title TEXT,
    description TEXT,
    amount INTEGER,
    lat FLOAT,
    lng FLOAT,
    distance_km FLOAT,
    status bounty_status,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.creator_id,
        b.title,
        b.description,
        b.amount,
        b.lat,
        b.lng,
        ST_Distance(
            b.location::geography,
            ST_MakePoint(user_lng, user_lat)::geography
        ) / 1000 AS distance_km,
        b.status,
        b.created_at
    FROM public.bounties b
    WHERE 
        b.status = 'open' AND
        ST_DWithin(
            b.location::geography,
            ST_MakePoint(user_lng, user_lat)::geography,
            radius_km * 1000  -- Convert km to meters
        )
    ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept a bounty
CREATE OR REPLACE FUNCTION public.accept_bounty(
    p_bounty_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_bounty RECORD;
    v_user_balance INTEGER;
    v_session_id UUID;
BEGIN
    -- Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object('error', 'Not authenticated');
    END IF;

    -- Get bounty details with lock
    SELECT * INTO v_bounty
    FROM public.bounties
    WHERE id = p_bounty_id
    FOR UPDATE;

    -- Check if bounty exists and is open
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Bounty not found');
    END IF;

    IF v_bounty.status != 'open' THEN
        RETURN jsonb_build_object('error', 'Bounty is not available');
    END IF;

    -- Check if user is trying to accept their own bounty
    IF v_bounty.creator_id = auth.uid() THEN
        RETURN jsonb_build_object('error', 'Cannot accept your own bounty');
    END IF;

    -- Check user's balance
    SELECT points_balance INTO v_user_balance
    FROM public.users
    WHERE id = auth.uid()
    FOR UPDATE;

    IF v_user_balance < v_bounty.amount THEN
        RETURN jsonb_build_object('error', 'Insufficient points balance');
    END IF;

    -- Start transaction
    -- Deduct points from accepter
    UPDATE public.users
    SET points_balance = points_balance - v_bounty.amount
    WHERE id = auth.uid();

    -- Update bounty status
    UPDATE public.bounties
    SET 
        status = 'accepted',
        accepted_by = auth.uid()
    WHERE id = p_bounty_id;

    -- Create session
    INSERT INTO public.sessions (bounty_id, streamer_id)
    VALUES (p_bounty_id, auth.uid())
    RETURNING id INTO v_session_id;

    RETURN jsonb_build_object(
        'success', true,
        'session_id', v_session_id,
        'message', 'Bounty accepted successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to finish a session
CREATE OR REPLACE FUNCTION public.finish_session(
    p_session_id UUID,
    p_approved BOOLEAN
)
RETURNS JSONB AS $$
DECLARE
    v_session RECORD;
    v_bounty RECORD;
BEGIN
    -- Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object('error', 'Not authenticated');
    END IF;

    -- Get session details with lock
    SELECT s.*, b.creator_id, b.amount
    INTO v_session
    FROM public.sessions s
    JOIN public.bounties b ON s.bounty_id = b.id
    WHERE s.id = p_session_id
    FOR UPDATE;

    -- Check if session exists
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Session not found');
    END IF;

    -- Check if user is the bounty creator
    IF v_session.creator_id != auth.uid() THEN
        RETURN jsonb_build_object('error', 'Only bounty creator can finish session');
    END IF;

    -- Check if session is active
    IF v_session.status != 'active' THEN
        RETURN jsonb_build_object('error', 'Session is not active');
    END IF;

    -- Update session
    UPDATE public.sessions
    SET 
        status = 'completed',
        completed_at = NOW(),
        approved = p_approved
    WHERE id = p_session_id;

    -- Update bounty status
    UPDATE public.bounties
    SET status = 'completed'
    WHERE id = v_session.bounty_id;

    -- If approved, credit the streamer
    IF p_approved THEN
        UPDATE public.users
        SET points_balance = points_balance + v_session.amount
        WHERE id = v_session.streamer_id;
    ELSE
        -- If rejected, refund the accepter
        UPDATE public.users
        SET points_balance = points_balance + v_session.amount
        WHERE id = v_session.streamer_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'approved', p_approved,
        'message', CASE 
            WHEN p_approved THEN 'Session completed and approved'
            ELSE 'Session completed and rejected'
        END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
-- Run this to verify everything was created:
/*
SELECT 'Tables:' as category, count(*) as count 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'bounties', 'sessions')
UNION ALL
SELECT 'Functions:' as category, count(*) as count 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('nearby_bounties', 'accept_bounty', 'finish_session', 'handle_new_user', 'update_updated_at_column')
UNION ALL
SELECT 'Policies:' as category, count(*) as count 
FROM pg_policies 
WHERE schemaname = 'public';
*/