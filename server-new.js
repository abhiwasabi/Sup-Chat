const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key-here'
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/build')));

// Store active streams and fake audience
const activeStreams = new Map();
const fakeAudience = [];

// AI Chat personalities - Real streamer names
const chatPersonalities = [
  {
    name: "Kai Cenat",
    personality: "enthusiastic gamer who loves reactions and hype"
  },
  {
    name: "Ninja",
    personality: "supportive viewer who asks questions and gives compliments"
  },
  {
    name: "Ibai Llanos",
    personality: "technical viewer who comments on stream quality and setup"
  },
  {
    name: "AuronPlay",
    personality: "curious new viewer who asks about the streamer and content"
  },
  {
    name: "Rubius",
    personality: "energetic viewer who creates excitement and momentum"
  },
  {
    name: "xQc",
    personality: "relaxed viewer who enjoys casual conversation"
  },
  {
    name: "TheGrefg",
    personality: "enthusiastic gamer who loves reactions and hype"
  },
  {
    name: "Pokimane",
    personality: "supportive viewer who asks questions and gives compliments"
  },
  {
    name: "Tfue",
    personality: "technical viewer who comments on stream quality and setup"
  },
  {
    name: "Shroud",
    personality: "curious new viewer who asks about the streamer and content"
  },
  {
    name: "NICKMERCS",
    personality: "energetic viewer who creates excitement and momentum"
  },
  {
    name: "TimTheTatman",
    personality: "relaxed viewer who enjoys casual conversation"
  },
  {
    name: "Summit1g",
    personality: "enthusiastic gamer who loves reactions and hype"
  },
  {
    name: "Amouranth",
    personality: "supportive viewer who asks questions and gives compliments"
  },
  {
    name: "HasanAbi",
    personality: "technical viewer who comments on stream quality and setup"
  },
  {
    name: "Gaules",
    personality: "curious new viewer who asks about the streamer and content"
  },
  {
    name: "TommyInnit",
    personality: "energetic viewer who creates excitement and momentum"
  },
  {
    name: "Adin Ross",
    personality: "relaxed viewer who enjoys casual conversation"
  },
  {
    name: "Ludwig",
    personality: "enthusiastic gamer who loves reactions and hype"
  },
  {
    name: "Juansguarnizo",
    personality: "supportive viewer who asks questions and gives compliments"
  },
  {
    name: "ElSpreen",
    personality: "technical viewer who comments on stream quality and setup"
  },
  {
    name: "Tarik",
    personality: "curious new viewer who asks about the streamer and content"
  },
  {
    name: "Quackity",
    personality: "energetic viewer who creates excitement and momentum"
  },
  {
    name: "Sodapoppin",
    personality: "relaxed viewer who enjoys casual conversation"
  },
  {
    name: "Myth",
    personality: "enthusiastic gamer who loves reactions and hype"
  },
  {
    name: "Fuslie",
    personality: "supportive viewer who asks questions and gives compliments"
  },
  {
    name: "Sykkuno",
    personality: "technical viewer who comments on stream quality and setup"
  },
  {
    name: "Mizkif",
    personality: "curious new viewer who asks about the streamer and content"
  },
  {
    name: "Valkyrae",
    personality: "energetic viewer who creates excitement and momentum"
  },
  {
    name: "Clix",
    personality: "relaxed viewer who enjoys casual conversation"
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
    timestamp: new Date().toISOString()
  };
}

