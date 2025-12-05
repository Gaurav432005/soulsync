import { createContext, useContext, useState, useRef, useEffect } from "react";

const PlayerContext = createContext();
export const usePlayer = () => useContext(PlayerContext);

export const PlayerProvider = ({ children }) => {
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState([]);
  const [queueSource, setQueueSource] = useState(null);

  const playerRef = useRef(null);

  // ------------------------------------
  // 🔥 PLAY SONG (Perfect Behaviour)
  // ------------------------------------
  const playSong = (song, newQueue = [], sourceName = "Queue") => {
    // Agar same song par click kiya
    if (currentSong?.youtubeId === song.youtubeId) {
      setIsPlaying(true); // Resume
      return;
    }

    // New Song
    setCurrentSong(song);

    // Queue update only if new queue provided
    if (newQueue.length > 0) {
      setQueue(newQueue);
      setQueueSource(sourceName);
    }

    setIsPlaying(true);
  };

  // ------------------------------------
  // 🔥 PLAY / PAUSE
  // ------------------------------------
  const togglePlay = () => setIsPlaying((p) => !p);

  // ------------------------------------
  // 🔥 NEXT SONG
  // ------------------------------------
  const playNext = () => {
    if (!queue.length || !currentSong) return;

    const index = queue.findIndex((s) => s.youtubeId === currentSong.youtubeId);

    // If found & not last
    if (index !== -1 && index < queue.length - 1) {
      setCurrentSong(queue[index + 1]);
    } else {
      setCurrentSong(queue[0]); // Loop
    }

    setIsPlaying(true);
  };

  // ------------------------------------
  // 🔥 PREV SONG
  // ------------------------------------
  const playPrev = () => {
    if (!queue.length || !currentSong) return;

    const index = queue.findIndex((s) => s.youtubeId === currentSong.youtubeId);

    if (index > 0) {
      setCurrentSong(queue[index - 1]);
    } else {
      setCurrentSong(queue[queue.length - 1]); // Loop reverse
    }

    setIsPlaying(true);
  };

  // ------------------------------------
  // 🔥 AUTO PLAY when currentSong changes
  // ------------------------------------
  useEffect(() => {
    if (!playerRef.current) return;

    if (currentSong) {
      // Force load + autoplay
      playerRef.current.loadVideoById(currentSong.youtubeId);
      playerRef.current.playVideo();
    }
  }, [currentSong]);

  // ------------------------------------
  // 🔥 PLAY/PAUSE CONTROL
  // ------------------------------------
  useEffect(() => {
    if (!playerRef.current) return;

    if (isPlaying) {
      playerRef.current.playVideo();
    } else {
      playerRef.current.pauseVideo();
    }
  }, [isPlaying]);

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        setIsPlaying,
        queue,
        queueSource,
        playSong,
        togglePlay,
        playNext,
        playPrev,
        playerRef, // IMPORTANT for YouTube component
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};
