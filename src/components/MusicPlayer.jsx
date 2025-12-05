import React, { useEffect, useState, useRef } from "react";
import YouTube from "react-youtube";
import { Play, Pause, SkipForward, SkipBack } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";

const MusicPlayer = () => {
  const {
    currentSong,
    isPlaying,
    setIsPlaying,
    togglePlay,
    playNext,
    playPrev,
    queue
  } = usePlayer();

  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  const playerRef = useRef(null);

  const hasNavigation = queue?.length > 1;

  /* ---------------------------------------
     MEDIA SESSION API
  --------------------------------------- */
  useEffect(() => {
    if (!currentSong || !("mediaSession" in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title,
      artist: currentSong.author || "SoulSync",
      artwork: [
        { src: currentSong.thumbnail, sizes: "96x96", type: "image/jpeg" },
        { src: currentSong.thumbnail, sizes: "512x512", type: "image/jpeg" }
      ]
    });

    navigator.mediaSession.setActionHandler("play", () => {
      setIsPlaying(true);
      playerRef.current?.playVideo();
    });

    navigator.mediaSession.setActionHandler("pause", () => {
      setIsPlaying(false);
      playerRef.current?.pauseVideo();
    });

    navigator.mediaSession.setActionHandler("previoustrack", () => {
      if (hasNavigation) playPrev();
    });

    navigator.mediaSession.setActionHandler("nexttrack", () => {
      if (hasNavigation) playNext();
    });

  }, [currentSong, setIsPlaying, playPrev, playNext, hasNavigation]);

  /* ---------------------------------------
    SYNC PLAY/PAUSE
  --------------------------------------- */
  useEffect(() => {
    if (!playerRef.current) return;
    if (isPlaying) playerRef.current.playVideo();
    else playerRef.current.pauseVideo();
  }, [isPlaying]);

  /* ---------------------------------------
    UPDATE PROGRESS
  --------------------------------------- */
  useEffect(() => {
    let interval;

    if (isPlaying && !isDragging) {
      interval = setInterval(() => {
        if (!playerRef.current) return;

        try {
          const c = playerRef.current.getCurrentTime();
          const d = playerRef.current.getDuration();
          if (!isNaN(c)) setProgress(c);
          if (!isNaN(d) && d > 0) setDuration(d);
        } catch {}
      }, 800);
    }

    return () => clearInterval(interval);
  }, [isPlaying, isDragging]);

  /* ---------------------------------------
    PLAYER HANDLERS
  --------------------------------------- */
  const onReady = (event) => {
    playerRef.current = event.target;
    setDuration(event.target.getDuration() || 0);
    setIsBuffering(false);

    if (isPlaying) event.target.playVideo();
  };

  const onStateChange = (event) => {
    const s = event.data;

    if (s === 1) {
      setIsPlaying(true);
      setIsBuffering(false);
    }

    if (s === 2) {
      setIsPlaying(false);
      setIsBuffering(false);
    }

    if (s === 3) {
      setIsBuffering(true);
    }

    if (s === 0) {
      playNext();
    }
  };

  /* ---------------------------------------
    SLIDER LOGIC
  --------------------------------------- */
  const handleSeekChange = (e) => {
    setIsDragging(true);
    setProgress(Number(e.target.value));
  };

  const handleSeekEnd = (e) => {
    const newTime = Number(e.target.value);
    playerRef.current?.seekTo(newTime, true);
    setIsDragging(false);
    setProgress(newTime);
  };

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  if (!currentSong) return null;

  return (
    <>
      {/* Hidden YouTube Player */}
      <div className="hidden">
        <YouTube
          videoId={currentSong.youtubeId}
          opts={{
            height: "0",
            width: "0",
            playerVars: {
              autoplay: 1,
              controls: 0,
              playsinline: 1,
              origin: window.location.origin
            }
          }}
          onReady={onReady}
          onStateChange={onStateChange}
        />
      </div>

      {/* Music Player UI */}
      <div className="fixed bottom-[65px] md:bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 z-50 md:pl-64 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">

        {/* PROGRESS BAR */}
        <div className="absolute -top-[6px] left-0 w-full h-5 group flex items-center cursor-pointer select-none">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={progress}
            onChange={handleSeekChange}
            onMouseUp={handleSeekEnd}
            onTouchEnd={handleSeekEnd}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
          />

          <div className="w-full h-[3px] bg-gray-200 absolute top-[9px]" />

          <div
            className="h-[3px] bg-black absolute transition-all"
            style={{ width: `${progressPercent}%` }}
          />

          <div
            className="absolute top-[10px] w-3 h-3 bg-black rounded-full shadow z-30 transition-all"
            style={{
              left: `${progressPercent}%`,
              transform: "translate(-50%, -50%)"
            }}
          />
        </div>

        {/* CONTROLS */}
        <div className="flex items-center justify-between px-4 py-2 md:px-6 md:py-3 h-16">

          {/* Song Info */}
          <div className="flex items-center gap-3 flex-1 pr-4 min-w-0">
            <div className="w-10 h-10 md:w-12 md:h-12 shrink-0">
              <img
                src={currentSong.thumbnail}
                alt=""
                className={`w-full h-full rounded-lg object-cover border shadow-sm ${
                  isPlaying ? "animate-pulse-slow" : ""
                }`}
              />
            </div>

            <div className="min-w-0 flex flex-col">
              <h4 className="font-bold text-sm text-gray-900 truncate">
                {currentSong.title}
              </h4>
              <p className="text-xs text-gray-500 truncate">
                {currentSong.author || "Unknown"}
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-4 md:gap-6">
            {/* Prev */}
            <button
              onClick={playPrev}
              disabled={!hasNavigation}
              className={`p-1 transition ${
                hasNavigation
                  ? "text-gray-900 hover:text-black active:scale-95"
                  : "text-gray-300 cursor-not-allowed"
              }`}
            >
              <SkipBack size={22} />
            </button>

            {/* Play / Pause */}
            <button
              onClick={togglePlay}
              className="w-10 h-10 md:w-12 md:h-12 bg-black text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition"
            >
              {isBuffering ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause size={18} />
              ) : (
                <Play size={18} className="ml-1" />
              )}
            </button>

            {/* Next */}
            <button
              onClick={playNext}
              disabled={!hasNavigation}
              className={`p-1 transition ${
                hasNavigation
                  ? "text-gray-900 hover:text-black active:scale-95"
                  : "text-gray-300 cursor-not-allowed"
              }`}
            >
              <SkipForward size={22} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default MusicPlayer;
