import { createContext, useContext, useState, useRef, useEffect } from "react";

const PlayerContext = createContext();
export const usePlayer = () => useContext(PlayerContext);

export const PlayerProvider = ({ children }) => {
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState([]); 
  const [progress, setProgress] = useState(0); 
  const [duration, setDuration] = useState(0); 
  const playerRef = useRef(null); 

  // --- 1. MEDIA SESSION API (LOCK SCREEN CONTROLS) ---
  useEffect(() => {
    if (!currentSong || !('mediaSession' in navigator)) return;

    // Metadata update (Lock screen Title/Artist/Image)
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title,
      artist: currentSong.author || "SoulSync",
      artwork: [
        { src: currentSong.thumbnail, sizes: '96x96', type: 'image/jpeg' },
        { src: currentSong.thumbnail, sizes: '128x128', type: 'image/jpeg' },
        { src: currentSong.thumbnail, sizes: '192x192', type: 'image/jpeg' },
        { src: currentSong.thumbnail, sizes: '512x512', type: 'image/jpeg' },
      ]
    });

    // Action Handlers (Control from Lock Screen / Headset)
    navigator.mediaSession.setActionHandler('play', togglePlay);
    navigator.mediaSession.setActionHandler('pause', togglePlay);
    navigator.mediaSession.setActionHandler('previoustrack', playPrev);
    navigator.mediaSession.setActionHandler('nexttrack', playNext);

  }, [currentSong]);

  const playSong = (song, newQueue = []) => {
    setCurrentSong(song);
    if (newQueue.length > 0) setQueue(newQueue);
    setIsPlaying(true);
  };

  const togglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
        playerRef.current.pauseVideo();
        setIsPlaying(false);
    } else {
        playerRef.current.playVideo();
        setIsPlaying(true);
    }
  };

  const playNext = () => {
    if (!queue.length || !currentSong) return;
    const currentIndex = queue.findIndex(s => s.youtubeId === currentSong.youtubeId);
    if (currentIndex < queue.length - 1) {
      setCurrentSong(queue[currentIndex + 1]);
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  };

  const playPrev = () => {
    if (!queue.length || !currentSong) return;
    const currentIndex = queue.findIndex(s => s.youtubeId === currentSong.youtubeId);
    if (currentIndex > 0) {
      setCurrentSong(queue[currentIndex - 1]);
      setIsPlaying(true);
    }
  };

  const seekTo = (seconds) => {
    if (playerRef.current) {
      playerRef.current.seekTo(seconds, true);
      setProgress(seconds);
    }
  };

  return (
    <PlayerContext.Provider value={{ 
      currentSong, isPlaying, setIsPlaying, 
      queue, playSong, togglePlay, playNext, playPrev,
      progress, setProgress, duration, setDuration, seekTo, playerRef 
    }}>
      {children}
    </PlayerContext.Provider>
  );
};