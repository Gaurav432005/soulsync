import React, { useEffect, useState, useRef } from 'react';
import YouTube from 'react-youtube';
import { Play, Pause, SkipForward, SkipBack } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

const MusicPlayer = () => {
  const { 
    currentSong, isPlaying, setIsPlaying, togglePlay, playNext, playPrev, 
    progress, setProgress, duration, setDuration, seekTo, playerRef 
  } = usePlayer();

  const [isBuffering, setIsBuffering] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  // 1. Logic to Reset & Sync Time
  useEffect(() => {
    let interval;
    if (isPlaying && playerRef.current && !isDragging) {
      interval = setInterval(() => {
        try {
            const currentTime = playerRef.current.getCurrentTime();
            const totalTime = playerRef.current.getDuration();
            
            // Force update duration if it wasn't captured earlier
            if (totalTime && totalTime > 0) {
                setDuration(totalTime);
            }
            
            if (currentTime !== undefined) {
                setProgress(currentTime);
            }
        } catch(e) {}
      }, 500); // Standard speed (Safe & Smooth)
    }
    return () => clearInterval(interval);
  }, [isPlaying, playerRef, isDragging, setDuration, setProgress]);

  // 2. YouTube Handlers
  const onReady = (event) => {
    playerRef.current = event.target;
    setIsBuffering(false);
    setDuration(event.target.getDuration());
    event.target.playVideo();
  };

  const onStateChange = (event) => {
    if (event.data === 1) { setIsPlaying(true); setIsBuffering(false); }
    if (event.data === 2) { setIsPlaying(false); setIsBuffering(false); }
    if (event.data === 3) setIsBuffering(true);
    if (event.data === 0) playNext();
  };

  // 3. Slider Dragging Logic
  const handleSeekChange = (e) => {
    setIsDragging(true);
    setProgress(parseFloat(e.target.value));
  };

  const handleSeekEnd = (e) => {
    setIsDragging(false);
    seekTo(parseFloat(e.target.value));
  };

  // 4. Calculate Percentage (Simple Math)
  // Agar duration 0 hai to 0%, nahi to simple math
  const progressPercent = (duration && duration > 0) 
    ? (progress / duration) * 100 
    : 0;

  if (!currentSong) return null;

  return (
    <>
      <div className="hidden">
        <YouTube 
          videoId={currentSong.youtubeId} 
          opts={{ 
            height: '0', width: '0', 
            playerVars: { autoplay: 1, controls: 0, playsinline: 1, origin: window.location.origin } 
          }}
          onReady={onReady}
          onStateChange={onStateChange}
        />
      </div>

      {/* PLAYER UI */}
      <div className="fixed bottom-[56px] md:bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 z-50 md:pl-64 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
        
        {/* =======================
            PERFECT TIMELINE
        ======================= */}
        <div className="absolute -top-[6px] left-0 w-full h-5 group cursor-pointer flex items-center select-none">
           
           {/* Invisible Touch Input (Controls the logic) */}
           <input 
              type="range" 
              min="0" 
              max={duration || 100} // Ensure max is never 0
              value={progress} 
              onChange={handleSeekChange}
              onMouseUp={handleSeekEnd}
              onTouchEnd={handleSeekEnd}
              className="absolute inset-0 w-full h-full opacity-0 z-30 cursor-pointer"
            />

           {/* Gray Background Line */}
           <div className="w-full h-[3px] bg-gray-200 absolute top-[9px] left-0 pointer-events-none"></div>

           {/* Black Active Line */}
           <div 
             className="h-[3px] bg-black absolute top-[9px] left-0 pointer-events-none"
             style={{ width: `${progressPercent}%` }}
           ></div>

           {/* Black Circle (Thumb) */}
           <div 
             className="absolute top-[10px] w-3 h-3 bg-black rounded-full shadow-md z-20 pointer-events-none"
             style={{ 
                 left: `${progressPercent}%`,
                 transform: `translate(-50%, -50%)` // Center align
             }}
           />
        </div>

        {/* CONTROLS AREA */}
        <div className="flex items-center justify-between px-4 py-2 md:px-6 md:py-3 h-16">
          
          {/* Song Info */}
          <div className="flex items-center gap-3 flex-1 overflow-hidden pr-4">
             <div className="relative w-10 h-10 md:w-12 md:h-12 shrink-0">
               <img 
                 src={currentSong.thumbnail} 
                 className={`w-full h-full rounded-lg object-cover shadow-sm border border-gray-100 ${isPlaying ? 'animate-pulse-slow' : ''}`}
                 alt=""
               />
             </div>
             <div className="min-w-0 flex flex-col justify-center">
               <h4 className="font-bold text-sm text-gray-900 truncate">
                 {currentSong.title}
               </h4>
               <p className="text-xs text-gray-500 truncate">
                 {currentSong.author}
               </p>
             </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-4 md:gap-6">
             <button onClick={playPrev} className="text-gray-400 hover:text-black active:scale-95 transition-transform p-1">
               <SkipBack size={22} fill="currentColor" />
             </button>

             <button 
               onClick={togglePlay} 
               className="w-10 h-10 md:w-12 md:h-12 bg-black text-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg"
             >
               {isBuffering ? (
                 <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
               ) : (
                 isPlaying ? <Pause size={18} fill="white" /> : <Play size={18} fill="white" className="ml-1"/>
               )}
             </button>

             <button onClick={playNext} className="text-gray-900 hover:text-gray-600 active:scale-95 transition-transform p-1">
               <SkipForward size={22} fill="currentColor"/>
             </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default MusicPlayer;