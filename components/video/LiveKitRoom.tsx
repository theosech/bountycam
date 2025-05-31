'use client'

import { useState, useEffect } from 'react'
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  ConnectionState,
  useConnectionState,
  useLocalParticipant,
  useRemoteParticipants,
  VideoTrack,
  AudioTrack,
  useTracks,
  Track,
} from '@livekit/components-react'
import '@livekit/components-styles'

interface LiveKitRoomProps {
  roomName: string
  token: string
  isStreamer: boolean
  onError?: (error: Error) => void
  onStreamStart?: () => void
  onStreamEnd?: () => void
}

function RoomContent({ isStreamer, onStreamStart, onStreamEnd }: { 
  isStreamer: boolean
  onStreamStart?: () => void
  onStreamEnd?: () => void
}) {
  const connectionState = useConnectionState()
  const localParticipant = useLocalParticipant()
  const remoteParticipants = useRemoteParticipants()
  const tracks = useTracks([Track.Source.Camera, Track.Source.Microphone])

  useEffect(() => {
    if (connectionState === ConnectionState.Connected && isStreamer && localParticipant.isCameraEnabled) {
      onStreamStart?.()
    }
  }, [connectionState, isStreamer, localParticipant.isCameraEnabled, onStreamStart])

  useEffect(() => {
    if (connectionState === ConnectionState.Disconnected) {
      onStreamEnd?.()
    }
  }, [connectionState, onStreamEnd])

  // Custom layout for streamer view
  if (isStreamer) {
    return (
      <div className="relative h-full w-full bg-black">
        <VideoConference />
        <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded">
          {connectionState === ConnectionState.Connected ? (
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              LIVE
            </span>
          ) : (
            <span>Connecting...</span>
          )}
        </div>
      </div>
    )
  }

  // Viewer layout - show only remote video
  const remoteTracks = tracks.filter(track => !track.participant.isLocal)
  const videoTrack = remoteTracks.find(track => track.source === Track.Source.Camera)

  return (
    <div className="relative h-full w-full bg-black flex items-center justify-center">
      {videoTrack ? (
        <VideoTrack trackRef={videoTrack} className="w-full h-full object-contain" />
      ) : (
        <div className="text-white text-center">
          <p className="text-xl mb-2">Waiting for streamer...</p>
          <p className="text-sm text-gray-400">The stream will appear here once the streamer goes live</p>
        </div>
      )}
      <RoomAudioRenderer />
      {remoteParticipants.length > 0 && (
        <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Watching Live
          </span>
        </div>
      )}
    </div>
  )
}

export default function BountyCamLiveKitRoom({
  roomName,
  token,
  isStreamer,
  onError,
  onStreamStart,
  onStreamEnd,
}: LiveKitRoomProps) {
  const [roomError, setRoomError] = useState<Error | null>(null)

  const handleError = (error: Error) => {
    console.error('LiveKit Room Error:', error)
    setRoomError(error)
    onError?.(error)
  }

  if (roomError) {
    return (
      <div className="h-full w-full bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white p-6">
          <p className="text-xl mb-2">Stream Error</p>
          <p className="text-sm text-gray-400 mb-4">{roomError.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <LiveKitRoom
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      token={token}
      connectOptions={{
        autoSubscribe: true,
      }}
      options={{
        adaptiveStream: true,
        dynacast: true,
      }}
      onError={handleError}
      className="h-full w-full"
    >
      <RoomContent 
        isStreamer={isStreamer} 
        onStreamStart={onStreamStart}
        onStreamEnd={onStreamEnd}
      />
    </LiveKitRoom>
  )
}