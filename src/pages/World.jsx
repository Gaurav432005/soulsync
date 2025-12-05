import React, { useState, useEffect } from "react";
import {
  collectionGroup,
  query,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { Search, Play, Pause, Globe } from "lucide-react";
import { db } from "../firebase";
import { usePlayer } from "../context/PlayerContext";

const World = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [worldSongs, setWorldSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  const { currentSong, playSong, isPlaying, togglePlay } = usePlayer();

  // -------------------------------------------
  // 🔥 FETCH GLOBAL SONGS
  // -------------------------------------------
  useEffect(() => {
    const q = query(
      collectionGroup(db, "favourites"),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setWorldSongs(fetched);
        setLoading(false);
      },
      (err) => {
        console.error("🔥 Firestore Index Error", err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  // -------------------------------------------
  // 🔥 SEARCH SAFE FILTER
  // -------------------------------------------
  const filteredSongs = worldSongs.filter((song) =>
    (song.title || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-white text-black">

      {/* ------------------------------------------- */}
      {/* 🔥 HEADER */}
      {/* ------------------------------------------- */}
      <div className="px-6 py-6 shrink-0 border-b border-gray-100 bg-white/95 backdrop-blur-sm z-10">
        <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Globe size={24} /> Global Feed
        </h1>

        <div className="relative">
          <input
            type="text"
            placeholder="Search global songs..."
            className="w-full bg-gray-100 border-none outline-none pl-10 pr-4 py-3 rounded-xl text-sm font-medium focus:ring-2 focus:ring-black/5 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
        </div>
      </div>

      {/* ------------------------------------------- */}
      {/* 🔥 SONG LIST */}
      {/* ------------------------------------------- */}
      <div className="flex-1 overflow-y-auto px-6 py-4 pb-32">

        {loading ? (
          <div className="flex justify-center py-20 text-gray-400 text-sm">
            Loading world...
          </div>
        ) : filteredSongs.length === 0 ? (
          <div className="text-center py-20 text-gray-400">No songs found.</div>
        ) : (
          <div className="space-y-2">
            {filteredSongs.map((song, i) => {
              const isCurrent = currentSong?.youtubeId === song.youtubeId;

              // CLEAN QUEUE for PlayerContext
              const cleanedQueue = filteredSongs.map((s) => ({
                youtubeId: s.youtubeId,
                title: s.title,
                thumbnail: s.thumbnail,
              }));

              // 🔥 Single handler for play/pause
              const handlePlay = (e) => {
                e.stopPropagation();

                if (isCurrent) togglePlay();
                else playSong(
                  {
                    youtubeId: song.youtubeId,
                    title: song.title,
                    thumbnail: song.thumbnail,
                  },
                  cleanedQueue,
                  "World"
                );
              };

              return (
                <div
                  key={`${song.youtubeId}-${i}`}
                  className={`flex items-center justify-between p-3 rounded-xl group transition-colors cursor-pointer w-full ${
                    isCurrent
                      ? "bg-gray-100 border border-gray-200"
                      : "hover:bg-gray-50"
                  }`}
                  onClick={handlePlay}
                >
                  {/* ------------------------------------------- */}
                  {/* LEFT SIDE */}
                  {/* ------------------------------------------- */}
                  <div className="flex items-center gap-3 flex-1 min-w-0 mr-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg overflow-hidden shrink-0">
                      <img
                        src={song.thumbnail || "/fallback.jpg"}
                        onError={(e) => (e.target.src = "/fallback.jpg")}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4
                        className={`font-bold text-sm truncate ${
                          isCurrent ? "text-black" : "text-gray-900"
                        }`}
                      >
                        {song.title}
                      </h4>
                      <p className="text-xs text-gray-500 truncate">Global</p>
                    </div>
                  </div>

                  {/* ------------------------------------------- */}
                  {/* PLAY / PAUSE BUTTON */}
                  {/* ------------------------------------------- */}
                  <button
                    onClick={handlePlay}
                    className={`shrink-0 w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                      isCurrent
                        ? "bg-black border-black text-white"
                        : "border-gray-200 text-black opacity-0 group-hover:opacity-100 hover:bg-black hover:text-white hover:border-black"
                    }`}
                  >
                    {isCurrent && isPlaying ? (
                      <Pause size={14} />
                    ) : (
                      <Play size={14} />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default World;
