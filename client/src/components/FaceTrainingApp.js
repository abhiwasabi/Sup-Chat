import React, { useState, useEffect } from 'react';
import FaceTraining from './FaceTraining';
import { io } from 'socket.io-client';

const FaceTrainingApp = () => {
  const [socket, setSocket] = useState(null);
  const [streamId, setStreamId] = useState(null);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io('http://localhost:9000');
    setSocket(newSocket);

    // Generate unique stream ID
    const id = 'stream_' + Math.random().toString(36).substr(2, 9);
    setStreamId(id);

    return () => {
      newSocket.close();
    };
  }, []);

  return (
    <FaceTraining 
      socket={socket}
      streamId={streamId}
    />
  );
};

export default FaceTrainingApp;

