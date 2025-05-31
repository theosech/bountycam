'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'

const Map = dynamic(() => import('@/components/map/Map'), { ssr: false })

interface NearbyBounty {
  id: string
  creator_id: string
  title: string
  description: string
  amount: number
  lat: number
  lng: number
  distance_km: number
  status: string
  created_at: string
}

export default function BountiesPage() {
  const [bounties, setBounties] = useState<NearbyBounty[]>([])
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedBounty, setSelectedBounty] = useState<string | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords
          setUserLocation([latitude, longitude])
          await fetchNearbyBounties(latitude, longitude)
        },
        (error) => {
          console.error('Error getting location:', error)
          // Default to LA if location access denied
          setUserLocation([34.0522, -118.2437])
          fetchNearbyBounties(34.0522, -118.2437)
        }
      )
    } else {
      // Default to LA if geolocation not supported
      setUserLocation([34.0522, -118.2437])
      fetchNearbyBounties(34.0522, -118.2437)
    }
  }, [])

  const fetchNearbyBounties = async (lat: number, lng: number) => {
    try {
      const { data, error } = await supabase.rpc('nearby_bounties', {
        user_lat: lat,
        user_lng: lng,
        radius_km: 2
      })

      if (error) throw error
      setBounties(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAcceptBounty = async (bountyId: string) => {
    setSelectedBounty(bountyId)
    setError(null)

    try {
      const { data, error } = await supabase.rpc('accept_bounty', {
        p_bounty_id: bountyId
      })

      if (error) throw error

      if (data.error) {
        setError(data.error)
      } else {
        // Navigate to the session page
        router.push(`/session/${data.session_id}`)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSelectedBounty(null)
    }
  }

  const mapMarkers = bounties.map(bounty => ({
    id: bounty.id,
    position: [bounty.lat, bounty.lng] as [number, number],
    title: bounty.title,
    amount: bounty.amount
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Nearby Bounties</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Map */}
          <div className="bg-white shadow rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">Bounties Map</h2>
            <div className="h-96">
              {userLocation && (
                <Map
                  center={userLocation}
                  markers={mapMarkers}
                  zoom={13}
                />
              )}
            </div>
          </div>

          {/* Bounties List */}
          <div className="bg-white shadow rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">Available Bounties</h2>
            
            {isLoading && (
              <p className="text-gray-500">Loading nearby bounties...</p>
            )}
            
            {error && (
              <div className="text-red-600 text-sm mb-4">{error}</div>
            )}
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {bounties.map((bounty) => (
                <div key={bounty.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg">{bounty.title}</h3>
                    <span className="text-lg font-bold text-indigo-600">{bounty.amount} pts</span>
                  </div>
                  
                  {bounty.description && (
                    <p className="text-gray-600 text-sm mb-2">{bounty.description}</p>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">
                      {bounty.distance_km.toFixed(1)} km away
                    </span>
                    <button
                      onClick={() => handleAcceptBounty(bounty.id)}
                      disabled={selectedBounty === bounty.id}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm"
                    >
                      {selectedBounty === bounty.id ? 'Accepting...' : 'Accept Bounty'}
                    </button>
                  </div>
                </div>
              ))}
              
              {!isLoading && bounties.length === 0 && (
                <p className="text-gray-500">No bounties found within 2km</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}