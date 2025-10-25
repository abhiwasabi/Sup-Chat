import React, { useState, useEffect, useRef, useCallback } from 'react';
import './SpeechRecognition.css';

const SpeechRecognition = ({ onSpeechDetected, isStreaming, isEnabled }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    // Only initialize speech recognition if streaming and enabled
    if (!isStreaming || !isEnabled) {
      return;
    }
    
    // Check if speech recognition is supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSupported(true);
      recognitionRef.current = new SpeechRecognition();
      
      // Configure recognition
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.maxAlternatives = 1;

      // Event handlers
      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          const confidence = event.results[i][0].confidence;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
            setConfidence(confidence);
          } else {
            interimTranscript += transcript;
          }
        }

        const fullTranscript = finalTranscript || interimTranscript;
        setTranscript(fullTranscript);

        // Send final results to parent component
        if (finalTranscript && onSpeechDetected) {
          onSpeechDetected({
            text: finalTranscript,
            confidence: confidence,
            timestamp: new Date().toISOString()
          });
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setError(`Speech recognition error: ${event.error}`);
        setIsListening(false);
        
        // Auto-restart on certain errors if streaming and enabled
        if (isStreaming && isEnabled && event.error !== 'not-allowed' && event.error !== 'service-not-allowed') {
          setTimeout(() => {
            if (recognitionRef.current && isStreaming && isEnabled) {
              try {
                recognitionRef.current.start();
              } catch (err) {
                console.error('Error restarting speech recognition after error:', err);
              }
            }
          }, 1000); // Longer delay after error
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        // Auto-restart listening if streaming and enabled
        if (isStreaming && isEnabled) {
          setTimeout(() => {
            if (recognitionRef.current && isStreaming && isEnabled) {
              try {
                recognitionRef.current.start();
              } catch (err) {
                console.error('Error restarting speech recognition:', err);
              }
            }
          }, 100); // Small delay before restart
        }
      };
    } else {
      setSupported(false);
      setError('Speech recognition not supported in this browser');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onSpeechDetected, isStreaming, isEnabled]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && supported && isStreaming && isEnabled) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('Error starting speech recognition:', err);
        setError('Failed to start speech recognition');
      }
    }
  }, [supported, isStreaming, isEnabled]);

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  // Auto-start/stop based on streaming status
  useEffect(() => {
    if (isStreaming && isEnabled && supported) {
      startListening();
    } else {
      stopListening();
    }
  }, [isStreaming, isEnabled, supported, startListening]);

  // Cleanup when component unmounts or streaming stops
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  if (!supported) {
    return (
      <div className="speech-recognition">
        <div className="speech-error">
          <div className="error-icon">🎤</div>
          <p>Speech recognition not supported in this browser</p>
          <p className="error-subtitle">Try using Chrome, Edge, or Safari</p>
        </div>
      </div>
    );
  }

  return (
    <div className="speech-recognition">
      <div className="speech-header">
        <h4>🎤 Speech Recognition</h4>
        <div className={`speech-status ${isListening ? 'listening' : 'idle'}`}>
          {isListening ? '🔴 Listening' : '⚫ Idle'}
        </div>
      </div>

      <div className="speech-controls">
        <button
          onClick={isListening ? stopListening : startListening}
          disabled={!isStreaming || !isEnabled}
          className={`speech-button ${isListening ? 'stop' : 'start'}`}
        >
          {isListening ? '⏹️ Stop Listening' : '🎤 Start Listening'}
        </button>
      </div>

      {error && (
        <div className="speech-error">
          <p>{error}</p>
        </div>
      )}

      <div className="speech-transcript">
        <div className="transcript-header">
          <span>What you're saying:</span>
          {confidence > 0 && (
            <span className="confidence">
              Confidence: {Math.round(confidence * 100)}%
            </span>
          )}
        </div>
        <div className="transcript-text">
          {transcript || 'Start speaking to see your words here...'}
        </div>
      </div>

      <div className="speech-tips">
        <h5>💡 Tips for better recognition:</h5>
        <ul>
          <li>Speak clearly and at a normal pace</li>
          <li>Use a good microphone</li>
          <li>Minimize background noise</li>
          <li>Allow microphone permissions</li>
        </ul>
      </div>
    </div>
  );
};

export default SpeechRecognition;
