# 🎬 Sup, Chat? - Fake Audience Stream

A next-generation streaming platform that provides AI-powered fake audience chat to boost confidence for streamers. Features real-time face recognition, emotion detection, speech-to-text integration with OpenAI GPT-4, donation system, and interactive AI personalities.

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ Features

### 🎥 Core Streaming Features
- **Live Video Streaming**: High-quality webcam feed with automatic camera handling
- **Countdown Timer**: 3-2-1 countdown with sound effects before stream starts
- **Live Indicator**: Dynamic red pulse indicator with white background
- **Viewer Count**: Animated viewer count that simulates growth (0-11 viewers initially)
- **Username Display**: Customizable streamer name with rounded corners
- **Watermark**: "supchat" branding on video overlay

### 🎭 Face Recognition & Emotion Detection
- **Real-Time Face Detection**: Uses face-api.js for continuous face detection (every 3 seconds)
- **Multi-Person Support**: Detects and tracks multiple people in frame simultaneously
- **Face Training System**: Train custom facial profiles at `/train`
- **Emotion Detection**: Detects happiness and sadness expressions
  - **Smile Detection**: Triggers positive chat responses when you're smiling
  - **Sadness Detection**: Triggers supportive/concerned chat messages
- **On-Screen Indicator**: Inline bar showing detected faces with colored borders
- **Face Recognition**: Matches detected faces against trained profiles (Mehdi, Abhi, Badri, etc.)

### 🗣️ Speech Recognition & AI Integration
- **Real-Time Speech Detection**: Continuous microphone input during streaming
- **OpenAI GPT-4 Integration**: Natural, contextual AI responses using GPT-4o-mini
- **Personality-Based Responses**: 15+ unique AI personalities with distinct styles
- **Mention Detection**: Call out specific personalities by name
- **Exclusive Responses**: When you mention a personality, only they respond (others temporarily pause)
- **Random Chat**: Continuous background chat messages from various personalities
- **Donation Requests**: Say "donate", "donation", or "dono" to trigger donation messages

### 💰 Donation System
- **Donation Messages**: Gold-bordered chat messages from any personality
- **Donation Sound**: Twitch-inspired donation sound effect
- **Text-to-Speech**: Announces donations aloud with Brian's voice
- **On-Screen Overlay**: Large on-screen display showing donor name, amount, and message
- **Donation Goal**: Progress bar showing amount raised (goal: $100)
- **Random Amounts**: Donations range from $1 to $30
- **Fade Animation**: Donation overlay smoothly fades out

### 🎨 Chat Interface
- **Auto-Scrolling**: Chat automatically scrolls to latest messages
- **Message Types**:
  - **Regular Messages**: Standard chat from personalities
  - **Donation Messages**: Gold background with 💰 emoji
  - **System Messages**: Gray background for system notifications
- **Stream Start Announcement**: All personalities announce when stream starts
- **Stream Ended Message**: "Stream has ended. Thank you for watching!"
- **Live Updates**: Real-time message delivery via Socket.IO

### 🤖 AI Personalities
The platform includes 15+ unique AI personalities:

- **xQc** 🎮 - Known streamer, energetic and gaming-focused
- **Tyler1** 🔥 - Very energetic, enthusiastic
- **KEEMSTAR** ⚡ - Drama-focused, controversial takes
- **marlon** 😎 - Super relaxed, lots of "bro" and "dude"
- **Kai Cenat** 💯 - Toxic, dramatic expressions
- **Mehdi** 🧙‍♂️ - Multiple variations (mehdi, mehdi999, etc.)
- **Abhi** 👨‍💻 - Multiple variations
- **And 8+ more unique personalities** 🎭

