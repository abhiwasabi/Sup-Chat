const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/build')));

// Store active streams and fake audience
const activeStreams = new Map();
const fakeAudience = [];

// AI Chat personalities
const chatPersonalities = [
  {
    name: "GamingFan123",
    personality: "enthusiastic gamer who loves reactions and hype",
    emoji: "🎮"
  },
  {
    name: "StreamLover",
    personality: "supportive viewer who asks questions and gives compliments",
    emoji: "❤️"
  },
  {
    name: "TechGuru",
    personality: "technical viewer who comments on stream quality and setup",
    emoji: "⚡"
  },
  {
    name: "NewViewer",
    personality: "curious new viewer who asks about the streamer and content",
    emoji: "👋"
  },
  {
    name: "HypeMaster",
    personality: "energetic viewer who creates excitement and momentum",
    emoji: "🔥"
  },
  {
    name: "ChillViewer",
    personality: "relaxed viewer who enjoys casual conversation",
    emoji: "😌"
  }
];

// Generate fake chat messages based on speech content
function generateFakeMessage(streamerName, personality, speechContent = null) {
  // If we have speech content, generate contextual responses
  if (speechContent) {
    const contextualResponses = generateContextualResponse(speechContent, personality);
    if (contextualResponses.length > 0) {
      const randomResponse = contextualResponses[Math.floor(Math.random() * contextualResponses.length)];
      return {
        id: Date.now() + Math.random(),
        username: personality.name,
        message: randomResponse,
        emoji: personality.emoji,
        timestamp: new Date().toISOString(),
        isContextual: true
      };
    }
  }

  // Fallback to general messages if no speech content or no contextual responses
  const messages = {
    enthusiastic: [
      "This is amazing! 🔥",
      "You're doing great!",
      "Love the energy!",
      "This is so entertaining!",
      "Keep it up!",
      "You're killing it!",
      "This is the best stream ever!",
      "Can't stop watching!"
    ],
    supportive: [
      "You're doing great!",
      "Love your content!",
      "Thanks for streaming!",
      "You're so talented!",
      "This is really helpful!",
      "You're awesome!",
      "Keep being you!",
      "You're inspiring!"
    ],
    technical: [
      "Great stream quality!",
      "Nice setup!",
      "Audio sounds perfect!",
      "Video is crystal clear!",
      "What camera are you using?",
      "Great lighting!",
      "Smooth streaming!",
      "Professional quality!"
    ],
    curious: [
      "How long have you been streaming?",
      "What games do you usually play?",
      "Where are you from?",
      "What's your favorite game?",
      "How did you get into streaming?",
      "What's your setup like?",
      "Do you stream every day?",
      "What's your goal for streaming?"
    ],
    energetic: [
      "LET'S GO! 🚀",
      "THIS IS HYPE!",
      "YOOO THIS IS FIRE!",
      "BEST STREAM EVER!",
      "HYPE TRAIN! 🚂",
      "AMAZING CONTENT!",
      "KEEP THE ENERGY UP!",
      "THIS IS INSANE!"
    ],
    casual: [
      "Nice stream!",
      "Chilling here",
      "Good vibes",
      "Relaxing content",
      "Enjoying this",
      "Cool stream",
      "Nice background music",
      "Peaceful vibes"
    ]
  };

  const personalityMap = {
    "enthusiastic gamer who loves reactions and hype": "enthusiastic",
    "supportive viewer who asks questions and gives compliments": "supportive", 
    "technical viewer who comments on stream quality and setup": "technical",
    "curious new viewer who asks about the streamer and content": "curious",
    "energetic viewer who creates excitement and momentum": "energetic",
    "relaxed viewer who enjoys casual conversation": "casual"
  };

  const messageType = personalityMap[personality] || "supportive";
  const messageList = messages[messageType];
  const randomMessage = messageList[Math.floor(Math.random() * messageList.length)];
  
  return {
    id: Date.now() + Math.random(),
    username: personality.name,
    message: randomMessage,
    emoji: personality.emoji,
    timestamp: new Date().toISOString()
  };
}

