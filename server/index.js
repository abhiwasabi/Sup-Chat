const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const OpenAI = require('openai');
require('dotenv').config();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

// Generate OpenAI-powered responses
async function generateOpenAIResponse(streamerName, personality, speechContent) {
  try {
    console.log(`🤖 Calling OpenAI API for ${personality.name}...`);
    console.log(`📝 Speech content: "${speechContent}"`);
    
    // If no speech content, generate a general response
    let prompt;
    if (!speechContent || speechContent.trim() === '') {
      prompt = `You are ${personality.name}, a ${personality.personality} in a live stream chat. The streamer "${streamerName}" is streaming. 

Respond as this character would in a live chat. Keep it short (1-2 sentences max), casual, and engaging. Use the emoji ${personality.emoji} if appropriate. Be authentic to the personality.

Examples of good responses:
- GamingFan123: "yo what's up! 🔥"
- StreamLover: "hey there! ❤️" 
- TechGuru: "nice stream! ⚡"
- NewViewer: "first time here! 👋"
- HypeMaster: "LET'S GO! 🚀"
- ChillViewer: "chilling here 😌"

Respond now:`;
    } else {
      prompt = `You are ${personality.name}, a ${personality.personality} in a live stream chat. The streamer just said: "${speechContent}". 

Respond as this character would in a live chat. Keep it short (1-2 sentences max), casual, and engaging. Use the emoji ${personality.emoji} if appropriate. Be authentic to the personality.

Examples of good responses:
- GamingFan123: "yo that was sick! 🔥"
- StreamLover: "aww you're so sweet ❤️" 
- TechGuru: "nice setup btw ⚡"
- NewViewer: "hey first time here! 👋"
- HypeMaster: "LET'S GOOO! 🚀"
- ChillViewer: "chilling and enjoying the vibes 😌"

IMPORTANT: 
- Only respond as your character
- Do NOT include "Streamer:" or any character names in your response
- Do NOT include your own name (${personality.name}) in the response
- Just respond naturally as if you're chatting
- Example: Instead of "StreamLover: Hello!" just say "Hello!"

Respond now:`;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 50,
      temperature: 0.8,
    });

    let response = completion.choices[0].message.content.trim();
    
    // Remove personality name from response if it's included
    if (response.startsWith(`${personality.name}:`)) {
      response = response.replace(`${personality.name}:`, '').trim();
    }
    if (response.startsWith(`${personality.name}`)) {
      response = response.replace(`${personality.name}`, '').trim();
    }
    
    // Remove "Streamer:" references
    response = response.replace(/Streamer:\s*"[^"]*"/g, '').trim();
    response = response.replace(/Streamer:\s*[^"]*/g, '').trim();
    response = response.replace(/^Streamer:\s*/g, '').trim();
    
    // Remove any remaining personality name patterns
    response = response.replace(new RegExp(`${personality.name}:\\s*`, 'g'), '').trim();
    response = response.replace(new RegExp(`${personality.name}\\s*`, 'g'), '').trim();
    
    // Remove any character name followed by colon
    response = response.replace(/^[A-Za-z]+:\s*/g, '').trim();
    
    // Remove any remaining quotes that might be left
    response = response.replace(/^["']|["']$/g, '').trim();
    
    // Clean up any extra whitespace or newlines
    response = response.replace(/\n+/g, ' ').trim();
    
    // Final cleanup - remove any remaining character name patterns
    response = response.replace(/^(StreamLover|GamingFan123|TechGuru|NewViewer|HypeMaster|ChillViewer):\s*/g, '').trim();
    
    console.log(`🧠 OpenAI response: ${response}`);
    return response;
  } catch (error) {
    console.error('❌ OpenAI API error:', error.message);
    return null;
  }
}

// Generate fake chat messages - ONLY using ChatGPT
async function generateFakeMessage(streamerName, personality, speechContent = null) {
  // Always use OpenAI for responses
  const openAIResponse = await generateOpenAIResponse(streamerName, personality, speechContent);
  
  if (openAIResponse) {
    return {
      id: Date.now() + Math.random(),
      username: personality.name,
      message: openAIResponse,
      emoji: personality.emoji,
      timestamp: new Date().toISOString(),
      isOpenAI: true,
      isContextual: !!speechContent
    };
  }
  
  // If OpenAI fails, return null (no fallback)
  console.log(`❌ Failed to generate OpenAI response for ${personality.name}`);
  return null;
}

// Removed hardcoded responses - now using only ChatGPT

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

    // Start generating fake messages (only general responses, not speech-triggered)
    const interval = setInterval(async () => {
      if (activeStreams.has(streamId)) {
        const personality = chatPersonalities[Math.floor(Math.random() * chatPersonalities.length)];
        const fakeMessage = await generateFakeMessage(activeStreams.get(streamId).streamerName, personality, null);
        
        // Only send message if OpenAI generated a response
        if (fakeMessage) {
          io.to(streamId).emit('fake-chat-message', fakeMessage);
          
          // Update audience count
          const stream = activeStreams.get(streamId);
          stream.audienceCount = Math.min(stream.audienceCount + 1, 50); // Cap at 50 fake viewers
          activeStreams.set(streamId, stream);
          
          io.to(streamId).emit('audience-update', stream.audienceCount);
        }
      }
    }, Math.random() * 5000 + 5000); // Random interval between 5-10 seconds (less frequent)

    // Store interval for cleanup
    socket.fakeAudienceInterval = interval;
  });

  // Stop fake audience
  socket.on('stop-fake-audience', (streamId) => {
    if (socket.fakeAudienceInterval) {
      clearInterval(socket.fakeAudienceInterval);
      socket.fakeAudienceInterval = null;
    }
    
    // Clear the stream data
    if (activeStreams.has(streamId)) {
      activeStreams.delete(streamId);
    }
    
    // Notify that the stream has stopped
    io.to(streamId).emit('stream-stopped');
  });

  // Handle speech detection
  socket.on('speech-detected', async (data) => {
    const { streamId, speechContent, confidence } = data;
    console.log(`Speech detected in stream ${streamId}: "${speechContent}" (confidence: ${confidence})`);
    
    // Generate contextual fake audience responses based on speech
    if (activeStreams.has(streamId)) {
      const personality = chatPersonalities[Math.floor(Math.random() * chatPersonalities.length)];
      console.log(`Generating AI response for personality: ${personality.name}`);
      
      const fakeMessage = await generateFakeMessage(activeStreams.get(streamId).streamerName, personality, speechContent);
      console.log(`Generated message:`, fakeMessage);
      
      // Only send message if OpenAI generated a response
      if (fakeMessage) {
        io.to(streamId).emit('fake-chat-message', fakeMessage);
      }
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
