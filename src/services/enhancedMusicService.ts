/**
 * Enhanced Music Service for VibeStream
 * Integrates Saavn.dev API with the existing context system
 */

export interface SaavnTrack {
  id: string;
  name: string;
  artists: { primary: { name: string }[] };
  image: { quality: string; url: string }[];
  downloadUrl: { quality: string; url: string }[];
  duration: number;
  album?: { name: string };
  year?: string;
  language?: string;
  hasLyrics?: boolean;
}

export interface SaavnSearchResponse {
  success: boolean;
  data: {
    results: SaavnTrack[];
    total?: number;
  };
}

export interface SaavnModulesResponse {
  success: boolean;
  data: {
    trending?: {
      songs: SaavnTrack[];
    };
    charts?: SaavnTrack[];
    albums?: any[];
    playlists?: any[];
  };
}

class EnhancedMusicService {
  private baseUrl = 'https://saavn.dev/api';
  private cache = new Map<string, any>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  // Cache management
  private getCacheKey(endpoint: string, params: Record<string, any> = {}): string {
    const paramString = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    return `${endpoint}?${paramString}`;
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  // API Methods
  async searchSongs(query: string, page: number = 1, limit: number = 20): Promise<SaavnSearchResponse> {
    const cacheKey = this.getCacheKey('search/songs', { query, page, limit });
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log(`🔄 Using cached search results for: "${query}"`);
      return cached;
    }

    try {
      console.log(`🔍 Searching Saavn for: "${query}"`);
      const url = `${this.baseUrl}/search/songs?query=${encodeURIComponent(query)}&page=${page}&limit=${limit}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data: SaavnSearchResponse = await response.json();
      
      if (data.success) {
        console.log(`✅ Found ${data.data.results?.length || 0} songs`);
        this.setCache(cacheKey, data);
        return data;
      } else {
        console.log('❌ No songs found');
        return { success: false, data: { results: [] } };
      }
    } catch (error) {
      console.error('❌ Search failed:', error);
      return { 
        success: false, 
        data: { results: [] }
      };
    }
  }

  async getHomePageModules(languages: string[] = ['english', 'hindi']): Promise<SaavnModulesResponse> {
    const langCsv = (languages && languages.length > 0 ? languages : ['english','hindi']).join(',');
    const cacheKey = this.getCacheKey('modules', { language: langCsv });
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log('🔄 Using cached home page modules');
      return cached;
    }

    try {
      console.log('🔥 Fetching home page modules...');
      const url = `${this.baseUrl}/modules?language=${encodeURIComponent(langCsv)}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data: SaavnModulesResponse = await response.json();
      
      if (data.success) {
  console.log(`✅ Loaded home page modules for languages: ${langCsv}`);
        this.setCache(cacheKey, data);
        return data;
      } else {
        console.log('❌ No home page modules found');
        return { success: false, data: {} };
      }
    } catch (error) {
      console.error('❌ Failed to load home page modules:', error);
      return { success: false, data: {} };
    }
  }

  async getMadeForYouSongs(): Promise<SaavnSearchResponse> {
    try {
      console.log('🔥 Fetching "Made For You" songs...');
      const url = `${this.baseUrl}/search/songs?query=relaxing&limit=6`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data: SaavnSearchResponse = await response.json();
      
      if (data.success) {
        console.log(`✅ Loaded "Made For You" songs`);
        return data;
      } else {
        console.log('❌ No "Made For You" songs found');
        return { success: false, data: { results: [] } };
      }
    } catch (error) {
      console.error('❌ Failed to load "Made For You" songs:', error);
      return { success: false, data: { results: [] } };
    }
  }

  async getViralSongs(): Promise<SaavnSearchResponse> {
    try {
      console.log('🔥 Fetching "Viral Right Now" songs...');
      const url = `${this.baseUrl}/search/songs?query=viral&limit=6`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data: SaavnSearchResponse = await response.json();
      
      if (data.success) {
        console.log(`✅ Loaded "Viral Right Now" songs`);
        return data;
      } else {
        console.log('❌ No "Viral Right Now" songs found');
        return { success: false, data: { results: [] } };
      }
    } catch (error) {
      console.error('❌ Failed to load "Viral Right Now" songs:', error);
      return { success: false, data: { results: [] } };
    }
  }

  async getTopChartsSongs(): Promise<SaavnSearchResponse> {
    try {
      console.log('🔥 Fetching "Top Charts" songs...');
      const url = `${this.baseUrl}/search/songs?query=top+hits&limit=3`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data: SaavnSearchResponse = await response.json();
      
      if (data.success) {
        console.log(`✅ Loaded "Top Charts" songs`);
        return data;
      } else {
        console.log('❌ No "Top Charts" songs found');
        return { success: false, data: { results: [] } };
      }
    } catch (error) {
      console.error('❌ Failed to load "Top Charts" songs:', error);
      return { success: false, data: { results: [] } };
    }
  }

