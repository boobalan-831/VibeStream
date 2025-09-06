/**
 * Enhanced Audio Player Service
 * Professional audio playback with HTML5 Audio + Howler.js fallback
 * Supports: Play, Pause, Resume, Seek, Stop, Progress tracking
 */

export interface PlayingTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: string;
  image: string;
  audioUrl: string;
  source: 'jiosaavn' | 'deezer' | 'youtube';
}

export interface PlayerState {
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
}

type PlayerEventType = 'stateChange' | 'trackChange' | 'error' | 'progress';
type PlayerEventCallback = (state: PlayerState) => void;

class EnhancedAudioPlayerService {
  private audio: HTMLAudioElement | null = null;
  private state: PlayerState;
  private listeners: Map<PlayerEventType, Set<PlayerEventCallback>> = new Map();
  private progressInterval: number | null = null;
  private fadeInterval: number | null = null;

  constructor() {
    this.state = {
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
      error: null
    };

    this.initializeEventListeners();
  }

  // 🎵 Core Playback Methods

  async loadTrack(track: PlayingTrack): Promise<boolean> {
    try {
      this.updateState({ isLoading: true, error: null });
      
      // Clean up previous audio
      this.cleanupAudio();
      
      // Create new audio element
      this.audio = new Audio();
      // Allow CORS metadata (waveform, time updates) and HTTPS enforcement
      this.audio.crossOrigin = 'anonymous';
      this.setupAudioEventListeners();
      
      // Set audio source
      let src = (track.audioUrl || '').trim();
      if (!src) {
        throw new Error('Empty audio URL');
      }
      if (src.startsWith('//')) src = 'https:' + src;
      if (src.startsWith('http://')) src = 'https://' + src.substring('http://'.length);
      this.audio.src = src;
      this.audio.preload = 'metadata';
      
      // Update state
      this.updateState({ 
        currentTrack: track,
        isLoading: true 
      });
      
      // Wait for metadata to load
      await new Promise((resolve, reject) => {
        if (!this.audio) {
          reject(new Error('Audio element not available'));
          return;
        }

        const onLoad = () => {
          this.updateState({ 
            duration: this.audio?.duration || 0,
            isLoading: false 
          });
          resolve(true);
        };

        const onError = () => {
          const errMsg = `Failed to load audio (${this.audio?.error?.code || 'unknown'})`;
          this.updateState({ 
            isLoading: false,
            error: errMsg 
          });
          reject(new Error(errMsg));
        };

        this.audio.addEventListener('loadedmetadata', onLoad, { once: true });
        this.audio.addEventListener('error', onError, { once: true });
        this.audio.addEventListener('stalled', () => {
          this.updateState({ error: 'Network stalled while loading audio' });
        });
        this.audio.addEventListener('abort', () => {
          this.updateState({ error: 'Audio load aborted' });
        });
        
        // Timeout after 10 seconds
        setTimeout(() => {
          if (this.state.isLoading) {
            onError();
          }
        }, 10000);
      });

      this.emit('trackChange');
      return true;
    } catch (error) {
      console.error('❌ Failed to load track:', error);
      this.updateState({ 
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }

  async play(): Promise<boolean> {
    try {
      if (!this.audio || !this.state.currentTrack) {
        throw new Error('No track loaded');
      }

      this.updateState({ isLoading: true });
      
      await this.audio.play();
      
      this.updateState({ 
        isPlaying: true,
        isLoading: false,
        error: null 
      });
      
      this.startProgressTracking();
      this.emit('stateChange');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to play:', error);
      this.updateState({ 
        isPlaying: false,
        isLoading: false,
        error: 'Playback failed' 
      });
      return false;
    }
  }

  pause(): void {
    if (this.audio) {
      this.audio.pause();
      this.updateState({ isPlaying: false });
      this.stopProgressTracking();
      this.emit('stateChange');
    }
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.updateState({ 
        isPlaying: false,
        currentTime: 0 
      });
      this.stopProgressTracking();
      this.emit('stateChange');
    }
  }

  async togglePlayPause(): Promise<boolean> {
    if (this.state.isPlaying) {
      this.pause();
      return false;
    } else {
      return await this.play();
    }
  }

  // 🎵 Queue Management

  async loadPlaylist(tracks: PlayingTrack[], startIndex: number = 0, autoPlay: boolean = false): Promise<boolean> {
    this.updateState({ 
      queue: tracks,
      currentIndex: startIndex 
    });

    if (tracks.length > 0 && startIndex >= 0 && startIndex < tracks.length) {
      const success = await this.loadTrack(tracks[startIndex]);
      if (success && autoPlay) {
        return await this.play();
      }
      return success;
    }

    return false;
  }

  async skipToNext(): Promise<boolean> {
    const { queue, currentIndex, repeatMode, shuffleMode } = this.state;
    
    if (queue.length === 0) return false;

    let nextIndex: number;

    if (repeatMode === 'one') {
      // Repeat current track
      nextIndex = currentIndex;
    } else if (shuffleMode) {
      // Random next track
      do {
        nextIndex = Math.floor(Math.random() * queue.length);
      } while (nextIndex === currentIndex && queue.length > 1);
    } else {
      // Sequential next
      nextIndex = currentIndex + 1;
      
      if (nextIndex >= queue.length) {
        if (repeatMode === 'all') {
          nextIndex = 0;
        } else {
          return false; // End of playlist
        }
      }
    }

    this.updateState({ currentIndex: nextIndex });
    const success = await this.loadTrack(queue[nextIndex]);
    
    if (success && this.state.isPlaying) {
      return await this.play();
    }
    
    return success;
  }

  async skipToPrevious(): Promise<boolean> {
    const { queue, currentIndex, shuffleMode } = this.state;
    
    if (queue.length === 0) return false;

    // If more than 3 seconds into the song, restart current track
    if (this.state.currentTime > 3) {
      this.seek(0);
      return true;
    }

    let prevIndex: number;

    if (shuffleMode) {
      // Random previous track
      do {
        prevIndex = Math.floor(Math.random() * queue.length);
      } while (prevIndex === currentIndex && queue.length > 1);
    } else {
      // Sequential previous
      prevIndex = currentIndex - 1;
      
      if (prevIndex < 0) {
        prevIndex = queue.length - 1;
      }
    }

    this.updateState({ currentIndex: prevIndex });
    const success = await this.loadTrack(queue[prevIndex]);
    
    if (success && this.state.isPlaying) {
      return await this.play();
    }
    
    return success;
  }

  // 🎵 Seek & Progress

  seek(time: number): void {
    if (this.audio && this.state.duration > 0) {
      const seekTime = Math.max(0, Math.min(time, this.state.duration));
      this.audio.currentTime = seekTime;
      this.updateState({ currentTime: seekTime });
      this.emit('progress');
    }
  }

  seekByPercentage(percentage: number): void {
    const seekTime = (percentage / 100) * this.state.duration;
    this.seek(seekTime);
  }

  // 🎵 Volume Control

  setVolume(volume: number): void {
    const newVolume = Math.max(0, Math.min(1, volume));
    
    if (this.audio) {
      this.audio.volume = newVolume;
    }
    
    this.updateState({ 
      volume: newVolume,
      isMuted: newVolume === 0 
    });
    this.emit('stateChange');
  }

  toggleMute(): void {
    if (this.state.isMuted) {
      this.setVolume(this.state.volume > 0 ? this.state.volume : 0.5);
    } else {
      this.setVolume(0);
    }
  }

  // 🎵 Playback Modes

  toggleShuffle(): void {
    this.updateState({ shuffleMode: !this.state.shuffleMode });
    this.emit('stateChange');
  }

  toggleRepeat(): void {
    const modes: ('none' | 'one' | 'all')[] = ['none', 'one', 'all'];
    const currentIndex = modes.indexOf(this.state.repeatMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    
    this.updateState({ repeatMode: nextMode });
    this.emit('stateChange');
  }

  // 🎵 Audio Effects

  async fadeIn(duration: number = 1000): Promise<void> {
    if (!this.audio) return;
    
    const targetVolume = this.state.volume;
    this.audio.volume = 0;
    
    return new Promise((resolve) => {
      let currentVolume = 0;
      const step = targetVolume / (duration / 50);
      
      this.fadeInterval = window.setInterval(() => {
        currentVolume += step;
        
        if (currentVolume >= targetVolume) {
          currentVolume = targetVolume;
          if (this.fadeInterval) {
            clearInterval(this.fadeInterval);
            this.fadeInterval = null;
          }
          resolve();
        }
        
        if (this.audio) {
          this.audio.volume = currentVolume;
        }
      }, 50);
    });
  }

  async fadeOut(duration: number = 1000): Promise<void> {
    if (!this.audio) return;
    
    const startVolume = this.audio.volume;
    
    return new Promise((resolve) => {
      let currentVolume = startVolume;
      const step = startVolume / (duration / 50);
      
      this.fadeInterval = window.setInterval(() => {
        currentVolume -= step;
        
        if (currentVolume <= 0) {
          currentVolume = 0;
          if (this.fadeInterval) {
            clearInterval(this.fadeInterval);
            this.fadeInterval = null;
          }
          resolve();
        }
        
        if (this.audio) {
          this.audio.volume = currentVolume;
        }
      }, 50);
    });
  }

  // 🎵 State Management

  getState(): PlayerState {
    return { ...this.state };
  }

  subscribe(callback: PlayerEventCallback): () => void {
    const unsubscribers: (() => void)[] = [];
    
    ['stateChange', 'trackChange', 'error', 'progress'].forEach(eventType => {
      this.addEventListener(eventType as PlayerEventType, callback);
      unsubscribers.push(() => this.removeEventListener(eventType as PlayerEventType, callback));
    });
    
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }

  addEventListener(event: PlayerEventType, callback: PlayerEventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  removeEventListener(event: PlayerEventType, callback: PlayerEventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  // 🔧 Private Methods

  private setupAudioEventListeners(): void {
    if (!this.audio) return;

    this.audio.addEventListener('loadstart', () => {
      this.updateState({ isLoading: true });
    });

    this.audio.addEventListener('canplay', () => {
      this.updateState({ isLoading: false });
    });

    this.audio.addEventListener('ended', () => {
      this.handleTrackEnded();
    });

    this.audio.addEventListener('error', (e) => {
      console.error('❌ Audio error:', e);
      this.updateState({ 
        isLoading: false,
        isPlaying: false,
        error: 'Audio playback error' 
      });
      this.emit('error');
    });

    this.audio.addEventListener('timeupdate', () => {
      if (this.audio) {
        this.updateState({ currentTime: this.audio.currentTime });
      }
    });
  }

  private async handleTrackEnded(): Promise<void> {
    this.updateState({ isPlaying: false });
    
    if (this.state.repeatMode === 'one') {
      // Repeat current track
      this.seek(0);
      await this.play();
    } else {
      // Skip to next track
      const hasNext = await this.skipToNext();
      if (!hasNext && this.state.repeatMode === 'none') {
        // End of playlist
        this.stop();
      }
    }
  }

  private startProgressTracking(): void {
    this.stopProgressTracking();
    
    this.progressInterval = window.setInterval(() => {
      if (this.audio && this.state.isPlaying) {
        this.updateState({ currentTime: this.audio.currentTime });
        this.emit('progress');
      }
    }, 1000);
  }

  private stopProgressTracking(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  private cleanupAudio(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio.load();
      this.audio = null;
    }
    
    this.stopProgressTracking();
    
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
  }

  private initializeEventListeners(): void {
    // Initialize event listener sets
    (['stateChange', 'trackChange', 'error', 'progress'] as PlayerEventType[]).forEach(event => {
      this.listeners.set(event, new Set());
    });
  }

  private updateState(updates: Partial<PlayerState>): void {
    this.state = { ...this.state, ...updates };
  }

  private emit(event: PlayerEventType): void {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(this.getState());
      } catch (error) {
        console.error(`❌ Error in ${event} listener:`, error);
      }
    });
  }

  // 🧹 Cleanup

  destroy(): void {
    this.cleanupAudio();
    this.listeners.clear();
  }
}

// Export singleton instance
export const enhancedAudioPlayer = new EnhancedAudioPlayerService();
