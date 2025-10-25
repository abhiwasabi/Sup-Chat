import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';

const FaceDetectionTest = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [status, setStatus] = useState('Loading...');
  const [modelsLoaded, setModelsLoaded] = useState(false);

  useEffect(() => {
    loadModels();
    return () => {
      if (videoRef.current) {
        const stream = videoRef.current.srcObject;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      }
    };
  }, []);

  const loadModels = async () => {
    try {
      console.log('🧪 Loading face-api models for test...');
      setStatus('Loading models...');
      
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      console.log('🧪 Tiny face detector loaded');
      
      setModelsLoaded(true);
      setStatus('Models loaded!');
      console.log('🧪 Models loaded successfully');
    } catch (error) {
      console.error('🧪 Error loading models:', error);
      setStatus('Error loading models: ' + error.message);
    }
  };

  const startCamera = async () => {
    try {
      console.log('🧪 Starting camera...');
      setStatus('Starting camera...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 320, height: 240 } 
      });
      
      videoRef.current.srcObject = stream;
      videoRef.current.play();
      
      setStatus('Camera started!');
      console.log('🧪 Camera started');
    } catch (error) {
      console.error('🧪 Camera error:', error);
      setStatus('Camera error: ' + error.message);
    }
  };

  const testDetection = async () => {
    if (!modelsLoaded) {
      setStatus('Models not loaded!');
      return;
    }

    if (!videoRef.current.srcObject) {
      setStatus('Camera not started!');
      return;
    }

    try {
      console.log('🧪 Testing face detection...');
      setStatus('Detecting faces...');
      
      const detections = await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions());
      console.log('🧪 Detections:', detections);
      
      // Draw video frame
      const ctx = canvasRef.current.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, 320, 240);
      
      // Draw detections
      if (detections.length > 0) {
        const resizedDetections = faceapi.resizeResults(detections, { width: 320, height: 240 });
        faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
        setStatus(`Found ${detections.length} faces!`);
      } else {
        setStatus('No faces detected');
      }
      
    } catch (error) {
      console.error('🧪 Detection error:', error);
      setStatus('Detection error: ' + error.message);
    }
  };

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>🧪 Face Detection Test</h1>
      <div style={{ margin: '20px 0' }}>
        <strong>Status: {status}</strong>
      </div>
      
      <div style={{ margin: '20px 0' }}>
        <video 
          ref={videoRef} 
          width="320" 
          height="240" 
          autoPlay 
          muted 
          style={{ border: '1px solid black', margin: '10px' }}
        />
        <canvas 
          ref={canvasRef} 
          width="320" 
          height="240" 
          style={{ border: '1px solid red', margin: '10px' }}
        />
      </div>
      
      <div style={{ margin: '20px 0' }}>
        <button onClick={startCamera} style={{ margin: '5px', padding: '10px' }}>
          📹 Start Camera
        </button>
        <button onClick={testDetection} style={{ margin: '5px', padding: '10px' }}>
          🔍 Test Detection
        </button>
        <button onClick={loadModels} style={{ margin: '5px', padding: '10px' }}>
          🧠 Load Models
        </button>
      </div>
    </div>
  );
};

export default FaceDetectionTest;

