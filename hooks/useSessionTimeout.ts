import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function useSessionTimeout(
  sessionId: string,
  isActive: boolean,
  timeoutMinutes: number = 30
) {
  const router = useRouter()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<Date>(new Date())
  const supabase = createClient()

  const updateActivity = () => {
    lastActivityRef.current = new Date()
  }

  const checkTimeout = async () => {
    const inactiveMinutes = 
      (new Date().getTime() - lastActivityRef.current.getTime()) / 1000 / 60

    if (inactiveMinutes >= timeoutMinutes) {
      // Session timed out - update status
      await supabase
        .from('stream_events')
        .insert({
          session_id: sessionId,
          event_type: 'session_timeout_warning',
          metadata: { 
            inactive_minutes: inactiveMinutes,
            timestamp: new Date().toISOString()
          }
        })

      // Redirect to dashboard
      router.push('/dashboard')
    }
  }

  useEffect(() => {
    if (!isActive) return

    // Set up activity listeners
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach(event => {
      document.addEventListener(event, updateActivity)
    })

    // Check for timeout every minute
    const interval = setInterval(checkTimeout, 60 * 1000)

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity)
      })
      clearInterval(interval)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [sessionId, isActive, timeoutMinutes])

  return { updateActivity }
}
