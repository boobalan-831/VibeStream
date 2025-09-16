import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Heart,
  List,
  Volume2,
  VolumeX,
  Timer,
  Mic2,
  Minus,
  Plus,
  FlagTriangleRight,
  X
} from 'lucide-react';

type RepeatMode = 0 | 1 | 2; // off, all, one

export interface PremiumPlayerProps {
  // Track
  artworkUrl: string;
  title: string;
  subtitle: string;
  nextTitle?: string;

  // Playback state
  isPlaying: boolean;
  isLoading?: boolean;
  progressPercent: number; // 0-100
  currentTimeLabel: string; // e.g. 1:23
  durationLabel: string; // e.g. 3:45

  // Queue
  queueCount: number;

  // Volume
  volumePercent: number; // 0-100
  isMuted: boolean;

  // Modes
  isShuffled: boolean;
  repeatMode: RepeatMode;
  playbackSpeed?: number;

  // Favorites
  isFavorite: boolean;

  // A-B loop
  aPoint: number | null;
  bPoint: number | null;

  // Sleep timer
  sleepMinutesLeft: number | null; // remaining minutes (rounded) or null

  // Handlers
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeekPercent: (percent: number) => void;
  onSeekBy: (seconds: number) => void; // +/- seconds
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onCycleSpeed?: () => void;
  onToggleFavorite: () => void;
  onOpenQueue: () => void;
  onVolumeChange: (percent: number) => void;
  onToggleMute: () => void;

  // A-B loop controls
  onMarkA: () => void;
  onMarkB: () => void;
  onClearAB: () => void;

  // Sleep timer controls
  onSetSleep: (minutes: number) => void;
  onCancelSleep: () => void;
}

