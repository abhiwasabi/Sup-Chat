import React, { useState, useEffect, useRef } from 'react';
import './ChatInterface.css';

const ChatInterface = ({ socket, streamId, isStreaming }) => {
  const [messages, setMessages] = useState([]);
  const [audienceCount, setAudienceCount] = useState(0);
  const [wasStreaming, setWasStreaming] = useState(false);
  const messagesEndRef = useRef(null);

  const clearChat = () => {
    setMessages([]);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Track streaming state changes
  useEffect(() => {
    if (isStreaming) {
      setWasStreaming(true);
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
      setMessages(prev => [...prev, { ...message, isFake: true }]);
    });

    // Listen for real chat messages
    socket.on('real-chat-message', (message) => {
      setMessages(prev => [...prev, { ...message, isReal: true }]);
    });

    // Listen for audience count updates
    socket.on('audience-update', (count) => {
      setAudienceCount(count);
    });

    // Listen for stream stopped event
    socket.on('stream-stopped', () => {
      setMessages([]);
      setAudienceCount(0);
    });

    return () => {
      socket.off('fake-chat-message');
      socket.off('real-chat-message');
      socket.off('audience-update');
      socket.off('stream-stopped');
    };
  }, [socket]);


  return (
    <div className="chat-interface">
      <div className="chat-header">
        <div className="chat-title">
          <h3>💬 Live Chat</h3>
          <div className="audience-count">
            👥 {audienceCount} viewers
          </div>
        </div>
        <button onClick={clearChat} className="clear-chat-btn">
          🗑️ Clear
        </button>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <div className="empty-icon">💭</div>
            <p>Chat messages will appear here when you start streaming</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`chat-message ${msg.isFake ? 'fake-message' : msg.isReal ? 'real-message' : ''}`}
            >
            <div className="message-header">
              <span className="username">
                {msg.username}
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
