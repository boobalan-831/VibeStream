import { supabase } from '../lib/supabaseClient';
import type { SaavnTrack } from './enhancedMusicService';

// Helper to convert a Saavn id to our track PK
export const toTrackId = (saavnId: string) => `saavn:${saavnId}`;

export async function upsertTrack(track: SaavnTrack) {
  const id = toTrackId(track.id);
  const name = track.name;
  const artists = (track.artists?.primary || []).map(a => a.name);
  const image_url = track.image?.[track.image.length - 1]?.url || null;
  const duration_seconds = track.duration ?? null;
  const album_name = track.album?.name ?? null;

  const { error } = await supabase.rpc('upsert_track', {
    p_id: id,
    p_name: name,
    p_artists: artists,
    p_image_url: image_url,
    p_duration_seconds: duration_seconds,
    p_album_name: album_name,
    p_source: 'saavn'
  });
  if (error) console.error('upsertTrack error', error);
  return id;
}

export async function logRecentlyPlayed(userId: string, trackId: string, progressSeconds?: number, device?: string) {
  const { error } = await supabase.from('user_recently_played').insert({
    user_id: userId,
    track_id: trackId,
    progress_seconds: progressSeconds ?? null,
    device: device ?? 'web'
  });
  if (error) console.error('logRecentlyPlayed error', error);
}

export async function likeTrack(userId: string, trackId: string) {
  const { error } = await supabase.from('user_likes').insert({ user_id: userId, track_id: trackId });
  if (error) console.error('likeTrack error', error);
}

export async function unlikeTrack(userId: string, trackId: string) {
  const { error } = await supabase
    .from('user_likes')
    .delete()
    .eq('user_id', userId)
    .eq('track_id', trackId);
  if (error) console.error('unlikeTrack error', error);
}

export async function getLikes(userId: string) {
  const { data, error } = await supabase
    .from('user_likes')
    .select('track_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('getLikes error', error);
    return [] as { track_id: string; created_at: string }[];
  }
  return data ?? [];
}

export async function getRecentlyPlayed(userId: string, limit = 100) {
  const { data, error } = await supabase
    .from('user_recently_played')
    .select('track_id, played_at, progress_seconds')
    .eq('user_id', userId)
    .order('played_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('getRecentlyPlayed error', error);
    return [] as { track_id: string; played_at: string; progress_seconds: number | null }[];
  }
  return data ?? [];
}

export async function getLikedTracksWithMeta(userId: string, limit = 200) {
  const { data, error } = await supabase
    .from('user_likes')
    .select('created_at, tracks:track_id(id, source, name, artists, image_url, duration_seconds, album_name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('getLikedTracksWithMeta error', error);
    return [] as { created_at: string; tracks: DbTrack }[];
  }
  // Supabase returns related objects as arrays under alias; coerce to single track
  return (data || []).map((row: any) => ({
    created_at: row.created_at as string,
    tracks: Array.isArray(row.tracks) ? (row.tracks[0] as DbTrack) : (row.tracks as DbTrack),
  }));
}

export async function getRecentlyPlayedWithMeta(userId: string, limit = 100) {
  const { data, error } = await supabase
    .from('user_recently_played')
    .select('played_at, progress_seconds, tracks:track_id(id, source, name, artists, image_url, duration_seconds, album_name)')
    .eq('user_id', userId)
    .order('played_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('getRecentlyPlayedWithMeta error', error);
    return [] as { played_at: string; progress_seconds: number | null; tracks: DbTrack }[];
  }
  return (data || []).map((row: any) => ({
    played_at: row.played_at as string,
    progress_seconds: (row.progress_seconds ?? null) as number | null,
    tracks: Array.isArray(row.tracks) ? (row.tracks[0] as DbTrack) : (row.tracks as DbTrack),
  }));
}

export async function createPlaylist(ownerId: string, title: string, description?: string, isPublic = false) {
  const { data, error } = await supabase
    .from('playlists')
    .insert({ owner_id: ownerId, title, description, is_public: isPublic })
    .select()
    .single();
  if (error) {
    console.error('createPlaylist error', error);
    return null;
  }
  return data;
}

export async function addTrackToPlaylist(playlistId: string, userId: string, track: SaavnTrack) {
  const trackId = await upsertTrack(track);
  const { error } = await supabase.from('playlist_tracks').insert({
    playlist_id: playlistId,
    track_id: trackId,
    added_by: userId
  });
  if (error) console.error('addTrackToPlaylist error', error);
}

export async function removeTrackFromPlaylist(playlistId: string, trackId: string) {
  const { error } = await supabase
    .from('playlist_tracks')
    .delete()
    .eq('playlist_id', playlistId)
    .eq('track_id', trackId);
  if (error) console.error('removeTrackFromPlaylist error', error);
}

export async function recommendTracks(userId: string, limit = 20) {
  const { data, error } = await supabase.rpc('recommend_tracks', {
    p_user: userId,
    p_limit: limit
  });
  if (error) {
    console.error('recommendTracks error', error);
    return [] as any[];
  }
  return data ?? [];
}

export async function rebuildArtistCounts(userId: string) {
  const { error } = await supabase.rpc('rebuild_user_artist_counts', {
    p_user: userId
  });
  if (error) console.error('rebuildArtistCounts error', error);
}

// DB track row type and converter to Saavn-like track for UI/playback
export type DbTrack = {
  id: string; // e.g. saavn:123
  source: string;
  name: string;
  artists: string[] | null;
  image_url: string | null;
  duration_seconds: number | null;
  album_name: string | null;
};

export function fromDbTrack(row: DbTrack): SaavnTrack {
  const saavnId = row.id?.startsWith('saavn:') ? row.id.slice(6) : row.id;
  return {
    id: saavnId || '',
    name: row.name || '',
    artists: { primary: (row.artists || []).map((n) => ({ name: n })) },
    image: row.image_url
      ? [
          { quality: '500x500', url: row.image_url },
          { quality: '150x150', url: row.image_url }
        ]
      : [],
    downloadUrl: [],
    duration: row.duration_seconds ?? 0,
    album: row.album_name ? { name: row.album_name } : undefined,
  };
}

// Continue listening (playback state)
export async function savePlaybackState(userId: string, trackId: string, positionSeconds: number) {
  const { error } = await supabase.rpc('save_playback_state', {
    p_user: userId,
    p_track_id: trackId,
    p_position: Math.max(0, Math.floor(positionSeconds || 0))
  });
  if (error) console.error('savePlaybackState error', error);
}

export async function getPlaybackState(userId: string) {
  const { data, error } = await supabase
    .from('user_playback_state')
    .select('track_id, position_seconds')
    .eq('user_id', userId)
    .single();
  if (error) {
    // Not fatal; just means none yet
    return null as null | { track_id: string; position_seconds: number };
  }
  return data as { track_id: string; position_seconds: number };
}
