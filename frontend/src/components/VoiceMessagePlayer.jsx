import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

const VoiceMessagePlayer = ({ src, className = "" }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const onLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const onTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const onEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleProgressChange = (e) => {
    const newTime = parseFloat(e.target.value);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = (currentTime / duration) * 100 || 0;

  return (
    <div className={`flex items-center gap-3 bg-slate-100 dark:bg-slate-800 rounded-full px-4 py-2 w-full max-w-sm shadow-sm border border-slate-200 dark:border-slate-700 ${className}`}>
      <audio
        ref={audioRef}
        src={src}
        onLoadedMetadata={onLoadedMetadata}
        onTimeUpdate={onTimeUpdate}
        onEnded={onEnded}
        hidden
      />
      
      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        type="button"
        className="w-8 h-8 flex items-center justify-center bg-teal-500 hover:bg-teal-600 text-white rounded-full transition-all shrink-0 shadow-md shadow-teal-500/20"
      >
        {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
      </button>

      {/* Progress Section */}
      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
        <div className="relative w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden group cursor-pointer">
          <input
            type="range"
            min="0"
            max={duration || 0}
            step="0.01"
            value={currentTime}
            onChange={handleProgressChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div 
            className="absolute top-0 left-0 h-full bg-teal-500 rounded-full transition-all duration-100"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className="flex justify-between items-center px-0.5">
          <span className="text-[10px] font-bold text-slate-500 tabular-nums">
            {formatTime(currentTime)}
          </span>
          <span className="text-[10px] font-bold text-slate-500 tabular-nums">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      <Volume2 size={14} className="text-slate-400 shrink-0 hidden sm:block" />
    </div>
  );
};

export default VoiceMessagePlayer;