  async getSongDetails(songId: string): Promise<{ success: boolean; data: SaavnTrack | null; audioUrl?: string }> {
    const cacheKey = this.getCacheKey('songs', { id: songId });
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log(`🔄 Using cached song details for: ${songId}`);
      return cached;
    }

    try {
      console.log(`🎵 Getting song details for: ${songId}`);
      const url = `${this.baseUrl}/songs/${songId}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.data && data.data.length > 0) {
        const song = data.data[0];
        
        // Get the best quality download URL
        const downloadUrl = song.downloadUrl?.find((url: any) => url.quality === '320kbps') || 
                           song.downloadUrl?.find((url: any) => url.quality === '160kbps') ||
                           song.downloadUrl?.[0];
        
        const result = {
          success: true,
          data: song,
          audioUrl: downloadUrl?.url || null
        };
        
        console.log(`✅ Got song details and audio URL (${downloadUrl?.quality || 'unknown quality'})`);
        this.setCache(cacheKey, result);
        return result;
      } else {
        console.log('❌ No song details found');
        return { success: false, data: null };
      }
    } catch (error) {
      console.error('❌ Failed to get song details:', error);
      return { success: false, data: null };
    }
  }

  async getAudioUrl(songId: string): Promise<string | null> {
    try {
      const details = await this.getSongDetails(songId);
      if (details.success && details.audioUrl) {
        let url = details.audioUrl;
        
        // Ensure HTTPS
        if (url.startsWith('//')) {
          url = 'https:' + url;
        } else if (url.startsWith('http://')) {
          url = url.replace('http://', 'https://');
        }
        
        return url;
      }
      return null;
    } catch (error) {
      console.error('❌ Failed to get audio URL:', error);
      return null;
    }
  }

  // Utility methods
  getImageUrl(track: SaavnTrack, quality: '500x500' | '150x150' | 'high' = 'high'): string {
    // Debug logging can be re-enabled if needed
    // const DEBUG = false; if (DEBUG) console.log('Getting image URL for track:', track);
    if (typeof track.image === 'string') {
      return track.image;
    }

    if (Array.isArray(track.image)) {
      if (quality === 'high') {
        return track.image.find(img => img.quality === '500x500')?.url || 
               track.image.find(img => img.quality === '150x150')?.url ||
               track.image[0]?.url || '';
      }
      
      return track.image.find(img => img.quality === quality)?.url || 
             track.image[0]?.url || '';
    }

    // console.error('Track image is not a string or an array:', track.image);
    return ''; // or a placeholder image
  }

  formatDuration(seconds: number): string {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Convert Saavn track to app's Song format
  convertToAppSong(track: SaavnTrack): any {
    return {
      id: track.id,
      title: track.name,
      artist: track.artists.primary.map(artist => artist.name).join(', '),
      album: track.album?.name || 'Unknown Album',
      duration: this.formatDuration(track.duration),
      image: this.getImageUrl(track),
      audioUrl: '', // Will be filled when needed
      source: 'jiosaavn' as const,
      year: track.year,
      language: track.language,
    };
  }

  // Batch convert tracks
  convertTracksToAppSongs(tracks: SaavnTrack[]): any[] {
    return tracks.map(track => this.convertToAppSong(track));
  }

  // Search with auto-suggestions
  async searchWithSuggestions(query: string): Promise<{
    results: SaavnTrack[];
    suggestions: string[];
  }> {
    const searchResult = await this.searchSongs(query);
    const results = searchResult.success ? searchResult.data.results : [];
    
    // Generate suggestions based on search results
    const suggestions: string[] = [];
    if (results.length > 0) {
      // Get unique artist names as suggestions
      const artists = new Set<string>();
      results.forEach(track => {
        track.artists.primary.forEach(artist => {
          if (artist.name && !artist.name.toLowerCase().includes(query.toLowerCase())) {
            artists.add(artist.name);
          }
        });
      });
      suggestions.push(...Array.from(artists).slice(0, 5));
    }
    
    return { results, suggestions };
  }

  // Get popular searches (fallback suggestions)
  getPopularSearches(): string[] {
    return [
      'Arijit Singh',
      'Dua Lipa',
      'AR Rahman',
      'Ed Sheeran',
      'Taylor Swift',
      'Atif Aslam',
      'Shreya Ghoshal',
      'Billie Eilish',
      'The Weeknd',
      'Post Malone'
    ];
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Cache cleared');
  }

  // Get cache stats
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export const enhancedMusicService = new EnhancedMusicService();
