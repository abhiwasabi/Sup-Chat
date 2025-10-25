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
    name: "valkyrae",
    emoji: "🤔"
  },
  {
    name: "pokimane",
    emoji: "💪"
  },
  {
    name: "Tfue",
    emoji: "📖"
  },
  {
    name: "TSM_Myth",
    emoji: "💡"
  },
  {
    name: "xQc",
    emoji: "😊"
  },
  {
    name: "TenZ",
    emoji: "❓"
  },
  {
    name: "neon",
    emoji: "💀"
  },
  {
    name: "Lacy",
    emoji: "😡"
  },
  {
    name: "LinusTechTips",
    emoji: "🤓"
  },
  {
    name: "marlon",
    emoji: "🌊"
  },
  {
    name: "Kai Cenat",
    emoji: "🔥"
  }
];

// Generate fake chat messages based on speech content
async function generateFakeMessage(streamerName, personality, speechContent = null) {
  // Build a natural, contextual prompt with unique personality traits
  const prompt = `
You are ${personality.name}, a real streamer/YouTuber with a unique personality and speaking style.

${personality.name === 'valkyrae' ? 'You are Valkyrae - known for being genuine, supportive, and asking thoughtful questions. You speak casually but thoughtfully.' : ''}
${personality.name === 'pokimane' ? 'You are Pokimane - known for being bubbly, encouraging, and using expressions like "periodt" and "slay". You are very supportive and positive.' : ''}
${personality.name === 'Tfue' ? 'You are Tfue - known for being direct, competitive, and using gaming slang. You speak confidently and sometimes use abbreviations.' : ''}
${personality.name === 'TSM_Myth' ? 'You are Myth - known for being analytical, strategic, and using technical gaming terms. You think logically and ask smart questions.' : ''}
${personality.name === 'xQc' ? 'You are xQc - known for being energetic, dramatic, and using expressions like "POGGERS" and "OMEGALUL". You react strongly to everything.' : ''}
${personality.name === 'TenZ' ? 'You are TenZ - known for being chill, humble, and using gaming terminology. You speak casually and are very supportive.' : ''}
${personality.name === 'neon' ? 'You are neon - known for being toxic, negative, and complaining about everything. You find fault in everything and spread negativity.' : ''}
${personality.name === 'Lacy' ? 'You are Lacy - known for being bitter, hateful, and always finding something to hate. You are very negative and toxic.' : ''}
${personality.name === 'LinusTechTips' ? 'You are LinusTechTips - known for being extremely nerdy, using technical jargon, and over-analyzing everything. You speak like a computer scientist.' : ''}
${personality.name === 'marlon' ? 'You are marlon - known for being super relaxed, using lots of "bro" and "dude", and speaking in chill slang. You are very laid back.' : ''}
${personality.name === 'Kai Cenat' ? 'You are Kai Cenat - known for being toxic, dramatic, and using expressions like "nah" and "bro". You are known for being controversial and sometimes negative.' : ''}

The streamer just said: "${speechContent || 'Hello everyone, welcome to my stream!'}"

Respond as ${personality.name} would - with your unique personality, speaking style, and typical expressions.
Make it sound authentic to your real personality, not generic.
Keep it 3-12 words, relevant to what they said, and in lowercase.
CRITICAL: Do NOT use quotes, apostrophes, or any quotation marks in your response.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // or gpt-5 if available
      messages: [{ role: "user", content: prompt }],
      max_tokens: 30,
      temperature: 1.0,
    });

    let message = completion.choices[0].message.content.trim();
    
    // Remove any quotes, apostrophes, or quotation marks
    message = message.replace(/[""'']/g, '');
    
    // Ensure all lowercase
    message = message.toLowerCase();
    
    // Smart emoji logic: only add emojis to enthusiastic responses
    const enthusiasticWords = ['amazing', 'awesome', 'love', 'great', 'fantastic', 'incredible', 'wow', 'yes', 'excited', 'happy', 'best', 'perfect', 'wonderful', 'brilliant', 'epic', 'fire', 'lit', 'hype', 'pumped', 'stoked'];
    const isEnthusiastic = enthusiasticWords.some(word => message.includes(word));
    
    // Remove all existing emojis first
    message = message.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
    
    // Only add emoji if response is enthusiastic
    if (isEnthusiastic) {
      const emojiOptions = ['😭', '💀', '😹', '♥️', '🖤', '👌'];
      const randomEmoji = emojiOptions[Math.floor(Math.random() * emojiOptions.length)];
      message = message + ' ' + randomEmoji;
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
      // Generate initial random viewer count between 10 and 100
      const initialCount = Math.floor(Math.random() * 91) + 10; // 10-100
      activeStreams.set(streamId, {
        streamerName: 'Streamer',
        isActive: true,
        audienceCount: initialCount
      });
      // Send initial audience count
      io.to(streamId).emit('audience-update', initialCount);
    }

    // Start generating fake messages
    const interval = setInterval(async () => {
      if (activeStreams.has(streamId)) {
        const personality = chatPersonalities[Math.floor(Math.random() * chatPersonalities.length)];
        // Generate random idle messages with different topics
        const idleTopics = [
          "just chilling and watching",
          "this stream is so good",
          "love the vibes here",
          "streamer is so talented",
          "having a great time",
          "this content is fire",
          "streamer is amazing",
          "love this community"
        ];
        const randomTopic = idleTopics[Math.floor(Math.random() * idleTopics.length)];
        
        const fakeMessage = await generateFakeMessage(
          activeStreams.get(streamId).streamerName,
          personality,
          randomTopic
        );

        io.to(streamId).emit('fake-chat-message', fakeMessage);

        const stream = activeStreams.get(streamId);
        if (stream) {
          // Generate random viewer count between 10 and 100
          stream.audienceCount = Math.floor(Math.random() * 91) + 10; // 10-100
          activeStreams.set(streamId, stream);
          io.to(streamId).emit('audience-update', stream.audienceCount);
        }
      }
    }, Math.random() * 8000 + 5000); // Faster random messages (5-13 seconds)

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
    
    // Send final audience count of 0
    io.to(streamId).emit('audience-update', 0);
    
    // Notify that the stream has stopped
    io.to(streamId).emit('stream-stopped');
  });

  // Handle speech detection
  socket.on('speech-detected', async (data) => {
    const { streamId, speechContent, confidence } = data;
    console.log(`Speech detected in stream ${streamId}: "${speechContent}" (confidence: ${confidence})`);
    
    if (activeStreams.has(streamId)) {
      try {
        // Generate 3 different responses in parallel for maximum speed
        const usedPersonalities = new Set();
        const personalityPromises = [];
        
        for (let i = 0; i < 3; i++) {
          let personality;
          // Ensure we get 3 different personalities
          do {
            personality = chatPersonalities[Math.floor(Math.random() * chatPersonalities.length)];
          } while (usedPersonalities.has(personality.name) && usedPersonalities.size < chatPersonalities.length);
          
          usedPersonalities.add(personality.name);
          
          // Create promise for parallel execution
          personalityPromises.push(
            generateFakeMessage(
              activeStreams.get(streamId).streamerName,
              personality,
              speechContent
            )
          );
        }
        
        // Execute all API calls in parallel
        const responses = await Promise.all(personalityPromises);
        
        // Send all 3 responses with minimal delays for fast response
        responses.forEach((message, index) => {
          setTimeout(() => {
            io.to(streamId).emit('fake-chat-message', message);
          }, index * 200); // 200ms delay between each response for fast, natural flow
        });
      } catch (error) {
        console.error("Error generating speech responses:", error);
        // Send fallback message if API fails
        const fallbackMessage = {
          id: Date.now() + Math.random(),
          username: "Viewer",
          message: "that's so cool! 😭",
          emoji: "😭",
          timestamp: new Date().toISOString(),
          isContextual: true
        };
        io.to(streamId).emit('fake-chat-message', fallbackMessage);
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