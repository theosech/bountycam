'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface SessionData {
  id: string
  bounty_id: string
  streamer_id: string
  status: string
  started_at: string
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
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFinishSession = async (approved: boolean) => {
    setIsProcessing(true)
    setError(null)

    try {
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
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-6">Streaming Session</h1>
          
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">{session.bounty.title}</h2>
              {session.bounty.description && (
                <p className="text-gray-600 mt-1">{session.bounty.description}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded">
                <p className="text-sm text-gray-500">Bounty Amount</p>
                <p className="text-xl font-bold text-indigo-600">{session.bounty.amount} points</p>
              </div>
              <div className="bg-gray-50 p-4 rounded">
                <p className="text-sm text-gray-500">Session Status</p>
                <p className="text-xl font-bold capitalize">{session.status}</p>
              </div>
            </div>

            {/* Placeholder for video stream */}
            <div className="bg-gray-900 rounded-lg aspect-video flex items-center justify-center">
              <div className="text-center text-white">
                <p className="text-xl mb-2">📹 Live Stream Placeholder</p>
                <p className="text-sm text-gray-400">Video streaming will be implemented in Phase 2</p>
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
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
                  You are currently streaming for this bounty. The bounty creator will review and approve/reject when complete.
                </p>
              </div>
            )}

            {/* Session completed */}
            {session.status === 'completed' && (
              <div className="bg-green-50 p-4 rounded">
                <p className="text-green-900">
                  This session has been completed.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}