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

// Track current faces in each stream to prevent duplicate messages
const currentFaces = new Map();

// Track when specific personalities are mentioned to pause random messages
const mentionedPersonalityTimeouts = new Map();

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
      
      // Announce all fake audience personalities joining the stream
      console.log(`🎉 Announcing fake audience joining stream ${streamId}`);
      chatPersonalities.forEach((personality, index) => {
        setTimeout(() => {
          const joinMessage = {
            id: Date.now() + Math.random() + index,
            username: "System",
            message: `${personality.name} joined the stream`,
            emoji: personality.emoji,
            timestamp: new Date().toISOString(),
            isSystemJoin: true
          };
          io.to(streamId).emit('fake-chat-message', joinMessage);
        }, index * 200); // Stagger messages by 200ms each
      });
    }

    // Start generating fake messages
    const interval = setInterval(async () => {
      if (activeStreams.has(streamId)) {
        // Check if a personality was recently mentioned (within last 10 seconds)
        const now = Date.now();
        const lastMentionTime = mentionedPersonalityTimeouts.get(streamId) || 0;
        const timeSinceMention = now - lastMentionTime;
        
        // If a personality was mentioned recently, skip this random message
        if (timeSinceMention < 10000) { // 10 seconds
          console.log(`⏸️ Skipping random message - personality was mentioned ${Math.round(timeSinceMention/1000)}s ago`);
          return;
        }
        
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
        // Check if any personality names are mentioned in the speech
        const mentionedPersonalities = [];
        const speechLower = speechContent.toLowerCase();
        
        console.log(`🔍 Checking speech: "${speechContent}"`);
        
        chatPersonalities.forEach(personality => {
          const nameLower = personality.name.toLowerCase();
          let isMentioned = false;
          
          // Check for exact match first
          if (speechLower.includes(nameLower)) {
            isMentioned = true;
            console.log(`✅ Exact match found for ${personality.name}`);
          }
          // Check for common variations and nicknames
          else if (nameLower === 'xqc' && (speechLower.includes('xqc') || speechLower.includes('x qc'))) {
            isMentioned = true;
            console.log(`✅ xQc variation match found`);
          }
          else if (nameLower === 'tsm_myth' && (speechLower.includes('myth') || speechLower.includes('tsm'))) {
            isMentioned = true;
            console.log(`✅ TSM_Myth variation match found`);
          }
          else if (nameLower === 'tenz' && (speechLower.includes('tenz') || speechLower.includes('tens') || speechLower.includes('ten z'))) {
            isMentioned = true;
            console.log(`✅ TenZ variation match found`);
          }
          else if (nameLower === 'valkyrae' && (speechLower.includes('valkyrae') || speechLower.includes('valky rae'))) {
            isMentioned = true;
            console.log(`✅ Valkyrae variation match found`);
          }
          else if (nameLower === 'pokimane' && (speechLower.includes('pokimane') || speechLower.includes('poki mane') || speechLower.includes('pokemon'))) {
            isMentioned = true;
            console.log(`✅ Pokimane variation match found`);
          }
          else if (nameLower === 'tfue' && (speechLower.includes('tfue') || speechLower.includes('t fue'))) {
            isMentioned = true;
            console.log(`✅ Tfue variation match found`);
          }
          else if (nameLower === 'linustechtips' && (speechLower.includes('linus') || speechLower.includes('tech') || speechLower.includes('linus tech'))) {
            isMentioned = true;
            console.log(`✅ LinusTechTips variation match found`);
          }
          else if (nameLower === 'kai cenat' && (speechLower.includes('kai') || speechLower.includes('cenat') || speechLower.includes('kai cenat'))) {
            isMentioned = true;
            console.log(`✅ Kai Cenat variation match found`);
          }
          else if (nameLower === 'marlon' && (speechLower.includes('marlon') || speechLower.includes('marlin'))) {
            isMentioned = true;
            console.log(`✅ Marlon variation match found`);
          }
          else if (nameLower === 'lacy' && (speechLower.includes('lacy') || speechLower.includes('lucy'))) {
            isMentioned = true;
            console.log(`✅ Lacy variation match found`);
          }
          
          if (isMentioned) {
            mentionedPersonalities.push(personality);
            console.log(`🎯 Mentioned personality detected: ${personality.name}`);
          }
        });
        
        // Generate responses: mentioned personalities ONLY or random ones
        const usedPersonalities = new Set();
        const personalityPromises = [];
        
        console.log(`🔍 Found ${mentionedPersonalities.length} mentioned personalities:`, mentionedPersonalities.map(p => p.name));
        
        if (mentionedPersonalities.length > 0) {
          // EXCLUSIVE MODE: Only mentioned personalities respond
          console.log(`🎯 EXCLUSIVE MODE: Only mentioned personalities will respond`);
          console.log(`🎯 EXCLUSIVE: ${mentionedPersonalities.length} mentioned personality(ies) will respond exclusively`);
          
          // Record the time when a personality was mentioned to pause random messages
          mentionedPersonalityTimeouts.set(streamId, Date.now());
          console.log(`⏸️ Pausing random messages for 10 seconds due to personality mention`);
          
          mentionedPersonalities.forEach(personality => {
            usedPersonalities.add(personality.name);
            console.log(`✅ Adding EXCLUSIVE response from ${personality.name}`);
            personalityPromises.push(
              generateFakeMessage(
                activeStreams.get(streamId).streamerName,
                personality,
                speechContent
              )
            );
          });
          
          // CRITICAL: Skip all random personalities when someone is mentioned
          console.log(`🚫 EXCLUSIVE MODE: Skipping random personalities - only mentioned ones will respond`);
        } else {
          // NORMAL MODE: 3 random personalities respond
          console.log(`🎲 NORMAL MODE: 3 random personalities will respond`);
          for (let i = 0; i < 3; i++) {
            let personality;
            // Ensure we get 3 different personalities
            do {
              personality = chatPersonalities[Math.floor(Math.random() * chatPersonalities.length)];
            } while (usedPersonalities.has(personality.name) && usedPersonalities.size < chatPersonalities.length);
            
            usedPersonalities.add(personality.name);
            
            personalityPromises.push(
              generateFakeMessage(
                activeStreams.get(streamId).streamerName,
                personality,
                speechContent
              )
            );
          }
        }
        
        // Execute all API calls in parallel
        const responses = await Promise.all(personalityPromises);
        
        // Send all responses with minimal delays for fast response
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

  // Handle face recognition events
  socket.on('face-detected', (data) => {
    const { streamId, person, confidence, expressions } = data;
    console.log(`👤 PERSON DETECTED: ${person} in stream ${streamId} (confidence: ${confidence})`);
    
    // Initialize current faces for this stream if not exists
    if (!currentFaces.has(streamId)) {
      currentFaces.set(streamId, new Set());
    }
    
    const streamFaces = currentFaces.get(streamId);
    const isNewFace = !streamFaces.has(person);
    
    // Add face to current faces
    streamFaces.add(person);
    
    // Broadcast face detection to all clients in the stream
    io.to(streamId).emit('face-detected', {
      person,
      confidence,
      expressions,
      timestamp: new Date().toISOString()
    });
    
    // Only generate personality responses for NEW faces (not existing ones)
    if (isNewFace) {
      console.log(`🆕 NEW FACE DETECTED: ${person} in stream ${streamId}`);
      
      // Generate personality responses to the new person
      setTimeout(async () => {
        try {
          const personality = chatPersonalities[Math.floor(Math.random() * chatPersonalities.length)];
          const welcomeMessage = await generateFakeMessage(
            activeStreams.get(streamId)?.streamerName || 'Streamer',
            personality,
            `${person} just joined the stream!`
          );
          
          io.to(streamId).emit('fake-chat-message', welcomeMessage);
        } catch (error) {
          console.error("Error generating face detection response:", error);
        }
      }, 1000);
    } else {
      console.log(`👤 EXISTING FACE: ${person} still in stream ${streamId} (no new message)`);
    }
  });

  socket.on('face-left', (data) => {
    const { streamId, person } = data;
    console.log(`👋 Face left: ${person} from stream ${streamId}`);
    
    // Remove face from current faces tracking
    if (currentFaces.has(streamId)) {
      currentFaces.get(streamId).delete(person);
    }
    
    // Broadcast face left event to all clients in the stream
    io.to(streamId).emit('face-left', {
      person,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('faces-left', (data) => {
    const { streamId } = data;
    console.log(`👋 All faces left stream ${streamId}`);
    
    // Clear all faces from current faces tracking
    if (currentFaces.has(streamId)) {
      currentFaces.get(streamId).clear();
    }
    
    // Broadcast all faces left event to all clients in the stream
    io.to(streamId).emit('faces-left', {
      timestamp: new Date().toISOString()
    });
  });

  // Handle current faces update from client
  socket.on('current-faces', (data) => {
    const { streamId, faces } = data;
    const faceNames = faces ? faces.map(f => f.name) : [];
    console.log(`👥 Current faces update for stream ${streamId}:`, faceNames);
    
    // Initialize current faces for this stream if not exists
    if (!currentFaces.has(streamId)) {
      currentFaces.set(streamId, new Set());
    }
    
    const streamFaces = currentFaces.get(streamId);
    const currentFaceNames = new Set(faceNames);
    
    // Find faces that left (were in tracking but not in current faces)
    const facesThatLeft = Array.from(streamFaces).filter(face => !currentFaceNames.has(face));
    
    console.log(`🔍 Faces that left: ${facesThatLeft.length > 0 ? facesThatLeft.join(', ') : 'none'}`);
    
    // Remove faces that left from tracking
    facesThatLeft.forEach(face => {
      streamFaces.delete(face);
      console.log(`👋 Face left: ${face} from stream ${streamId}`);
    });
    
    // Find new faces (in current faces but not in tracking)
    const newFaces = faces ? faces.filter(face => !streamFaces.has(face.name)) : [];
    
    console.log(`🔍 New faces: ${newFaces.length > 0 ? newFaces.map(f => f.name).join(', ') : 'none'}`);
    
    // Add new faces to tracking
    newFaces.forEach(face => {
      streamFaces.add(face.name);
      console.log(`🆕 New face detected: ${face.name} in stream ${streamId}`);
    });
    
    // Broadcast updated current faces back to client
    io.to(streamId).emit('current-faces', {
      streamId,
      faces: faces || []
    });
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