import React, { useState, useEffect, useRef } from 'react';
import './ChatInterface.css';

const ChatInterface = ({ socket, streamId, isStreaming }) => {
  const [messages, setMessages] = useState([]);
  const [audienceCount, setAudienceCount] = useState(0);
  const [wasStreaming, setWasStreaming] = useState(false);
  const messagesEndRef = useRef(null);
  const chatMessagesRef = useRef(null);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const [newMessagesCount, setNewMessagesCount] = useState(0);

  const clearChat = () => {
    setMessages([]);
  };

  const handleScrollToBottom = () => {
    scrollToBottom();
    setNewMessagesCount(0);
    setIsUserScrolledUp(false);
  };

  // Smart auto-scroll: only scroll if user is at bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Check if user is at bottom of chat
  const checkIfAtBottom = () => {
    if (chatMessagesRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatMessagesRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50; // 50px threshold
      setIsUserScrolledUp(!isAtBottom);
    }
  };

  // Auto-scroll only if user is at bottom
  useEffect(() => {
    if (!isUserScrolledUp) {
      scrollToBottom();
      setNewMessagesCount(0); // Reset counter when auto-scrolling
    } else {
      // User is scrolled up, increment new messages counter
      setNewMessagesCount(prev => prev + 1);
    }
  }, [messages, isUserScrolledUp]);

  // Add scroll listener to detect user scrolling
  useEffect(() => {
    const chatElement = chatMessagesRef.current;
    if (chatElement) {
      chatElement.addEventListener('scroll', checkIfAtBottom);
      return () => chatElement.removeEventListener('scroll', checkIfAtBottom);
    }
  }, []);

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
      <div className="chat-messages" ref={chatMessagesRef}>
        {messages.length === 0 ? (
          <div className="empty-chat">
            <p style={{ color: '#666666' }}>Chat messages will appear here when you start streaming</p>
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

      {/* Scroll to bottom button - only show when user is scrolled up */}
      {isUserScrolledUp && newMessagesCount > 0 && (
        <div className="scroll-to-bottom-container">
          <button 
            onClick={handleScrollToBottom}
            className="scroll-to-bottom-btn"
          >
            ↓ {newMessagesCount} new message{newMessagesCount > 1 ? 's' : ''}
          </button>
        </div>
      )}

    </div>
  );
};

export default ChatInterface;