const PremiumPlayer: React.FC<PremiumPlayerProps> = ({
  artworkUrl,
  title,
  subtitle,
  nextTitle,
  isPlaying,
  isLoading = false,
  progressPercent,
  currentTimeLabel,
  durationLabel,
  queueCount,
  volumePercent,
  isMuted,
  isShuffled,
  repeatMode,
  playbackSpeed = 1,
  isFavorite,
  aPoint,
  bPoint,
  sleepMinutesLeft,
  onPlayPause,
  onPrev,
  onNext,
  onSeekPercent,
  onSeekBy,
  onToggleShuffle,
  onToggleRepeat,
  onCycleSpeed,
  onToggleFavorite,
  onOpenQueue,
  onVolumeChange,
  onToggleMute,
  onMarkA,
  onMarkB,
  onClearAB,
  onSetSleep,
  onCancelSleep,
}) => {
  const [showSleepMenu, setShowSleepMenu] = React.useState(false);
  const [showLyrics, setShowLyrics] = React.useState(false);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    onSeekPercent(pct);
  };

  return (
    <div className="bg-[#0B0F14]/95 md:bg-[#0B1015]/70 border-t border-white/10 px-4 py-4 shadow-xl md:static fixed bottom-12 left-0 right-0 z-40" style={{ backdropFilter: 'blur(10px)' }}>
      {/* Top progress */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-white/5 cursor-pointer" onClick={handleProgressClick}>
        <div className="h-full bg-emerald-400/80" style={{ width: `${progressPercent}%` }} />
      </div>

      <div className="relative flex items-center justify-between gap-3">
        {/* Left: artwork + titles */}
        <div className="flex items-center gap-3 min-w-0" style={{ flexBasis: '32%' }}>
          <div className="relative">
            <img src={artworkUrl} alt={title} className="w-14 h-14 md:w-16 md:h-16 rounded-lg object-cover ring-1 ring-white/10" />
          </div>
          <div className="min-w-0">
            <h4 className="font-semibold text-white truncate text-sm md:text-base" title={title}>{title}</h4>
            <p className="text-gray-300 text-[11px] md:text-sm truncate" title={subtitle}>{subtitle}</p>
            {nextTitle && (
              <p className="hidden md:block text-[11px] text-gray-500 truncate">Next: {nextTitle}</p>
            )}
          </div>
          <button onClick={onToggleFavorite} className={`ml-1 p-2 rounded-lg border border-white/10 hover:bg-white/5 transition ${isFavorite ? 'text-rose-400' : 'text-gray-300 hover:text-white'}`} title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
            <Heart className="w-5 h-5" fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Center: controls */}
        <div className="flex flex-col items-center gap-2 md:gap-2 px-2" style={{ flexBasis: '36%' }}>
          <div className="flex items-center gap-2 md:gap-3">
            <button onClick={onToggleShuffle} className={`p-2 rounded-full border border-white/10 ${isShuffled ? 'text-emerald-400 bg-emerald-400/10' : 'text-gray-300 hover:text-white hover:bg-white/5'}`} title="Shuffle">
              <Shuffle className="w-5 h-5" />
            </button>
            <button onClick={onPrev} className="p-2 rounded-full text-gray-300 hover:text-white hover:bg-white/5 border border-white/10" title="Previous">
              <SkipBack className="w-6 h-6" />
            </button>
            <button onClick={() => onSeekBy(-10)} className="hidden md:inline-flex items-center gap-1 px-3 py-2 rounded-full text-gray-300 hover:text-white hover:bg-white/5 border border-white/10" title="-10 sec">
              <Minus className="w-4 h-4" />10s
            </button>
            <button onClick={onPlayPause} className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-emerald-500 text-gray-900 hover:bg-emerald-400 transition shadow-md disabled:opacity-50" title={isPlaying ? 'Pause' : 'Play'} disabled={!!isLoading}>
              {isLoading ? (
                <div className="mx-auto my-auto w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-6 h-6 mx-auto" />
              ) : (
                <Play className="w-6 h-6 mx-auto" />
              )}
            </button>
            <button onClick={() => onSeekBy(10)} className="hidden md:inline-flex items-center gap-1 px-3 py-2 rounded-full text-gray-300 hover:text-white hover:bg-white/5 border border-white/10" title="+10 sec">
              <Plus className="w-4 h-4" />10s
            </button>
            <button onClick={onNext} className="p-2 rounded-full text-gray-300 hover:text-white hover:bg-white/5 border border-white/10" title="Next">
              <SkipForward className="w-6 h-6" />
            </button>
            <button onClick={onToggleRepeat} className={`p-2 rounded-full border border-white/10 ${repeatMode > 0 ? 'text-emerald-400 bg-emerald-400/10' : 'text-gray-300 hover:text-white hover:bg-white/5'}`} title={`Repeat ${repeatMode === 0 ? 'Off' : repeatMode === 1 ? 'All' : 'One'}`}>
              <div className="relative">
                <Repeat className="w-5 h-5" />
                {repeatMode === 2 && (
                  <span className="absolute -top-1 -right-1 bg-emerald-400 text-gray-900 text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">1</span>
                )}
              </div>
            </button>
            {onCycleSpeed && (
              <button onClick={onCycleSpeed} className="px-2.5 py-2 rounded-full text-gray-300 hover:text-white hover:bg-white/5 border border-white/10 text-xs font-semibold" title="Playback speed">
                {playbackSpeed}x
              </button>
            )}
          </div>
          {/* Desktop timeline */}
          <div className="hidden md:flex items-center gap-3 w-full">
            <span className="text-xs text-gray-300 w-12 text-right font-mono">{currentTimeLabel}</span>
            <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden cursor-pointer" onClick={handleProgressClick}>
              <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-400" style={{ width: `${progressPercent}%` }} />
            </div>
            <span className="text-xs text-gray-300 w-12 font-mono">{durationLabel}</span>
          </div>
        </div>

        {/* Right: queue, volume, AB loop, sleep, lyrics */}
        <div className="flex items-center justify-end gap-2 md:gap-3" style={{ flexBasis: '32%' }}>
          <button onClick={onOpenQueue} className="relative px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 border border-white/10" title="Queue">
            <List className="w-5 h-5" />
            {queueCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-emerald-500 text-gray-900 text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{queueCount}</span>
            )}
          </button>
          {/* Lyrics toggle */}
          <div className="relative hidden md:block">
            <button onClick={() => setShowLyrics(v => !v)} className="px-2.5 py-2 rounded-lg border border-white/10 text-gray-300 hover:text-white hover:bg-white/5" title="Lyrics">
              <Mic2 className="w-5 h-5" />
            </button>
            {showLyrics && (
              <div className="absolute right-0 bottom-full mb-2 w-64 bg-[#0B0F14] border border-white/10 rounded-xl shadow-xl p-3 space-y-2 z-50">
                <p className="text-xs text-gray-400">Lyrics</p>
                <div className="text-xs text-gray-300 leading-relaxed">
                  Lyrics are not available yet. We’ll add synced lyrics soon.
                </div>
              </div>
            )}
          </div>
          <div className="hidden md:flex items-center gap-2">
            <button onClick={onToggleMute} className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 border border-white/10" title={isMuted ? 'Unmute' : 'Mute'}>
              {isMuted || volumePercent === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={volumePercent}
              onChange={(e) => onVolumeChange(parseInt(e.target.value))}
              className="w-28 h-2 accent-emerald-400 bg-white/10 rounded-lg"
            />
          </div>

          {/* A-B loop */}
          <div className="hidden md:flex items-center gap-1">
            <button onClick={onMarkA} className={`px-2 py-1 rounded-lg text-[11px] border ${aPoint !== null ? 'border-emerald-400 text-emerald-300 bg-emerald-400/10' : 'border-white/10 text-gray-300 hover:text-white hover:bg-white/5'}`} title="Mark A">
              A
            </button>
            <button onClick={onMarkB} className={`px-2 py-1 rounded-lg text-[11px] border ${bPoint !== null ? 'border-emerald-400 text-emerald-300 bg-emerald-400/10' : 'border-white/10 text-gray-300 hover:text-white hover:bg-white/5'}`} title="Mark B">
              B
            </button>
            <button onClick={onClearAB} className="px-2 py-1 rounded-lg text-[11px] border border-white/10 text-gray-300 hover:text-white hover:bg-white/5" title="Clear A-B">
              <X className="w-3.5 h-3.5" />
            </button>
            {(aPoint !== null || bPoint !== null) && (
              <span className="ml-1 text-[10px] text-emerald-300 flex items-center gap-1" title="Loop enabled">
                <FlagTriangleRight className="w-3.5 h-3.5" /> Loop
              </span>
            )}
          </div>

          {/* Sleep timer */}
          <div className="relative hidden md:block">
            <button onClick={() => setShowSleepMenu((v) => !v)} className={`px-2.5 py-2 rounded-lg border ${sleepMinutesLeft !== null ? 'border-emerald-400 text-emerald-300 bg-emerald-400/10' : 'border-white/10 text-gray-300 hover:text-white hover:bg-white/5'}`} title="Sleep timer">
              <div className="flex items-center gap-1">
                <Timer className="w-5 h-5" />
                <span className="text-xs">{sleepMinutesLeft !== null ? `${sleepMinutesLeft}m` : 'Sleep'}</span>
              </div>
            </button>
            {showSleepMenu && (
              <div className="absolute right-0 bottom-full mb-2 w-36 bg-[#0B0F14] border border-white/10 rounded-xl shadow-xl p-2 space-y-1 z-50">
                {[15, 30, 60].map((m) => (
                  <button key={m} onClick={() => { onSetSleep(m); setShowSleepMenu(false); }} className="w-full px-3 py-2 rounded-lg text-sm text-gray-200 hover:bg-white/5 text-left">
                    {m} minutes
                  </button>
                ))}
                <button onClick={() => { onCancelSleep(); setShowSleepMenu(false); }} className="w-full px-3 py-2 rounded-lg text-sm text-red-300 hover:bg-white/5 text-left">
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumPlayer;
