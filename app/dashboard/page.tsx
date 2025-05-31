import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  // Fetch user data
  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  // Fetch user's bounties
  const { data: myBounties } = await supabase
    .from('bounties')
    .select('*')
    .eq('creator_id', user.id)
    .order('created_at', { ascending: false })

  // Fetch user's sessions
  const { data: mySessions } = await supabase
    .from('sessions')
    .select(`
      *,
      bounty:bounties(*)
    `)
    .eq('streamer_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-indigo-50 p-4 rounded">
              <h2 className="font-semibold text-indigo-900">Points Balance</h2>
              <p className="text-3xl font-bold text-indigo-600">{userData?.points_balance || 0}</p>
            </div>
            <div className="bg-green-50 p-4 rounded">
              <h2 className="font-semibold text-green-900">My Bounties</h2>
              <p className="text-3xl font-bold text-green-600">{myBounties?.length || 0}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded">
              <h2 className="font-semibold text-purple-900">My Sessions</h2>
              <p className="text-3xl font-bold text-purple-600">{mySessions?.length || 0}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">My Bounties</h2>
              <Link
                href="/new-bounty"
                className="text-sm bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
              >
                Create New
              </Link>
            </div>
            <div className="space-y-3">
              {myBounties?.map((bounty) => (
                <div key={bounty.id} className="border rounded p-3">
                  <h3 className="font-semibold">{bounty.title}</h3>
                  <div className="flex justify-between text-sm text-gray-600 mt-1">
                    <span>{bounty.amount} points</span>
                    <span className={`capitalize ${
                      bounty.status === 'open' ? 'text-green-600' :
                      bounty.status === 'accepted' ? 'text-yellow-600' :
                      bounty.status === 'completed' ? 'text-blue-600' :
                      'text-gray-600'
                    }`}>
                      {bounty.status}
                    </span>
                  </div>
                </div>
              ))}
              {(!myBounties || myBounties.length === 0) && (
                <p className="text-gray-500">No bounties created yet</p>
              )}
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">My Sessions</h2>
              <Link
                href="/bounties"
                className="text-sm bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Find Bounties
              </Link>
            </div>
            <div className="space-y-3">
              {mySessions?.map((session) => (
                <div key={session.id} className="border rounded p-3">
                  <h3 className="font-semibold">{session.bounty?.title}</h3>
                  <div className="flex justify-between text-sm text-gray-600 mt-1">
                    <span>{session.bounty?.amount} points</span>
                    <span className={`capitalize ${
                      session.status === 'active' ? 'text-yellow-600' :
                      session.status === 'completed' ? 'text-green-600' :
                      'text-gray-600'
                    }`}>
                      {session.status}
                    </span>
                  </div>
                  {session.status === 'active' && (
                    <Link
                      href={`/session/${session.id}`}
                      className="text-sm text-indigo-600 hover:text-indigo-800 mt-2 inline-block"
                    >
                      Go to Session →
                    </Link>
                  )}
                </div>
              ))}
              {(!mySessions || mySessions.length === 0) && (
                <p className="text-gray-500">No sessions started yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}