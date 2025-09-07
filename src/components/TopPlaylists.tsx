import React, { useEffect, useState } from 'react';
import { Play } from 'lucide-react';

interface Playlist {
  id: string;
  name: string;
  image: { quality: string; url: string }[];
  followerCount: string;
  description?: string;
  songCount?: string;
}

const getImageUrl = (playlist: Playlist) => {
  return playlist.image.find(img => img.quality === '500x500')?.url || 
         playlist.image.find(img => img.quality === '150x150')?.url ||
         playlist.image[0]?.url;
};

const TopPlaylists: React.FC<{ onPlayPlaylist: (playlist: Playlist) => void }> = ({ onPlayPlaylist }) => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        setLoading(true);
        const response = await fetch('https://saavn.dev/api/search/playlists?query=top%20tamil&limit=20');
        const data = await response.json();
        console.log('🎵 Playlists API Response:', data);
        
        if (data.success && data.data && Array.isArray(data.data.results)) {
          // Filter out playlists that explicitly show 0 songs
          const validPlaylists = data.data.results.filter((p: any) => p.songCount === undefined || parseInt(p.songCount, 10) > 0);
          console.log(`📀 Found ${validPlaylists.length} valid playlists`);
          setPlaylists(validPlaylists);
        } else {
          setPlaylists([]);
        }
      } catch (error) {
        console.error('❌ Failed to fetch playlists:', error);
        setPlaylists([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylists();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-400 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-white mb-6">Top Playlists</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {playlists.map((playlist) => (
          <div
            key={playlist.id}
            className="bg-gray-800 border border-gray-700 hover:bg-gray-700 transition-all cursor-pointer group overflow-hidden relative rounded-lg"
            onClick={() => onPlayPlaylist(playlist)}
          >
            <div className="relative">
              <img
                src={getImageUrl(playlist)}
                alt={playlist.name}
                className="w-full aspect-square object-cover rounded-t-lg"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                <button
                  className="w-12 h-12 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg flex items-center justify-center focus:outline-none"
                  tabIndex={-1}
                  type="button"
                  aria-label="Play Playlist"
                >
                  <Play className="w-6 h-6 ml-0.5" />
                </button>
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-white truncate mb-1">{playlist.name}</h3>
              <p className="text-gray-400 text-xs truncate">{playlist.followerCount} Followers</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopPlaylists;
