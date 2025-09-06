/**
 * VibeStream Context - Complete State Management
 * Manages: Player state, Search results, Favorites, User preferences
 * NO BACKEND REQUIRED - Frontend-only solution!
 */

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Song, frontendMusicService } from '../services/frontendMusicService';
import { PlayingTrack, enhancedAudioPlayer } from '../services/enhancedAudioPlayer';
import { localStorageService, StoredSong, UserPreferences } from '../services/localStorageService';

// 🎵 State Interfaces
export interface AppState {
  // Player State
  player: {
    currentTrack: PlayingTrack | null;
    isPlaying: boolean;
    isLoading: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    isMuted: boolean;
    queue: PlayingTrack[];
    currentIndex: number;
    repeatMode: 'none' | 'one' | 'all';
    shuffleMode: boolean;
    error: string | null;
  };

  // Search & Discovery
  search: {
    query: string;
    results: Song[];
    isSearching: boolean;
    activeSource: 'jiosaavn' | 'deezer' | 'youtube' | 'all';
    recentSearches: string[];
  };

  // Library
  library: {
    favorites: StoredSong[];
    recentlyPlayed: StoredSong[];
    trendingSongs: Song[];
  };

  // UI State
  ui: {
    currentView: 'home' | 'search' | 'library' | 'favorites' | 'recently-played';
    isInitialized: boolean;
    showLyrics: boolean;
    showQueue: boolean;
    theme: 'light' | 'dark' | 'auto';
  };

  // User Preferences
  preferences: UserPreferences;
}

// 🎵 Action Types
export type AppAction =
  // Player Actions
  | { type: 'PLAYER_SET_TRACK'; payload: PlayingTrack | null }
  | { type: 'PLAYER_SET_PLAYING'; payload: boolean }
  | { type: 'PLAYER_SET_LOADING'; payload: boolean }
  | { type: 'PLAYER_SET_TIME'; payload: { currentTime: number; duration: number } }
  | { type: 'PLAYER_SET_VOLUME'; payload: number }
  | { type: 'PLAYER_SET_MUTED'; payload: boolean }
  | { type: 'PLAYER_SET_QUEUE'; payload: PlayingTrack[] }
  | { type: 'PLAYER_SET_INDEX'; payload: number }
  | { type: 'PLAYER_SET_REPEAT'; payload: 'none' | 'one' | 'all' }
  | { type: 'PLAYER_SET_SHUFFLE'; payload: boolean }
  | { type: 'PLAYER_SET_ERROR'; payload: string | null }
  | { type: 'PLAYER_UPDATE_STATE'; payload: Partial<AppState['player']> }

  // Search Actions
  | { type: 'SEARCH_SET_QUERY'; payload: string }
  | { type: 'SEARCH_SET_RESULTS'; payload: Song[] }
  | { type: 'SEARCH_SET_LOADING'; payload: boolean }
  | { type: 'SEARCH_SET_SOURCE'; payload: 'jiosaavn' | 'deezer' | 'youtube' | 'all' }
  | { type: 'SEARCH_ADD_RECENT'; payload: string }
  | { type: 'SEARCH_CLEAR_RESULTS' }

  // Library Actions
  | { type: 'LIBRARY_SET_FAVORITES'; payload: StoredSong[] }
  | { type: 'LIBRARY_ADD_FAVORITE'; payload: StoredSong }
  | { type: 'LIBRARY_REMOVE_FAVORITE'; payload: string }
  | { type: 'LIBRARY_SET_RECENTLY_PLAYED'; payload: StoredSong[] }
  | { type: 'LIBRARY_ADD_RECENTLY_PLAYED'; payload: StoredSong }
  | { type: 'LIBRARY_SET_TRENDING'; payload: Song[] }

  // UI Actions
  | { type: 'UI_SET_VIEW'; payload: AppState['ui']['currentView'] }
  | { type: 'UI_SET_INITIALIZED'; payload: boolean }
  | { type: 'UI_TOGGLE_LYRICS' }
  | { type: 'UI_TOGGLE_QUEUE' }
  | { type: 'UI_SET_THEME'; payload: 'light' | 'dark' | 'auto' }

  // Preferences Actions
  | { type: 'PREFERENCES_UPDATE'; payload: Partial<UserPreferences> };

