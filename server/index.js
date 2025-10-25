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

// 🧠 Realistic Twitch Chat Personalities
const chatPersonalities = [
  {
    name: "Kai Cenat",
    personality: "high-energy streamer-fan who treats every moment like a highlight reel, types in caps, uses hype slang and emotes constantly",
    emoji: "🔥"
  },
  {
    name: "Marques Brownlee",
    personality: "the tech-savvy viewer who notices the streamer’s gear, bitrate, fps drops, and offers friendly commentary/compliments on stream quality",
    emoji: "⚙️"
  },
  {
    name: "Jynxi",
    personality: "the sarcastic but affectionate regular, drops witty one-liners, irony, memes, a little poke at the streamer but always in good fun",
    emoji: "😏"
  },
  {
    name: "ninja",
    personality: "the wholesome, supportive viewer — cheers everyone on, uses hearts and kind emojis, asks questions to show genuine interest rather than trolling",
    emoji: "💖"
  },
  {
    name: "xQc",
    personality: "the chaotic meme-lord in chat: throws emotes, spam jokes, reacts wildly, maybe posts random “KEKW” or “PogChamp”-style lines — not mean, just wild",
    emoji: "💀"
  },
  {
    name: "pokimane",
    personality: "the low-key lurker who rarely types, but when they do it’s a short cryptic, funny or random comment — kind of mysterious and calm",
    emoji: "👀"
  },
  {
    name: "iLuvKpop",
    personality: "the new viewer who’s excited but a bit awkward, asking newbie questions, dropping first-time messages, discovering the stream vibe",
    emoji: "👋"
  }
];


// 🎤 Generate OpenAI-powered chat responses
async function generateOpenAIResponse(streamerName, personality, speechContent) {
  try {
    console.log(`🤖 Calling OpenAI API for ${personality.name}...`);
    console.log(`📝 Speech content: "${speechContent}"`);

    const prompt = `
You are ${personality.name}, a ${personality.personality} chatting in a fast-paced live Twitch stream for ${streamerName}. 
Write a short, natural, human-like message (6–16 words) reacting in the chat. 

STYLE RULES:
- Sound like a real Twitch chatter (casual, spontaneous, sometimes slightly chaotic)
- Include slang, emotes (like LUL, Pog, KEKW, 😭🔥💀), or abbreviations if it fits
- Avoid full sentences that sound like essays
- Sometimes use lowercase or missing punctuation — not perfect grammar
- Only respond once, keep it natural (don’t overexplain)
- Don’t mention ${personality.name} or ${streamerName}
- Optionally add the emoji ${personality.emoji} at the end if it feels natural

Good examples:
- "yo that was insane 😭🔥"
- "bro really said that LMAOO 💀"
- "mic setup goin crazy ngl ⚙️"
- "ayy let's gooo Pog 🔥"
- "vibes are immaculate rn 😌"
- "first stream i’ve caught live, feelsgoodman 👋"

Streamer just said: "${speechContent || "nothing specific, just chatting"}"
Now respond as ${personality.name}.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 50,
      temperature: 1.1, // more variety and randomness
    });

    let response = completion.choices[0].message.content.trim();

    // Clean up response
    response = response
      .replace(/^[A-Za-z]+:\s*/g, '') // remove "Name: "
      .replace(/^["']|["']$/g, '') // remove quotes
      .replace(/\n+/g, ' ') // remove newlines
      .trim()
      .toLowerCase(); // convert to lowercase

    console.log(`🧠 OpenAI response: ${response}`);
    return response;
  } catch (error) {
    console.error('❌ OpenAI API error:', error.message);
    return null;
  }
}

// 🎭 Generate a fake chat message
async function generateFakeMessage(streamerName, personality, speechContent = null) {
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

  console.log(`❌ Failed to generate OpenAI response for ${personality.name}`);
  return null;
}

// 🧩 Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join stream room
  socket.on('join-stream', (streamId) => {
    socket.join(streamId);
    console.log(`User ${socket.id} joined stream ${streamId}`);
  });

  // Start fake audience
  socket.on('start-fake-audience', (streamId) => {
    if (!activeStreams.has(streamId)) {
      activeStreams.set(streamId, {
        streamerName: 'Streamer',
        isActive: true,
        audienceCount: 0
      });
    }

    const interval = setInterval(async () => {
      if (activeStreams.has(streamId)) {
        const personality = chatPersonalities[Math.floor(Math.random() * chatPersonalities.length)];
        const fakeMessage = await generateFakeMessage(activeStreams.get(streamId).streamerName, personality, null);

        if (fakeMessage) {
          io.to(streamId).emit('fake-chat-message', fakeMessage);

          // 🔁 Occasionally send a quick follow-up message
          if (Math.random() < 0.25) {
            const secondPersonality = chatPersonalities[Math.floor(Math.random() * chatPersonalities.length)];
            const secondMessage = await generateFakeMessage(activeStreams.get(streamId).streamerName, secondPersonality, null);

            if (secondMessage) {
              setTimeout(() => {
                io.to(streamId).emit('fake-chat-message', secondMessage);
              }, Math.random() * 2000 + 1000); // 1–3s delay
            }
          }

          // Update audience count
          const stream = activeStreams.get(streamId);
          if (stream) {
            stream.audienceCount = Math.min(stream.audienceCount + 1, 50);
            activeStreams.set(streamId, stream);
            io.to(streamId).emit('audience-update', stream.audienceCount);
          }
        }
      }
    }, Math.random() * 4000 + 2000); // every 2–6 seconds

    socket.fakeAudienceInterval = interval;
  });

  // Stop fake audience
  socket.on('stop-fake-audience', (streamId) => {
    if (socket.fakeAudienceInterval) {
      clearInterval(socket.fakeAudienceInterval);
      socket.fakeAudienceInterval = null;
    }

    if (activeStreams.has(streamId)) {
      activeStreams.delete(streamId);
    }

    io.to(streamId).emit('stream-stopped');
  });

  // Handle speech-triggered responses
  socket.on('speech-detected', async (data) => {
    const { streamId, speechContent, confidence } = data;
    console.log(`Speech detected in stream ${streamId}: "${speechContent}" (confidence: ${confidence})`);

    if (activeStreams.has(streamId)) {
      const personality = chatPersonalities[Math.floor(Math.random() * chatPersonalities.length)];
      console.log(`Generating AI response for: ${personality.name}`);

      const fakeMessage = await generateFakeMessage(activeStreams.get(streamId).streamerName, personality, speechContent);
      if (fakeMessage) io.to(streamId).emit('fake-chat-message', fakeMessage);
    }
  });

  // Handle real chat messages
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

  // Update streamer name
  socket.on('update-streamer-name', (data) => {
    const { streamId, streamerName } = data;
    if (activeStreams.has(streamId)) {
      const stream = activeStreams.get(streamId);
      stream.streamerName = streamerName;
      activeStreams.set(streamId, stream);
    }
  });

  // Disconnect cleanup
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (socket.fakeAudienceInterval) clearInterval(socket.fakeAudienceInterval);
  });
});

// 🛠️ API Routes
app.get('/api/streams', (req, res) => {
  res.json(Array.from(activeStreams.entries()).map(([id, stream]) => ({
    id,
    ...stream
  })));
});

app.get('/api/stream/:id', (req, res) => {
  const streamId = req.params.id;
  const stream = activeStreams.get(streamId);

  if (stream) res.json({ id: streamId, ...stream });
  else res.status(404).json({ error: 'Stream not found' });
});

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

// 🚀 Start server
const PORT = process.env.PORT || 9000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
