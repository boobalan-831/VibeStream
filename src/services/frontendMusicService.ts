/**
 * Frontend-Only Music Service
 * Direct integration with public APIs - NO BACKEND NEEDED!
 */

export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: string;
  image: string;
  audioUrl: string;
  source: 'jiosaavn' | 'deezer' | 'youtube';
  year?: string;
  language?: string;
  quality?: string;
}

export interface SearchResponse {
  success: boolean;
  data: Song[];
  total: number;
  source?: string;
  message?: string;
  error?: string;
}

class FrontendMusicService {
  // Simple in-memory cache to avoid refetching audio URLs
  private jioAudioCache: Map<string, string> = new Map();
  
  // 🎵 JioSaavn Direct API Integration (using saavn.dev)
  async searchJioSaavn(query: string, limit: number = 20): Promise<SearchResponse> {
    try {
      console.log(`🔍 Searching JioSaavn for: "${query}"`);
      
      // Direct API call to saavn.dev (CORS-enabled public API)
      const response = await fetch(`https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}&page=1&limit=${limit}`);
      
      if (!response.ok) {
        throw new Error(`JioSaavn API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.data?.results?.length > 0) {
        const songs = data.data.results.map((song: any) => this.formatJioSaavnSong(song));
        console.log(`✅ Found ${songs.length} songs from JioSaavn`);
        return {
          success: true,
          data: songs,
          total: songs.length,
          source: 'jiosaavn'
        };
      }

      return { success: false, data: [], total: 0, error: 'No songs found' };
    } catch (error) {
      console.error('❌ JioSaavn search failed:', error);
      return { 
        success: false, 
        data: [], 
        total: 0, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // 🎵 Get JioSaavn Trending Songs
  async getTrendingJioSaavn(): Promise<SearchResponse> {
    try {
      console.log('🔥 Fetching JioSaavn trending songs...');
      
      const response = await fetch('https://saavn.dev/api/modules?language=english,hindi');
      
      if (!response.ok) {
        throw new Error(`JioSaavn trending API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.data?.trending?.songs?.length > 0) {
        const songs = data.data.trending.songs.map((song: any) => this.formatJioSaavnSong(song));
        console.log(`✅ Found ${songs.length} trending songs`);
        return {
          success: true,
          data: songs,
          total: songs.length,
          source: 'jiosaavn'
        };
      }

      // Fallback trending songs if API fails
      return this.getFallbackTrendingSongs();
    } catch (error) {
      console.error('❌ JioSaavn trending failed:', error);
      return this.getFallbackTrendingSongs();
    }
  }

  // 🎵 Deezer Direct API Integration
  async searchDeezer(query: string, limit: number = 20): Promise<SearchResponse> {
    try {
      console.log(`🔍 Searching Deezer for: "${query}"`);
      
      // Deezer public API (CORS-enabled)
      const response = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=${limit}`);
      
      if (!response.ok) {
        throw new Error(`Deezer API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data?.data?.length > 0) {
        const songs = data.data.map((track: any) => this.formatDeezerSong(track));
        console.log(`✅ Found ${songs.length} songs from Deezer`);
        return {
          success: true,
          data: songs,
          total: songs.length,
          source: 'deezer'
        };
      }

      return { success: false, data: [], total: 0, error: 'No songs found' };
    } catch (error) {
      console.error('❌ Deezer search failed:', error);
      return { 
        success: false, 
        data: [], 
        total: 0, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // 🎵 YouTube Music Search (using a public API or YouTube Data API)
  async searchYouTube(query: string, limit: number = 20): Promise<SearchResponse> {
    try {
      console.log(`🔍 Searching YouTube for: "${query}"`);
      
      // Note: For production, you'd use YouTube Data API v3 with API key
      // For demo, we'll create mock YouTube results
      const mockResults = this.createMockYouTubeResults(query, limit);
      
      return {
        success: true,
        data: mockResults,
        total: mockResults.length,
        source: 'youtube'
      };
    } catch (error) {
      console.error('❌ YouTube search failed:', error);
      return { 
        success: false, 
        data: [], 
        total: 0, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // 🎵 Multi-source search (searches all platforms)
  async searchAllSources(query: string): Promise<SearchResponse> {
    try {
      console.log(`🌍 Searching all sources for: "${query}"`);
      
      // Search all platforms in parallel
      const [jiosaavnResults, deezerResults, youtubeResults] = await Promise.all([
        this.searchJioSaavn(query, 10).catch(err => ({ success: false, data: [], total: 0, error: err.message })),
        this.searchDeezer(query, 10).catch(err => ({ success: false, data: [], total: 0, error: err.message })),
        this.searchYouTube(query, 10).catch(err => ({ success: false, data: [], total: 0, error: err.message }))
      ]);

      const allSongs: Song[] = [];

      // Combine results from all successful searches
      if (jiosaavnResults.success) {
        allSongs.push(...jiosaavnResults.data);
      }
      
      if (deezerResults.success) {
        allSongs.push(...deezerResults.data);
      }
      
      if (youtubeResults.success) {
        allSongs.push(...youtubeResults.data);
      }

      console.log(`✅ Combined search found ${allSongs.length} songs from all sources`);
      
      return {
        success: allSongs.length > 0,
        data: allSongs,
        total: allSongs.length,
        source: 'multi'
      };
    } catch (error) {
      console.error('❌ Multi-source search failed:', error);
      return { 
        success: false, 
        data: [], 
        total: 0, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // 🎵 Get audio stream URL for a song
  async getAudioUrl(song: Song): Promise<string | null> {
    try {
      switch (song.source) {
        case 'jiosaavn':
          return await this.getJioSaavnAudioUrl(song.id);
        case 'deezer':
          return song.audioUrl; // Deezer provides direct preview URLs
        case 'youtube':
          return await this.getYouTubeAudioUrl(song.id);
        default:
          return null;
      }
    } catch (error) {
      console.error('❌ Failed to get audio URL:', error);
      return null;
    }
  }

  // 🔧 Helper Methods

  private formatJioSaavnSong(song: any): Song {
    return {
      id: song.id || `jiosaavn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: this.cleanText(song.name || song.title || 'Unknown'),
      artist: this.cleanText(song.primaryArtists || song.artist || 'Unknown Artist'),
      album: this.cleanText(song.album?.name || song.album || 'Unknown Album'),
      duration: this.formatDuration(song.duration),
      image: this.getHighQualityImage(song.image),
      audioUrl: song.downloadUrl?.[0]?.link || '',
      source: 'jiosaavn',
      year: song.year?.toString(),
      language: song.language || 'hindi',
      quality: '320kbps'
    };
  }

  private formatDeezerSong(track: any): Song {
    return {
      id: track.id?.toString() || `deezer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: this.cleanText(track.title || 'Unknown'),
      artist: this.cleanText(track.artist?.name || 'Unknown Artist'),
      album: this.cleanText(track.album?.title || 'Unknown Album'),
      duration: this.formatDuration(track.duration),
      image: track.album?.cover_xl || track.album?.cover_big || track.album?.cover_medium || '',
      audioUrl: track.preview || '', // 30-second preview
      source: 'deezer',
      year: track.album?.release_date?.split('-')[0],
      quality: '128kbps'
    };
  }

  private createMockYouTubeResults(query: string, limit: number): Song[] {
    const mockResults: Song[] = [];
    for (let i = 1; i <= Math.min(limit, 5); i++) {
      mockResults.push({
        id: `youtube_${Date.now()}_${i}`,
        title: `${query} - Official Video ${i}`,
        artist: 'YouTube Music',
        album: 'YouTube',
        duration: `${Math.floor(Math.random() * 3) + 2}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
        image: `https://via.placeholder.com/480x360/FF0000/FFFFFF?text=▶️+Video+${i}`,
        audioUrl: '', // Would be extracted from YouTube
        source: 'youtube',
        quality: 'Variable'
      });
    }
    return mockResults;
  }

  private async getJioSaavnAudioUrl(songId: string): Promise<string | null> {
    // Cache first
    if (this.jioAudioCache.has(songId)) {
      return this.jioAudioCache.get(songId)!;
    }
    try {
      const response = await fetch(`https://saavn.dev/api/songs/${songId}`);
      const data = await response.json();
      
      if (data.success && data.data?.[0]?.downloadUrl) {
        // Get highest quality audio URL
        const audioUrls = data.data[0].downloadUrl;
        const highQuality = audioUrls.find((url: any) => url.quality === '320kbps') ||
                           audioUrls.find((url: any) => url.quality === '160kbps') ||
                           audioUrls[0];
        let link = highQuality?.link || null;
        if (link && link.startsWith('http://')) link = 'https://' + link.substring('http://'.length);
        if (link) {
          this.jioAudioCache.set(songId, link);
        }
        return link;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Failed to get JioSaavn audio URL:', error);
      return null;
    }
  }

  private async getYouTubeAudioUrl(videoId: string): Promise<string | null> {
    // Note: For production, you'd use youtube-dl, ytdl-core, or similar
    // This is a placeholder implementation
    console.log('📺 YouTube audio extraction would be implemented here');
    return null;
  }

  private getFallbackTrendingSongs(): SearchResponse {
    const fallbackSongs: Song[] = [
      {
        id: 'fallback_1',
        title: 'Kesariya',
        artist: 'Arijit Singh',
        album: 'Brahmastra',
        duration: '4:28',
        image: 'https://c.saavncdn.com/191/Brahmastra-Hindi-2022-20220825141234-500x500.jpg',
        audioUrl: '',
        source: 'jiosaavn',
        year: '2022',
        language: 'hindi'
      },
      {
        id: 'fallback_2',
        title: 'Apna Bana Le',
        artist: 'Arijit Singh',
        album: 'Bhediya',
        duration: '3:54',
        image: 'https://c.saavncdn.com/050/Bhediya-Hindi-2022-20221118181610-500x500.jpg',
        audioUrl: '',
        source: 'jiosaavn',
        year: '2022',
        language: 'hindi'
      },
      {
        id: 'fallback_3',
        title: 'Chaleya',
        artist: 'Arijit Singh, Shilpa Rao',
        album: 'Jawan',
        duration: '3:18',
        image: 'https://c.saavncdn.com/572/Jawan-Hindi-2023-20230614121304-500x500.jpg',
        audioUrl: '',
        source: 'jiosaavn',
        year: '2023',
        language: 'hindi'
      }
    ];

    return {
      success: true,
      data: fallbackSongs,
      total: fallbackSongs.length,
      source: 'fallback'
    };
  }

  private cleanText(text: string): string {
    return text.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  }

  private formatDuration(duration: string | number): string {
    if (!duration) return '0:00';
    const seconds = typeof duration === 'string' ? parseInt(duration) : duration;
    if (isNaN(seconds)) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  private getHighQualityImage(images: any): string {
    if (typeof images === 'string') return images;
    if (Array.isArray(images)) {
      const highQuality = images.find(img => img.quality === '500x500') || 
                         images.find(img => img.quality === '150x150') || 
                         images[images.length - 1];
      return highQuality?.link || highQuality?.url || 'https://via.placeholder.com/500x500/1DB954/FFFFFF?text=♪';
    }
    return 'https://via.placeholder.com/500x500/1DB954/FFFFFF?text=♪';
  }

  // Prefetch audio URLs for a batch of JioSaavn songs (best-effort, limited concurrency)
  async prefetchJioSaavnAudio(songs: Song[], limit: number = 6): Promise<Song[]> {
    const targets = songs.filter(s => s.source === 'jiosaavn' && (!s.audioUrl || s.audioUrl.length < 10)).slice(0, limit);
    if (targets.length === 0) return songs;
    const updated: Record<string, string> = {};
    await Promise.all(targets.map(async (s) => {
      const url = await this.getJioSaavnAudioUrl(s.id);
      if (url) updated[s.id] = url;
    }));
    if (Object.keys(updated).length === 0) return songs;
    return songs.map(s => updated[s.id] ? { ...s, audioUrl: updated[s.id] } : s);
  }
}

// Export singleton instance
export const frontendMusicService = new FrontendMusicService();
