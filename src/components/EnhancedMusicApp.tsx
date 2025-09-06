import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  Search,
  Heart,
  Shuffle,
  Repeat,
  Home,
  TrendingUp,
  Clock,
  Music,
  List,
  User,
  Settings
} from 'lucide-react';
import { useVibeStream } from '../context/VibeStreamContext';
import { enhancedMusicService, SaavnTrack } from '../services/enhancedMusicService';

interface Track {
  id: string;
  name: string;
  artists: { primary: { name: string }[] };
  image: { quality: string; url: string }[];
  downloadUrl: { quality: string; url: string }[];
  duration: number;
  album?: { name: string };
}

// Use SaavnTrack as the main track interface
type AppTrack = SaavnTrack;

// UI Components
const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { className?: string }> = ({ className = "", ...props }) => (
  <input 
    {...props} 
    className={`px-4 py-2 border border-gray-700 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-400 ${className}`} 
  />
);

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  variant?: 'default' | 'ghost' | 'green'; 
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}> = ({ children, variant = 'default', size = 'default', className = "", ...props }) => {
  const baseClass = "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:pointer-events-none";
  
  const variantClass = {
    default: "bg-gray-700 text-white hover:bg-gray-600",
    ghost: "hover:bg-gray-800 text-gray-300 hover:text-white",
    green: "bg-green-500 text-white hover:bg-green-600 shadow-lg hover:shadow-green-500/25"
  }[variant];
  
  const sizeClass = {
    sm: "h-8 px-3 text-sm",
    default: "h-10 py-2 px-4",
    lg: "h-12 px-6 text-lg"
  }[size];
  
  return (
    <button 
      {...props} 
      className={`${baseClass} ${variantClass} ${sizeClass} ${className}`}
    >
      {children}
    </button>
  );
};

const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className = "", onClick }) => (
  <div 
    className={`bg-gray-800 border border-gray-700 rounded-lg shadow-lg ${onClick ? 'cursor-pointer hover:bg-gray-750 transition-all duration-200' : ''} ${className}`} 
    onClick={onClick}
  >
    {children}
  </div>
);

const Slider: React.FC<{
  value: number[];
  onValueChange: (value: number[]) => void;
  max: number;
  step: number;
  className?: string;
}> = ({ value, onValueChange, max, step, className = "" }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onValueChange([parseFloat(e.target.value)]);
  };

  return (
    <div className={`relative ${className}`}>
      <input
        type="range"
        min="0"
        max={max}
        step={step}
        value={value[0] || 0}
        onChange={handleChange}
        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
        style={{
          background: `linear-gradient(to right, #10b981 0%, #10b981 ${(value[0] / max) * 100}%, #374151 ${(value[0] / max) * 100}%, #374151 100%)`
        }}
      />
    </div>
  );
};

