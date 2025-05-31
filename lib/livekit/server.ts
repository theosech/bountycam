import { AccessToken } from 'livekit-server-sdk'

const livekitHost = process.env.NEXT_PUBLIC_LIVEKIT_URL!
const apiKey = process.env.LIVEKIT_API_KEY!
const apiSecret = process.env.LIVEKIT_API_SECRET!

export interface ParticipantInfo {
  identity: string
  name: string
  metadata?: string
}

export async function createToken(
  roomName: string,
  participantInfo: ParticipantInfo,
  canPublish: boolean = false
) {
  const at = new AccessToken(apiKey, apiSecret, {
    identity: participantInfo.identity,
    name: participantInfo.name,
    metadata: participantInfo.metadata,
  })

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish,
    canSubscribe: true,
  })

  return at.toJwt()
}

export function getRoomName(sessionId: string): string {
  return `session-${sessionId}`
}