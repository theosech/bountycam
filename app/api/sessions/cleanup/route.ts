import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// This endpoint can be called by a cron job to clean up inactive sessions
export async function POST(request: Request) {
  try {
    // Verify this is an authorized request (you might want to add API key auth)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CLEANUP_API_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    // Find sessions that have been active for more than 2 hours without activity
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    
    const { data: inactiveSessions, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('status', 'active')
      .lt('updated_at', twoHoursAgo)

    if (error) {
      throw error
    }

    if (!inactiveSessions || inactiveSessions.length === 0) {
      return NextResponse.json({ message: 'No inactive sessions found' })
    }

    // Process each inactive session
    for (const session of inactiveSessions) {
      // Log stream end event
      await supabase
        .from('stream_events')
        .insert({
          session_id: session.id,
          event_type: 'session_timeout',
          metadata: { reason: 'inactivity_timeout' }
        })

      // Mark session as cancelled
      await supabase
        .from('sessions')
        .update({ 
          status: 'cancelled',
          stream_ended_at: new Date().toISOString()
        })
        .eq('id', session.id)

      // Update bounty back to open
      await supabase
        .from('bounties')
        .update({ 
          status: 'open',
          accepted_by: null
        })
        .eq('id', session.bounty_id)

      // Refund points to streamer
      await supabase
        .from('users')
        .update({ 
          points_balance: supabase.raw('points_balance + ?', [session.bounty.amount])
        })
        .eq('id', session.streamer_id)
    }

    return NextResponse.json({ 
      message: `Cleaned up ${inactiveSessions.length} inactive sessions` 
    })

  } catch (error) {
    console.error('Session cleanup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}