const EnhancedMusicApp: React.FC = () => {
  const { state, actions } = useVibeStream();
  const [currentView, setCurrentView] = useState<'home' | 'search' | 'trending' | 'library'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AppTrack[]>([]);
  const [trendingSongs, setTrendingSongs] = useState<AppTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolume] = useState([80]);
  const [progress, setProgress] = useState([0]);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentTrack, setCurrentTrack] = useState<AppTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState<AppTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [repeatMode, setRepeatMode] = useState(0); // 0: off, 1: all, 2: one
  const [isShuffled, setIsShuffled] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  // Load trending songs on component mount
  useEffect(() => {
    loadTrendingSongs();
  }, []);

  // Load trending songs using enhanced service
  const loadTrendingSongs = async () => {
    try {
      console.log('🔥 Loading trending songs...');
      const response = await enhancedMusicService.getTrendingSongs();
      
      if (response.success && response.data.results.length > 0) {
        setTrendingSongs(response.data.results.slice(0, 20));
        console.log(`✅ Loaded ${response.data.results.length} trending songs`);
      }
    } catch (error) {
      console.error('❌ Failed to load trending songs:', error);
      setTrendingSongs([]);
    }
  };

  // Search songs using enhanced service
  const searchSongs = async (query: string) => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    try {
      console.log(`🔍 Searching for: "${query}"`);
      const response = await enhancedMusicService.searchSongs(query);
      
      if (response.success && response.data.results.length > 0) {
        setSearchResults(response.data.results);
        setCurrentView('search');
        console.log(`✅ Found ${response.data.results.length} songs`);
      } else {
        setSearchResults([]);
        console.log('❌ No songs found');
      }
    } catch (error) {
      console.error('❌ Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Get download URL for a track using enhanced service
  const getDownloadUrl = async (trackId: string): Promise<string | null> => {
    return await enhancedMusicService.getAudioUrl(trackId);
  };

  // Play a track
  const playTrack = async (track: AppTrack) => {
    if (!audioRef.current) return;
    
    console.log(`🎵 Playing track: ${track.name} by ${track.artists.primary.map(a => a.name).join(', ')}`);
    setCurrentTrack(track);
    setIsLoading(true);
    
    // Add to queue if not already in it
    const currentList = currentView === 'search' ? searchResults : trendingSongs;
    if (queue.length === 0 || queue !== currentList) {
      setQueue(currentList);
    }
    
    // Set current index
    const index = currentList.findIndex(t => t.id === track.id);
    setCurrentIndex(index);
    
    try {
      // Get download URL
      const audioUrl = await getDownloadUrl(track.id);
      
      if (audioUrl) {
        audioRef.current.src = audioUrl;
        audioRef.current.load();
        
        // Wait for the audio to be ready
        await new Promise((resolve, reject) => {
          if (!audioRef.current) {
            reject(new Error('Audio element not available'));
            return;
          }

          const onCanPlay = () => {
            audioRef.current!.removeEventListener('canplay', onCanPlay);
            audioRef.current!.removeEventListener('error', onError);
            resolve(void 0);
          };

          const onError = (e: any) => {
            audioRef.current!.removeEventListener('canplay', onCanPlay);
            audioRef.current!.removeEventListener('error', onError);
            reject(new Error('Failed to load audio'));
          };

          audioRef.current.addEventListener('canplay', onCanPlay);
          audioRef.current.addEventListener('error', onError);
        });

        await audioRef.current.play();
        setIsPlaying(true);
        console.log('✅ Track started playing');
      } else {
        throw new Error('No audio URL available');
      }
    } catch (error) {
      console.error('❌ Failed to play track:', error);
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle play/pause
  const togglePlayPause = async () => {
    if (!audioRef.current || !currentTrack) return;
    
    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        console.log('⏸️ Paused');
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
        console.log('▶️ Resumed');
      }
    } catch (error) {
      console.error('❌ Failed to toggle play/pause:', error);
    }
  };

  // Skip to next track
  const skipNext = () => {
    if (queue.length === 0 || currentIndex === -1) return;
    
    let nextIndex = currentIndex + 1;
    if (nextIndex >= queue.length) {
      if (repeatMode === 1) {
        nextIndex = 0;
      } else {
        return;
      }
    }
    
    playTrack(queue[nextIndex]);
  };

  // Skip to previous track
  const skipPrevious = () => {
    if (queue.length === 0 || currentIndex === -1) return;
    
    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
      if (repeatMode === 1) {
        prevIndex = queue.length - 1;
      } else {
        return;
      }
    }
    
    playTrack(queue[prevIndex]);
  };

  // Format time
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      console.log(`🕐 Duration loaded: ${formatTime(audio.duration)}`);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      const progressPercent = audio.duration > 0 ? (audio.currentTime / audio.duration) * 100 : 0;
      setProgress([progressPercent]);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress([0]);
      setCurrentTime(0);
      console.log('🏁 Track ended');
      
      if (repeatMode === 2) {
        audio.currentTime = 0;
        audio.play();
        setIsPlaying(true);
      } else {
        skipNext();
      }
    };

    const handleError = (e: any) => {
      console.error('❌ Audio error:', e);
      setIsPlaying(false);
      setIsLoading(false);
    };

    const handleCanPlay = () => {
      console.log('✅ Audio can play');
      setIsLoading(false);
    };

    const handleLoadStart = () => {
      console.log('⏳ Audio load started');
      setIsLoading(true);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('loadstart', handleLoadStart);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('loadstart', handleLoadStart);
    };
  }, [currentTrack, repeatMode]);

  // Handle progress change
  const handleProgressChange = (value: number[]) => {
    if (!audioRef.current || !duration) return;
    
    const newTime = (value[0] / 100) * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    setProgress(value);
  };

  // Handle volume change
  const handleVolumeChange = (value: number[]) => {
    if (!audioRef.current) return;
    
    audioRef.current.volume = value[0] / 100;
    setVolume(value);
  };

  // Get image URL using enhanced service
  const getImageUrl = (track: AppTrack) => {
    return enhancedMusicService.getImageUrl(track);
  };

  // Sidebar navigation items
  const sidebarItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'trending', label: 'Trending', icon: TrendingUp },
  ];

  const libraryItems = [
    { id: 'recent', label: 'Recently Played', icon: Clock },
    { id: 'liked', label: 'Liked Songs', icon: Heart },
    { id: 'queue', label: 'Playback Queue', icon: List },
  ];

  // Render main content based on current view
  const renderMainContent = () => {
    switch (currentView) {
      case 'search':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white">Search Results</h2>
            <div className="grid gap-4">
              {searchResults.map((track) => (
                <Card 
                  key={track.id}
                  className="p-4 hover:bg-gray-750 transition-all duration-200 cursor-pointer group"
                  onClick={() => playTrack(track)}
                >
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <img
                        src={getImageUrl(track)}
                        alt={track.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate">{track.name}</h3>
                      <p className="text-gray-400 truncate">
                        {track.artists.primary.map(artist => artist.name).join(', ')}
                      </p>
                      <p className="text-gray-500 text-sm">{enhancedMusicService.formatDuration(track.duration)}</p>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-green-400 font-medium text-sm">Play</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      case 'trending':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white">Trending Now</h2>
            <div className="grid gap-4">
              {trendingSongs.map((track) => (
                <Card 
                  key={track.id}
                  className="p-4 hover:bg-gray-750 transition-all duration-200 cursor-pointer group"
                  onClick={() => playTrack(track)}
                >
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <img
                        src={getImageUrl(track)}
                        alt={track.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate">{track.name}</h3>
                      <p className="text-gray-400 truncate">
                        {track.artists.primary.map(artist => artist.name).join(', ')}
                      </p>
                      <p className="text-gray-500 text-sm">{enhancedMusicService.formatDuration(track.duration)}</p>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-green-400 font-medium text-sm">Play</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      default: // home
        return (
          <div className="space-y-8">
            {/* Trending Section */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-white">Trending Now</h2>
                <Button 
                  variant="ghost" 
                  onClick={() => setCurrentView('trending')}
                  className="text-gray-400 hover:text-white"
                >
                  Show all
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {trendingSongs.slice(0, 10).map((track) => (
                  <Card 
                    key={track.id}
                    className="p-4 hover:bg-gray-750 transition-all duration-200 cursor-pointer group"
                    onClick={() => playTrack(track)}
                  >
                    <div className="space-y-3">
                      <div className="relative aspect-square overflow-hidden rounded-lg">
                        <img
                          src={getImageUrl(track)}
                          alt={track.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button 
                            variant="green" 
                            size="sm"
                            className="rounded-full w-12 h-12"
                          >
                            <Play className="w-5 h-5" />
                          </Button>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-white truncate">{track.name}</h3>
                        <p className="text-gray-400 text-sm truncate">
                          {track.artists.primary.map(artist => artist.name).join(', ')}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>

            {/* Recently Played (if available) */}
            {state.library.recentlyPlayed.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-white mb-6">Recently Played</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {state.library.recentlyPlayed.slice(0, 5).map((song, idx) => (
                    <Card 
                      key={`${song.id}-${idx}`}
                      className="p-4 hover:bg-gray-750 transition-all duration-200 cursor-pointer group"
                      onClick={() => actions.playTrack(song)}
                    >
                      <div className="space-y-3">
                        <div className="relative aspect-square overflow-hidden rounded-lg">
                          <img
                            src={song.image}
                            alt={song.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button 
                              variant="green" 
                              size="sm"
                              className="rounded-full w-12 h-12"
                            >
                              <Play className="w-5 h-5" />
                            </Button>
                          </div>
                        </div>
                        <div>
                          <h3 className="font-semibold text-white truncate">{song.title}</h3>
                          <p className="text-gray-400 text-sm truncate">{song.artist}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </div>
        );
    }
  };

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col">
      <audio ref={audioRef} crossOrigin="anonymous" />
      
      {/* Top Header */}
      <header className="bg-gray-900 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-green-400">🎵 VibeStream</h1>
          </div>
          
          {/* Search Bar */}
          <div className="flex-1 max-w-md mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search for songs, artists, albums..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchSongs(searchQuery)}
                className="pl-10 w-full"
              />
            </div>
          </div>
          
          {/* User Actions */}
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm">Sign Up</Button>
            <Button variant="green" size="sm">Log In</Button>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-64 bg-gray-900 border-r border-gray-700 p-4">
          <nav className="space-y-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id as any)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    currentView === item.id 
                      ? 'bg-gray-800 text-white' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-8">
            <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wide mb-4">My Library</h3>
            <nav className="space-y-2">
              {libraryItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-gray-400 hover:text-white hover:bg-gray-800"
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">
          {renderMainContent()}
        </main>
      </div>

      {/* Bottom Player */}
      {currentTrack && (
        <div className="bg-gray-800 border-t border-gray-700 p-4">
          <div className="flex items-center justify-between">
            {/* Currently Playing */}
            <div className="flex items-center space-x-4 flex-1 min-w-0" style={{ flexBasis: '30%' }}>
              <img
                src={getImageUrl(currentTrack)}
                alt={currentTrack.name}
                className="w-14 h-14 rounded-lg object-cover"
              />
              <div className="min-w-0">
                <h4 className="font-semibold text-white truncate">{currentTrack.name}</h4>
                <p className="text-gray-400 text-sm truncate">
                  {currentTrack.artists.primary.map(artist => artist.name).join(', ')}
                </p>
              </div>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-green-400">
                <Heart className="w-4 h-4" />
              </Button>
            </div>

            {/* Player Controls */}
            <div className="flex flex-col items-center space-y-2" style={{ flexBasis: '40%' }}>
              <div className="flex items-center space-x-4">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setIsShuffled(!isShuffled)}
                  className={isShuffled ? 'text-green-400' : 'text-gray-400'}
                >
                  <Shuffle className="w-4 h-4" />
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={skipPrevious}
                  className="text-gray-400 hover:text-white"
                >
                  <SkipBack className="w-5 h-5" />
                </Button>
                
                <Button
                  onClick={togglePlayPause}
                  variant="green"
                  className="w-10 h-10 rounded-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={skipNext}
                  className="text-gray-400 hover:text-white"
                >
                  <SkipForward className="w-5 h-5" />
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setRepeatMode((prev) => (prev + 1) % 3)}
                  className={repeatMode > 0 ? 'text-green-400' : 'text-gray-400'}
                >
                  <Repeat className="w-4 h-4" />
                  {repeatMode === 2 && <span className="text-xs ml-1">1</span>}
                </Button>
              </div>
              
              <div className="w-full flex items-center space-x-2">
                <span className="text-xs text-gray-400 w-10 text-right">{formatTime(currentTime)}</span>
                <Slider
                  value={progress}
                  onValueChange={handleProgressChange}
                  max={100}
                  step={0.1}
                  className="flex-1"
                />
                <span className="text-xs text-gray-400 w-10">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Volume & Options */}
            <div className="flex items-center space-x-3 justify-end" style={{ flexBasis: '30%' }}>
              <div className="flex items-center space-x-2">
                <Volume2 className="w-4 h-4 text-gray-400" />
                <Slider
                  value={volume}
                  onValueChange={handleVolumeChange}
                  max={100}
                  step={1}
                  className="w-24"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedMusicApp;
