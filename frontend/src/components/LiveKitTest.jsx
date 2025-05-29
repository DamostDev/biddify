// src/components/LiveKitTest.jsx
import React, { useEffect, useState } from 'react';
import { Room, LogLevel, RoomEvent } from 'livekit-client';

const LIVEKIT_URL = 'wss://biddify-eae9wk6t.livekit.cloud'; // Your URL
// Hardcode a token that you know is valid from your backend logs for testing
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJtZXRhZGF0YSI6IntcInJvbGVcIjpcInN0cmVhbWVyXCIsXCJzdHJlYW1JZFwiOjJ9IiwibmFtZSI6ImFzZGZkZGciLCJ2aWRlbyI6eyJyb29tIjoiYmlkZGlmeS1zdHJlYW0tMi0yOThmNWJhOCIsInJvb21Kb2luIjp0cnVlLCJjYW5QdWJsaXNoIjp0cnVlLCJjYW5TdWJzY3JpYmUiOnRydWUsImNhblB1Ymxpc2hEYXRhIjp0cnVlLCJjYW5VcGRhdGVPd25NZXRhZGF0YSI6dHJ1ZSwiaGlkZGVuIjpmYWxzZX0sImlzcyI6IkFQSTVVV1ZQNVVDdWJ2SiIsImV4cCI6MTc0ODU1NzQ0OSwibmJmIjowLCJzdWIiOiJ1c2VyLTUtc3RyZWFtZXItMiJ9.SBjmZejYBYa7Kmku23ejvhoEujHck1EA1vU7Ipe_3G4'; // Replace with a fresh, valid token

function LiveKitTest() {
  const [status, setStatus] = useState('Idle');
  const [roomName, setRoomName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!TEST_TOKEN || !LIVEKIT_URL) {
      setStatus('Missing URL or Token for test.');
      return;
    }

    setStatus('Connecting...');
    const room = new Room({
      logLevel: LogLevel.debug, // Get max logs from client
    });

    room.on(RoomEvent.ConnectionStateChanged, (state) => {
        console.log('[MinimalTest] Connection State:', state);
        setStatus(`LiveKit State: ${state}`);
    });
    
    room.on(RoomEvent.Disconnected, (reason) => {
        console.log('[MinimalTest] Disconnected. Reason:', reason);
        setError(`Disconnected: ${reason || 'Unknown'}`);
    });


    console.log('[MinimalTest] Attempting to connect with URL:', LIVEKIT_URL, 'and Token:', TEST_TOKEN);

    room.connect(LIVEKIT_URL, TEST_TOKEN)
      .then((connectedRoomInstance) => {
        console.log('[MinimalTest] connect().then() called. Received:', connectedRoomInstance);
        if (connectedRoomInstance && typeof connectedRoomInstance.name !== 'undefined') {
          setStatus('Connected successfully!');
          setRoomName(connectedRoomInstance.name);
          console.log('[MinimalTest] Room Name:', connectedRoomInstance.name);
          // You could try enabling media here too if it's a streamer token
          // await connectedRoomInstance.localParticipant.setCameraEnabled(true);
        } else {
          setStatus('Connect promise resolved, but room object is invalid.');
          setError('Invalid room object from connect(). Received: ' + JSON.stringify(connectedRoomInstance));
          console.error('[MinimalTest] Invalid room object:', connectedRoomInstance);
        }
      })
      .catch((err) => {
        setStatus('Connection failed.');
        setError(`Error: ${err.message}`);
        console.error('[MinimalTest] Connection error:', err);
      });

    return () => {
      console.log('[MinimalTest] Cleaning up, disconnecting room.');
      room.disconnect(true);
    };
  }, []);

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px' }}>
      <h2>LiveKit Minimal Connection Test</h2>
      <p><strong>Status:</strong> {status}</p>
      {roomName && <p><strong>Connected to Room:</strong> {roomName}</p>}
      {error && <p style={{ color: 'red' }}><strong>Error:</strong> {error}</p>}
      <p>Check the console for detailed logs.</p>
    </div>
  );
}
export default LiveKitTest;