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
  const [isSearching, setIsSearching] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
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
  
  // Categories for home page
  const [madeForYou, setMadeForYou] = useState<AppTrack[]>([]);
  const [viralSongs, setViralSongs] = useState<AppTrack[]>([]);
  const [topCharts, setTopCharts] = useState<AppTrack[]>([]);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  // Load trending songs on component mount
  useEffect(() => {
    loadTrendingSongs();
    loadHomeCategories();
  }, []);

  // Load trending songs using fetch API - EXACTLY as you specified
  const loadTrendingSongs = async () => {
    try {
      const [trendingResponse, rotationResponse] = await Promise.all([
        fetch('https://saavn.dev/api/search/songs?query=trending'),
        fetch('https://saavn.dev/api/search/songs?query=popular')
      ]);
      
      const trendingData = await trendingResponse.json();
      const rotationData = await rotationResponse.json();
      
      setTrendingSongs(trendingData.data.results || []);
      console.log(`✅ Loaded ${(trendingData.data.results || []).length} trending songs`);
    } catch (error) {
      console.error('Failed to load trending songs:', error);
      setTrendingSongs([]);
    }
  };

  // Load home page categories using your exact logic
  const loadHomeCategories = async () => {
    try {
      const [trendingResponse, rotationResponse] = await Promise.all([
        fetch('https://saavn.dev/api/search/songs?query=trending'),
        fetch('https://saavn.dev/api/search/songs?query=popular')
      ]);
      
      const trendingData = await trendingResponse.json();
      const rotationData = await rotationResponse.json();
      
      const trendingTracks = trendingData.data.results || [];
      const heavyRotation = rotationData.data.results || [];
      
      setMadeForYou(trendingTracks.slice(0, 6));
      setViralSongs(heavyRotation.slice(0, 6));
      setTopCharts([...trendingTracks.slice(6, 9), ...heavyRotation.slice(6, 9)]);
      
      console.log('✅ Home categories loaded successfully');
    } catch (error) {
      console.error('Failed to load home categories:', error);
    }
  };

  // Search songs using enhanced service with animation
  const searchSongs = async (query: string) => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    setIsLoading(true);
    setShowSuggestions(false);
    
    try {
      console.log(`🔍 Searching for: "${query}"`);
      const response = await enhancedMusicService.searchSongs(query);
      
      // Add delay for animation effect
      await new Promise(resolve => setTimeout(resolve, 800));
      
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
      setIsSearching(false);
    }
  };

  // Handle search input with suggestions
  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    
    if (value.length > 2) {
      const suggestions = [
        `${value} songs`,
        `${value} remix`,
        `${value} acoustic`,
        `${value} live`,
        `${value} cover`
      ];
      setSearchSuggestions(suggestions);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
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
            {/* Welcome Header */}
            <section className="bg-gradient-to-r from-green-600/20 to-blue-600/20 rounded-xl p-6 border border-gray-700">
              <h1 className="text-4xl font-bold text-white mb-2">Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}</h1>
              <p className="text-gray-300">Discover your new favorite music</p>
            </section>

            {/* Loading State */}
            {madeForYou.length === 0 && viralSongs.length === 0 && topCharts.length === 0 && (
              <section>
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-400 border-t-transparent mx-auto mb-4"></div>
                    <h3 className="text-xl font-semibold text-white mb-2">Loading amazing music...</h3>
                    <p className="text-gray-400">We're fetching the best tracks for you</p>
                  </div>
                </div>
              </section>
            )}

            {/* Made For You */}
            {madeForYou.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">🎵 Made For You</h2>
                  <Button 
                    variant="ghost" 
                    className="text-gray-400 hover:text-white"
                  >
                    Show all
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {madeForYou.map((track) => (
                    <Card 
                      key={track.id}
                      className="p-3 hover:bg-gray-750 transition-all duration-300 cursor-pointer group bg-gradient-to-b from-gray-800/50 to-gray-900/80 border border-gray-700/50"
                      onClick={() => playTrack(track)}
                    >
                      <div className="space-y-3">
                        <div className="relative aspect-square overflow-hidden rounded-lg">
                          <img
                            src={getImageUrl(track)}
                            alt={track.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                            <div className="bg-green-500 rounded-full p-3 shadow-lg transform scale-0 group-hover:scale-100 transition-transform duration-300">
                              <Play className="w-4 h-4 text-white" fill="white" />
                            </div>
                          </div>
                        </div>
                        <div>
                          <h3 className="font-semibold text-white truncate text-sm">{track.name}</h3>
                          <p className="text-gray-400 text-xs truncate">
                            {track.artists.primary.map((artist: any) => artist.name).join(', ')}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Viral Songs */}
            {viralSongs.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">🔥 Viral Right Now</h2>
                  <Button 
                    variant="ghost" 
                    className="text-gray-400 hover:text-white"
                  >
                    Show all
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {viralSongs.map((track) => (
                    <Card 
                      key={track.id}
                      className="p-3 hover:bg-gray-750 transition-all duration-300 cursor-pointer group bg-gradient-to-b from-red-900/20 to-gray-900/80 border border-red-700/30"
                      onClick={() => playTrack(track)}
                    >
                      <div className="space-y-3">
                        <div className="relative aspect-square overflow-hidden rounded-lg">
                          <img
                            src={getImageUrl(track)}
                            alt={track.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute top-2 right-2">
                            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">🔥</span>
                          </div>
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                            <div className="bg-red-500 rounded-full p-3 shadow-lg transform scale-0 group-hover:scale-100 transition-transform duration-300">
                              <Play className="w-4 h-4 text-white" fill="white" />
                            </div>
                          </div>
                        </div>
                        <div>
                          <h3 className="font-semibold text-white truncate text-sm">{track.name}</h3>
                          <p className="text-gray-400 text-xs truncate">
                            {track.artists.primary.map((artist: any) => artist.name).join(', ')}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Top Charts */}
            {topCharts.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">📈 Top Charts</h2>
                  <Button 
                    variant="ghost" 
                    className="text-gray-400 hover:text-white"
                  >
                    Show all
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {topCharts.map((track, index) => (
                    <Card 
                      key={track.id}
                      className="p-4 hover:bg-gray-750 transition-all duration-300 cursor-pointer group bg-gradient-to-r from-yellow-900/20 to-gray-900/80 border border-yellow-700/30"
                      onClick={() => playTrack(track)}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          <span className="text-3xl font-bold text-yellow-400">#{index + 1}</span>
                        </div>
                        <div className="relative">
                          <img
                            src={getImageUrl(track)}
                            alt={track.name}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Play className="w-5 h-5 text-white" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white truncate">{track.name}</h3>
                          <p className="text-gray-400 truncate text-sm">
                            {track.artists.primary.map((artist: any) => artist.name).join(', ')}
                          </p>
                          <p className="text-gray-500 text-xs">{enhancedMusicService.formatDuration(track.duration)}</p>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-yellow-400 font-medium text-sm">▶ Play</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Recently Played (if available) */}
            {queue.length > 0 && currentTrack && (
              <section>
                <h2 className="text-2xl font-bold text-white mb-6">🕒 Recently Played</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {queue.slice(0, 5).map((track: AppTrack, idx: number) => (
                    <Card 
                      key={`${track.id}-${idx}`}
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
                            {track.artists.primary.map((artist: any) => artist.name).join(', ')}
                          </p>
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
      <header className="bg-gray-900 border-b border-gray-700 p-4 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-green-400">🎵 VibeStream</h1>
          </div>
          
          {/* Enhanced Search Bar */}
          <div className="flex-1 max-w-md mx-8">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-all duration-300 ${
                isSearching ? 'text-green-400 animate-pulse' : 'text-gray-400'
              }`} />
              <Input
                placeholder="Search for songs, artists, albums..."
                value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchSongs(searchQuery)}
                onFocus={() => searchQuery.length > 2 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className={`pl-10 w-full transition-all duration-300 ${
                  isSearching ? 'ring-2 ring-green-400/50' : ''
                }`}
              />
              
              {/* Search Loading Animation */}
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-400 border-t-transparent"></div>
                </div>
              )}
              
              {/* Search Suggestions */}
              {showSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                  {searchSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSearchQuery(suggestion);
                        setShowSuggestions(false);
                        searchSongs(suggestion);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors duration-200 first:rounded-t-lg last:rounded-b-lg flex items-center space-x-3"
                    >
                      <Search className="w-4 h-4 text-gray-400" />
                      <span className="text-white">{suggestion}</span>
                    </button>
                  ))}
                </div>
              )}
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

      {/* Enhanced Bottom Player */}
      {currentTrack && (
        <div className="bg-gradient-to-r from-gray-800 via-gray-850 to-gray-800 border-t border-gray-600 p-4 shadow-2xl">
          <div className="flex items-center justify-between">
            {/* Currently Playing */}
            <div className="flex items-center space-x-4 flex-1 min-w-0" style={{ flexBasis: '30%' }}>
              <div className="relative group">
                <img
                  src={getImageUrl(currentTrack)}
                  alt={currentTrack.name}
                  className="w-16 h-16 rounded-lg object-cover shadow-lg ring-2 ring-gray-700 group-hover:ring-green-500 transition-all duration-300"
                />
                <div className="absolute inset-0 bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
              <div className="min-w-0">
                <h4 className="font-semibold text-white truncate text-lg">{currentTrack.name}</h4>
                <p className="text-gray-300 text-sm truncate">
                  {currentTrack.artists.primary.map((artist: any) => artist.name).join(', ')}
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-400 hover:text-red-400 hover:scale-110 transition-all duration-200"
              >
                <Heart className="w-5 h-5" />
              </Button>
            </div>

            {/* Enhanced Player Controls */}
            <div className="flex flex-col items-center space-y-3" style={{ flexBasis: '40%' }}>
              <div className="flex items-center space-x-6">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setIsShuffled(!isShuffled)}
                  className={`${isShuffled ? 'text-green-400 bg-green-400/20' : 'text-gray-300'} hover:scale-110 transition-all duration-200 p-3 rounded-full`}
                  title="Shuffle"
                >
                  <Shuffle className="w-5 h-5" />
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={skipPrevious}
                  className="text-gray-300 hover:text-white hover:scale-110 transition-all duration-200 p-3 rounded-full"
                  title="Previous"
                >
                  <SkipBack className="w-6 h-6" />
                </Button>
                
                <Button
                  onClick={togglePlayPause}
                  variant="green"
                  className="w-14 h-14 rounded-full shadow-lg hover:shadow-green-500/25 hover:scale-105 transition-all duration-200 ring-2 ring-green-500/30"
                  disabled={isLoading}
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isLoading ? (
                    <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : isPlaying ? (
                    <Pause className="w-6 h-6" fill="white" />
                  ) : (
                    <Play className="w-6 h-6" fill="white" />
                  )}
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={skipNext}
                  className="text-gray-300 hover:text-white hover:scale-110 transition-all duration-200 p-3 rounded-full"
                  title="Next"
                >
                  <SkipForward className="w-6 h-6" />
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setRepeatMode((prev) => (prev + 1) % 3)}
                  className={`${repeatMode > 0 ? 'text-green-400 bg-green-400/20' : 'text-gray-300'} hover:scale-110 transition-all duration-200 p-3 rounded-full relative`}
                  title={`Repeat ${repeatMode === 0 ? 'Off' : repeatMode === 1 ? 'All' : 'One'}`}
                >
                  <Repeat className="w-5 h-5" />
                  {repeatMode === 2 && (
                    <span className="absolute -top-1 -right-1 bg-green-400 text-gray-900 text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">1</span>
                  )}
                </Button>
              </div>
              
              <div className="w-full flex items-center space-x-4">
                <span className="text-sm text-gray-300 w-12 text-right font-mono">{formatTime(currentTime)}</span>
                <div className="flex-1 group">
                  <Slider
                    value={progress}
                    onValueChange={handleProgressChange}
                    max={100}
                    step={0.1}
                    className="flex-1"
                  />
                </div>
                <span className="text-sm text-gray-300 w-12 font-mono">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Enhanced Volume & Options */}
            <div className="flex items-center space-x-4 justify-end" style={{ flexBasis: '30%' }}>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-gray-400 hover:text-white hover:scale-110 transition-all duration-200"
                title="Queue"
              >
                <List className="w-5 h-5" />
              </Button>
              
              <div className="flex items-center space-x-3">
                <Volume2 className="w-5 h-5 text-gray-300" />
                <div className="w-28 group">
                  <Slider
                    value={volume}
                    onValueChange={handleVolumeChange}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>
                <span className="text-xs text-gray-400 w-8 text-center">{volume[0]}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedMusicApp;