// Generate ChatGPT-powered responses
async function generateChatGPTResponse(speechContent, personality) {
  try {
    const personalityPrompts = {
      "Kai Cenat": "You are an enthusiastic gaming fan watching a stream. You love games and get excited about gameplay. Keep responses short, casual, and lowercase with no punctuation. Be supportive and hype.",
      "Ninja": "You are a supportive viewer who loves the streamer. You're kind, encouraging, and always positive. Keep responses short, casual, and lowercase with no punctuation. Be warm and friendly.",
      "Ibai Llanos": "You are a tech-savvy viewer who notices technical details like audio quality, camera setup, and streaming equipment. Keep responses short, casual, and lowercase with no punctuation. Be helpful and knowledgeable.",
      "AuronPlay": "You are a new viewer who just discovered this stream. You're curious and excited to learn more. Keep responses short, casual, and lowercase with no punctuation. Be enthusiastic and ask questions.",
      "Rubius": "You are an extremely energetic viewer who creates hype and excitement. You use caps occasionally but mostly lowercase. Keep responses short, casual, and lowercase with no punctuation. Be the most enthusiastic person in chat.",
      "xQc": "You are a relaxed, chill viewer who enjoys the calm vibes. You're laid back and easygoing. Keep responses short, casual, and lowercase with no punctuation. Be peaceful and zen.",
      "TheGrefg": "You are an enthusiastic gaming fan watching a stream. You love games and get excited about gameplay. Keep responses short, casual, and lowercase with no punctuation. Be supportive and hype.",
      "Pokimane": "You are a supportive viewer who loves the streamer. You're kind, encouraging, and always positive. Keep responses short, casual, and lowercase with no punctuation. Be warm and friendly.",
      "Tfue": "You are a tech-savvy viewer who notices technical details like audio quality, camera setup, and streaming equipment. Keep responses short, casual, and lowercase with no punctuation. Be helpful and knowledgeable.",
      "Shroud": "You are a new viewer who just discovered this stream. You're curious and excited to learn more. Keep responses short, casual, and lowercase with no punctuation. Be enthusiastic and ask questions.",
      "NICKMERCS": "You are an extremely energetic viewer who creates hype and excitement. You use caps occasionally but mostly lowercase. Keep responses short, casual, and lowercase with no punctuation. Be the most enthusiastic person in chat.",
      "TimTheTatman": "You are a relaxed, chill viewer who enjoys the calm vibes. You're laid back and easygoing. Keep responses short, casual, and lowercase with no punctuation. Be peaceful and zen.",
      "Summit1g": "You are an enthusiastic gaming fan watching a stream. You love games and get excited about gameplay. Keep responses short, casual, and lowercase with no punctuation. Be supportive and hype.",
      "Amouranth": "You are a supportive viewer who loves the streamer. You're kind, encouraging, and always positive. Keep responses short, casual, and lowercase with no punctuation. Be warm and friendly.",
      "HasanAbi": "You are a tech-savvy viewer who notices technical details like audio quality, camera setup, and streaming equipment. Keep responses short, casual, and lowercase with no punctuation. Be helpful and knowledgeable.",
      "Gaules": "You are a new viewer who just discovered this stream. You're curious and excited to learn more. Keep responses short, casual, and lowercase with no punctuation. Be enthusiastic and ask questions.",
      "TommyInnit": "You are an extremely energetic viewer who creates hype and excitement. You use caps occasionally but mostly lowercase. Keep responses short, casual, and lowercase with no punctuation. Be the most enthusiastic person in chat.",
      "Adin Ross": "You are a relaxed, chill viewer who enjoys the calm vibes. You're laid back and easygoing. Keep responses short, casual, and lowercase with no punctuation. Be peaceful and zen.",
      "Ludwig": "You are an enthusiastic gaming fan watching a stream. You love games and get excited about gameplay. Keep responses short, casual, and lowercase with no punctuation. Be supportive and hype.",
      "Juansguarnizo": "You are a supportive viewer who loves the streamer. You're kind, encouraging, and always positive. Keep responses short, casual, and lowercase with no punctuation. Be warm and friendly.",
      "ElSpreen": "You are a tech-savvy viewer who notices technical details like audio quality, camera setup, and streaming equipment. Keep responses short, casual, and lowercase with no punctuation. Be helpful and knowledgeable.",
      "Tarik": "You are a new viewer who just discovered this stream. You're curious and excited to learn more. Keep responses short, casual, and lowercase with no punctuation. Be enthusiastic and ask questions.",
      "Quackity": "You are an extremely energetic viewer who creates hype and excitement. You use caps occasionally but mostly lowercase. Keep responses short, casual, and lowercase with no punctuation. Be the most enthusiastic person in chat.",
      "Sodapoppin": "You are a relaxed, chill viewer who enjoys the calm vibes. You're laid back and easygoing. Keep responses short, casual, and lowercase with no punctuation. Be peaceful and zen.",
      "Myth": "You are an enthusiastic gaming fan watching a stream. You love games and get excited about gameplay. Keep responses short, casual, and lowercase with no punctuation. Be supportive and hype.",
      "Fuslie": "You are a supportive viewer who loves the streamer. You're kind, encouraging, and always positive. Keep responses short, casual, and lowercase with no punctuation. Be warm and friendly.",
      "Sykkuno": "You are a tech-savvy viewer who notices technical details like audio quality, camera setup, and streaming equipment. Keep responses short, casual, and lowercase with no punctuation. Be helpful and knowledgeable.",
      "Mizkif": "You are a new viewer who just discovered this stream. You're curious and excited to learn more. Keep responses short, casual, and lowercase with no punctuation. Be enthusiastic and ask questions.",
      "Valkyrae": "You are an extremely energetic viewer who creates hype and excitement. You use caps occasionally but mostly lowercase. Keep responses short, casual, and lowercase with no punctuation. Be the most enthusiastic person in chat.",
      "Clix": "You are a relaxed, chill viewer who enjoys the calm vibes. You're laid back and easygoing. Keep responses short, casual, and lowercase with no punctuation. Be peaceful and zen."
    };

    const prompt = `${personalityPrompts[personality.name]}

The streamer just said: "${speechContent}"

Respond as this viewer would. Keep it natural, conversational, and appropriate to what they said. Only respond with a short, casual message in lowercase with no punctuation.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: prompt
        }
      ],
      max_tokens: 50,
      temperature: 0.8
    });

    return completion.choices[0].message.content.trim().toLowerCase();
  } catch (error) {
    console.error('OpenAI API error:', error);
    // Fallback to simple responses if API fails
    return generateFallbackResponse(speechContent, personality);
  }
}

// Fallback responses if ChatGPT is unavailable
function generateFallbackResponse(speechContent, personality) {
  const speech = speechContent.toLowerCase().trim();
  
  if (speech.includes('hello') || speech.includes('hi') || speech.includes('hey')) {
    return "hey";
  } else if (speech.includes('how are you') || speech.includes('how are you guys')) {
    return "good";
  } else if (speech.includes('thank you') || speech.includes('thanks')) {
    return "you're welcome";
  } else if (speech.includes('?')) {
    return "good question";
  } else {
    return "nice";
  }
}

// Generate natural conversational responses based on what the streamer actually says
function generateContextualResponse(speechContent, personality) {
  const speech = speechContent.toLowerCase().trim();
  const responses = [];

  // Greeting responses - if streamer says hello, respond with greetings
  if (speech.includes('hello') || speech.includes('hi') || speech.includes('hey') || speech.includes('welcome')) {
    if (personality.name === "Kai Cenat" || personality.name === "TheGrefg" || personality.name === "Summit1g" || personality.name === "Ludwig" || personality.name === "Myth") {
      responses.push("hey", "hi there", "hello", "what's up", "hey man");
    } else if (personality.name === "Ninja" || personality.name === "Pokimane" || personality.name === "Amouranth" || personality.name === "Fuslie") {
      responses.push("hi", "hello", "hey", "hi there", "hello there");
    } else if (personality.name === "Ibai Llanos" || personality.name === "Tfue" || personality.name === "HasanAbi" || personality.name === "ElSpreen" || personality.name === "Sykkuno") {
      responses.push("hey", "hi", "hello", "good to see you", "hey there");
    } else if (personality.name === "AuronPlay" || personality.name === "Shroud" || personality.name === "Gaules" || personality.name === "Tarik" || personality.name === "Mizkif") {
      responses.push("hi", "hello", "hey", "hi there", "hello");
    } else if (personality.name === "Rubius" || personality.name === "NICKMERCS" || personality.name === "TommyInnit" || personality.name === "Quackity" || personality.name === "Valkyrae") {
      responses.push("hey", "hi", "hello", "what's up", "yo");
    } else if (personality.name === "xQc" || personality.name === "TimTheTatman" || personality.name === "Adin Ross" || personality.name === "Sodapoppin" || personality.name === "Clix") {
      responses.push("hey", "hi", "hello", "hey there", "hi there");
    }
  }

  // How are you responses - if streamer asks how they're doing
  else if (speech.includes('how are you') || speech.includes('how are you guys') || speech.includes('how is everyone') || speech.includes('how are you doing')) {
    if (personality.name === "Kai Cenat" || personality.name === "TheGrefg" || personality.name === "Summit1g" || personality.name === "Ludwig" || personality.name === "Myth") {
      responses.push("good", "great", "awesome", "doing well", "pretty good");
    } else if (personality.name === "Ninja" || personality.name === "Pokimane" || personality.name === "Amouranth" || personality.name === "Fuslie") {
      responses.push("good", "great", "wonderful", "doing great", "amazing");
    } else if (personality.name === "Ibai Llanos" || personality.name === "Tfue" || personality.name === "HasanAbi" || personality.name === "ElSpreen" || personality.name === "Sykkuno") {
      responses.push("good", "great", "excellent", "doing well", "pretty good");
    } else if (personality.name === "AuronPlay" || personality.name === "Shroud" || personality.name === "Gaules" || personality.name === "Tarik" || personality.name === "Mizkif") {
      responses.push("good", "great", "awesome", "doing well", "good");
    } else if (personality.name === "Rubius" || personality.name === "NICKMERCS" || personality.name === "TommyInnit" || personality.name === "Quackity" || personality.name === "Valkyrae") {
      responses.push("amazing", "great", "awesome", "fantastic", "incredible");
    } else if (personality.name === "xQc" || personality.name === "TimTheTatman" || personality.name === "Adin Ross" || personality.name === "Sodapoppin" || personality.name === "Clix") {
      responses.push("good", "great", "chill", "doing well", "pretty good");
    }
  }

  // Thank you responses
  else if (speech.includes('thank you') || speech.includes('thanks') || speech.includes('appreciate')) {
    if (personality.name === "Kai Cenat" || personality.name === "TheGrefg" || personality.name === "Summit1g" || personality.name === "Ludwig" || personality.name === "Myth") {
      responses.push("you're welcome", "no problem", "anytime", "of course", "no worries");
    } else if (personality.name === "Ninja" || personality.name === "Pokimane" || personality.name === "Amouranth" || personality.name === "Fuslie") {
      responses.push("you're welcome", "no problem", "anytime", "of course", "happy to help");
    } else if (personality.name === "Ibai Llanos" || personality.name === "Tfue" || personality.name === "HasanAbi" || personality.name === "ElSpreen" || personality.name === "Sykkuno") {
      responses.push("you're welcome", "no problem", "anytime", "of course", "no worries");
    } else if (personality.name === "AuronPlay" || personality.name === "Shroud" || personality.name === "Gaules" || personality.name === "Tarik" || personality.name === "Mizkif") {
      responses.push("you're welcome", "no problem", "anytime", "of course", "no worries");
    } else if (personality.name === "Rubius" || personality.name === "NICKMERCS" || personality.name === "TommyInnit" || personality.name === "Quackity" || personality.name === "Valkyrae") {
      responses.push("you're welcome", "no problem", "anytime", "of course", "no worries");
    } else if (personality.name === "xQc" || personality.name === "TimTheTatman" || personality.name === "Adin Ross" || personality.name === "Sodapoppin" || personality.name === "Clix") {
      responses.push("you're welcome", "no problem", "anytime", "of course", "no worries");
    }
  }

  // Question responses - if streamer asks a question
  else if (speech.includes('?') || speech.includes('what do you think') || speech.includes('do you like') || speech.includes('what should')) {
    if (personality.name === "Kai Cenat" || personality.name === "TheGrefg" || personality.name === "Summit1g" || personality.name === "Ludwig" || personality.name === "Myth") {
      responses.push("good question", "i think so", "yeah", "for sure", "definitely");
    } else if (personality.name === "Ninja" || personality.name === "Pokimane" || personality.name === "Amouranth" || personality.name === "Fuslie") {
      responses.push("great question", "i think so", "yes", "absolutely", "definitely");
    } else if (personality.name === "Ibai Llanos" || personality.name === "Tfue" || personality.name === "HasanAbi" || personality.name === "ElSpreen" || personality.name === "Sykkuno") {
      responses.push("good question", "i think so", "yes", "absolutely", "definitely");
    } else if (personality.name === "AuronPlay" || personality.name === "Shroud" || personality.name === "Gaules" || personality.name === "Tarik" || personality.name === "Mizkif") {
      responses.push("good question", "i think so", "yeah", "for sure", "definitely");
    } else if (personality.name === "Rubius" || personality.name === "NICKMERCS" || personality.name === "TommyInnit" || personality.name === "Quackity" || personality.name === "Valkyrae") {
      responses.push("great question", "i think so", "yes", "absolutely", "definitely");
    } else if (personality.name === "xQc" || personality.name === "TimTheTatman" || personality.name === "Adin Ross" || personality.name === "Sodapoppin" || personality.name === "Clix") {
      responses.push("good question", "i think so", "yeah", "for sure", "definitely");
    }
  }

  // Game-related responses
  else if (speech.includes('game') || speech.includes('play') || speech.includes('win') || speech.includes('lose')) {
    if (personality.name === "Kai Cenat" || personality.name === "TheGrefg" || personality.name === "Summit1g" || personality.name === "Ludwig" || personality.name === "Myth") {
      responses.push("nice", "awesome", "cool", "sweet", "that's great");
    } else if (personality.name === "Ninja" || personality.name === "Pokimane" || personality.name === "Amouranth" || personality.name === "Fuslie") {
      responses.push("nice", "awesome", "cool", "sweet", "that's great");
    } else if (personality.name === "Ibai Llanos" || personality.name === "Tfue" || personality.name === "HasanAbi" || personality.name === "ElSpreen" || personality.name === "Sykkuno") {
      responses.push("nice", "awesome", "cool", "sweet", "that's great");
    } else if (personality.name === "AuronPlay" || personality.name === "Shroud" || personality.name === "Gaules" || personality.name === "Tarik" || personality.name === "Mizkif") {
      responses.push("nice", "awesome", "cool", "sweet", "that's great");
    } else if (personality.name === "Rubius" || personality.name === "NICKMERCS" || personality.name === "TommyInnit" || personality.name === "Quackity" || personality.name === "Valkyrae") {
      responses.push("nice", "awesome", "cool", "sweet", "that's great");
    } else if (personality.name === "xQc" || personality.name === "TimTheTatman" || personality.name === "Adin Ross" || personality.name === "Sodapoppin" || personality.name === "Clix") {
      responses.push("nice", "awesome", "cool", "sweet", "that's great");
    }
  }

  // Time-related responses
  else if (speech.includes('time') || speech.includes('hour') || speech.includes('minute') || speech.includes('long')) {
    if (personality.name === "Kai Cenat" || personality.name === "TheGrefg" || personality.name === "Summit1g" || personality.name === "Ludwig" || personality.name === "Myth") {
      responses.push("yeah", "for sure", "definitely", "absolutely", "i agree");
    } else if (personality.name === "Ninja" || personality.name === "Pokimane" || personality.name === "Amouranth" || personality.name === "Fuslie") {
      responses.push("yeah", "for sure", "definitely", "absolutely", "i agree");
    } else if (personality.name === "Ibai Llanos" || personality.name === "Tfue" || personality.name === "HasanAbi" || personality.name === "ElSpreen" || personality.name === "Sykkuno") {
      responses.push("yeah", "for sure", "definitely", "absolutely", "i agree");
    } else if (personality.name === "AuronPlay" || personality.name === "Shroud" || personality.name === "Gaules" || personality.name === "Tarik" || personality.name === "Mizkif") {
      responses.push("yeah", "for sure", "definitely", "absolutely", "i agree");
    } else if (personality.name === "Rubius" || personality.name === "NICKMERCS" || personality.name === "TommyInnit" || personality.name === "Quackity" || personality.name === "Valkyrae") {
      responses.push("yeah", "for sure", "definitely", "absolutely", "i agree");
    } else if (personality.name === "xQc" || personality.name === "TimTheTatman" || personality.name === "Adin Ross" || personality.name === "Sodapoppin" || personality.name === "Clix") {
      responses.push("yeah", "for sure", "definitely", "absolutely", "i agree");
    }
  }

  // Music/sound responses
  else if (speech.includes('music') || speech.includes('song') || speech.includes('sound') || speech.includes('audio')) {
    if (personality.name === "Kai Cenat" || personality.name === "TheGrefg" || personality.name === "Summit1g" || personality.name === "Ludwig" || personality.name === "Myth") {
      responses.push("sounds good", "nice", "cool", "awesome", "i like it");
    } else if (personality.name === "Ninja" || personality.name === "Pokimane" || personality.name === "Amouranth" || personality.name === "Fuslie") {
      responses.push("sounds good", "nice", "cool", "awesome", "i like it");
    } else if (personality.name === "Ibai Llanos" || personality.name === "Tfue" || personality.name === "HasanAbi" || personality.name === "ElSpreen" || personality.name === "Sykkuno") {
      responses.push("sounds good", "nice", "cool", "awesome", "i like it");
    } else if (personality.name === "AuronPlay" || personality.name === "Shroud" || personality.name === "Gaules" || personality.name === "Tarik" || personality.name === "Mizkif") {
      responses.push("sounds good", "nice", "cool", "awesome", "i like it");
    } else if (personality.name === "Rubius" || personality.name === "NICKMERCS" || personality.name === "TommyInnit" || personality.name === "Quackity" || personality.name === "Valkyrae") {
      responses.push("sounds good", "nice", "cool", "awesome", "i like it");
    } else if (personality.name === "xQc" || personality.name === "TimTheTatman" || personality.name === "Adin Ross" || personality.name === "Sodapoppin" || personality.name === "Clix") {
      responses.push("sounds good", "nice", "cool", "awesome", "i like it");
    }
  }

  // Food responses
  else if (speech.includes('food') || speech.includes('eat') || speech.includes('hungry') || speech.includes('lunch') || speech.includes('dinner')) {
    if (personality.name === "Kai Cenat" || personality.name === "TheGrefg" || personality.name === "Summit1g" || personality.name === "Ludwig" || personality.name === "Myth") {
      responses.push("same here", "me too", "i'm hungry too", "sounds good", "nice");
    } else if (personality.name === "Ninja" || personality.name === "Pokimane" || personality.name === "Amouranth" || personality.name === "Fuslie") {
      responses.push("same here", "me too", "i'm hungry too", "sounds good", "nice");
    } else if (personality.name === "Ibai Llanos" || personality.name === "Tfue" || personality.name === "HasanAbi" || personality.name === "ElSpreen" || personality.name === "Sykkuno") {
      responses.push("same here", "me too", "i'm hungry too", "sounds good", "nice");
    } else if (personality.name === "AuronPlay" || personality.name === "Shroud" || personality.name === "Gaules" || personality.name === "Tarik" || personality.name === "Mizkif") {
      responses.push("same here", "me too", "i'm hungry too", "sounds good", "nice");
    } else if (personality.name === "Rubius" || personality.name === "NICKMERCS" || personality.name === "TommyInnit" || personality.name === "Quackity" || personality.name === "Valkyrae") {
      responses.push("same here", "me too", "i'm hungry too", "sounds good", "nice");
    } else if (personality.name === "xQc" || personality.name === "TimTheTatman" || personality.name === "Adin Ross" || personality.name === "Sodapoppin" || personality.name === "Clix") {
      responses.push("same here", "me too", "i'm hungry too", "sounds good", "nice");
    }
  }

  // Default responses for anything else
  else {
    if (personality.name === "Kai Cenat" || personality.name === "TheGrefg" || personality.name === "Summit1g" || personality.name === "Ludwig" || personality.name === "Myth") {
      responses.push("nice", "cool", "awesome", "that's great", "i like it");
    } else if (personality.name === "Ninja" || personality.name === "Pokimane" || personality.name === "Amouranth" || personality.name === "Fuslie") {
      responses.push("nice", "cool", "awesome", "that's great", "i like it");
    } else if (personality.name === "Ibai Llanos" || personality.name === "Tfue" || personality.name === "HasanAbi" || personality.name === "ElSpreen" || personality.name === "Sykkuno") {
      responses.push("nice", "cool", "awesome", "that's great", "i like it");
    } else if (personality.name === "AuronPlay" || personality.name === "Shroud" || personality.name === "Gaules" || personality.name === "Tarik" || personality.name === "Mizkif") {
      responses.push("nice", "cool", "awesome", "that's great", "i like it");
    } else if (personality.name === "Rubius" || personality.name === "NICKMERCS" || personality.name === "TommyInnit" || personality.name === "Quackity" || personality.name === "Valkyrae") {
      responses.push("nice", "cool", "awesome", "that's great", "i like it");
    } else if (personality.name === "xQc" || personality.name === "TimTheTatman" || personality.name === "Adin Ross" || personality.name === "Sodapoppin" || personality.name === "Clix") {
      responses.push("nice", "cool", "awesome", "that's great", "i like it");
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

  // Start fake audience for a stream (speech-only mode)
  socket.on('start-fake-audience', (streamId) => {
    if (!activeStreams.has(streamId)) {
      activeStreams.set(streamId, {
        streamerName: 'Streamer',
        isActive: true,
        audienceCount: 0,
        speechOnlyMode: true
      });
    }

    // Initialize audience count but don't send random messages
    const stream = activeStreams.get(streamId);
    stream.audienceCount = 5; // Start with a small audience
    activeStreams.set(streamId, stream);
    io.to(streamId).emit('audience-update', stream.audienceCount);
    
    console.log(`Speech-only mode activated for stream ${streamId}`);
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
    
    // Rate limiting: only process if confidence is reasonable and content is meaningful
    if (confidence < 0.3 || !speechContent.trim() || speechContent.length < 2) {
      console.log('Skipping low confidence or empty speech');
      return;
    }
    
    // Generate multiple ChatGPT-powered fake audience responses based on speech
    if (activeStreams.has(streamId)) {
      // Always generate exactly 5 responses for every speech input
      const numResponses = 5;
      const responsePromises = [];
      
      // Use different personalities to ensure variety
      const usedPersonalities = new Set();
      
      for (let i = 0; i < numResponses; i++) {
        let personality;
        let attempts = 0;
        
        // Try to get a different personality for each response
        do {
          personality = chatPersonalities[Math.floor(Math.random() * chatPersonalities.length)];
          attempts++;
        } while (usedPersonalities.has(personality.name) && attempts < 10);
        
        usedPersonalities.add(personality.name);
        
        const responsePromise = (async () => {
          try {
            // Minimal delay to prevent API rate limiting
            await new Promise(resolve => setTimeout(resolve, i * 25));
            
            // Generate ChatGPT response with higher temperature for more variety
            const chatGPTResponse = await generateChatGPTResponse(speechContent, personality);
            
            const fakeMessage = {
              id: Date.now() + Math.random() + i,
              username: personality.name,
              message: chatGPTResponse,
              timestamp: new Date().toISOString(),
              isContextual: true,
              isChatGPT: true,
              basedOnSpeech: speechContent
            };
            
            return fakeMessage;
          } catch (error) {
            console.error('ChatGPT error for response', i, ':', error.message);
            
            // Fallback to contextual response
            const fallbackResponse = generateFallbackResponse(speechContent, personality);
            
            const fallbackMessage = {
              id: Date.now() + Math.random() + i,
              username: personality.name,
              message: fallbackResponse,
              timestamp: new Date().toISOString(),
              isContextual: true,
              isFallback: true,
              basedOnSpeech: speechContent
            };
            
            return fallbackMessage;
          }
        })();
        
        responsePromises.push(responsePromise);
      }
      
      // Wait for all responses and send them with slight delays
      try {
        const responses = await Promise.all(responsePromises);
        
        // Send all 5 responses in a quick burst - almost simultaneously
        responses.forEach((message, index) => {
          // Very quick burst timing - all messages appear within 200ms
          const burstDelay = index * 30; // 30ms between each message
          const randomDelay = Math.random() * 50; // Small random variation
          const totalDelay = burstDelay + randomDelay;
          
          setTimeout(() => {
            io.to(streamId).emit('fake-chat-message', message);
            console.log(`Response ${index + 1} from ${message.username}: "${message.message}"`);
          }, totalDelay);
        });
        
        // Update audience count
        const stream = activeStreams.get(streamId);
        stream.audienceCount = Math.min(stream.audienceCount + numResponses, 25); // Cap at 25 fake viewers
        activeStreams.set(streamId, stream);
        io.to(streamId).emit('audience-update', stream.audienceCount);
        
      } catch (error) {
        console.error('Error generating multiple responses:', error);
        
        // Send at least one fallback response
        const fallbackPersonality = chatPersonalities[Math.floor(Math.random() * chatPersonalities.length)];
        const fallbackResponse = generateFallbackResponse(speechContent, fallbackPersonality);
        
        const fallbackMessage = {
          id: Date.now() + Math.random(),
          username: fallbackPersonality.name,
          message: fallbackResponse,
          timestamp: new Date().toISOString(),
          isContextual: true,
          isFallback: true,
          basedOnSpeech: speechContent
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

// Test OpenAI API endpoint
app.post('/api/test-openai', async (req, res) => {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a test. Respond with 'API working' if you can process this request."
        }
      ],
      max_tokens: 10,
      temperature: 0.1
    });
    
    res.json({ 
      success: true, 
      response: completion.choices[0].message.content,
      status: "OpenAI API is working"
    });
  } catch (error) {
    console.error('OpenAI API Error:', error.message);
    res.json({ 
      success: false, 
      error: error.message,
      status: "OpenAI API failed - likely insufficient funds"
    });
  }
});

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

const PORT = 9000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