// Generate contextual responses based on speech content
function generateContextualResponse(speechContent, personality) {
  const speech = speechContent.toLowerCase();
  const responses = [];

  // Gaming-related responses
  if (speech.includes('game') || speech.includes('play') || speech.includes('win') || speech.includes('lose')) {
    if (personality.name === "GamingFan123") {
      responses.push("YES! I love this game too! 🎮", "That was an amazing play!", "You're so good at this!", "I'm learning so much from you!");
    }
    if (personality.name === "HypeMaster") {
      responses.push("LET'S GOOO! 🚀", "THAT WAS INSANE!", "YOU'RE CRUSHING IT!", "HYPE TRAIN! 🚂");
    }
  }

  // Greeting responses
  if (speech.includes('hello') || speech.includes('hi') || speech.includes('hey') || speech.includes('welcome')) {
    if (personality.name === "NewViewer") {
      responses.push("Hi! Thanks for the welcome! 👋", "Hello! Great to be here!", "Hey! Loving the stream so far!");
    }
    if (personality.name === "StreamLover") {
      responses.push("Hello! Thanks for having us! ❤️", "Hi! You're so welcoming!", "Hey! Great to see you!");
    }
  }

  // Question responses
  if (speech.includes('?') || speech.includes('ask') || speech.includes('question')) {
    if (personality.name === "NewViewer") {
      responses.push("Great question!", "I was wondering that too!", "Thanks for asking!");
    }
    if (personality.name === "CuriousViewer") {
      responses.push("That's a really good question!", "I'm curious about that too!", "Thanks for bringing that up!");
    }
  }

  // Technical responses
  if (speech.includes('camera') || speech.includes('audio') || speech.includes('quality') || speech.includes('setup')) {
    if (personality.name === "TechGuru") {
      responses.push("Your setup looks amazing! ⚡", "Great audio quality!", "What camera are you using?", "Professional setup!");
    }
  }

  // Encouragement responses
  if (speech.includes('nervous') || speech.includes('scared') || speech.includes('worried') || speech.includes('anxious')) {
    if (personality.name === "StreamLover") {
      responses.push("Don't worry, you're doing great! ❤️", "You've got this!", "We believe in you!", "You're amazing!");
    }
    if (personality.name === "ChillViewer") {
      responses.push("Just relax and be yourself 😌", "You're doing fine!", "Take your time!", "We're here for you!");
    }
  }

  // Achievement responses
  if (speech.includes('achievement') || speech.includes('accomplish') || speech.includes('success') || speech.includes('proud')) {
    if (personality.name === "StreamLover") {
      responses.push("Congratulations! 🎉", "You should be proud!", "That's amazing!", "Well done!");
    }
    if (personality.name === "HypeMaster") {
      responses.push("YES! CELEBRATION TIME! 🎊", "YOU DID IT!", "AMAZING ACHIEVEMENT!", "FIRE! 🔥");
    }
  }

  // Time-related responses
  if (speech.includes('time') || speech.includes('hour') || speech.includes('minute') || speech.includes('long')) {
    if (personality.name === "NewViewer") {
      responses.push("Time flies when you're having fun!", "I could watch this all day!", "How long have you been streaming?");
    }
  }

  // Food/drink responses
  if (speech.includes('food') || speech.includes('eat') || speech.includes('drink') || speech.includes('hungry')) {
    if (personality.name === "ChillViewer") {
      responses.push("Now I'm hungry too! 😋", "What are you eating?", "Food break sounds good!");
    }
  }

  // Music responses
  if (speech.includes('music') || speech.includes('song') || speech.includes('beat') || speech.includes('sound')) {
    if (personality.name === "ChillViewer") {
      responses.push("Love the music! 🎵", "Great playlist!", "This song is awesome!");
    }
  }

  return responses;
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join stream room
  socket.on('join-stream', (streamId) => {
    socket.join(streamId);
    console.log(`User ${socket.id} joined stream ${streamId}`);
  });

  // Start fake audience for a stream
  socket.on('start-fake-audience', (streamId) => {
    if (!activeStreams.has(streamId)) {
      activeStreams.set(streamId, {
        streamerName: 'Streamer',
        isActive: true,
        audienceCount: 0
      });
    }

    // Start generating fake messages
    const interval = setInterval(() => {
      if (activeStreams.has(streamId)) {
        const personality = chatPersonalities[Math.floor(Math.random() * chatPersonalities.length)];
        const fakeMessage = generateFakeMessage(activeStreams.get(streamId).streamerName, personality);
        
        // Send to streamer's room
        io.to(streamId).emit('fake-chat-message', fakeMessage);
        
        // Update audience count
        const stream = activeStreams.get(streamId);
        stream.audienceCount = Math.min(stream.audienceCount + 1, 50); // Cap at 50 fake viewers
        activeStreams.set(streamId, stream);
        
        io.to(streamId).emit('audience-update', stream.audienceCount);
      }
    }, Math.random() * 3000 + 2000); // Random interval between 2-5 seconds

    // Store interval for cleanup
    socket.fakeAudienceInterval = interval;
  });

  // Stop fake audience
  socket.on('stop-fake-audience', (streamId) => {
    if (socket.fakeAudienceInterval) {
      clearInterval(socket.fakeAudienceInterval);
      socket.fakeAudienceInterval = null;
    }
  });

  // Handle speech detection
  socket.on('speech-detected', (data) => {
    const { streamId, speechContent, confidence } = data;
    console.log(`Speech detected in stream ${streamId}: "${speechContent}" (confidence: ${confidence})`);
    
    // Generate contextual fake audience responses based on speech
    if (activeStreams.has(streamId)) {
      const personality = chatPersonalities[Math.floor(Math.random() * chatPersonalities.length)];
      const fakeMessage = generateFakeMessage(activeStreams.get(streamId).streamerName, personality, speechContent);
      
      // Send contextual response to streamer's room
      io.to(streamId).emit('fake-chat-message', fakeMessage);
    }
  });

  // Handle real chat messages (from actual viewers)
  socket.on('chat-message', (data) => {
    const { streamId, username, message } = data;
    io.to(streamId).emit('real-chat-message', {
      id: Date.now(),
      username,
      message,
      timestamp: new Date().toISOString(),
      isReal: true
    });
  });

  // Handle streamer updates
  socket.on('update-streamer-name', (data) => {
    const { streamId, streamerName } = data;
    if (activeStreams.has(streamId)) {
      const stream = activeStreams.get(streamId);
      stream.streamerName = streamerName;
      activeStreams.set(streamId, stream);
    }
  });

  // Cleanup on disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (socket.fakeAudienceInterval) {
      clearInterval(socket.fakeAudienceInterval);
    }
  });
});

// API Routes
app.get('/api/streams', (req, res) => {
  res.json(Array.from(activeStreams.entries()).map(([id, stream]) => ({
    id,
    ...stream
  })));
});

app.get('/api/stream/:id', (req, res) => {
  const streamId = req.params.id;
  const stream = activeStreams.get(streamId);
  
  if (stream) {
    res.json({ id: streamId, ...stream });
  } else {
    res.status(404).json({ error: 'Stream not found' });
  }
});

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

const PORT = process.env.PORT || 9000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
