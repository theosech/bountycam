'use client'

import { useEffect } from 'react'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

interface MapProps {
  center?: [number, number]
  zoom?: number
  markers?: Array<{
    id: string
    position: [number, number]
    title: string
    amount?: number
  }>
  onMapClick?: (lat: number, lng: number) => void
  clickedPosition?: [number, number] | null
}

function LocationMarker({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng)
      }
    },
  })
  return null
}

export default function Map({ 
  center = [34.0522, -118.2437], // Default to LA
  zoom = 13, 
  markers = [],
  onMapClick,
  clickedPosition
}: MapProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="w-full h-full"
      style={{ minHeight: '400px' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <LocationMarker onMapClick={onMapClick} />
      
      {/* Render existing markers */}
      {markers.map((marker) => (
        <Marker key={marker.id} position={marker.position}>
          {/* Popup can be added here if needed */}
        </Marker>
      ))}
      
      {/* Render clicked position marker */}
      {clickedPosition && (
        <Marker position={clickedPosition}>
          {/* This is the marker for new bounty location */}
        </Marker>
      )}
    </MapContainer>
  )
}