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
  Settings,
  X,
  Check
} from 'lucide-react';
import { useVibeStream } from '../context/VibeStreamContext';
import { useAuth } from '../context/AuthContext';
import { enhancedMusicService, SaavnTrack } from '../services/enhancedMusicService';
import { upsertTrack as dbUpsertTrack, logRecentlyPlayed, likeTrack as dbLikeTrack, unlikeTrack as dbUnlikeTrack, recommendTracks, rebuildArtistCounts, fromDbTrack, getLikedTracksWithMeta, getRecentlyPlayedWithMeta, savePlaybackState, getPlaybackState, toTrackId } from '../services/dbService';
import { getPreferredLanguages, savePreferredLanguages } from '../services/profileService';
import TopPlaylists from './TopPlaylists';
import PremiumPlayer from './PremiumPlayer';
// Auth gating is handled in App root; no login/register modals here
// Resolve logo URL via Vite for bundling & base path safety
const LOGO_URL = new URL('../../icons/VStream-logo.png', import.meta.url).href;

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
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { className?: string }>(({ className = "", ...props }, ref) => (
  <input
    ref={ref}
    {...props}
    className={`px-4 py-2 border border-gray-700 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-400 ${className}`}
  />
));
Input.displayName = 'Input';

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
  const { user, isGuest, previewLimitSeconds, actions: auth } = useAuth();
  const [currentView, setCurrentView] = useState<'home' | 'search' | 'trending' | 'library' | 'playlists' | 'playlistTracks' | 'recent' | 'liked' | 'queue'>('home');
  const [playlistTracks, setPlaylistTracks] = useState<AppTrack[]>([]);
  const [playlistName, setPlaylistName] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AppTrack[]>([]);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [trendingSongs, setTrendingSongs] = useState<AppTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
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
  const [showQueuePanel, setShowQueuePanel] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [likedTracks, setLikedTracks] = useState<AppTrack[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<AppTrack[]>([]);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  // Premium extras
  const [sleepUntil, setSleepUntil] = useState<number | null>(null); // epoch ms for sleep end
  const [loopA, setLoopA] = useState<number | null>(null);
  const [loopB, setLoopB] = useState<number | null>(null);
  // Premium UX: header scroll progress & player hover tooltip
  const [scrollProgress, setScrollProgress] = useState(0);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState(0);
  // User menu state
  const [showUserMenu, setShowUserMenu] = useState(false);
  // Preferences
  const [preferredLanguages, setPreferredLanguages] = useState<string[]>([]); // committed (saved / active personalization)
  const [pendingLanguages, setPendingLanguages] = useState<string[]>([]); // editing buffer until Apply
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [savedPrefsAt, setSavedPrefsAt] = useState<number | null>(null);
  // Continue listening (last saved)
  const [resumeState, setResumeState] = useState<{ track: AppTrack; position: number } | null>(null);
  
  // Prefer user profile image if available, otherwise fallback to app logo (no longer used in header avatar)
  const profileImageUrl = (user as any)?.user_metadata?.avatar_url || (user as any)?.user_metadata?.picture || null;
  // Friendly display name (avoid showing email)
  const displayName = React.useMemo(() => {
    if (!user) return isGuest ? 'Vibe Guest' : 'Vibe User';
    const meta: any = (user as any)?.user_metadata || {};
    return (
      meta.display_name || meta.full_name || meta.name || meta.given_name || meta.preferred_username || 'Vibe User'
    );
  }, [user, isGuest]);
  
  // Categories for home page
  const [madeForYou, setMadeForYou] = useState<AppTrack[]>([]);
  const [viralSongs, setViralSongs] = useState<AppTrack[]>([]);
  const [topCharts, setTopCharts] = useState<AppTrack[]>([]);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const originalVolumeRef = useRef<number | null>(null);
  // Header UI refs for click-outside handling
  const desktopUserMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileUserMenuRef = useRef<HTMLDivElement | null>(null);
  const desktopSearchPanelRef = useRef<HTMLDivElement | null>(null);
  const mobileSearchPanelRef = useRef<HTMLDivElement | null>(null);
  const desktopSearchInputRef = useRef<HTMLInputElement | null>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    try {
      const rs = localStorage.getItem('vibestream_recent_searches');
      if (rs) {
        const arr = JSON.parse(rs);
        if (Array.isArray(arr)) setRecentSearches(arr.slice(0, 8));
      }
    } catch {}
  }, []);

  // Load trending songs on component mount
  useEffect(() => {
    loadTrendingSongs();
    loadHomeCategories();
    try {
      const likedRaw = localStorage.getItem('vibestream_liked');
      if (likedRaw) { const parsed = JSON.parse(likedRaw); if(Array.isArray(parsed)) setLikedTracks(parsed); }
      const recentRaw = localStorage.getItem('vibestream_recent');
      if (recentRaw) { const parsedR = JSON.parse(recentRaw); if(Array.isArray(parsedR)) setRecentlyPlayed(parsedR); }
      const langsRaw = localStorage.getItem('vibestream_langs');
  if (langsRaw) { const parsedL = JSON.parse(langsRaw); if (Array.isArray(parsedL)) { setPreferredLanguages(parsedL); setPendingLanguages(parsedL); } }
    } catch(e) { console.warn('persist load fail', e); }
  }, []);

  // Reload trending songs when preferred languages change
  useEffect(() => {
    if (preferredLanguages.length > 0) {
      loadTrendingSongs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferredLanguages.join(',')]);

    // Local fallback hydration (for guests)
    // Authenticated hydration from Supabase
    useEffect(() => {
      let ignore = false;
      (async () => {
        if (!user?.id) return; // keep local fallback for guests
        try {
          const [likedRows, recentRows] = await Promise.all([
            getLikedTracksWithMeta(user.id, 200),
            getRecentlyPlayedWithMeta(user.id, 100),
          ]);
          if (ignore) return;
          const liked = likedRows
            .map((r) => fromDbTrack(r.tracks))
            .filter(Boolean);
          const recent = recentRows
            .map((r) => fromDbTrack(r.tracks))
            .filter(Boolean);
          setLikedTracks(liked as AppTrack[]);
          setRecentlyPlayed(recent as AppTrack[]);
        } catch (e) {
          console.warn('⚠️ Failed to hydrate from Supabase; using local fallback', e);
        }
      })();
      return () => { ignore = true; };
    }, [user?.id]);

  // If authenticated, fetch preferred languages from profile
  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!user?.id) return;
      try {
        const langs = await getPreferredLanguages(user.id);
        if (!ignore && langs && Array.isArray(langs) && langs.length > 0) {
          setPreferredLanguages(langs);
          setPendingLanguages(langs);
        }
      } catch {}
    })();
    return () => { ignore = true; };
  }, [user?.id]);

  // Track page scroll progress for a subtle header progress line
  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const pct = max > 0 ? (doc.scrollTop / max) * 100 : 0;
      setScrollProgress(pct);
    };
    window.addEventListener('scroll', onScroll, { passive: true } as any);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll as any);
  }, []);

  // Click-outside to close menus and search suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      // User menu: ignore clicks on the trigger button(s)
      const menuButtonClicked = (target as HTMLElement)?.closest?.('[data-user-menu-button]');
      const inDesktopMenu = desktopUserMenuRef.current?.contains(target);
      const inMobileMenu = mobileUserMenuRef.current?.contains(target);
      // Only close if click is outside menu AND not on menu button
      if (!menuButtonClicked && !inDesktopMenu && !inMobileMenu && showUserMenu) {
        setShowUserMenu(false);
      }

      // Search suggestions: consider both input and panel
      const inDesktopSearch = desktopSearchPanelRef.current?.contains(target) || desktopSearchInputRef.current?.contains(target);
      const inMobileSearch = mobileSearchPanelRef.current?.contains(target) || mobileSearchInputRef.current?.contains(target);
      if (!inDesktopSearch && !inMobileSearch && showSuggestions) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu, showSuggestions]);

  // If authenticated, fetch preferred languages from profile
  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!user?.id) return;
      try {
        const langs = await getPreferredLanguages(user.id);
        if (!ignore && langs && Array.isArray(langs) && langs.length > 0) {
          setPreferredLanguages(langs);
          setPendingLanguages(langs);
        }
      } catch {}
    })();
    return () => { ignore = true; };
  }, [user?.id]);

  // Reload home categories when preferred languages change
  useEffect(() => {
    loadHomeCategories(preferredLanguages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferredLanguages.join(',')]);

  useEffect(()=>{ try { localStorage.setItem('vibestream_liked', JSON.stringify(likedTracks.slice(0,200))); } catch{} }, [likedTracks]);
  useEffect(()=>{ try { localStorage.setItem('vibestream_recent', JSON.stringify(recentlyPlayed.slice(0,100))); } catch{} }, [recentlyPlayed]);
  useEffect(()=>{ if(currentTrack) setIsFavorite(likedTracks.some(t=>t.id===currentTrack.id)); else setIsFavorite(false); }, [currentTrack, likedTracks]);

  // Load trending songs using fetch API - with language filtering
  const loadTrendingSongs = async () => {
    try {
      const effective = preferredLanguages && preferredLanguages.length > 0 ? preferredLanguages : ['english','hindi'];
      
      const [trendingResponse, rotationResponse] = await Promise.all([
        fetch('https://saavn.dev/api/search/songs?query=trending&limit=40'),
        fetch('https://saavn.dev/api/search/songs?query=popular&limit=40')
      ]);
      
      const trendingData = await trendingResponse.json();
      const rotationData = await rotationResponse.json();
      
      let allTracks = [...(trendingData.data.results || []), ...(rotationData.data.results || [])];
      
      // Filter by language and dedupe
      const seenIds = new Set<string>();
      allTracks = allTracks.filter((track: any) => {
        if (seenIds.has(track.id)) return false;
        seenIds.add(track.id);
        
        const trackLang = track.language?.toLowerCase();
        if (trackLang && effective.length > 0) {
          return effective.some(lang => 
            trackLang.includes(lang.toLowerCase()) || lang.toLowerCase().includes(trackLang)
          );
        }
        return true; // Keep tracks without language info
      });
      
      setTrendingSongs(allTracks.slice(0, 20));
      console.log(`✅ Loaded ${allTracks.length} trending songs for languages: ${effective.join(',')}`);
    } catch (error) {
      console.error('Failed to load trending songs:', error);
      setTrendingSongs([]);
    }
  };

  // Load home page categories personalized by preferred languages
  const loadHomeCategories = async (langs: string[] | null = null) => {
    try {
      const languages = (langs ?? preferredLanguages);
      // Fallback defaults if none selected
      const effective = languages && languages.length > 0 ? languages : ['english','hindi'];
      const modules = await enhancedMusicService.getHomePageModules(effective);
      const trendingTracks = modules.data?.trending?.songs || [];
      
      // Language-aware search for viral and top charts with deduplication
      const searchWithLanguageFilter = async (query: string, limit: number = 6) => {
        const response = await fetch(`https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}&limit=${limit * 2}`);
        const data = await response.json();
        let tracks = data?.data?.results || [];
        
        // Filter by language and dedupe
        const seenIds = new Set<string>();
        tracks = tracks.filter((track: any) => {
          if (seenIds.has(track.id)) return false;
          seenIds.add(track.id);
          
          const trackLang = track.language?.toLowerCase();
          if (trackLang && effective.length > 0) {
            return effective.some(lang => 
              trackLang.includes(lang.toLowerCase()) || lang.toLowerCase().includes(trackLang)
            );
          }
          return true;
        }).slice(0, limit);
        
        return tracks;
      };

      const [heavyRotation, topTracks] = await Promise.all([
        searchWithLanguageFilter('viral', 6),
        searchWithLanguageFilter('top hits', 9)
      ]);
      
      setMadeForYou(trendingTracks.slice(0, 6));
      setViralSongs(heavyRotation.slice(0, 6));
      setTopCharts(topTracks.slice(0, 9));
      console.log('✅ Home categories loaded for languages:', effective.join(','));
    } catch (error) {
      console.error('Failed to load home categories:', error);
    }
  };

  // Enhanced search with suggestions & small debounce
  const performSearch = async (query: string) => {
    if (!query.trim()) return;
    setSelectedSuggestionIndex(-1);
    setHasSearched(true);
    setIsSearching(true);
    setIsLoading(true);
    setShowSuggestions(false);
    try {
      console.log(`🔍 Searching (enhanced) for: "${query}"`);
      const { results, suggestions } = await enhancedMusicService.searchWithSuggestions(query, preferredLanguages.length > 0 ? preferredLanguages : undefined);
      // Small artificial delay for smoother skeleton transition
      await new Promise(r => setTimeout(r, 400));
      setSearchResults(results);
      if (suggestions.length) setSearchSuggestions(suggestions);
      setCurrentView('search');
      // save recent searches
      try {
        setRecentSearches(prev => {
          const next = [query, ...prev.filter(q => q.toLowerCase() !== query.toLowerCase())].slice(0, 8);
          localStorage.setItem('vibestream_recent_searches', JSON.stringify(next));
          return next;
        });
      } catch {}
      console.log(`✅ Search returned ${results.length} tracks, ${suggestions.length} suggestions`);
    } catch (e) {
      console.error('❌ Enhanced search failed:', e);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
      setIsSearching(false);
    }
  };

  // Handle search input with suggestions
  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    setSelectedSuggestionIndex(-1);
    if (debounceTimer) clearTimeout(debounceTimer);
    if (value.length < 3) {
      setShowSuggestions(false);
      setIsSearching(false);
      return;
    }
    const timer = setTimeout(() => {
      performSearch(value);
    }, 500);
    setDebounceTimer(timer);
    // Show quick inline suggestions while debounce runs
    const quick = [
      `${value} song`,
      `${value} remix`,
      `${value} live`
    ];
    setSearchSuggestions(quick);
    setShowSuggestions(true);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, context: 'desktop' | 'mobile') => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setShowSuggestions(true);
      setSelectedSuggestionIndex(i => Math.min((i < 0 ? -1 : i) + 1, searchSuggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      if (selectedSuggestionIndex >= 0 && searchSuggestions[selectedSuggestionIndex]) {
        const s = searchSuggestions[selectedSuggestionIndex];
        setSearchQuery(s);
        setShowSuggestions(false);
        performSearch(s);
      } else {
        performSearch(searchQuery);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      (context === 'desktop' ? desktopSearchInputRef : mobileSearchInputRef).current?.blur();
    }
  };

  // Get download URL for a track using enhanced service
  const getDownloadUrl = async (trackId: string): Promise<string | null> => {
    return await enhancedMusicService.getAudioUrl(trackId);
  };

  // Play a track
  const playTrack = async (track: AppTrack, opts?: { startAtSeconds?: number }) => {
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

        // Seek to position if provided
        if (opts?.startAtSeconds && !isNaN(opts.startAtSeconds)) {
          audioRef.current.currentTime = Math.max(0, opts.startAtSeconds);
        }
        await audioRef.current.play();
        setIsPlaying(true);
        setRecentlyPlayed(prev=>{const filtered=prev.filter(t=>t.id!==track.id); return [track,...filtered].slice(0,50);});
        console.log('✅ Track started playing');

        // Persist to Supabase (authenticated users)
        try {
          if (user?.id) {
            const dbId = await dbUpsertTrack(track);
            await logRecentlyPlayed(user.id, dbId, Math.floor(audioRef.current.currentTime || 0), 'web');
          }
        } catch (persistErr) {
          console.warn('⚠️ Failed to persist play to Supabase', persistErr);
        }

        // Guest preview gating: limit playback to previewLimitSeconds
        if (isGuest && previewLimitSeconds > 0) {
          const limiter = () => {
            if (!audioRef.current) return;
            if (audioRef.current.currentTime >= previewLimitSeconds) {
              audioRef.current.pause();
              setIsPlaying(false);
              auth.openAuthPrompt('full-play');
              audioRef.current.removeEventListener('timeupdate', limiter);
            }
          };
          audioRef.current.addEventListener('timeupdate', limiter);
        }
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

  // Persist playback position periodically (throttled) for authenticated users
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !user?.id || !currentTrack) return;
    let lastSaved = 0;
    const onTime = () => {
      const now = Date.now();
      if (now - lastSaved < 8000) return; // throttle 8s
      lastSaved = now;
      const pos = Math.floor(audio.currentTime || 0);
      const dbId = toTrackId(currentTrack.id);
      savePlaybackState(user.id!, dbId, pos).catch(() => {});
    };
    audio.addEventListener('timeupdate', onTime);
    return () => audio.removeEventListener('timeupdate', onTime);
  }, [user?.id, currentTrack?.id]);

  // Load last playback state (continue listening)
  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!user?.id) { setResumeState(null); return; }
      try {
        const state = await getPlaybackState(user.id);
        if (!state || !state.track_id) { if(!ignore) setResumeState(null); return; }
        const saavnId = state.track_id.startsWith('saavn:') ? state.track_id.slice(6) : state.track_id;
        // Get song details to construct UI track
        const details = await enhancedMusicService.getSongDetails(saavnId);
        const tr = details?.data as any as AppTrack | null;
        if (tr && !ignore) {
          setResumeState({ track: tr, position: state.position_seconds ?? 0 });
        }
      } catch (e) {
        console.warn('Failed to load playback state', e);
        if (!ignore) setResumeState(null);
      }
    })();
    return () => { ignore = true; };
  }, [user?.id]);

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

  // Premium: seek by +/- seconds
  const seekBySeconds = (delta: number) => {
    if (!audioRef.current || !duration) return;
    const newTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + delta));
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    setProgress([duration > 0 ? (newTime / duration) * 100 : 0]);
  };

  // Premium: mute toggle
  const [isMuted, setIsMuted] = useState(false);
  const toggleMute = () => {
    if (!audioRef.current) return;
    const next = !isMuted;
    audioRef.current.muted = next;
    setIsMuted(next);
  };

  // Premium: handle sleep timer with smooth fade-out in last 10s
  useEffect(() => {
    if (!sleepUntil) return;
    const timer = setInterval(() => {
      const now = Date.now();
      if (!audioRef.current) return;
      const remainingMs = sleepUntil - now;
      if (remainingMs <= 0) {
        audioRef.current.pause();
        setIsPlaying(false);
        // restore volume
        if (originalVolumeRef.current !== null) {
          audioRef.current.volume = originalVolumeRef.current;
        }
        setSleepUntil(null);
        originalVolumeRef.current = null;
      } else if (remainingMs <= 10000) {
        // fade out 0-10s
        if (originalVolumeRef.current === null) {
          originalVolumeRef.current = audioRef.current.volume;
        }
        const base = originalVolumeRef.current ?? (volume[0] / 100);
        const vol = Math.max(0, Math.min(1, (remainingMs / 10000) * base));
        audioRef.current.volume = vol;
      }
    }, 500);
    return () => clearInterval(timer);
  }, [sleepUntil, volume]);

  const setSleepMinutes = (minutes: number) => {
    setSleepUntil(Date.now() + minutes * 60 * 1000);
  };
  const cancelSleep = () => {
    setSleepUntil(null);
    if (audioRef.current && originalVolumeRef.current !== null) {
      audioRef.current.volume = originalVolumeRef.current;
    }
    originalVolumeRef.current = null;
  };

  // Premium: A-B loop handling
  useEffect(() => {
    if (!audioRef.current) return;
    const check = () => {
      if (!audioRef.current) return;
      if (loopA !== null && loopB !== null && loopB > loopA) {
        if (audioRef.current.currentTime >= loopB) {
          audioRef.current.currentTime = loopA;
        }
      }
    };
    audioRef.current.addEventListener('timeupdate', check);
    return () => audioRef.current?.removeEventListener('timeupdate', check);
  }, [loopA, loopB]);

  // Toggle favorite (local visual only)
  const toggleFavorite = async () => {
    if(!currentTrack) return;
    const willLike = !likedTracks.some(t=>t.id===currentTrack.id);
    // Optimistic UI update
    setLikedTracks(prev=>{ const exists = prev.find(t=>t.id===currentTrack.id); return exists? prev.filter(t=>t.id!==currentTrack.id): [currentTrack!, ...prev.filter(t=>t.id!==currentTrack!.id)].slice(0,200);});
    setIsFavorite(p=>!p);
    // Sync with Supabase if authenticated
    if (!user?.id) return;
    try {
      const dbId = await dbUpsertTrack(currentTrack);
      if (willLike) await dbLikeTrack(user.id, dbId); else await dbUnlikeTrack(user.id, dbId);
    } catch (e) {
      console.warn('⚠️ Failed to sync favorite with Supabase', e);
    }
  };
  // Gate favorites for guests
  const gatedToggleFavorite = () => {
    if (isGuest) {
      auth.openAuthPrompt('save');
      return;
    }
    toggleFavorite();
  };

  // Cycle playback speed
  const cyclePlaybackSpeed = () => {
    const speeds = [0.75, 1, 1.25, 1.5];
    const idx = speeds.indexOf(playbackSpeed);
    const next = speeds[(idx + 1) % speeds.length];
    setPlaybackSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  // Clickable top progress bar handler
  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    handleProgressChange([pct]);
  };

  // Hover time preview for progress bar
  const handleProgressBarMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) { setHoverTime(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setHoverTime(ratio * duration);
    setHoverX(e.clientX - rect.left);
  };
  const handleProgressBarLeave = () => setHoverTime(null);

  // Get image URL using enhanced service
  const getImageUrl = (track: AppTrack) => {
    return enhancedMusicService.getImageUrl(track);
  };

  // Sidebar navigation items
  const sidebarItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'playlists', label: 'Top Playlists', icon: List },
    { id: 'trending', label: 'Trending', icon: TrendingUp },
  ];

  const libraryItems = [
    { id: 'recent', label: 'Recently Played', icon: Clock },
    { id: 'liked', label: 'Liked Songs', icon: Heart },
    { id: 'queue', label: 'Playback Queue', icon: List },
  ];

  // Recommended tracks (from Supabase)
  const [recommended, setRecommended] = useState<AppTrack[]>([]);
  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!user?.id) { setRecommended([]); return; }
      try {
        await rebuildArtistCounts(user.id);
        const rows = await recommendTracks(user.id);
        const mapped = (rows as any[]).map((r:any) => fromDbTrack(r));
        // Dedupe by track id to avoid duplicate keys and UI confusion
        const seen = new Set<string>();
        const deduped: AppTrack[] = [] as any;
        for (const t of mapped as AppTrack[]) {
          if (!t) continue;
          const id = t.id;
          if (!seen.has(id)) { seen.add(id); deduped.push(t); }
        }
        if (!ignore) setRecommended(deduped);
      } catch (e) {
        console.warn('⚠️ Failed to load recommendations', e);
        if (!ignore) setRecommended([]);
      }
    })();
    return () => { ignore = true; };
  }, [user?.id]);

  // Render main content based on current view
  const handlePlayPlaylist = async (playlist: any) => {
    setIsLoading(true);
    setPlaylistTracks([]);
    setPlaylistName(playlist.name || 'Playlist');
    setCurrentView('playlistTracks');

    try {
      console.log(`🎵 Fetching playlist with ID: ${playlist.id}`);
      const response = await fetch(`https://saavn.dev/api/playlists?id=${playlist.id}`);
      const data = await response.json();
      console.log('📀 Playlist API Response:', data);

      if (data.success && data.data && Array.isArray(data.data.songs) && data.data.songs.length > 0) {
        console.log(`🎶 Found ${data.data.songs.length} songs in playlist.`);
        setPlaylistTracks(data.data.songs);
      } else {
        console.log('❌ No tracks found in this playlist from the API. Using search as fallback.');
        // Fallback to search with playlist name
        const searchResponse = await fetch(`https://saavn.dev/api/search/songs?query=${encodeURIComponent(playlist.name)}&limit=20`);
        const searchData = await searchResponse.json();
        if (searchData.success && searchData.data && searchData.data.results) {
          console.log(`🎶 Found ${searchData.data.results.length} songs via search fallback.`);
          setPlaylistTracks(searchData.data.results);
        } else {
          setPlaylistTracks([]);
        }
      }
    } catch (error) {
      console.error('❌ Failed to fetch playlist tracks:', error);
      setPlaylistTracks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMainContent = () => {
    switch (currentView) {
      case 'search':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-3xl font-bold text-white">Search Results</h2>
                <p className="text-gray-400 text-sm mt-1">{searchResults.length > 0 ? `${searchResults.length} tracks found` : hasSearched && !isSearching ? 'No tracks found' : 'Type to search'}</p>
              </div>
              {isSearching && (
                <div className="flex items-center space-x-2 text-green-400 text-sm">
                  <div className="h-3 w-3 rounded-full bg-green-400 animate-ping" />
                  <span>Searching...</span>
                </div>
              )}
            </div>

            {/* Empty State */}
            {hasSearched && !isSearching && searchResults.length === 0 && (
              <div className="flex items-center justify-center py-20">
                <div className="text-center max-w-md">
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-xl font-semibold text-white mb-2">No results</h3>
                  <p className="text-gray-400 text-sm">Try refining your query or use different keywords (e.g. artist name, track title).</p>
                </div>
              </div>
            )}

            {/* Loading Skeleton */}
            {isSearching && (
              <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="animate-pulse p-3 rounded-lg bg-gray-800/60 border border-gray-700/50 space-y-3">
                    <div className="aspect-square rounded-md bg-gray-700" />
                    <div className="h-3 rounded bg-gray-700 w-3/4" />
                    <div className="h-3 rounded bg-gray-700 w-1/2" />
                  </div>
                ))}
              </div>
            )}

            {/* Results Grid */}
            {!isSearching && searchResults.length > 0 && (
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {searchResults.map((track) => {
                  const isCurrent = currentTrack?.id === track.id;
                  return (
                    <Card
                      key={track.id}
                      className={`p-3 group relative overflow-hidden transition-all duration-300 cursor-pointer bg-gradient-to-b from-gray-800/50 to-gray-900/80 border border-gray-700/50 hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/10 ${isCurrent ? 'ring-2 ring-green-500/60' : ''}`}
                      onClick={() => playTrack(track)}
                    >
                      <div className="space-y-3">
                        <div className="relative aspect-square overflow-hidden rounded-md">
                          <img
                            src={getImageUrl(track)}
                            alt={track.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="bg-green-500 rounded-full p-3 shadow-lg transform scale-0 group-hover:scale-100 transition-transform duration-300">
                              <Play className="w-4 h-4 text-white" fill="white" />
                            </div>
                          </div>
                          {isCurrent && (
                            <div className="absolute top-1 left-1 bg-green-500 text-gray-900 text-[10px] font-bold px-2 py-0.5 rounded-full">PLAYING</div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-semibold text-white text-sm leading-tight truncate" title={track.name}>{track.name}</h3>
                          <p className="text-[11px] text-gray-400 truncate" title={track.artists.primary.map(a => a.name).join(', ')}>
                            {track.artists.primary.map(a => a.name).join(', ')}
                          </p>
                          <p className="text-[10px] text-gray-500 font-mono">
                            {enhancedMusicService.formatDuration(track.duration)}
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        );
      case 'playlistTracks':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white mb-4">{playlistName}</h2>
            {playlistTracks.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-400 border-t-transparent mx-auto mb-4"></div>
                      <h3 className="text-xl font-semibold text-white mb-2">Loading playlist tracks...</h3>
                      <p className="text-gray-400">Please wait while we fetch the songs</p>
                    </>
                  ) : (
                    <>
                      <div className="text-6xl mb-4">🎵</div>
                      <h3 className="text-xl font-semibold text-white mb-2">No tracks found</h3>
                      <p className="text-gray-400">This playlist appears to be empty or couldn't be loaded</p>
                      <button 
                        onClick={() => setCurrentView('playlists')}
                        className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                      >
                        Back to Playlists
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid gap-4">
                {playlistTracks.map((track) => (
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
            )}
          </div>
        );
      case 'playlists':
        return <TopPlaylists onPlayPlaylist={handlePlayPlaylist} />;
      case 'recent':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white mb-4">🕒 Recently Played</h2>
            {recentlyPlayed.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="text-6xl mb-4">🎧</div>
                  <h3 className="text-xl font-semibold text-white mb-2">No tracks played yet</h3>
                  <p className="text-gray-400">Your recently played tracks will appear here</p>
                  <button 
                    onClick={() => setCurrentView('home')}
                    className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Back to Home
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {recentlyPlayed.map((track, idx) => (
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
            )}
          </div>
        );
      case 'liked':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white mb-4">❤️ Liked Songs</h2>
            {likedTracks.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="text-6xl mb-4">💔</div>
                  <h3 className="text-xl font-semibold text-white mb-2">No liked songs yet</h3>
                  <p className="text-gray-400">Your favorite tracks will appear here</p>
                  <button 
                    onClick={() => setCurrentView('home')}
                    className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Back to Home
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {likedTracks.map((track) => (
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
            )}
          </div>
        );
      case 'queue':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold text-white">📚 Playback Queue</h2>
              <Button 
                variant="ghost" 
                className="text-gray-400 hover:text-white"
                onClick={() => setShowQueuePanel(false)}
              >
                Close
              </Button>
            </div>
            {queue.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="text-6xl mb-4">🎶</div>
                  <h3 className="text-xl font-semibold text-white mb-2">Queue is empty</h3>
                  <p className="text-gray-400">Add some tracks to get started</p>
                  <button 
                    onClick={() => setCurrentView('home')}
                    className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Back to Home
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {queue.map((track, idx) => {
                  const isCurrent = currentTrack?.id === track.id;
                  return (
                    <Card
                      key={track.id}
                      className={`p-4 group relative overflow-hidden transition-all duration-300 cursor-pointer bg-gradient-to-b from-gray-800/50 to-gray-900/80 border border-gray-700/50 hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/10 ${isCurrent ? 'ring-2 ring-green-500/60' : ''}`}
                      onClick={() => playTrack(track)}
                    >
                      <div className="space-y-3">
                        <div className="relative aspect-square overflow-hidden rounded-md">
                          <img
                            src={getImageUrl(track)}
                            alt={track.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="bg-green-500 rounded-full p-3 shadow-lg transform scale-0 group-hover:scale-100 transition-transform duration-300">
                              <Play className="w-4 h-4 text-white" fill="white" />
                            </div>
                          </div>
                          {isCurrent && (
                            <div className="absolute top-1 left-1 bg-green-500 text-gray-900 text-[10px] font-bold px-2 py-0.5 rounded-full">PLAYING</div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-semibold text-white text-sm leading-tight truncate" title={track.name}>{track.name}</h3>
                          <p className="text-[11px] text-gray-400 truncate" title={track.artists.primary.map(a => a.name).join(', ')}>
                            {track.artists.primary.map(a => a.name).join(', ')}
                          </p>
                          <p className="text-[10px] text-gray-500 font-mono">
                            {enhancedMusicService.formatDuration(track.duration)}
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
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

            {/* Continue Listening */}
            {user && resumeState && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-2xl font-bold text-white">⏯️ Continue Listening</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card 
                    className="p-4 hover:bg-gray-750 transition-all duration-300 cursor-pointer group bg-gradient-to-b from-emerald-900/20 to-gray-900/80 border border-emerald-700/30"
                    onClick={() => playTrack(resumeState.track, { startAtSeconds: resumeState.position })}
                  >
                    <div className="flex items-center gap-4">
                      <img src={getImageUrl(resumeState.track)} alt={resumeState.track.name} className="w-20 h-20 rounded-lg object-cover" />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-white truncate">{resumeState.track.name}</h3>
                        <p className="text-gray-400 text-sm truncate">{resumeState.track.artists.primary.map(a=>a.name).join(', ')}</p>
                        <p className="text-gray-500 text-xs mt-1">Resume at {formatTime(resumeState.position)}</p>
                      </div>
                      <Button variant="green" size="sm" className="rounded-full">
                        <Play className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                </div>
              </section>
            )}

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

            {/* Recommended For You (Supabase) */}
            {user && recommended.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">✨ Recommended For You</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {recommended.map((track, idx) => (
                    <Card 
                      key={`rec-${track.id}-${idx}`}
                      className="p-3 hover:bg-gray-750 transition-all duration-300 cursor-pointer group bg-gradient-to-b from-emerald-900/20 to-gray-900/80 border border-emerald-700/30"
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
                            <div className="bg-emerald-500 rounded-full p-3 shadow-lg transform scale-0 group-hover:scale-100 transition-transform duration-300">
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
      {/* Header */}
      <header className="sticky top-0 z-50 relative backdrop-blur-xl bg-[#0B0F14]/80 border-b border-white/10 px-4 pt-3 pb-2 md:py-3">
        {/* Subtle scroll progress line */}
        <div className="absolute left-0 right-0 top-0 h-0.5 bg-white/5 overflow-hidden">
          <div className={`h-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400`} style={{ width: `${scrollProgress}%` }} />
        </div>

        {/* Mobile header */}
        <div className="md:hidden space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 select-none">
              <img src={LOGO_URL} alt="VibeStream logo" className="w-10 h-10 rounded-lg shadow-sm ring-1 ring-white/10 object-contain p-0.5" />
              <div className={`text-left`}>
                <h1 className={`text-xl font-extrabold tracking-tight bg-gradient-to-r from-[#14B8A6] to-emerald-300 bg-clip-text text-transparent`}>VibeStream</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {currentTrack && (
                <button onClick={() => setShowQueuePanel(v=>!v)} title="Open Queue" className="relative p-2 rounded-lg border border-white/10 text-gray-300 hover:text-white hover:bg-white/5">
                  <List className="w-5 h-5" />
                  {queue.length>0 && <span className="absolute -top-1 -right-1 bg-emerald-500 text-gray-900 text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{queue.length}</span>}
                </button>
              )}
              <button onClick={() => setShowUserMenu(v=>!v)} data-user-menu-button title="Account" className="inline-flex items-center justify-center w-9 h-9 rounded-full ring-1 ring-white/10 overflow-hidden bg-white/5 hover:bg-white/10">
                {profileImageUrl ? <img src={profileImageUrl} alt="Profile" className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-gray-300" />}
              </button>
            </div>
          </div>

          {/* Mobile search */}
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isSearching ? 'text-emerald-300 animate-pulse' : 'text-gray-400'}`} />
            <Input
              placeholder="Search songs, artists..."
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              onKeyDown={(e) => handleSearchKeyDown(e, 'mobile')}
              onFocus={() => searchQuery.length > 2 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              className={`pl-11 w-full pr-10 h-11 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:bg-white/10 focus:ring-2 focus:ring-[#14B8A6]/40 transition-all ${isSearching ? 'ring-2' : ''}`}
              ref={mobileSearchInputRef}
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-400 border-t-transparent" />
              </div>
            )}
            {showSuggestions && (
              <div ref={mobileSearchPanelRef} className="absolute top-full left-0 right-0 mt-2 bg-[#0B0F14]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto">
                {searchQuery.length < 3 && recentSearches.length > 0 && (
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-gray-400">Recent searches</p>
                      <button className="text-[11px] text-gray-400 hover:text-white" onClick={() => { setRecentSearches([]); try{localStorage.removeItem('vibestream_recent_searches');}catch{} }}>Clear</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {recentSearches.map((q,i)=> (
                        <button key={i} onClick={()=>{ setSearchQuery(q); setShowSuggestions(false); performSearch(q); }} className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-200 hover:bg-white/10">
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {searchSuggestions.length > 0 && (
                  <div className="py-2">
                    {searchSuggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => { setSearchQuery(s); setShowSuggestions(false); performSearch(s); }}
                        className={`w-full px-4 py-3 text-left hover:bg-white/5 transition-colors flex items-center gap-3 ${i === selectedSuggestionIndex ? 'bg-white/10' : ''}`}
                      >
                        <Search className="w-4 h-4 text-gray-400" />
                        <span className="text-white">{s}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Desktop header */}
        <div className="hidden md:flex items-center justify-between gap-4">
          {/* Left: brand */}
          <div className="flex items-center gap-3 select-none">
            <img src={LOGO_URL} alt="VibeStream logo" className="w-10 h-10 rounded-lg shadow ring-1 ring-white/10 object-contain p-0.5" />
            <div className="text-left">
              <span className={`text-2xl font-extrabold tracking-tight bg-gradient-to-r from-[#14B8A6] to-emerald-300 bg-clip-text text-transparent inline-flex items-center`}>VibeStream</span>
            </div>
          </div>
          {/* Center: search */}
          <div className="flex-1 max-w-2xl">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isSearching ? 'text-emerald-300 animate-pulse' : 'text-gray-400'}`} />
              <Input
                placeholder="Search for songs, artists, albums..."
                value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                onKeyDown={(e) => handleSearchKeyDown(e, 'desktop')}
                onFocus={() => searchQuery.length > 2 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                className={`pl-10 w-full rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:bg-white/10 focus:ring-2 focus:ring-[#14B8A6]/40 transition-all ${isSearching ? 'ring-2' : ''}`}
                ref={desktopSearchInputRef}
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-400 border-t-transparent" />
                </div>
              )}
              {showSuggestions && (
                <div ref={desktopSearchPanelRef} className="absolute top-full left-0 right-0 mt-2 bg-[#0B0F14] border border-white/10 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto">
                  {searchQuery.length < 3 && recentSearches.length > 0 && (
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-gray-400">Recent searches</p>
                        <button className="text-[11px] text-gray-400 hover:text-white" onClick={() => { setRecentSearches([]); try{localStorage.removeItem('vibestream_recent_searches');}catch{} }}>Clear</button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {recentSearches.map((q,i)=> (
                          <button key={i} onClick={()=>{ setSearchQuery(q); setShowSuggestions(false); performSearch(q); }} className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-200 hover:bg-white/10">
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {searchSuggestions.length > 0 && (
                    <div className="py-2">
                      {searchSuggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => { setSearchQuery(s); setShowSuggestions(false); performSearch(s); }}
                          className={`w-full px-4 py-3 text-left hover:bg-white/5 transition-colors flex items-center gap-3 ${i === selectedSuggestionIndex ? 'bg-white/10' : ''}`}
                        >
                          <Search className="w-4 h-4 text-gray-400" />
                          <span className="text-white">{s}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          {/* Right: actions */}
          <div className="flex items-center gap-2 relative">
            {/* Greeting chip */}
            <span className="hidden lg:inline-flex items-center px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300 mr-2">Hi, {displayName.split(' ')[0] || 'Friend'}</span>
            {currentTrack && (
              <button onClick={() => setShowQueuePanel(v=>!v)} title="Open Queue" className="relative p-2 rounded-lg border border-white/10 text-gray-300 hover:text-white hover:bg-white/5">
                <List className="w-5 h-5" />
                {queue.length>0 && <span className="absolute -top-1 -right-1 bg-emerald-500 text-gray-900 text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{queue.length}</span>}
              </button>
            )}
            {/* Avatar */}
            <button onClick={() => setShowUserMenu(v=>!v)} data-user-menu-button title="Account" className="inline-flex items-center justify-center w-10 h-10 rounded-full ring-1 ring-white/10 overflow-hidden bg-white/5 hover:bg-white/10">
              {profileImageUrl ? <img src={profileImageUrl} alt="Profile" className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-gray-300" />}
            </button>
            {showUserMenu && (
              <div ref={desktopUserMenuRef} className="absolute right-0 top-12 z-50 w-[380px] rounded-2xl border border-white/10 bg-[#0B0F14]/95 shadow-2xl backdrop-blur p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <img src={LOGO_URL} alt="VibeStream" className="w-7 h-7 rounded-md ring-1 ring-white/10 object-contain" />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400">Hey{user ? ',' : ''}</p>
                    <p className="text-sm text-white truncate">{displayName}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => { setCurrentView('trending'); setShowUserMenu(false); }} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-300" />
                    <span className="text-[11px] text-gray-200">Trending</span>
                  </button>
                  <button onClick={() => { setCurrentView('playlists'); setShowUserMenu(false); }} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center gap-2">
                    <List className="w-5 h-5 text-emerald-300" />
                    <span className="text-[11px] text-gray-200">Playlists</span>
                  </button>
                  <button onClick={() => { setCurrentView('liked'); setShowUserMenu(false); }} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center gap-2">
                    <Heart className="w-5 h-5 text-emerald-300" />
                    <span className="text-[11px] text-gray-200">Liked</span>
                  </button>
                </div>
                {/* Language preferences (enhanced) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] uppercase tracking-wide text-gray-400">Music languages</p>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setPendingLanguages(['english','hindi'])}
                        className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[10px] text-gray-300 border border-white/10"
                      >Default</button>
                      <button
                        onClick={() => setPendingLanguages(['english','hindi','tamil','telugu'])}
                        className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[10px] text-gray-300 border border-white/10"
                      >Mixed</button>
                      <button
                        onClick={() => setPendingLanguages(['english'])}
                        className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[10px] text-gray-300 border border-white/10"
                      >English</button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                    {['english','hindi','tamil','telugu','punjabi','bengali','kannada','marathi','malayalam','gujarati','odia','urdu'].map(lang => {
                      const active = pendingLanguages.includes(lang);
                      return (
                        <button
                          key={lang}
                          onClick={() => setPendingLanguages(prev => prev.includes(lang) ? prev.filter(l=>l!==lang) : [...prev, lang])}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${active ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300 shadow-inner shadow-emerald-500/10' : 'bg-white/5 border-white/10 text-gray-200 hover:bg-white/10'}`}
                          aria-pressed={active}
                        >
                          {active && <span className="mr-1">✓</span>}{lang.charAt(0).toUpperCase()+lang.slice(1)}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-400">
                    <span>{pendingLanguages.length} selected</span>
                    <div className="flex gap-2">
                      <button onClick={() => setPendingLanguages([])} className="hover:text-gray-200">Clear</button>
                      <button onClick={() => setPendingLanguages(['english','hindi','tamil','telugu','punjabi'])} className="hover:text-gray-200">All Popular</button>
                    </div>
                  </div>
                  {user && (
                    <button
                      onClick={async () => {
                        if (isSavingPrefs) return;
                        const langs = pendingLanguages;
                        try {
                          setIsSavingPrefs(true);
                          setPreferredLanguages(langs);
                          try { localStorage.setItem('vibestream_langs', JSON.stringify(langs)); } catch {}
                          await savePreferredLanguages(user.id, langs);
                          await loadHomeCategories(langs);
                          setCurrentView('home');
                          try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
                          setSavedPrefsAt(Date.now());
                          setTimeout(()=> setSavedPrefsAt(null), 2000);
                          setTimeout(()=> setShowUserMenu(false), 800);
                        } finally {
                          setIsSavingPrefs(false);
                        }
                      }}
                      className={`w-full py-2 rounded-lg border text-sm font-medium transition-all ${isSavingPrefs ? 'bg-white/5 border-white/10 opacity-80' : 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-200'}`}
                    >
                      <span className="inline-flex items-center gap-2">
                        {isSavingPrefs ? (
                          <span className="inline-block w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                        ) : savedPrefsAt ? (
                          <Check className="w-4 h-4 text-emerald-300" />
                        ) : null}
                        {savedPrefsAt ? 'Saved' : isSavingPrefs ? 'Saving…' : 'Apply & Save'}
                      </span>
                    </button>
                  )}
                  {!user && (
                    <p className="text-[10px] text-gray-500">Sign in to sync preferences across devices.</p>
                  )}
                </div>
                {recentlyPlayed.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-wide text-gray-400">Recent</p>
                    <div className="space-y-1">
                      {recentlyPlayed.slice(0,3).map((t, i) => (
                        <button key={`${t.id}-${i}`} onClick={() => { playTrack(t); setShowUserMenu(false); }} className="w-full flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-white/5">
                          <img src={getImageUrl(t)} alt={t.name} className="w-8 h-8 rounded object-cover" />
                          <div className="min-w-0 text-left">
                            <p className="text-xs text-white truncate">{t.name}</p>
                            <p className="text-[10px] text-gray-400 truncate">{t.artists.primary.map(a=>a.name).join(', ')}</p>
                          </div>
                          <Play className="w-3.5 h-3.5 text-emerald-300 ml-auto" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  {isGuest ? (
                    <button onClick={() => { auth.openAuthPrompt('cta'); setShowUserMenu(false); }} className="w-full py-2.5 rounded-xl bg-emerald-500 text-gray-900 font-semibold hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20">Sign in to unlock full songs</button>
                  ) : (
                    <>
                      <button onClick={() => { setCurrentView('playlists'); setShowUserMenu(false); }} className="w-full py-2.5 rounded-xl bg-white/5 text-white font-semibold hover:bg-white/10 border border-white/10">Explore top playlists</button>
                      <button onClick={() => { auth.signOut(); setShowUserMenu(false); }} className="w-full py-2 rounded-xl bg-white/0 text-red-300 hover:text-red-200 hover:bg-white/5 border border-white/10">Sign out</button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Desktop tabs underline removed to avoid duplicating sidebar navigation */}
      </header>

      {/* Mobile user menu */}
      {showUserMenu && (
        <>
        <div className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={(e) => {e.stopPropagation(); setShowUserMenu(false);}} />
        <div ref={mobileUserMenuRef} className="md:hidden fixed top-[70px] left-1/2 -translate-x-1/2 w-[92%] z-50 rounded-2xl border border-white/10 bg-[#0B0F14]/95 shadow-2xl backdrop-blur p-4 space-y-3">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="VibeStream" className="w-7 h-7 rounded-md ring-1 ring-white/10 object-contain" />
            <div className="min-w-0">
              <p className="text-xs text-gray-400">Hey{user ? ',' : ''}</p>
              <p className="text-sm text-white truncate">{displayName}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => { setCurrentView('trending'); setShowUserMenu(false); }} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-300" />
              <span className="text-[11px] text-gray-200">Trending</span>
            </button>
            <button onClick={() => { setCurrentView('playlists'); setShowUserMenu(false); }} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center gap-2">
              <List className="w-5 h-5 text-emerald-300" />
              <span className="text-[11px] text-gray-200">Playlists</span>
            </button>
            <button onClick={() => { setCurrentView('liked'); setShowUserMenu(false); }} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center gap-2">
              <Heart className="w-5 h-5 text-emerald-300" />
              <span className="text-[11px] text-gray-200">Liked</span>
            </button>
          </div>
          {recentlyPlayed.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wide text-gray-400">Recent</p>
              <div className="space-y-1">
                {recentlyPlayed.slice(0,3).map((t, i) => (
                  <button key={`${t.id}-m-${i}`} onClick={() => { playTrack(t); setShowUserMenu(false); }} className="w-full flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-white/5">
                    <img src={getImageUrl(t)} alt={t.name} className="w-8 h-8 rounded object-cover" />
                    <div className="min-w-0 text-left">
                      <p className="text-xs text-white truncate">{t.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{t.artists.primary.map(a=>a.name).join(', ')}</p>
                    </div>
                    <Play className="w-3.5 h-3.5 text-emerald-300 ml-auto" />
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Language preferences (mobile enhanced) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-wide text-gray-400">Music languages</p>
              <div className="flex gap-1">
                <button onClick={() => setPendingLanguages(['english','hindi'])} className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[10px] text-gray-300 border border-white/10">Default</button>
                <button onClick={() => setPendingLanguages(['english','hindi','tamil','telugu'])} className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[10px] text-gray-300 border border-white/10">Mixed</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
              {['english','hindi','tamil','telugu','punjabi','bengali','kannada','marathi','malayalam','gujarati','odia','urdu'].map(lang => {
                const active = pendingLanguages.includes(lang);
                return (
                  <button
                    key={`m-${lang}`}
                    onClick={() => setPendingLanguages(prev => prev.includes(lang) ? prev.filter(l=>l!==lang) : [...prev, lang])}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${active ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300 shadow-inner shadow-emerald-500/10' : 'bg-white/5 border-white/10 text-gray-200 hover:bg-white/10'}`}
                    aria-pressed={active}
                  >
                    {active && <span className="mr-1">✓</span>}{lang.charAt(0).toUpperCase()+lang.slice(1)}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-400">
              <span>{pendingLanguages.length} selected</span>
              <div className="flex gap-2">
                <button onClick={() => setPendingLanguages([])} className="hover:text-gray-200">Clear</button>
                <button onClick={() => setPendingLanguages(['english','hindi','tamil','telugu','punjabi'])} className="hover:text-gray-200">All Popular</button>
              </div>
            </div>
            {user && (
              <button
                onClick={async () => {
                  if (isSavingPrefs) return;
                  const langs = pendingLanguages;
                  try {
                    setIsSavingPrefs(true);
                    setPreferredLanguages(langs);
                    try { localStorage.setItem('vibestream_langs', JSON.stringify(langs)); } catch {}
                    await savePreferredLanguages(user.id, langs);
                    await loadHomeCategories(langs);
                    setCurrentView('home');
                    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
                    setSavedPrefsAt(Date.now());
                    setTimeout(()=> setSavedPrefsAt(null), 2000);
                  } finally {
                    setIsSavingPrefs(false);
                    setTimeout(()=> setShowUserMenu(false), 800);
                  }
                }}
                className={`w-full py-2 rounded-lg border text-sm font-medium transition-all ${isSavingPrefs ? 'bg-white/5 border-white/10 opacity-80' : 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-200'}`}
              >
                <span className="inline-flex items-center gap-2">
                  {isSavingPrefs ? (
                    <span className="inline-block w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  ) : savedPrefsAt ? (
                    <Check className="w-4 h-4 text-emerald-300" />
                  ) : null}
                  {savedPrefsAt ? 'Saved' : isSavingPrefs ? 'Saving…' : 'Apply & Save'}
                </span>
              </button>
            )}
            {!user && (
              <p className="text-[10px] text-gray-500">Sign in to sync preferences across devices.</p>
            )}
          </div>
          <div className="space-y-2">
            {isGuest ? (
              <button onClick={() => { auth.openAuthPrompt('cta'); setShowUserMenu(false); }} className="w-full py-2.5 rounded-xl bg-emerald-500 text-gray-900 font-semibold hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20">Sign in to unlock full songs</button>
            ) : (
              <button onClick={() => { auth.signOut(); setShowUserMenu(false); }} className="w-full py-2 rounded-xl bg-white/0 text-red-300 hover:text-red-200 hover:bg-white/5 border border-white/10">Sign out</button>
            )}
          </div>
        </div>
        </>
      )}

      {/* Layout */}
      <div className="flex flex-1 min-h-0">
        <aside className="hidden md:block w-64 bg-[#0B0F14] border-r border-white/10 p-4">
          <nav className="space-y-1">
            {sidebarItems.map(item => {
              const Icon = item.icon; return (
                <button key={item.id} onClick={() => setCurrentView(item.id as any)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border ${currentView === item.id ? 'bg-white/10 border-white/15 text-white' : 'bg-white/0 border-white/5 text-gray-300 hover:text-white hover:bg-white/5'}`}> 
                  <Icon className="w-5 h-5" /> <span className="font-medium">{item.label}</span>
                </button>
              );})}
          </nav>
          <div className="mt-6">
            <h3 className="text-gray-400 text-[11px] font-semibold uppercase tracking-wide mb-3 px-1">My Library</h3>
            <nav className="space-y-1">
              {libraryItems.map(item => { const Icon = item.icon; return (
                <button key={item.id} onClick={() => setCurrentView(item.id as any)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border bg-white/0 border-white/5 text-gray-300 hover:text-white hover:bg-white/5">
                  <Icon className="w-5 h-5" /> <span className="font-medium">{item.label}</span>
                </button>
              );})}
            </nav>
          </div>
        </aside>
        <main className="flex-1 overflow-auto p-6 pb-40 md:pb-6">{renderMainContent()}</main>
      </div>
      {/* Queue Panel */}
      {currentTrack && showQueuePanel && (
        <div className="fixed bottom-12 md:bottom-40 left-0 right-0 max-h-[50vh] md:max-h-[45vh] bg-gray-900/95 backdrop-blur-xl border-t border-gray-700 z-50 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
            <div className="flex items-center space-x-3"><List className="w-5 h-5 text-green-400" /><h4 className="text-white font-semibold">Playback Queue</h4><span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">{queue.length}</span></div>
            <button onClick={() => setShowQueuePanel(false)} className="p-1 rounded-md hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
          </div>
          <div className="overflow-y-auto px-2 py-2 space-y-1 custom-scrollbar">
            {queue.length === 0 && <div className="text-center py-8 text-gray-500 text-sm">Queue is empty</div>}
            {queue.map((t, idx) => { const active = currentTrack?.id === t.id; return (
              <button key={`${t.id}-${idx}`} onClick={() => playTrack(t)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors group ${active ? 'bg-green-500/15 border border-green-500/40' : 'hover:bg-gray-800/80'}`}>
                <div className="text-xs w-5 text-gray-500 group-hover:text-gray-300">{idx + 1}</div>
                <img src={getImageUrl(t)} alt={t.name} className="w-10 h-10 rounded object-cover" />
                <div className="flex-1 min-w-0"><p className={`truncate text-sm ${active ? 'text-green-400 font-semibold' : 'text-white'}`}>{t.name}</p><p className="truncate text-[11px] text-gray-400">{t.artists.primary.map(a => a.name).join(', ')}</p></div>
                {active && <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">Now</span>}
              </button>
            );})}
          </div>
        </div>
      )}
      {/* Bottom Player - Premium */}
      {currentTrack && (
        <PremiumPlayer
          artworkUrl={getImageUrl(currentTrack)}
          title={currentTrack.name}
          subtitle={currentTrack.artists.primary.map((a:any)=>a.name).join(', ')}
          nextTitle={queue[currentIndex + 1]?.name}
          isPlaying={isPlaying}
          isLoading={isLoading}
          progressPercent={progress[0] || 0}
          currentTimeLabel={formatTime(currentTime)}
          durationLabel={formatTime(duration)}
          queueCount={queue.length}
          volumePercent={volume[0]}
          isMuted={isMuted}
          isShuffled={isShuffled}
          repeatMode={repeatMode as any}
          playbackSpeed={playbackSpeed}
          isFavorite={isFavorite}
          aPoint={loopA}
          bPoint={loopB}
          sleepMinutesLeft={sleepUntil ? Math.max(0, Math.ceil((sleepUntil - Date.now()) / 60000)) : null}
          onPlayPause={togglePlayPause}
          onPrev={skipPrevious}
          onNext={skipNext}
          onSeekPercent={(pct)=>handleProgressChange([pct])}
          onSeekBy={seekBySeconds}
          onToggleShuffle={()=>setIsShuffled(!isShuffled)}
          onToggleRepeat={()=>setRepeatMode((prev)=>(prev+1)%3)}
          onCycleSpeed={cyclePlaybackSpeed}
          onToggleFavorite={gatedToggleFavorite}
          onOpenQueue={()=>setShowQueuePanel(p=>!p)}
          onVolumeChange={(p)=>handleVolumeChange([p])}
          onToggleMute={toggleMute}
          onMarkA={()=> setLoopA(currentTime)}
          onMarkB={()=> setLoopB(currentTime)}
          onClearAB={()=> { setLoopA(null); setLoopB(null);} }
          onSetSleep={setSleepMinutes}
          onCancelSleep={cancelSleep}
        />
      )}
      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-12 bg-gray-800/95 border-t border-gray-700 flex items-stretch justify-around z-40 backdrop-blur-sm">
        {[
          { id: 'home', label: 'Home', icon: Home },
          { id: 'search', label: 'Search', icon: Search },
          { id: 'trending', label: 'Trending', icon: TrendingUp },
          { id: 'playlists', label: 'Lists', icon: List }
        ].map(item => { const Icon = item.icon; const active = currentView === item.id; return (
          <button key={item.id} onClick={() => setCurrentView(item.id as any)} className={`flex flex-col items-center justify-center flex-1 text-xs font-medium transition-colors ${active ? 'text-green-400' : 'text-gray-400 hover:text-white'}`}>
            <Icon className={`w-5 h-5 mb-0.5 ${active ? 'scale-110' : ''}`} />{item.label}
          </button>
        );})}
      </nav>

      {/* Guest subtle banner */}
      {isGuest && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-30">
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 text-white text-xs px-4 py-2 rounded-full shadow-lg">
            Sign in for full songs & save
          </div>
        </div>
      )}

      {/* Save preferences toast */}
      {savedPrefsAt && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100]">
          <div className="backdrop-blur-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-200 text-sm px-4 py-2 rounded-full shadow-lg inline-flex items-center gap-2">
            <Check className="w-4 h-4" /> Preferences saved
          </div>
        </div>
      )}

  {/* Auth Modals removed; handled at App root */}
    </div>
  );
};

export default EnhancedMusicApp;