// 🎵 Initial State
const initialState: AppState = {
  player: {
    currentTrack: null,
    isPlaying: false,
    isLoading: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isMuted: false,
    queue: [],
    currentIndex: -1,
    repeatMode: 'none',
    shuffleMode: false,
    error: null,
  },
  search: {
    query: '',
    results: [],
    isSearching: false,
    activeSource: 'all',
    recentSearches: [],
  },
  library: {
    favorites: [],
    recentlyPlayed: [],
    trendingSongs: [],
  },
  ui: {
    currentView: 'home',
    isInitialized: false,
    showLyrics: false,
    showQueue: false,
    theme: 'auto',
  },
  preferences: {
    volume: 1,
    repeatMode: 'none',
    shuffleMode: false,
    theme: 'auto',
    autoPlay: false,
    crossfade: false,
    normalizeVolume: false,
  },
};

// 🎵 Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    // Player Actions
    case 'PLAYER_SET_TRACK':
      return { ...state, player: { ...state.player, currentTrack: action.payload } };
    
    case 'PLAYER_SET_PLAYING':
      return { ...state, player: { ...state.player, isPlaying: action.payload } };
    
    case 'PLAYER_SET_LOADING':
      return { ...state, player: { ...state.player, isLoading: action.payload } };
    
    case 'PLAYER_SET_TIME':
      return { 
        ...state, 
        player: { 
          ...state.player, 
          currentTime: action.payload.currentTime,
          duration: action.payload.duration 
        } 
      };
    
    case 'PLAYER_SET_VOLUME':
      return { ...state, player: { ...state.player, volume: action.payload } };
    
    case 'PLAYER_SET_MUTED':
      return { ...state, player: { ...state.player, isMuted: action.payload } };
    
    case 'PLAYER_SET_QUEUE':
      return { ...state, player: { ...state.player, queue: action.payload } };
    
    case 'PLAYER_SET_INDEX':
      return { ...state, player: { ...state.player, currentIndex: action.payload } };
    
    case 'PLAYER_SET_REPEAT':
      return { ...state, player: { ...state.player, repeatMode: action.payload } };
    
    case 'PLAYER_SET_SHUFFLE':
      return { ...state, player: { ...state.player, shuffleMode: action.payload } };
    
    case 'PLAYER_SET_ERROR':
      return { ...state, player: { ...state.player, error: action.payload } };
    
    case 'PLAYER_UPDATE_STATE':
      return { ...state, player: { ...state.player, ...action.payload } };

    // Search Actions
    case 'SEARCH_SET_QUERY':
      return { ...state, search: { ...state.search, query: action.payload } };
    
    case 'SEARCH_SET_RESULTS':
      return { ...state, search: { ...state.search, results: action.payload } };
    
    case 'SEARCH_SET_LOADING':
      return { ...state, search: { ...state.search, isSearching: action.payload } };
    
    case 'SEARCH_SET_SOURCE':
      return { ...state, search: { ...state.search, activeSource: action.payload } };
    
    case 'SEARCH_ADD_RECENT':
      const recentSearches = [action.payload, ...state.search.recentSearches.filter(s => s !== action.payload)].slice(0, 10);
      return { ...state, search: { ...state.search, recentSearches } };
    
    case 'SEARCH_CLEAR_RESULTS':
      return { ...state, search: { ...state.search, results: [], query: '' } };

    // Library Actions
    case 'LIBRARY_SET_FAVORITES':
      return { ...state, library: { ...state.library, favorites: action.payload } };
    
    case 'LIBRARY_ADD_FAVORITE':
      return { 
        ...state, 
        library: { 
          ...state.library, 
          favorites: [action.payload, ...state.library.favorites.filter(f => f.id !== action.payload.id)] 
        } 
      };
    
    case 'LIBRARY_REMOVE_FAVORITE':
      return { 
        ...state, 
        library: { 
          ...state.library, 
          favorites: state.library.favorites.filter(f => f.id !== action.payload) 
        } 
      };
    
    case 'LIBRARY_SET_RECENTLY_PLAYED':
      return { ...state, library: { ...state.library, recentlyPlayed: action.payload } };
    
    case 'LIBRARY_ADD_RECENTLY_PLAYED':
      return { 
        ...state, 
        library: { 
          ...state.library, 
          recentlyPlayed: [action.payload, ...state.library.recentlyPlayed.filter(r => r.id !== action.payload.id)].slice(0, 50) 
        } 
      };
    
    case 'LIBRARY_SET_TRENDING':
      return { ...state, library: { ...state.library, trendingSongs: action.payload } };

    // UI Actions
    case 'UI_SET_VIEW':
      return { ...state, ui: { ...state.ui, currentView: action.payload } };
    
    case 'UI_SET_INITIALIZED':
      return { ...state, ui: { ...state.ui, isInitialized: action.payload } };
    
    case 'UI_TOGGLE_LYRICS':
      return { ...state, ui: { ...state.ui, showLyrics: !state.ui.showLyrics } };
    
    case 'UI_TOGGLE_QUEUE':
      return { ...state, ui: { ...state.ui, showQueue: !state.ui.showQueue } };
    
    case 'UI_SET_THEME':
      return { ...state, ui: { ...state.ui, theme: action.payload } };

    // Preferences Actions
    case 'PREFERENCES_UPDATE':
      return { ...state, preferences: { ...state.preferences, ...action.payload } };

    default:
      return state;
  }
}

