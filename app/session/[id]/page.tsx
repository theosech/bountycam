import { createServerSupabaseClient } from '@/lib/supabase/server'
import SessionClient from './SessionClient'

// Using any type to bypass the TypeScript error
// This is a temporary workaround
export default async function SessionPage({ params }: { params: any }) {
  const supabase = await createServerSupabaseClient()
  
  // Fetch initial session data
  const { data: session } = await supabase
    .from('sessions')
    .select(`
      *,
      bounty:bounties(*)
    `)
    .eq('id', params.id)
    .single()

  return <SessionClient initialSession={session} sessionId={params.id} />
}
