import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createToken, getRoomName } from '@/lib/livekit/server'

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select(`
        *,
        bounty:bounties(*)
      `)
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Check if user is authorized to join this session
    const isStreamer = session.streamer_id === user.id
    const isCreator = session.bounty.creator_id === user.id

    if (!isStreamer && !isCreator) {
      return NextResponse.json(
        { error: 'Not authorized to join this session' },
        { status: 403 }
      )
    }

    // Generate LiveKit token
    const roomName = session.room_name || getRoomName(sessionId)
    const token = await createToken(
      roomName,
      {
        identity: user.id,
        name: user.email || 'User',
        metadata: JSON.stringify({
          role: isStreamer ? 'streamer' : 'viewer',
          sessionId,
        }),
      },
      isStreamer // Only streamer can publish
    )

    // Update room name in database if not set
    if (!session.room_name) {
      await supabase
        .from('sessions')
        .update({ room_name: roomName })
        .eq('id', sessionId)
    }

    // Log stream start if streamer
    if (isStreamer && session.status === 'active' && !session.stream_started_at) {
      await supabase
        .from('sessions')
        .update({ stream_started_at: new Date().toISOString() })
        .eq('id', sessionId)

      // Log event
      await supabase
        .from('stream_events')
        .insert({
          session_id: sessionId,
          event_type: 'stream_started',
          participant_id: user.id,
          metadata: { role: 'streamer' }
        })
    }

    return NextResponse.json({
      token,
      roomName,
      isStreamer,
    })
  } catch (error) {
    console.error('Error generating LiveKit token:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}