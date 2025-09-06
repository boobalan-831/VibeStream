# 🎵 VibeStream - Professional Music Streaming Platform

VibeStream is a modern, professional music streaming application built with React, TypeScript, and Node.js. It features a beautiful JioSaavn-inspired UI with advanced music player functionality.

![VibeStream Screenshot](https://via.placeholder.com/800x400/14B8A6/FFFFFF?text=VibeStream+Music+Player)

## ✨ Features

### 🎨 Modern UI/UX
- **Professional Design**: Clean, modern interface inspired by JioSaavn
- **Responsive Layout**: Works perfectly on desktop, tablet, and mobile
- **Smooth Animations**: Hover effects, transitions, and micro-interactions
- **Dark/Light Theme**: Beautiful color scheme with teal accents

### 🎵 VibeStream - Professional Music Streaming App

A modern, full-featured music streaming application built with React, TypeScript, and Tailwind CSS. Features a Spotify-inspired interface with complete audio playback functionality.

## ✨ Features

### 🎵 Core Music Functionality
- **Complete Audio Playback**: Play, pause, skip, seek, volume control
- **Real-time Progress Tracking**: Visual progress bar with seek functionality
- **Queue Management**: Auto-generated queues with skip next/previous
- **Repeat Modes**: Off, Repeat All, Repeat One
- **Shuffle Mode**: Randomize playback order
- **Volume Control**: Adjustable volume with visual slider

### 🔍 Music Discovery
- **Advanced Search**: Search songs by title, artist, or album
- **Trending Songs**: Automatically loads trending music
- **Multiple Sources**: Integrated with Saavn.dev API
- **High-Quality Audio**: Supports 320kbps audio streaming
- **Album Artwork**: High-resolution cover art display

### 🎨 Modern UI/UX
- **Dark Theme**: Professional dark interface similar to Spotify
- **Responsive Design**: Works perfectly on desktop and mobile
- **Smooth Animations**: Hover effects, transitions, loading states
- **Interactive Elements**: Click-to-play, visual feedback
- **Grid & List Views**: Multiple layout options for content

### 🚀 Performance Features
- **Caching System**: Intelligent API response caching
- **Error Handling**: Robust error recovery and user feedback
- **Loading States**: Skeleton screens and spinners
- **HTTPS Enforcement**: Automatic secure connection handling
- **Cross-Origin Audio**: Proper CORS handling for streaming

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, Custom CSS animations
- **Icons**: Lucide React
- **Audio**: HTML5 Audio API with Howler.js fallback
- **API**: Saavn.dev (JioSaavn unofficial API)
- **State Management**: React Context + useReducer
- **Build Tool**: Vite with HMR support

## 📦 Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd VibeStream
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open in browser**:
   Navigate to `http://localhost:5173`

## 🎵 How to Use

### Basic Playback
1. **Search for Music**: Use the search bar to find songs
2. **Click to Play**: Click any song card to start playing
3. **Control Playback**: Use the bottom player controls
4. **Adjust Volume**: Use the volume slider on the bottom right

### Advanced Features
- **Create Queues**: Songs are automatically queued from search/trending results
- **Skip Tracks**: Use previous/next buttons or keyboard shortcuts
- **Repeat Modes**: Click repeat button to cycle through modes
- **Shuffle**: Enable shuffle for random playback order

### Navigation
- **Home**: View trending songs and recently played
- **Search**: Find specific songs, artists, or albums
- **Trending**: Browse current popular music

## 🏗️ Project Structure

```
VibeStream/
├── src/
│   ├── components/
│   │   ├── EnhancedMusicApp.tsx      # Main application component
│   │   └── LoadingComponents.tsx     # Loading states and skeletons
│   ├── services/
│   │   ├── enhancedMusicService.ts   # Enhanced API service
│   │   ├── enhancedAudioPlayer.ts    # Audio playback service
│   │   ├── frontendMusicService.ts   # Frontend music utilities
│   │   └── localStorageService.ts    # Local storage service
│   ├── context/
│   │   └── VibeStreamContext.tsx     # State management
│   ├── App.tsx                       # App entry point
│   ├── main.tsx                      # React entry point
│   └── index.css                     # Global styles
├── package.json                      # Dependencies & scripts
├── vite.config.ts                    # Vite configuration
├── tailwind.config.cjs               # Tailwind CSS config
├── tsconfig.json                     # TypeScript config
├── index.html                        # Main HTML file
├── .gitignore                        # Git ignore rules
└── README.md                         # Documentation
```

## 🔧 Configuration

### Environment Setup
No environment variables required for basic functionality. The app uses public APIs that don't require authentication.

### API Configuration
The app uses the Saavn.dev API which provides:
- Song search functionality
- Trending music data
- High-quality audio streaming
- Album artwork and metadata

## 🎨 Customization

### Themes
The app uses a dark theme by default. Colors are defined in CSS custom properties and can be easily modified in `index.css`.

### Layout
- Modify grid layouts in the main components
- Adjust responsive breakpoints in Tailwind classes
- Customize animations and transitions in CSS

### Features
- Add new music sources in `enhancedMusicService.ts`
- Implement additional player features in `EnhancedMusicApp.tsx`
- Extend state management in `VibeStreamContext.tsx`

## 🚀 Production Build

```bash
cd web
npm run build
```

The built files will be in the `dist/` directory and can be deployed to any static hosting service.

## 🐛 Troubleshooting

### Common Issues

1. **Audio not playing**:
   - Check browser auto-play policies
   - Ensure HTTPS connection for production
   - Verify CORS headers for audio URLs

2. **Search not working**:
   - Check network connection
   - Verify API endpoints are accessible
   - Clear browser cache

3. **Slow loading**:
   - Check network speed
   - Clear service cache using dev tools
   - Ensure proper image optimization

### Debug Mode
Enable console logging to see detailed API responses and playback events.

## 🌟 Future Enhancements

### Planned Features
- [ ] User authentication and profiles
- [ ] Personal playlists management
- [ ] Download for offline listening
- [ ] Lyrics display integration
- [ ] Social sharing features
- [ ] Music recommendations AI
- [ ] Cross-device sync
- [ ] Equalizer and audio effects

### Technical Improvements
- [ ] Service Worker for offline support
- [ ] Progressive Web App (PWA) features
- [ ] Performance optimizations
- [ ] Additional music source integrations
- [ ] Advanced audio visualizations

## 📝 License

This project is for educational and demonstration purposes. Ensure compliance with music streaming regulations and API terms of service when using in production.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

For support or questions, please open an issue in the repository or contact the development team.

---

**Built with ❤️ for music lovers everywhere** 🎵 Features
- **Advanced Player Controls**: Play, pause, next, previous, shuffle, repeat
- **Progress Bar**: Seek to any position in the track
- **Volume Control**: Adjustable volume with visual feedback
- **Queue Management**: View and manage upcoming tracks
- **Recently Played**: Track listening history
- **Liked Songs**: Save favorite tracks

### 🔍 Music Discovery
- **Trending Music**: Latest popular tracks from JioSaavn
- **Search Functionality**: Find songs, artists, and albums
- **Browse by Category**: Mood-based music discovery
- **Radio Stations**: Curated music stations

### 🎯 Advanced Features
- **Context API State Management**: Centralized state for music player
- **Multi-source Support**: JioSaavn integration with YouTube fallback
- **Real-time Updates**: Live player state synchronization
- **Error Handling**: Graceful fallbacks for missing data

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd MusicPlayer
   ```

2. **Install dependencies**
   ```bash
   # Install all dependencies for both frontend and backend
   pnpm install
   ```

3. **Start the development servers**
   
   **Backend (Terminal 1):**
   ```bash
   cd server
   pnpm dev
   ```
   
   **Frontend (Terminal 2):**
   ```bash
   cd web
   pnpm dev
   ```

4. **Open the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

## 🏗️ Project Structure

```
MusicPlayer/
├── server/                 # Backend Node.js + Express
│   ├── src/
│   │   ├── index.ts       # Main server file
│   │   └── routes/        # API routes
│   │       ├── jiosaavn.ts
│   │       ├── youtube.ts
│   │       ├── lyrics.ts
│   │       └── playlist.ts
│   └── package.json
│
├── web/                   # Frontend React + TypeScript
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── TopBar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── MainContent.tsx
│   │   │   ├── BottomPlayer.tsx
│   │   │   ├── TrendingSection.tsx
│   │   │   ├── SongCard.tsx
│   │   │   ├── SearchResults.tsx
│   │   │   └── LibraryView.tsx
│   │   ├── context/       # React Context
│   │   │   └── MusicContext.tsx
│   │   ├── App.tsx        # Main app component
│   │   └── main.tsx       # Entry point
│   ├── package.json
│   ├── vite.config.ts     # Vite configuration
│   └── tailwind.config.js # Tailwind CSS config
│
├── pnpm-workspace.yaml    # pnpm workspace config
└── README.md
```

## 🎵 API Endpoints

### JioSaavn Integration
- `GET /api/jiosaavn/trending` - Get trending songs
- `GET /api/jiosaavn/search?q={query}` - Search for songs
- `GET /api/jiosaavn/song/{id}` - Get song details
- `GET /api/jiosaavn/album/{id}` - Get album details

### YouTube Integration
- `GET /api/youtube/search?q={query}` - Search YouTube
- `GET /api/youtube/stream/{id}` - Get stream URL

### Additional Features
- `GET /api/lyrics/{song}` - Get song lyrics
- `POST /api/playlist/create` - Create playlist
- `GET /api/playlist/{id}` - Get playlist

## 🎨 Component Architecture

### MusicContext
Central state management for the entire application:
```typescript
interface MusicState {
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  queue: Track[];
  currentView: string;
  // ... more state
}
```

### Key Components

**TopBar**: Navigation header with search and user actions
**Sidebar**: Navigation menu with library sections
**MainContent**: Dynamic content area that switches between views
**BottomPlayer**: Advanced music player with full controls
**TrendingSection**: Displays songs in a beautiful card grid
**SongCard**: Individual song card with hover effects

## 🛠️ Technology Stack

### Frontend
- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Context API** - State management

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **TypeScript** - Type-safe backend
- **tsx** - TypeScript execution
- **CORS** - Cross-origin resource sharing

### Development Tools
- **pnpm** - Fast, efficient package manager
- **ESM Modules** - Modern JavaScript modules
- **Hot Reload** - Instant development feedback

## 🎯 Features Roadmap

### ✅ Completed
- [x] Professional UI design
- [x] Music player with full controls
- [x] JioSaavn API integration
- [x] Search functionality
- [x] Trending music display
- [x] State management with Context API
- [x] Responsive design
- [x] Queue management

### 🚧 In Development
- [ ] YouTube audio streaming
- [ ] Lyrics display
- [ ] Playlist management
- [ ] User authentication
- [ ] Offline mode
- [ ] Social features

### 🔮 Future Plans
- [ ] Mobile app (React Native)
- [ ] Desktop app (Electron)
- [ ] AI-powered recommendations
- [ ] Live streaming
- [ ] Podcast support
- [ ] Social sharing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **JioSaavn** - Music data provider
- **Tailwind CSS** - Beautiful styling framework
- **React Team** - Amazing frontend framework
- **Vite** - Lightning-fast build tool

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**BOOBALAN D**

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](../../issues).

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## ⭐ Show Your Support

Give a ⭐️ if this project helped you!

---

**Made with ❤️ by BOOBALAN D**

> "Music is the universal language of mankind" - Henry Wadsworth Longfellow

🎵 **Happy Listening with VibeStream!** 🎵
