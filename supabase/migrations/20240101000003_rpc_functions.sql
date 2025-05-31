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