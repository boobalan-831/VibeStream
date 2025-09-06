/**
 * Local Storage Service for VibeStream
 * Handles: Recent searches, Favorites, Offline song metadata, User preferences
 * Uses IndexedDB for complex data, LocalStorage for simple preferences
 */

import { Song } from './frontendMusicService';

export interface StoredSong extends Song {
  addedAt: number;
  playCount: number;
  lastPlayed?: number;
}

export interface UserPreferences {
  volume: number;
  repeatMode: 'none' | 'one' | 'all';
  shuffleMode: boolean;
  theme: 'light' | 'dark' | 'auto';
  autoPlay: boolean;
  crossfade: boolean;
  normalizeVolume: boolean;
}

export interface RecentSearch {
  id: string;
  query: string;
  timestamp: number;
  resultCount: number;
}

class LocalStorageService {
  private dbName = 'VibeStreamDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  // 🗄️ Initialize IndexedDB
  async initialize(): Promise<boolean> {
    try {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.dbVersion);

        request.onerror = () => {
          console.error('❌ Failed to open IndexedDB:', request.error);
          reject(false);
        };

        request.onsuccess = () => {
          this.db = request.result;
          console.log('✅ IndexedDB initialized successfully');
          resolve(true);
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          
          // Create object stores
          if (!db.objectStoreNames.contains('favorites')) {
            const favoritesStore = db.createObjectStore('favorites', { keyPath: 'id' });
            favoritesStore.createIndex('addedAt', 'addedAt', { unique: false });
            favoritesStore.createIndex('artist', 'artist', { unique: false });
          }

          if (!db.objectStoreNames.contains('recentlyPlayed')) {
            const recentStore = db.createObjectStore('recentlyPlayed', { keyPath: 'id' });
            recentStore.createIndex('lastPlayed', 'lastPlayed', { unique: false });
            recentStore.createIndex('playCount', 'playCount', { unique: false });
          }

          if (!db.objectStoreNames.contains('recentSearches')) {
            const searchStore = db.createObjectStore('recentSearches', { keyPath: 'id' });
            searchStore.createIndex('timestamp', 'timestamp', { unique: false });
          }

          if (!db.objectStoreNames.contains('playlists')) {
            const playlistStore = db.createObjectStore('playlists', { keyPath: 'id' });
            playlistStore.createIndex('name', 'name', { unique: false });
            playlistStore.createIndex('createdAt', 'createdAt', { unique: false });
          }

          console.log('✅ IndexedDB object stores created');
        };
      });
    } catch (error) {
      console.error('❌ IndexedDB initialization failed:', error);
      return false;
    }
  }

  // 🎵 Favorites Management
  async addToFavorites(song: Song): Promise<boolean> {
    try {
      if (!this.db) await this.initialize();
      if (!this.db) return false;

      const storedSong: StoredSong = {
        ...song,
        addedAt: Date.now(),
        playCount: 0
      };

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(['favorites'], 'readwrite');
        const store = transaction.objectStore('favorites');
        const request = store.put(storedSong);

        request.onsuccess = () => {
          console.log(`✅ Added "${song.title}" to favorites`);
          resolve(true);
        };

        request.onerror = () => {
          console.error('❌ Failed to add to favorites:', request.error);
          reject(false);
        };
      });
    } catch (error) {
      console.error('❌ Add to favorites failed:', error);
      return false;
    }
  }

  async removeFromFavorites(songId: string): Promise<boolean> {
    try {
      if (!this.db) await this.initialize();
      if (!this.db) return false;

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(['favorites'], 'readwrite');
        const store = transaction.objectStore('favorites');
        const request = store.delete(songId);

        request.onsuccess = () => {
          console.log(`✅ Removed song ${songId} from favorites`);
          resolve(true);
        };

        request.onerror = () => {
          console.error('❌ Failed to remove from favorites:', request.error);
          reject(false);
        };
      });
    } catch (error) {
      console.error('❌ Remove from favorites failed:', error);
      return false;
    }
  }

  async getFavorites(limit?: number): Promise<StoredSong[]> {
    try {
      if (!this.db) await this.initialize();
      if (!this.db) return [];

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(['favorites'], 'readonly');
        const store = transaction.objectStore('favorites');
        const index = store.index('addedAt');
        const request = index.openCursor(null, 'prev'); // Most recent first

        const favorites: StoredSong[] = [];
        let count = 0;

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          
          if (cursor && (!limit || count < limit)) {
            favorites.push(cursor.value);
            count++;
            cursor.continue();
          } else {
            resolve(favorites);
          }
        };

        request.onerror = () => {
          console.error('❌ Failed to get favorites:', request.error);
          reject([]);
        };
      });
    } catch (error) {
      console.error('❌ Get favorites failed:', error);
      return [];
    }
  }

  async isFavorite(songId: string): Promise<boolean> {
    try {
      if (!this.db) await this.initialize();
      if (!this.db) return false;

      return new Promise((resolve) => {
        const transaction = this.db!.transaction(['favorites'], 'readonly');
        const store = transaction.objectStore('favorites');
        const request = store.get(songId);

        request.onsuccess = () => {
          resolve(!!request.result);
        };

        request.onerror = () => {
          resolve(false);
        };
      });
    } catch (error) {
      console.error('❌ Check favorite failed:', error);
      return false;
    }
  }

  // 🎵 Recently Played Management
  async addToRecentlyPlayed(song: Song): Promise<boolean> {
    try {
      if (!this.db) await this.initialize();
      if (!this.db) return false;

      // Get existing entry to update play count
      const existing = await this.getRecentlyPlayedSong(song.id);
      
      const storedSong: StoredSong = {
        ...song,
        addedAt: existing?.addedAt || Date.now(),
        lastPlayed: Date.now(),
        playCount: (existing?.playCount || 0) + 1
      };

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(['recentlyPlayed'], 'readwrite');
        const store = transaction.objectStore('recentlyPlayed');
        const request = store.put(storedSong);

        request.onsuccess = () => {
          resolve(true);
        };

        request.onerror = () => {
          console.error('❌ Failed to add to recently played:', request.error);
          reject(false);
        };
      });
    } catch (error) {
      console.error('❌ Add to recently played failed:', error);
      return false;
    }
  }

  async getRecentlyPlayed(limit: number = 50): Promise<StoredSong[]> {
    try {
      if (!this.db) await this.initialize();
      if (!this.db) return [];

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(['recentlyPlayed'], 'readonly');
        const store = transaction.objectStore('recentlyPlayed');
        const index = store.index('lastPlayed');
        const request = index.openCursor(null, 'prev'); // Most recent first

        const recentlyPlayed: StoredSong[] = [];
        let count = 0;

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          
          if (cursor && count < limit) {
            recentlyPlayed.push(cursor.value);
            count++;
            cursor.continue();
          } else {
            resolve(recentlyPlayed);
          }
        };

        request.onerror = () => {
          console.error('❌ Failed to get recently played:', request.error);
          reject([]);
        };
      });
    } catch (error) {
      console.error('❌ Get recently played failed:', error);
      return [];
    }
  }

  private async getRecentlyPlayedSong(songId: string): Promise<StoredSong | null> {
    try {
      if (!this.db) return null;

      return new Promise((resolve) => {
        const transaction = this.db!.transaction(['recentlyPlayed'], 'readonly');
        const store = transaction.objectStore('recentlyPlayed');
        const request = store.get(songId);

        request.onsuccess = () => {
          resolve(request.result || null);
        };

        request.onerror = () => {
          resolve(null);
        };
      });
    } catch (error) {
      return null;
    }
  }

  // 🔍 Recent Searches Management
  async addRecentSearch(query: string, resultCount: number): Promise<boolean> {
    try {
      const search: RecentSearch = {
        id: `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        query: query.toLowerCase().trim(),
        timestamp: Date.now(),
        resultCount
      };

      // Check if this search already exists
      const existing = await this.getRecentSearches();
      const duplicate = existing.find(s => s.query === search.query);
      
      if (duplicate) {
        // Update timestamp of existing search
        duplicate.timestamp = Date.now();
        duplicate.resultCount = resultCount;
        search.id = duplicate.id;
      }

      if (!this.db) await this.initialize();
      if (!this.db) return false;

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(['recentSearches'], 'readwrite');
        const store = transaction.objectStore('recentSearches');
        const request = store.put(search);

        request.onsuccess = () => {
          resolve(true);
        };

        request.onerror = () => {
          console.error('❌ Failed to add recent search:', request.error);
          reject(false);
        };
      });
    } catch (error) {
      console.error('❌ Add recent search failed:', error);
      return false;
    }
  }

  async getRecentSearches(limit: number = 10): Promise<RecentSearch[]> {
    try {
      if (!this.db) await this.initialize();
      if (!this.db) return [];

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(['recentSearches'], 'readonly');
        const store = transaction.objectStore('recentSearches');
        const index = store.index('timestamp');
        const request = index.openCursor(null, 'prev'); // Most recent first

        const searches: RecentSearch[] = [];
        let count = 0;

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          
          if (cursor && count < limit) {
            searches.push(cursor.value);
            count++;
            cursor.continue();
          } else {
            resolve(searches);
          }
        };

        request.onerror = () => {
          console.error('❌ Failed to get recent searches:', request.error);
          reject([]);
        };
      });
    } catch (error) {
      console.error('❌ Get recent searches failed:', error);
      return [];
    }
  }

  async clearRecentSearches(): Promise<boolean> {
    try {
      if (!this.db) await this.initialize();
      if (!this.db) return false;

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(['recentSearches'], 'readwrite');
        const store = transaction.objectStore('recentSearches');
        const request = store.clear();

        request.onsuccess = () => {
          console.log('✅ Recent searches cleared');
          resolve(true);
        };

        request.onerror = () => {
          console.error('❌ Failed to clear recent searches:', request.error);
          reject(false);
        };
      });
    } catch (error) {
      console.error('❌ Clear recent searches failed:', error);
      return false;
    }
  }

  // ⚙️ User Preferences (LocalStorage)
  savePreferences(preferences: Partial<UserPreferences>): void {
    try {
      const current = this.getPreferences();
      const updated = { ...current, ...preferences };
      localStorage.setItem('vibestream_preferences', JSON.stringify(updated));
      console.log('✅ Preferences saved');
    } catch (error) {
      console.error('❌ Failed to save preferences:', error);
    }
  }

  getPreferences(): UserPreferences {
    try {
      const stored = localStorage.getItem('vibestream_preferences');
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          volume: 1,
          repeatMode: 'none',
          shuffleMode: false,
          theme: 'auto',
          autoPlay: false,
          crossfade: false,
          normalizeVolume: false,
          ...parsed
        };
      }
    } catch (error) {
      console.error('❌ Failed to get preferences:', error);
    }

    // Default preferences
    return {
      volume: 1,
      repeatMode: 'none',
      shuffleMode: false,
      theme: 'auto',
      autoPlay: false,
      crossfade: false,
      normalizeVolume: false
    };
  }

  // 📊 Statistics
  async getListeningStats(): Promise<{
    totalSongs: number;
    totalListeningTime: number;
    favoritesCount: number;
    topArtists: { artist: string; playCount: number }[];
  }> {
    try {
      const recentlyPlayed = await this.getRecentlyPlayed(1000);
      const favorites = await this.getFavorites();
      
      const totalSongs = recentlyPlayed.length;
      const totalListeningTime = recentlyPlayed.reduce((total, song) => {
        const duration = this.parseDuration(song.duration);
        return total + (duration * song.playCount);
      }, 0);

      // Calculate top artists
      const artistCounts: { [artist: string]: number } = {};
      recentlyPlayed.forEach(song => {
        artistCounts[song.artist] = (artistCounts[song.artist] || 0) + song.playCount;
      });

      const topArtists = Object.entries(artistCounts)
        .map(([artist, playCount]) => ({ artist, playCount }))
        .sort((a, b) => b.playCount - a.playCount)
        .slice(0, 10);

      return {
        totalSongs,
        totalListeningTime,
        favoritesCount: favorites.length,
        topArtists
      };
    } catch (error) {
      console.error('❌ Failed to get listening stats:', error);
      return {
        totalSongs: 0,
        totalListeningTime: 0,
        favoritesCount: 0,
        topArtists: []
      };
    }
  }

  // 🧹 Cleanup
  async clearAllData(): Promise<boolean> {
    try {
      if (!this.db) await this.initialize();
      if (!this.db) return false;

      const stores = ['favorites', 'recentlyPlayed', 'recentSearches', 'playlists'];
      
      for (const storeName of stores) {
        await new Promise<void>((resolve, reject) => {
          const transaction = this.db!.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          const request = store.clear();

          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }

      // Clear LocalStorage preferences
      localStorage.removeItem('vibestream_preferences');
      
      console.log('✅ All data cleared');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear all data:', error);
      return false;
    }
  }

  private parseDuration(duration: string): number {
    // Parse duration string (e.g., "3:45") to seconds
    const parts = duration.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return 0;
  }
}

// Export singleton instance
export const localStorageService = new LocalStorageService();
