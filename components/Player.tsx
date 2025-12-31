
import React, { useState, useEffect, useRef } from 'react';
import { Track } from '../types';
import { Play, Pause, SkipBack, SkipForward, Volume2, Repeat, Shuffle, AlertCircle } from 'lucide-react';
import Visualizer from './Visualizer';

interface PlayerProps {
  track: Track | null;
  onNext: () => void;
  onPrevious: () => void;
}

const Player: React.FC<PlayerProps> = ({ track, onNext, onPrevious }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [error, setError] = useState<string | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const isInitialMount = useRef(true);

  // Initialize Audio Context and Analyser
  const initAudioContext = () => {
    if (!audioCtxRef.current && audioRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      const src = ctx.createMediaElementSource(audioRef.current);
      const anal = ctx.createAnalyser();
      src.connect(anal);
      anal.connect(ctx.destination);
      anal.fftSize = 256;
      audioCtxRef.current = ctx;
      setAnalyser(anal);
    }
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  useEffect(() => {
    if (track && audioRef.current) {
      setError(null);
      
      // Force the audio element to reload the new source
      audioRef.current.load();

      // Don't auto-play on the very first mount of the component
      if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
      }

      const attemptPlay = async () => {
        if (!audioRef.current) return;
        try {
          initAudioContext();
          playPromiseRef.current = audioRef.current.play();
          if (playPromiseRef.current) {
            await playPromiseRef.current;
            setIsPlaying(true);
          }
        } catch (e) {
          // Only log if it's not a standard abort (which happens when switching tracks quickly)
          if ((e as Error).name !== 'AbortError') {
            console.log("Playback failed or was prevented:", e);
          }
          setIsPlaying(false);
        } finally {
          playPromiseRef.current = null;
        }
      };

      attemptPlay();
    }
  }, [track]);

  const togglePlay = async () => {
    if (!audioRef.current || !track) return;

    if (isPlaying) {
      try {
        if (playPromiseRef.current) {
          await playPromiseRef.current;
        }
        audioRef.current.pause();
        setIsPlaying(false);
      } catch (e) {
        console.error("Pause failed:", e);
      }
    } else {
      initAudioContext();
      try {
        // Ensure source is loaded if somehow it wasn't
        if (audioRef.current.readyState === 0) {
          audioRef.current.load();
        }
        playPromiseRef.current = audioRef.current.play();
        await playPromiseRef.current;
        setIsPlaying(true);
        setError(null);
      } catch (e) {
        console.error("Manual play failed:", e);
        setError("Unable to play this source.");
      } finally {
        playPromiseRef.current = null;
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleAudioError = () => {
    console.error("Audio source error detected");
    setError("Failed to load audio source.");
    setIsPlaying(false);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!track) return null;

  // Calculate progress percentage for mobile bar
  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 glass border-t border-slate-800 z-50">
      <audio
        ref={audioRef}
        src={track.url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={onNext}
        onError={handleAudioError}
        preload="auto"
      />
      
      {/* Mobile Progress Bar (Top Edge) */}
      <div className="md:hidden absolute top-0 left-0 right-0 h-1 bg-slate-800">
        <div 
          className="h-full bg-blue-500 transition-all duration-300" 
          style={{ width: `${progressPercent}%` }}
        />
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={handleSeek}
          className="absolute inset-0 w-full h-4 -top-2 opacity-0 cursor-pointer"
        />
      </div>

      <div className="max-w-7xl mx-auto flex flex-col md:grid md:grid-cols-3 gap-0 md:gap-4 items-center p-2 md:p-6">
        {/* Track Info */}
        <div className="flex items-center space-x-3 w-full md:w-auto overflow-hidden">
          <div className="relative flex-shrink-0">
            <img 
              src={track.coverArt} 
              alt={track.name} 
              className={`w-12 h-12 md:w-16 md:h-16 rounded-lg object-cover shadow-lg shadow-blue-500/10 border transition-colors ${error ? 'border-red-500/50' : 'border-slate-700'}`}
            />
            {error && (
              <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-1 shadow-lg" title={error}>
                <AlertCircle size={10} className="text-white" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className={`font-semibold truncate text-sm md:text-lg font-display ${error ? 'text-red-400' : 'text-white'}`}>{track.name}</h3>
            <p className="text-slate-400 text-xs md:text-sm truncate">{track.artist}</p>
          </div>
          
          {/* Mobile Controls embedded in the row */}
          <div className="flex md:hidden items-center space-x-3 ml-2">
            <button onClick={onPrevious} className="text-slate-300 hover:text-white p-1"><SkipBack size={20} /></button>
            <button 
              onClick={togglePlay}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${error ? 'bg-slate-700 text-slate-500' : 'bg-white text-slate-900'}`}
              disabled={!!error}
            >
              {isPlaying ? <Pause fill="currentColor" size={20} /> : <Play fill="currentColor" size={20} className="ml-1" />}
            </button>
            <button onClick={onNext} className="text-slate-300 hover:text-white p-1"><SkipForward size={20} /></button>
          </div>
        </div>

        {/* Desktop Controls */}
        <div className="hidden md:flex flex-col items-center space-y-2 w-full">
          <div className="flex items-center space-x-6">
            <button className="text-slate-400 hover:text-white transition-colors"><Shuffle size={18} /></button>
            <button onClick={onPrevious} className="text-slate-300 hover:text-white transition-colors"><SkipBack size={24} /></button>
            <button 
              onClick={togglePlay}
              className={`w-12 h-12 flex items-center justify-center rounded-full transition-all ${error ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-900 hover:scale-105'}`}
              disabled={!!error}
            >
              {isPlaying ? <Pause fill="currentColor" size={24} /> : <Play fill="currentColor" size={24} className="ml-1" />}
            </button>
            <button onClick={onNext} className="text-slate-300 hover:text-white transition-colors"><SkipForward size={24} /></button>
            <button className="text-slate-400 hover:text-white transition-colors"><Repeat size={18} /></button>
          </div>
          
          <div className="w-full flex items-center space-x-3">
            <span className="text-xs text-slate-500 w-10 text-right">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <span className="text-xs text-slate-500 w-10">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Visualizer & Volume (Desktop Only) */}
        <div className="hidden md:flex flex-col items-end space-y-3 w-full">
          <Visualizer analyser={analyser} isPlaying={isPlaying && !error} />
          <div className="flex items-center space-x-3 w-32">
            <Volume2 size={18} className="text-slate-500" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setVolume(v);
                if (audioRef.current) audioRef.current.volume = v;
              }}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Player;
