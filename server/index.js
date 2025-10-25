const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

// AI Chat personalities - Vlog Style
const chatPersonalities = [
  {
    name: "CuriousCat",
    personality: "curious viewer who asks follow-up questions about your life and experiences",
    emoji: "🤔"
  },
  {
    name: "SupportiveSam",
    personality: "encouraging viewer who gives positive feedback and emotional support",
    emoji: "💪"
  },
  {
    name: "StorySeeker",
    personality: "interested viewer who wants to hear more details and stories",
    emoji: "📖"
  },
  {
    name: "AdviceGiver",
    personality: "helpful viewer who offers suggestions and shares similar experiences",
    emoji: "💡"
  },
  {
    name: "ReactionRiley",
    personality: "expressive viewer who reacts emotionally to what you share",
    emoji: "😊"
  },
  {
    name: "QuestionQueen",
    personality: "inquisitive viewer who asks thoughtful questions about your content",
    emoji: "❓"
  }
];

// Generate fake chat messages based on speech content
async function generateFakeMessage(streamerName, personality, speechContent = null) {
  // Build a natural, contextual prompt
  const prompt = `
You are acting as a vlog viewer named ${personality.name}.
Personality: ${personality.personality}.
Tone: sound like a real vlog commenter — casual, supportive, interested in personal content, short messages, rarely use emojis (only 1-2 per message max).
Respond to what the vlogger is actually saying, not about gaming or streaming.

The vlogger's name is ${streamerName}.
${speechContent ? `They just said: "${speechContent}"` : "No recent speech content."}

Write ONE comment you'd realistically post right now.
It should be 3–12 words long, relevant to what they said, and natural.
IMPORTANT: Write your response in ALL LOWERCASE letters only.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // or gpt-5 if available
      messages: [{ role: "user", content: prompt }],
      max_tokens: 30,
      temperature: 1.0,
    });

    let message = completion.choices[0].message.content.trim();
    
    // Ensure all lowercase
    message = message.toLowerCase();
    
    // Limit emojis to max 2 per message
    const emojiMatches = message.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu);
    if (emojiMatches && emojiMatches.length > 2) {
      // Keep only first 2 emojis
      const emojisToKeep = emojiMatches.slice(0, 2);
      message = message.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
      message = message + emojisToKeep.join('');
    }

    return {
      id: Date.now() + Math.random(),
      username: personality.name,
      message,
      emoji: personality.emoji,
      timestamp: new Date().toISOString(),
      isContextual: !!speechContent
    };
  } catch (err) {
    console.error("Error generating AI chat:", err);
    // fallback if API fails
    return {
      id: Date.now() + Math.random(),
      username: personality.name,
      message: "bro this stream wild 😭",
      emoji: personality.emoji,
      timestamp: new Date().toISOString()
    };
  }
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
    const interval = setInterval(async () => {
      if (activeStreams.has(streamId)) {
        const personality = chatPersonalities[Math.floor(Math.random() * chatPersonalities.length)];
        const fakeMessage = await generateFakeMessage(
          activeStreams.get(streamId).streamerName,
          personality
        );

        io.to(streamId).emit('fake-chat-message', fakeMessage);

        const stream = activeStreams.get(streamId);
        if (stream) {
          stream.audienceCount = Math.min(stream.audienceCount + 1, 50);
          activeStreams.set(streamId, stream);
          io.to(streamId).emit('audience-update', stream.audienceCount);
        }
      }
    }, Math.random() * 3000 + 2000);

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
  socket.on('speech-detected', async (data) => {
    const { streamId, speechContent, confidence } = data;
    console.log(`Speech detected in stream ${streamId}: "${speechContent}" (confidence: ${confidence})`);
    
    if (activeStreams.has(streamId)) {
      const personality = chatPersonalities[Math.floor(Math.random() * chatPersonalities.length)];
      const fakeMessage = await generateFakeMessage(
        activeStreams.get(streamId).streamerName,
        personality,
        speechContent
      );
      
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