# BountyCam Phase 2: WebRTC Live Streaming Setup

## Overview

Phase 2 adds real-time video streaming capabilities using LiveKit Cloud as the WebRTC provider. Each bounty session now includes live video streaming with role-based publishing (only streamers can broadcast).

## New Features

### 1. **Live Video Streaming**
- Integrated LiveKit for WebRTC video/audio
- Unique room per session (using session UUID)
- Role-based permissions (streamer publishes, requester views)
- Automatic room creation on bounty acceptance

### 2. **Session Lifecycle**
- Stream starts when streamer clicks "Start Streaming"
- Automatic cleanup for inactive sessions (2-hour timeout)
- Stream events logged to database
- Session ends on approval/rejection

### 3. **Enhanced Dashboard**
- "Watch Live" button for active sessions
- Real-time status updates
- Stream status indicators

## Configuration

### 1. **LiveKit Setup**

1. Sign up for LiveKit Cloud at https://livekit.io
2. Create a new project
3. Get your API credentials

### 2. **Environment Variables**

Update `.env.local`:
```env
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
CLEANUP_API_KEY=your_cleanup_api_key
```

### 3. **Database Migration**

Run the new migration to add WebRTC fields:
```sql
-- In Supabase SQL Editor
-- Run: supabase/migrations/20240102000001_webrtc_fields.sql
```

## Architecture

### Components

1. **LiveKitRoom Component** (`components/video/LiveKitRoom.tsx`)
   - Handles video/audio streaming
   - Different UI for streamer vs viewer
   - Error handling and reconnection

2. **Token Generation** (`app/api/livekit/token/route.ts`)
   - Secure token generation
   - Role-based permissions
   - Session validation

3. **Session Page Updates** (`app/session/[id]/page.tsx`)
   - Integrated video player
   - Stream controls
   - Real-time status updates

### Data Flow

1. Streamer accepts bounty → Session created with room name
2. Streamer/Requester joins session → Token generated with appropriate permissions
3. Stream starts → Events logged to database
4. Session ends → Points transferred, stream stopped

## Stream Events Tracking

Events logged to `stream_events` table:
- `stream_started` - When streamer begins broadcasting
- `stream_active` - When stream is successfully connected
- `stream_inactive` - When stream disconnects
- `stream_ended` - When session is completed
- `session_timeout` - When session times out due to inactivity

## Error Handling

- Connection failures show retry button
- Token generation failures fall back to error message
- Network issues handled by LiveKit SDK
- Session timeouts automatically clean up resources

## Security

- Tokens are generated server-side only
- Role validation ensures only streamers can publish
- Session ownership verified before token generation
- Service key never exposed to client

## Testing

1. Create two test accounts
2. Account A: Create a bounty
3. Account B: Accept the bounty
4. Account B: Start streaming from session page
5. Account A: Watch stream and approve/reject

## Troubleshooting

### Stream Not Showing
- Check LiveKit credentials in `.env.local`
- Verify browser permissions for camera/microphone
- Check console for WebRTC errors

### Token Generation Failed
- Ensure user is authenticated
- Verify session exists and is active
- Check API route logs

### Connection Issues
- LiveKit uses TURN servers by default
- Check firewall settings
- Verify WebSocket connections allowed

## Next Steps

Phase 3 will add:
- Stream recording capabilities
- Thumbnail generation
- Advanced verification features
- Stream quality metrics