Each personality has:
- Unique speaking style and vocabulary
- Personality-specific responses to emotions
- Distinct responses to speech content
- Special handling for toxic personalities

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- OpenAI API Key ([Get one here](https://platform.openai.com/))
- Webcam and microphone

### Installation

1. **Clone the repository**
   ```bash
   cd fake-audience-stream
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   PORT=9000
   NODE_ENV=development
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```
   This starts both the server (port 9000) and client (port 3000)

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🎮 How to Use

### Basic Streaming

1. **Enter Your Username**: Type your streaming name in the input field (top-left)
2. **Start Streaming**: Click "Start Stream" button
3. **Allow Permissions**: Grant camera and microphone access
4. **Watch Countdown**: 3-2-1 countdown with sound effects
5. **Go Live**: Stream starts automatically
6. **Interact**: AI personalities will respond to your speech and expressions
7. **Stop Streaming**: Click "Stop Stream" to end

### Face Training (Advanced)

1. Navigate to `http://localhost:3000/train`
2. Grant camera access
3. Position yourself in front of camera
4. Click "Train [Your Name]" next to your profile
5. Wait for training to complete (captures 20 samples)
6. Name is editable - click to change
7. Add more people with the 4th slot
8. Remove people with the remove button

### Requesting Donations

- Say "donate", "donation", or "dono" during your stream
- A random personality will send a donation message
- Sound plays, text-to-speech announces it
- On-screen overlay displays the donation
- Amount is added to donation goal

### Chat Interaction

- **Speak Naturally**: AI listens and responds to your speech
- **Mention Personalities**: Say "Hey xQc" - only xQc responds
- **Show Emotion**: Smile for positive responses, frown for supportive messages
- **Express Happiness**: Get messages like "glad to see you smiling"
- **Express Sadness**: Receive supportive messages like "why so sad" (toxic personalities stay toxic)

## 🛠️ Technical Architecture

### Tech Stack

**Backend:**
- Node.js + Express
- Socket.IO for real-time communication
- OpenAI API (GPT-4o-mini) for AI responses
- CORS enabled for client communication

**Frontend:**
- React with Hooks (useState, useEffect, useRef, useCallback)
- face-api.js for face detection and recognition
- WebRTC for camera/microphone access
- SpeechSynthesis API for text-to-speech
- Web Audio API for sound effects
- CSS3 animations and transitions

**Key Libraries:**
- `face-api.js` - Face detection, recognition, and emotion analysis
- `socket.io-client` - Real-time bidirectional communication
- `openai` - GPT-4 integration
- `uuid` - Unique ID generation

### Project Structure

```
fake-audience-stream/
├── client/
│   ├── public/
│   │   └── models/          # face-api.js models
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatInterface.js      # Chat display with auto-scroll
│   │   │   ├── FaceRecognition.js    # Face detection & emotion
│   │   │   ├── FaceTrainingSystem.js # Training interface
│   │   │   ├── OnScreenIndicator.js  # Face indicator
│   │   │   ├── SpeechRecognition.js  # Microphone input
│   │   │   ├── StreamingApp.js       # Main app component
│   │   │   └── VideoStream.js        # Video display & controls
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
├── server/
│   └── index.js             # Socket.IO server + OpenAI integration
├── .env                     # Environment variables (not committed)
├── package.json
└── README.md
```

### Key Components

**ChatInterface.js**
- Displays all chat messages
- Handles donation messages (gold background, TTS)
- Auto-scrolls to bottom
- Stream ended message

**FaceRecognition.js**
- Continuous face detection (every 3 seconds)
- Face recognition against trained profiles
- Smile and sadness detection with throttling
- Emits Socket.IO events for face changes

**VideoStream.js**
- Camera feed display
- Countdown overlay (3-2-1)
- Live indicator with pulse animation
- Donation overlay with fade-out
- Donation goal progress bar
- Viewer count animation

**SpeechRecognition.js**
- Microphone input
- Continuous speech detection
- Only active when streaming
- Sends transcripts to server

**server/index.js**
- Socket.IO event handlers
- OpenAI GPT-4 integration
- Personality mention detection
- Donation keyword detection
- Emotion response generation
- Face detection chat triggers

## 🎯 Features in Detail

### Face Detection System
- **Periodic Detection**: Runs every 3 seconds while streaming
- **Multi-Face Support**: Detects and tracks multiple people
- **On-Screen Display**: Shows detected faces in top-right corner
- **Colored Borders**: Each person has unique color (purple, blue, orange, etc.)
- **Enter/Leave Events**: Chat responds when faces enter or leave frame

### Emotion Detection
- **Smile Detection**: Threshold 0.6 (60% confidence)
- **Sadness Detection**: Threshold 0.6 (60% confidence)
- **5-Second Throttling**: Prevents spam (only triggers once per 5 seconds)
- **Personalized Messages**: Includes person's name in notifications
- **Contextual Chat**: Personality-appropriate responses to emotions
- **Toxic Personality Handling**: Toxic personalities maintain toxicity even for sadness

### Speech Recognition
- **Continuous Listening**: Always active during streaming
- **OpenAI Processing**: GPT-4 generates contextual responses
- **Personality Matching**: Checks if any personality is mentioned
- **Exclusive Responses**: Mentioned personality responds exclusively
- **Donation Detection**: Detects donation keywords
- **Rate Limiting**: Only processes confident speech (>30% confidence)

### Donation System
- **Gold Styling**: Distinct gold background and border
- **Sound Effect**: Twitch-inspired donation sound
- **Text-to-Speech**: "[Username] sent [amount] and said [message]"
- **On-Screen Overlay**: Large display on left side of video
- **Progress Tracking**: Adds to donation goal ($100 target)
- **Fade Animation**: Smoothly fades out after 4 seconds

## ⚙️ Configuration

### Customize AI Personalities

Edit `server/index.js` - `chatPersonalities` array:

```javascript
const chatPersonalities = [
  {
    name: "YourCustomName",
    personality: "description of behavior",
    responseStyle: "your style"
  }
];
```

### Adjust Detection Settings

In `client/src/components/FaceRecognition.js`:

```javascript
// Detection interval (default: 3000ms)
detectionIntervalRef.current = setInterval(detectFaces, 3000);

// Smile threshold (default: 0.6)
const smileThreshold = 0.6;

// Sadness threshold (default: 0.6)
const sadThreshold = 0.6;

// Emotion throttling (default: 5000ms)
if (timeSinceLastSmile < 5000) { ... }
```

### Customize Sound Effects

In `client/src/components/VideoStream.js`:

```javascript
// Countdown ding sound
playDingSound();

// Stream start sound (Twitch donation)
playTwitchDonationSound();
```

## 🚀 Deployment

### Production Build

```bash
# Build the React app
npm run build

# Start the production server
npm start
```

### Environment Variables

Required in `.env`:
```env
PORT=9000
NODE_ENV=production
OPENAI_API_KEY=sk-your-api-key-here
```

### Browser Requirements

- **Chrome/Edge**: Full support ✅
- **Firefox**: Full support ✅
- **Safari**: Full support ✅

### Hardware Requirements

- **Camera**: Required for streaming
- **Microphone**: Required for speech recognition
- **Modern CPU**: Recommended for face detection performance
- **Stable Internet**: Required for OpenAI API calls

## 🔧 Troubleshooting

### Camera Not Working
- Check browser permissions
- Ensure no other app is using camera
- Try refreshing the page

### Face Detection Not Working
- Ensure you're visible in front of camera
- Check browser console for errors
- Verify face-api.js models loaded

### Speech Not Detected
- Check microphone permissions
- Verify microphone is not muted
- Ensure stream is started (green "Streaming" status)

### OpenAI Errors
- Verify API key in `.env` file
- Check API quota/billing
- Look for rate limit errors in server logs

### Donation Not Working
- Say "donate", "donation", or "dono" clearly
- Wait 1-2 seconds for response
- Check browser console for errors

## 🤝 Contributing

Contributions are welcome! Areas for improvement:

- [ ] Add more AI personalities
- [ ] Improve face detection accuracy
- [ ] Add more emotions (anger, surprise, etc.)
- [ ] Customizable donation amounts
- [ ] Multiple donation goals
- [ ] Chat moderation features
- [ ] Stream recording
- [ ] Cloud storage for face training data

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## ⚠️ Disclaimer

This app is designed to help build confidence and practice streaming. The fake audience is clearly marked with system messages and should not be used to deceive real viewers. Always be transparent about your streaming setup!

## 🙏 Acknowledgments

- face-api.js by [justadudewhohacks](https://github.com/justadudewhohacks)
- OpenAI for GPT-4 API
- Socket.IO for real-time communication
- React team for the amazing framework

---

**Happy Streaming! 🎬✨**

Made with ❤️ for streamers worldwide
