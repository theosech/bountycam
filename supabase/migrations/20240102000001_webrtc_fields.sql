-- Add WebRTC room tracking fields to sessions table
ALTER TABLE public.sessions
ADD COLUMN room_name TEXT,
ADD COLUMN stream_started_at TIMESTAMPTZ,
ADD COLUMN stream_ended_at TIMESTAMPTZ,
ADD COLUMN thumbnail_url TEXT;

-- Create index for room lookups
CREATE INDEX idx_sessions_room_name ON public.sessions(room_name);

-- Create stream events table for logging
CREATE TABLE public.stream_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    participant_id TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS for stream_events
ALTER TABLE public.stream_events ENABLE ROW LEVEL SECURITY;

-- Users can view stream events for their sessions
CREATE POLICY "Users can view own stream events" ON public.stream_events
    FOR SELECT USING (
        session_id IN (
            SELECT id FROM public.sessions 
            WHERE streamer_id = auth.uid() OR
            bounty_id IN (
                SELECT id FROM public.bounties WHERE creator_id = auth.uid()
            )
        )
    );

-- Update accept_bounty function to include room name
CREATE OR REPLACE FUNCTION public.accept_bounty(
    p_bounty_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_bounty RECORD;
    v_user_balance INTEGER;
    v_session_id UUID;
    v_room_name TEXT;
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

    -- Generate session ID
    v_session_id := uuid_generate_v4();
    v_room_name := 'session-' || v_session_id;

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

    -- Create session with room name
    INSERT INTO public.sessions (id, bounty_id, streamer_id, room_name)
    VALUES (v_session_id, p_bounty_id, auth.uid(), v_room_name);

    RETURN jsonb_build_object(
        'success', true,
        'session_id', v_session_id,
        'room_name', v_room_name,
        'message', 'Bounty accepted successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;