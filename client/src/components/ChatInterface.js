import React, { useState, useEffect, useRef } from 'react';
import './ChatInterface.css';

const ChatInterface = ({ socket, streamId, isStreaming }) => {
  const [messages, setMessages] = useState([]);
  const [audienceCount, setAudienceCount] = useState(0);
  const [wasStreaming, setWasStreaming] = useState(false);
  const [streamEnded, setStreamEnded] = useState(false);
  const messagesEndRef = useRef(null);
  const chatMessagesRef = useRef(null);

  const clearChat = () => {
    setMessages([]);
  };

  // Auto-scroll to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Auto-scroll whenever new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Track streaming state changes
  useEffect(() => {
    if (isStreaming) {
      setWasStreaming(true);
      setStreamEnded(false); // Reset stream ended state when streaming starts
    } else if (wasStreaming && !isStreaming) {
      // Only clear when streaming actually stops (not on initial load)
      setMessages([]);
      setAudienceCount(0);
      setWasStreaming(false);
    }
  }, [isStreaming, wasStreaming]);

  useEffect(() => {
    if (!socket) return;

    // Listen for fake chat messages
    socket.on('fake-chat-message', (message) => {
      if (!streamEnded) {
        setMessages(prev => [...prev, { ...message, isFake: true }]);
      }
    });

    // Listen for real chat messages
    socket.on('real-chat-message', (message) => {
      if (!streamEnded) {
        setMessages(prev => [...prev, { ...message, isReal: true }]);
      }
    });

    // Listen for donation messages
    socket.on('donation-message', (message) => {
      if (!streamEnded) {
        console.log('💰 Donation message received:', message);
        setMessages(prev => [...prev, { ...message, isDonation: true }]);
        
        // Play donation sound
        playDonationSound();
        
        // Play TTS for donation message with new format
        speakDonation(message.username, message.amount, message.message);
      }
    });

    // Listen for audience count updates
    socket.on('audience-update', (count) => {
      setAudienceCount(count);
    });

    // Listen for stream stopped event
    socket.on('stream-stopped', () => {
      // Mark stream as ended to prevent new messages
      setStreamEnded(true);
      
      // Add "Stream has ended" message
      const streamEndedMessage = {
        id: Date.now(),
        username: 'System',
        message: 'Stream has ended. Thank you for watching!',
        timestamp: new Date().toISOString(),
        isSystem: true
      };
      setMessages([streamEndedMessage]);
      setAudienceCount(0);
      
      // Auto-scroll to show the message
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return () => {
      socket.off('fake-chat-message');
      socket.off('real-chat-message');
      socket.off('donation-message');
      socket.off('audience-update');
      socket.off('stream-stopped');
    };
  }, [socket, streamEnded]);

  // Play donation sound
  const playDonationSound = () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Twitch donation sound - ascending notes
    const notes = [
      { freq: 330, duration: 0.1, delay: 0 },
      { freq: 392, duration: 0.1, delay: 0.15 },
      { freq: 523, duration: 0.1, delay: 0.3 }
    ];
    
    notes.forEach(note => {
      setTimeout(() => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = note.freq;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + note.duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + note.duration);
      }, note.delay * 1000);
    });
  };

  // Text to speech for donation
  const speakDonation = (username, amount, message) => {
    if ('speechSynthesis' in window) {
      // Get voices and wait for them to load
      const getVoices = () => {
        return new Promise((resolve) => {
          let voices = speechSynthesis.getVoices();
          if (voices.length > 0) {
            resolve(voices);
          } else {
            speechSynthesis.onvoiceschanged = () => {
              resolve(speechSynthesis.getVoices());
            };
          }
        });
      };

      getVoices().then((voices) => {
        // Format: "[username] donated [amount] and said [message]"
        const messageOnly = message.replace(/^\$\d+\s*-\s*/, ''); // Remove amount prefix if present
        const textToSpeak = `${username} donated ${amount} and said ${messageOnly}`;
        
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.voice = voices.find(voice => 
          voice.name.toLowerCase().includes('brian') || 
          voice.name.toLowerCase().includes('male') ||
          voice.lang.startsWith('en')
        ) || voices[0];
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;
        console.log('🎤 Speaking donation message:', textToSpeak);
        speechSynthesis.speak(utterance);
      });
    }
  };


  return (
    <div className="chat-interface">
      <div className="chat-messages" ref={chatMessagesRef}>
        {messages.length === 0 ? (
          <div className="empty-chat">
            <p style={{ color: '#666666' }}>Chat messages will appear here when you start streaming</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`chat-message ${
                msg.isDonation ? 'donation-message' : 
                msg.isSystem || msg.username === 'System' ? 'system-message' :
                msg.isFake ? 'fake-message' : 
                msg.isReal ? 'real-message' : ''
              }`}
            >
            <div className="message-header">
              <span className="username">
                {msg.isDonation && '💰 '}{msg.username}
              </span>
              <span className="message-time">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </div>
              <div className="message-content">
                <span className="message-text">{msg.message}</span>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>


    </div>
  );
};

export default ChatInterface;
