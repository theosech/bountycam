'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'

// Dynamic import for LiveKit component
const LiveKitRoom = dynamic(
  () => import('@/components/video/LiveKitRoom'),
  { ssr: false }
)

interface SessionData {
  id: string
  bounty_id: string
  streamer_id: string
  status: string
  started_at: string
  room_name: string | null
  stream_started_at: string | null
  bounty: {
    id: string
    title: string
    description: string
    amount: number
    creator_id: string
  }
}

export default function SessionPage({ params }: { params: { id: string } }) {
  const [session, setSession] = useState<SessionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [livekitToken, setLivekitToken] = useState<string | null>(null)
  const [showVideo, setShowVideo] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchSession()
  }, [params.id])

  const fetchSession = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      setCurrentUserId(user.id)

      // Fetch session data
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          bounty:bounties(*)
        `)
        .eq('id', params.id)
        .single()

      if (error) throw error
      setSession(data)

      // Get LiveKit token if session is active
      if (data.status === 'active') {
        await fetchLiveKitToken()
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchLiveKitToken = async () => {
    try {
      const response = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId: params.id }),
      })

      if (!response.ok) {
        throw new Error('Failed to get streaming token')
      }

      const { token } = await response.json()
      setLivekitToken(token)
      setShowVideo(true)
    } catch (err: any) {
      console.error('Error fetching LiveKit token:', err)
      setError('Failed to initialize video stream')
    }
  }

  const handleFinishSession = async (approved: boolean) => {
    setIsProcessing(true)
    setError(null)

    try {
      // Log stream end if streaming
      if (session?.stream_started_at && !session.stream_ended_at) {
        await supabase
          .from('sessions')
          .update({ stream_ended_at: new Date().toISOString() })
          .eq('id', params.id)

        await supabase
          .from('stream_events')
          .insert({
            session_id: params.id,
            event_type: 'stream_ended',
            participant_id: currentUserId,
            metadata: { approved }
          })
      }

      const { data, error } = await supabase.rpc('finish_session', {
        p_session_id: params.id,
        p_approved: approved
      })

      if (error) throw error

      if (data.error) {
        setError(data.error)
      } else {
        router.push('/dashboard')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleStreamStart = async () => {
    console.log('Stream started')
    await supabase
      .from('stream_events')
      .insert({
        session_id: params.id,
        event_type: 'stream_active',
        participant_id: currentUserId,
        metadata: { timestamp: new Date().toISOString() }
      })
  }

  const handleStreamEnd = async () => {
    console.log('Stream ended')
    await supabase
      .from('stream_events')
      .insert({
        session_id: params.id,
        event_type: 'stream_inactive',
        participant_id: currentUserId,
        metadata: { timestamp: new Date().toISOString() }
      })
  }

  const handleStreamError = (error: Error) => {
    console.error('Stream error:', error)
    setError(`Stream error: ${error.message}`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading session...</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">Session not found</p>
      </div>
    )
  }

  const isStreamer = currentUserId === session.streamer_id
  const isCreator = currentUserId === session.bounty.creator_id

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white shadow rounded-lg">
          <div className="p-6 border-b">
            <h1 className="text-2xl font-bold">{session.bounty.title}</h1>
            {session.bounty.description && (
              <p className="text-gray-600 mt-1">{session.bounty.description}</p>
            )}
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-500">Bounty Amount</p>
                <p className="text-lg font-bold text-indigo-600">{session.bounty.amount} points</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-500">Session Status</p>
                <p className="text-lg font-bold capitalize">{session.status}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-500">Stream Status</p>
                <p className="text-lg font-bold">
                  {session.stream_started_at ? 'Live' : 'Not Started'}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-500">Your Role</p>
                <p className="text-lg font-bold">
                  {isStreamer ? 'Streamer' : isCreator ? 'Requester' : 'Viewer'}
                </p>
              </div>
            </div>
          </div>

          {/* Video Stream Area */}
          <div className="relative bg-black" style={{ aspectRatio: '16/9' }}>
            {showVideo && livekitToken && session.room_name ? (
              <LiveKitRoom
                roomName={session.room_name}
                token={livekitToken}
                isStreamer={isStreamer}
                onError={handleStreamError}
                onStreamStart={handleStreamStart}
                onStreamEnd={handleStreamEnd}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-white">
                <div className="text-center">
                  <p className="text-xl mb-2">📹 Live Stream</p>
                  {session.status === 'active' ? (
                    isStreamer ? (
                      <button
                        onClick={fetchLiveKitToken}
                        className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        Start Streaming
                      </button>
                    ) : (
                      <button
                        onClick={fetchLiveKitToken}
                        className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Join Stream
                      </button>
                    )
                  ) : (
                    <p className="text-sm text-gray-400">Session is not active</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Controls and Info */}
          <div className="p-6">
            {error && (
              <div className="mb-4 p-4 bg-red-50 text-red-600 rounded">{error}</div>
            )}

            {/* Controls for session creator */}
            {isCreator && session.status === 'active' && (
              <div className="border-t pt-4">
                <p className="text-sm text-gray-600 mb-3">
                  As the bounty creator, you can approve or reject this session:
                </p>
                <div className="flex space-x-4">
                  <button
                    onClick={() => handleFinishSession(true)}
                    disabled={isProcessing}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {isProcessing ? 'Processing...' : 'Approve & Pay'}
                  </button>
                  <button
                    onClick={() => handleFinishSession(false)}
                    disabled={isProcessing}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    {isProcessing ? 'Processing...' : 'Reject'}
                  </button>
                </div>
              </div>
            )}

            {/* Info for streamer */}
            {isStreamer && session.status === 'active' && (
              <div className="bg-blue-50 p-4 rounded">
                <p className="text-blue-900">
                  You are the streamer for this bounty. Start your stream above and complete the requested task. 
                  The requester will review and approve/reject when complete.
                </p>
              </div>
            )}

            {/* Session completed */}
            {session.status === 'completed' && (
              <div className="bg-green-50 p-4 rounded">
                <p className="text-green-900">
                  This session has been completed.
                  {session.approved && ' The bounty was approved and points were transferred.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}