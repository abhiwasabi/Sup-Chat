# 🎬 Fake Audience Stream

A streaming app that provides AI-powered fake audience chat to boost confidence for streamers with low viewer counts. Perfect for new streamers who want to practice and build confidence!

## ✨ Features

- **Live Video Streaming**: Built-in webcam support with high-quality video
- **AI-Powered Fake Audience**: Intelligent chat messages from fake viewers
- **Multiple AI Personalities**: Different chat personalities (gaming fans, supportive viewers, tech enthusiasts, etc.)
- **Real-time Chat**: Mix of fake and real audience messages
- **Streamer Dashboard**: Control your stream and monitor audience engagement
- **Responsive Design**: Works on desktop and mobile devices

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- A webcam for streaming

### Installation

1. **Clone or download the project**
   ```bash
   cd fake-audience-stream
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

## 🎮 How to Use

1. **Enter Your Name**: Type your streaming name in the input field
2. **Start Streaming**: Click "Start Streaming" to begin your stream
3. **Allow Camera Access**: Grant permission for camera and microphone
4. **Watch the Magic**: AI will generate fake audience messages to boost your confidence!
5. **Interact with Chat**: Respond to both fake and real messages
6. **Control Settings**: Use the dashboard to toggle AI audience on/off

## 🤖 AI Personalities

The app includes 6 different AI chat personalities:

- **GamingFan123** 🎮 - Enthusiastic gamer who loves reactions
- **StreamLover** ❤️ - Supportive viewer who asks questions
- **TechGuru** ⚡ - Technical viewer who comments on quality
- **NewViewer** 👋 - Curious new viewer asking about content
- **HypeMaster** 🔥 - Energetic viewer creating excitement
- **ChillViewer** 😌 - Relaxed viewer enjoying casual chat

## 🛠️ Technical Details

### Backend (Node.js + Express + Socket.io)
- Real-time communication with Socket.io
- AI message generation with multiple personalities
- Stream management and audience tracking
- RESTful API endpoints

### Frontend (React)
- Modern React with hooks
- Responsive design with CSS Grid/Flexbox
- Real-time chat interface
- Video streaming with WebRTC

### Key Technologies
- **Backend**: Node.js, Express, Socket.io
- **Frontend**: React, Socket.io-client
- **Video**: WebRTC getUserMedia API
- **Styling**: CSS3 with gradients and animations

## 📱 Features in Detail

### Video Streaming
- High-quality webcam feed (up to 720p)
- Automatic camera permission handling
- Live/offline status indicators
- Responsive video container

### Chat System
- Real-time message delivery
- Distinction between fake and real messages
- Auto-scrolling chat interface
- Message timestamps and user identification

### Dashboard
- Live audience count
- Stream statistics
- AI audience toggle
- Streaming tips and guidance

## 🎯 Use Cases

- **New Streamers**: Build confidence before going live
- **Content Creators**: Practice streaming without pressure
- **Public Speaking**: Overcome camera anxiety
- **Social Media**: Practice for Instagram/TikTok content
- **Presentations**: Rehearse for online meetings

## 🔧 Customization

You can customize the AI personalities by editing the `chatPersonalities` array in `server/index.js`:

```javascript
const chatPersonalities = [
  {
    name: "YourCustomName",
    personality: "description of behavior",
    emoji: "🎯"
  }
];
```

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Variables
Create a `.env` file:
```
PORT=5000
NODE_ENV=production
```

## 🤝 Contributing

Feel free to contribute by:
- Adding new AI personalities
- Improving the chat algorithms
- Enhancing the UI/UX
- Adding new features

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## ⚠️ Disclaimer

This app is designed to help build confidence and practice streaming. The fake audience is clearly marked and should not be used to deceive real viewers. Always be transparent about your streaming setup!

---

**Happy Streaming! 🎬✨**
