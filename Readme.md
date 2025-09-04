# 🤖 Mira - AI PC Assistant

<div align="center">
  <img src="pc-assistant/src/assets/ai-assistant.png" alt="Mira AI Assistant" width="200"/>
  
  [![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
  [![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
  [![Electron](https://img.shields.io/badge/Electron-37+-purple.svg)](https://electronjs.org/)
</div>

## 🌟 Overview

**Mira** is an intelligent desktop AI assistant that combines voice recognition, natural language processing, and system automation to provide a seamless human-computer interaction experience. Built with modern web technologies and powered by Google's Gemini AI, Mira can understand voice commands, execute tasks, and engage in meaningful conversations.

### ✨ Key Features

- 🎤 **Voice Recognition**: Real-time speech-to-text using Whisper AI
- 🧠 **AI-Powered**: Conversational AI with Google Gemini 2.5 Flash
- 🖥️ **System Control**: Open applications, websites, and manage desktop tasks
- 🎵 **Media Control**: Play music and videos from YouTube
- 🔍 **Smart Search**: Google search integration with custom search engine
- 💾 **Memory System**: Remembers user preferences, facts, and reminders
- 😊 **Mood Detection**: Empathetic responses based on user emotional state
- 🗣️ **Text-to-Speech**: Natural voice responses
- 📱 **Cross-Platform**: Available as web app and desktop application

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (React +      │◄──►│   (Express +    │◄──►│   (MongoDB)     │
│   Electron)     │    │   Node.js)      │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         │                       │
    ┌─────────┐            ┌─────────────┐
    │ Whisper │            │ Google APIs │
    │ (STT)   │            │ (Gemini +   │
    └─────────┘            │  Search)    │
                           └─────────────┘
```

## 📁 Project Structure

```
AI-Assistant/
├── 📄 README.md
├── 📁 backend/                    # Express.js API server
│   ├── 📄 index.js               # Main server file
│   ├── 📄 SoftwareMap.js         # Application mapping
│   ├── 📄 package.json           # Backend dependencies
│   └── 📁 uploads/               # Temporary audio files
├── 📁 pc-assistant/              # React + Electron frontend
│   ├── 📄 electron.js            # Electron main process
│   ├── 📄 package.json           # Frontend dependencies
│   ├── 📁 src/
│   │   ├── 📄 App.jsx            # Main React component
│   │   ├── 📄 main.jsx           # React entry point
│   │   └── 📁 assets/            # Images and resources
│   ├── 📁 build/                 # Web build output
│   └── 📁 dist/                  # Desktop app distribution
└── 📁 Screenshots/               # Project screenshots
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **MongoDB** (local or cloud instance)
- **Google API Keys**:
  - Gemini API key
  - Google Custom Search API key and Custom Search Engine ID

### 1. Clone the Repository

```bash
git clone https://github.com/Aditya122221/Mira---PC-Assistant.git
cd AI-Assistant
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the backend directory:

```env
MONGODB_URI=mongodb://localhost:27017/mira-assistant
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_CSE_KEY=your_google_cse_key_here
GOOGLE_CSE_CX=your_custom_search_engine_id_here
```

Start the backend server:

```bash
npm start
```

### 3. Frontend Setup

```bash
cd ../pc-assistant
npm install
```

Create a `.env` file in the pc-assistant directory:

```env
VITE_GEMINI_API=your_gemini_api_key_here
VITE_GOOGLE_CSE_KEY=your_google_cse_key_here
VITE_GOOGLE_CSE_CX=your_custom_search_engine_id_here
```

### 4. Run the Application

#### Web Version
```bash
npm run dev
```

#### Desktop Version
```bash
# Build the web version first
npm run build

# Create desktop executable
npm run dist
```

The desktop app will be generated in the `dist/` folder as `PCAssistant Setup 1.0.0.exe`.

## 🎯 Usage Examples

### Voice Commands

| Command Type | Example | Action |
|-------------|---------|--------|
| **Greeting** | "Hi Mira" | Activates assistant |
| **Search** | "Mira, search for React tutorials" | Opens Google search |
| **Play Music** | "Play relaxing music" | Opens YouTube playlist |
| **Open App** | "Open VS Code" | Launches desktop application |
| **Open Website** | "Open Gmail" | Opens website in browser |
| **Reminder** | "Remind me to call mom at 6pm" | Sets reminder |
| **Mood Support** | "I'm feeling stressed" | Provides emotional support |

### Conversation Features

- **Memory**: "Remember that my favorite color is blue"
- **Problem Tracking**: "I have a problem with my computer"
- **Personal Facts**: "My name is John"
- **Crisis Support**: Detects and responds to mental health concerns

## 🛠️ Technologies Used

### Frontend
- **React 18** - UI framework
- **Electron 37** - Desktop app wrapper
- **Vite** - Build tool and dev server
- **CSS3** - Styling and animations

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **Whisper** - Speech-to-text processing
- **Multer** - File upload handling

### AI & APIs
- **Google Gemini 2.5 Flash** - Conversational AI
- **Google Custom Search** - Web search integration
- **Whisper AI** - Speech recognition
- **Web Speech API** - Text-to-speech

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
MONGODB_URI=mongodb://localhost:27017/mira-assistant
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_CSE_KEY=your_google_cse_key
GOOGLE_CSE_CX=your_custom_search_engine_id
```

#### Frontend (.env)
```env
VITE_GEMINI_API=your_gemini_api_key
VITE_GOOGLE_CSE_KEY=your_google_cse_key
VITE_GOOGLE_CSE_CX=your_custom_search_engine_id
```

### API Setup

1. **Google Gemini API**:
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Add to both frontend and backend .env files

2. **Google Custom Search**:
   - Go to [Google Custom Search](https://cse.google.com/)
   - Create a custom search engine
   - Get your API key from [Google Cloud Console](https://console.cloud.google.com/)

## 📱 Screenshots

<div align="center">
  <img src="Screenshots/Screenshot 2025-09-02 202158.png" alt="Mira Interface" width="600"/>
  <p><em>Mira AI Assistant Interface</em></p>
</div>

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Aditya** - [GitHub](https://github.com/Aditya122221)

## 🙏 Acknowledgments

- Google for Gemini AI and Custom Search APIs
- OpenAI for Whisper speech recognition
- The React and Electron communities
- All contributors and testers

---

<div align="center">
  <p>Made with ❤️ by Aditya</p>
  <p>⭐ Star this repo if you found it helpful!</p>
</div>