// 🎵 Context
const VibeStreamContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  actions: {
    // Player actions
    playTrack: (song: Song, queue?: Song[], index?: number) => Promise<void>;
    togglePlayPause: () => Promise<void>;
    skipNext: () => Promise<void>;
    skipPrevious: () => Promise<void>;
    seekTo: (time: number) => void;
    setVolume: (volume: number) => void;
    toggleMute: () => void;
    toggleShuffle: () => void;
    toggleRepeat: () => void;
    
    // Search actions
    searchSongs: (query: string, source?: 'jiosaavn' | 'deezer' | 'youtube' | 'all') => Promise<void>;
    clearSearch: () => void;
    
    // Library actions
    toggleFavorite: (song: Song) => Promise<void>;
    loadFavorites: () => Promise<void>;
    loadRecentlyPlayed: () => Promise<void>;
    loadTrending: () => Promise<void>;
    
    // UI actions
    setView: (view: AppState['ui']['currentView']) => void;
    setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  };
} | null>(null);

// 🎵 Provider Component
export function VibeStreamProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Initialize app
  useEffect(() => {
    initializeApp();
  }, []);

  // Sync with audio player
  useEffect(() => {
    const unsubscribe = enhancedAudioPlayer.subscribe((playerState) => {
      dispatch({
        type: 'PLAYER_UPDATE_STATE',
        payload: {
          currentTrack: playerState.currentTrack,
          isPlaying: playerState.isPlaying,
          isLoading: playerState.isLoading,
          currentTime: playerState.currentTime,
          duration: playerState.duration,
          volume: playerState.volume,
          isMuted: playerState.isMuted,
          queue: playerState.queue,
          currentIndex: playerState.currentIndex,
          repeatMode: playerState.repeatMode,
          shuffleMode: playerState.shuffleMode,
          error: playerState.error,
        },
      });
    });

    return unsubscribe;
  }, []);

  const initializeApp = async () => {
    try {
      console.log('🚀 Initializing VibeStream...');
      
      // Initialize local storage
      await localStorageService.initialize();
      
      // Load user preferences
      const preferences = localStorageService.getPreferences();
      dispatch({ type: 'PREFERENCES_UPDATE', payload: preferences });
      
      // Set initial player volume
      enhancedAudioPlayer.setVolume(preferences.volume);
      
      // Load library data
      await Promise.all([
        loadFavorites(),
        loadRecentlyPlayed(),
        loadTrending(),
      ]);
      
      dispatch({ type: 'UI_SET_INITIALIZED', payload: true });
      console.log('✅ VibeStream initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize app:', error);
    }
  };

  // 🎵 Action Implementations
  const playTrack = async (song: Song, queue: Song[] = [], index: number = 0) => {
    console.log(`[VibeStreamContext] playTrack called for: "${song.title}"`);
    dispatch({ type: 'PLAYER_SET_LOADING', payload: true });
    dispatch({ type: 'PLAYER_SET_ERROR', payload: null });

    try {
      // Resolve / fetch audio URL if missing
      let ensuredSong = song;
      const needsResolve = !ensuredSong.audioUrl || ensuredSong.audioUrl.length < 10;
      
      console.log(`[VibeStreamContext] Does song need URL resolve? ${needsResolve}`);

      if (needsResolve) {
        console.log(`[VibeStreamContext] Resolving audio URL for: "${ensuredSong.title}"`);
        const resolvedUrl = await frontendMusicService.getAudioUrl(ensuredSong);
        if (!resolvedUrl) {
          console.error(`[VibeStreamContext] ❌ FAILED to resolve audio URL for "${ensuredSong.title}"`);
          dispatch({ type: 'PLAYER_SET_ERROR', payload: 'Audio not available for this track.' });
          dispatch({ type: 'PLAYER_SET_LOADING', payload: false });
          return;          
        }
        console.log(`[VibeStreamContext] ✅ Successfully resolved URL: ${resolvedUrl}`);
        ensuredSong = { ...ensuredSong, audioUrl: resolvedUrl };
        
        // Update the source list (search/trending) with the new URL to prevent re-fetching
        if (state.search.results.some(r => r.id === ensuredSong.id)) {
          const updated = state.search.results.map(r => r.id === ensuredSong.id ? ensuredSong : r);
          dispatch({ type: 'SEARCH_SET_RESULTS', payload: updated });
        }
        if (state.library.trendingSongs.some(r => r.id === ensuredSong.id)) {
          const updatedTrending = state.library.trendingSongs.map(r => r.id === ensuredSong.id ? ensuredSong : r);
          dispatch({ type: 'LIBRARY_SET_TRENDING', payload: updatedTrending });
        }
      }

      // Guard: some sources (youtube placeholder) still non-playable
      if (!ensuredSong.audioUrl) {
        console.error(`[VibeStreamContext] ❌ No audio stream URL available for "${ensuredSong.title}" after check.`);
        dispatch({ type: 'PLAYER_SET_ERROR', payload: 'No audio stream available.' });
        dispatch({ type: 'PLAYER_SET_LOADING', payload: false });
        return;
      }

      console.log(`[VibeStreamContext] Preparing to load playlist in enhancedAudioPlayer.`);
      const playingQueue: PlayingTrack[] = (queue.length > 0 ? queue : [ensuredSong]).map(s => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        album: s.album,
        duration: s.duration,
        image: s.image,
        audioUrl: s.audioUrl, // This might be undefined for other tracks in the queue
        source: s.source,
      }));

      const ok = await enhancedAudioPlayer.loadPlaylist(playingQueue, index, true);
      
      if (!ok) {
        console.error(`[VibeStreamContext] ❌ enhancedAudioPlayer.loadPlaylist returned false.`);
        dispatch({ type: 'PLAYER_SET_ERROR', payload: 'Failed to load audio.' });
        dispatch({ type: 'PLAYER_SET_LOADING', payload: false });
        return;
      }
      console.log(`[VibeStreamContext] ✅ enhancedAudioPlayer.loadPlaylist successful.`);

      // Add to recently played
      await localStorageService.addToRecentlyPlayed(ensuredSong);
      dispatch({ 
        type: 'LIBRARY_ADD_RECENTLY_PLAYED', 
        payload: { ...ensuredSong, addedAt: Date.now(), playCount: 1, lastPlayed: Date.now() } 
      });
      
    } catch (error) {
      console.error('❌ [VibeStreamContext] FATAL: Unhandled exception in playTrack:', error);
      dispatch({ type: 'PLAYER_SET_ERROR', payload: 'A critical playback error occurred.' });
      dispatch({ type: 'PLAYER_SET_LOADING', payload: false });
    }
  };

  const togglePlayPause = async () => {
    await enhancedAudioPlayer.togglePlayPause();
  };

  const skipNext = async () => {
    await enhancedAudioPlayer.skipToNext();
  };

  const skipPrevious = async () => {
    await enhancedAudioPlayer.skipToPrevious();
  };

  const seekTo = (time: number) => {
    enhancedAudioPlayer.seek(time);
  };

  const setVolume = (volume: number) => {
    enhancedAudioPlayer.setVolume(volume);
    localStorageService.savePreferences({ volume });
    dispatch({ type: 'PREFERENCES_UPDATE', payload: { volume } });
  };

  const toggleMute = () => {
    enhancedAudioPlayer.toggleMute();
  };

  const toggleShuffle = () => {
    enhancedAudioPlayer.toggleShuffle();
  };

  const toggleRepeat = () => {
    enhancedAudioPlayer.toggleRepeat();
  };

  const searchSongs = async (query: string, source: 'jiosaavn' | 'deezer' | 'youtube' | 'all' = 'all') => {
    try {
      dispatch({ type: 'SEARCH_SET_LOADING', payload: true });
      dispatch({ type: 'SEARCH_SET_QUERY', payload: query });
      dispatch({ type: 'SEARCH_SET_SOURCE', payload: source });

      let results: Song[] = [];

      switch (source) {
        case 'jiosaavn':
          const jiosaavnResponse = await frontendMusicService.searchJioSaavn(query);
          results = jiosaavnResponse.success ? jiosaavnResponse.data : [];
          break;
        
        case 'deezer':
          const deezerResponse = await frontendMusicService.searchDeezer(query);
          results = deezerResponse.success ? deezerResponse.data : [];
          break;
        
        case 'youtube':
          const youtubeResponse = await frontendMusicService.searchYouTube(query);
          results = youtubeResponse.success ? youtubeResponse.data : [];
          break;
        
        case 'all':
        default:
          const allResponse = await frontendMusicService.searchAllSources(query);
          results = allResponse.success ? allResponse.data : [];
          break;
      }

      dispatch({ type: 'SEARCH_SET_RESULTS', payload: results });
      dispatch({ type: 'SEARCH_ADD_RECENT', payload: query });
      // Prefetch JioSaavn audio URLs for first few songs silently
      if (results.length > 0) {
        frontendMusicService.prefetchJioSaavnAudio(results).then(prefetched => {
          // Only update if something actually changed
            if (prefetched.some((s,i) => s.audioUrl !== results[i]?.audioUrl)) {
              dispatch({ type: 'SEARCH_SET_RESULTS', payload: prefetched });
            }
        }).catch(()=>{});
      }
      
      // Save to recent searches
      await localStorageService.addRecentSearch(query, results.length);
      
    } catch (error) {
      console.error('❌ Search failed:', error);
      dispatch({ type: 'SEARCH_SET_RESULTS', payload: [] });
    } finally {
      dispatch({ type: 'SEARCH_SET_LOADING', payload: false });
    }
  };

  const clearSearch = () => {
    dispatch({ type: 'SEARCH_CLEAR_RESULTS' });
  };

  const toggleFavorite = async (song: Song) => {
    try {
      const isFavorite = await localStorageService.isFavorite(song.id);
      
      if (isFavorite) {
        await localStorageService.removeFromFavorites(song.id);
        dispatch({ type: 'LIBRARY_REMOVE_FAVORITE', payload: song.id });
      } else {
        await localStorageService.addToFavorites(song);
        dispatch({ 
          type: 'LIBRARY_ADD_FAVORITE', 
          payload: { ...song, addedAt: Date.now(), playCount: 0 } 
        });
      }
    } catch (error) {
      console.error('❌ Failed to toggle favorite:', error);
    }
  };

  const loadFavorites = async () => {
    try {
      const favorites = await localStorageService.getFavorites();
      dispatch({ type: 'LIBRARY_SET_FAVORITES', payload: favorites });
    } catch (error) {
      console.error('❌ Failed to load favorites:', error);
    }
  };

  const loadRecentlyPlayed = async () => {
    try {
      const recentlyPlayed = await localStorageService.getRecentlyPlayed();
      dispatch({ type: 'LIBRARY_SET_RECENTLY_PLAYED', payload: recentlyPlayed });
    } catch (error) {
      console.error('❌ Failed to load recently played:', error);
    }
  };

  const loadTrending = async () => {
    try {
      const response = await frontendMusicService.getTrendingJioSaavn();
      if (response.success) {
        dispatch({ type: 'LIBRARY_SET_TRENDING', payload: response.data });
        // Prefetch trending audio to improve immediate playback
        frontendMusicService.prefetchJioSaavnAudio(response.data).then(prefetched => {
          if (prefetched.some((s,i) => s.audioUrl !== response.data[i]?.audioUrl)) {
            dispatch({ type: 'LIBRARY_SET_TRENDING', payload: prefetched });
          }
        }).catch(()=>{});
      }
    } catch (error) {
      console.error('❌ Failed to load trending:', error);
    }
  };

  const setView = (view: AppState['ui']['currentView']) => {
    dispatch({ type: 'UI_SET_VIEW', payload: view });
  };

  const setTheme = (theme: 'light' | 'dark' | 'auto') => {
    dispatch({ type: 'UI_SET_THEME', payload: theme });
    localStorageService.savePreferences({ theme });
    dispatch({ type: 'PREFERENCES_UPDATE', payload: { theme } });
  };

  const actions = {
    playTrack,
    togglePlayPause,
    skipNext,
    skipPrevious,
    seekTo,
    setVolume,
    searchSongs,
    clearSearch,
    toggleFavorite,
    loadFavorites,
    loadRecentlyPlayed,
    loadTrending,
    setView,
    setTheme,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
  };

  return (
    <VibeStreamContext.Provider value={{ state, dispatch, actions }}>
      {children}
    </VibeStreamContext.Provider>
  );
}

// 🎵 Hook
export function useVibeStream() {
  const context = useContext(VibeStreamContext);
  if (!context) {
    throw new Error('useVibeStream must be used within a VibeStreamProvider');
  }
  return context;
}
