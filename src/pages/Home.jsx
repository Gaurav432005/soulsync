import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Play,
  Pause,
  X,
  Check,
  Trash2,
  ListMusic,
} from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { useAuth } from "../context/AuthContext";
import {
  addDoc,
  deleteDoc,
  doc,
  collection,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import { toast } from "react-hot-toast";

const Home = () => {
  const { playSong, isPlaying, togglePlay, queue, currentSong, queueSource } =
    usePlayer();
  const { currentUser } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState([]);
  const [myFeed, setMyFeed] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const [activeTab, setActiveTab] = useState("you");

  const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
  const searchAbortRef = useRef(null);

  // Auto-switch tab when queueSource changes (safer)
  useEffect(() => {
    if (!queueSource) return;
    setActiveTab(queueSource === "You" ? "you" : "other");
  }, [queueSource]);

  // -------------------------
  // Real-time myFeed (user's favourites)
  // -------------------------
  useEffect(() => {
    if (!currentUser) {
      setMyFeed([]);
      return;
    }

    const q = query(
      collection(db, "users", currentUser.uid, "favourites"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const songs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setMyFeed(songs);
      },
      (err) => {
        console.error("Feed snapshot error:", err);
      }
    );

    return () => unsub();
  }, [currentUser]);

  // -------------------------
  // Helper: make clean song / queue objects for PlayerContext
  // -------------------------
  const makeCleanSong = (s) => ({
    youtubeId: s.youtubeId || s.id || s.videoId,
    title: s.title || "",
    thumbnail: s.thumbnail || null,
    author: s.author || s.channelTitle || "",
    id: s.id || s.youtubeId || null,
  });

  const makeCleanQueue = (arr) =>
    arr.map((s) => ({
      youtubeId: s.youtubeId || s.id || s.videoId,
      title: s.title || "",
      thumbnail: s.thumbnail || null,
      author: s.author || s.channelTitle || "",
      id: s.id || s.youtubeId || null,
    }));

  // -------------------------
  // Search (triggered by form submit)
  // -------------------------
  const handleSearch = async (e) => {
    e?.preventDefault();
    const q = searchQuery?.trim();
    if (!q) {
      setResults([]);
      setActiveTab(queue.length ? "other" : "you");
      return;
    }

    if (!API_KEY) {
      toast.error("Missing YouTube API key (VITE_YOUTUBE_API_KEY).");
      return;
    }

    setLoading(true);
    setActiveTab("other");
    setResults([]);

    // Abort previous if any
    if (searchAbortRef.current) {
      try {
        searchAbortRef.current.abort();
      } catch {}
    }
    searchAbortRef.current = new AbortController();

    try {
      const resp = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=25&q=${encodeURIComponent(
          q
        )}&type=video&key=${API_KEY}`,
        { signal: searchAbortRef.current.signal }
      );

      if (!resp.ok) {
        throw new Error("YouTube API error");
      }

      const data = await resp.json();

      const formatted = (data.items || [])
        .filter((it) => it?.id?.videoId)
        .map((it) => {
          const thumb =
            (it.snippet?.thumbnails?.medium &&
              it.snippet.thumbnails.medium.url) ||
            (it.snippet?.thumbnails?.high && it.snippet.thumbnails.high.url) ||
            (it.snippet?.thumbnails?.default && it.snippet.thumbnails.default.url) ||
            null;

          return {
            // use youtubeId as unique identifier for UI & processing
            id: `yt-${it.id.videoId}`,
            youtubeId: it.id.videoId,
            title: it.snippet.title,
            author: it.snippet.channelTitle,
            thumbnail: thumb,
          };
        });

      setResults(formatted);
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Search failed:", err);
        toast.error("Search failed");
      }
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------
  // Add / Remove to Firestore
  // processingId is tracked by youtubeId
  // -------------------------
  const addToLibrary = async (item) => {
    if (!currentUser) return toast.error("Please login first");
    const youtubeId = item.youtubeId || item.id;
    if (!youtubeId) return;

    setProcessingId(youtubeId);
    const tId = toast.loading("Adding...");

    try {
      const ref = await addDoc(
        collection(db, "users", currentUser.uid, "favourites"),
        {
          youtubeId: youtubeId,
          title: item.title || "",
          thumbnail: item.thumbnail || null,
          author: item.author || "",
          createdAt: serverTimestamp(),
        }
      );

      // onSnapshot will update myFeed in realtime; but keep optimistic UI insertion
      setMyFeed((prev) => [
        {
          id: ref.id,
          youtubeId,
          title: item.title || "",
          thumbnail: item.thumbnail || null,
          author: item.author || "",
          createdAt: new Date(),
        },
        ...prev,
      ]);

      toast.success("Added", { id: tId });
    } catch (err) {
      console.error("Add failed:", err);
      toast.error("Failed to add", { id: tId });
    } finally {
      setProcessingId(null);
    }
  };

  const removeFromLibrary = async (docIdOrYoutubeId, youtubeIdIfAny) => {
    if (!currentUser) return toast.error("Please login first");

    // Accept either docId or youtubeId; prefer docId if looks like firestore id (no 'yt-' prefix)
    let docId = docIdOrYoutubeId;
    let youtubeId = youtubeIdIfAny || docIdOrYoutubeId;

    // If passed a youtubeId (starts with yt- or length 11), try to find docId from myFeed
    if (typeof docId === "string" && (docId.startsWith("yt-") || docId.length === 11)) {
      youtubeId = docId;
      const found = myFeed.find((s) => s.youtubeId === youtubeId || s.id === youtubeId);
      docId = found?.id;
    }

    if (!docId) {
      // nothing to delete
      toast.error("Item not found");
      return;
    }

    setProcessingId(youtubeId || docId);
    try {
      await deleteDoc(doc(db, "users", currentUser.uid, "favourites", docId));
      setMyFeed((prev) => prev.filter((s) => s.id !== docId));
      toast.success("Removed");
    } catch (err) {
      console.error("Remove failed:", err);
      toast.error("Failed to remove");
    } finally {
      setProcessingId(null);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setResults([]);
    // Keep active tab as-is (we don't force-switch)
  };

  const getFirstName = () =>
    currentUser?.displayName?.split?.(" ")?.[0] || "User";

  const getSecondTabLabel = () => {
    if (searchQuery) return "Results";
    if (queueSource && queueSource !== "You") return queueSource;
    return "Search";
  };

  // -------------------------
  // Helpers for rendering state
  // -------------------------
  const isAlreadyAdded = (youtubeId) =>
    myFeed.some((s) => s.youtubeId === youtubeId);

  // -------------------------
  // JSX
  // -------------------------
  return (
    <div className="h-full flex flex-col bg-white text-black">
      {/* HEADER */}
      <div className="shrink-0 p-4 z-10 bg-white border-b border-gray-50 flex flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Hi, {getFirstName()} 👋</h1>

        <form onSubmit={handleSearch} className="relative w-full">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search songs..."
            className="w-full bg-gray-50 border border-gray-100 text-black pl-10 pr-10 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-black/5 transition-all text-sm font-medium placeholder:text-gray-400"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />

          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-black"
            >
              <X size={16} />
            </button>
          )}
        </form>

        <div className="flex items-center justify-center bg-gray-100 p-1 rounded-full w-fit mx-auto transition-all">
          <button
            onClick={() => setActiveTab("you")}
            className={`flex items-center gap-2 px-8 py-2 rounded-full text-sm font-bold transition-all ${
              activeTab === "you" ? "bg-black text-white shadow-md" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            You
          </button>
          <button
            onClick={() => setActiveTab("other")}
            className={`flex items-center gap-2 px-8 py-2 rounded-full text-sm font-bold transition-all ${
              activeTab === "other" ? "bg-black text-white shadow-md" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {getSecondTabLabel()}
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto pb-24">
          {/* TAB: other (Search Results OR External Queue) */}
          {activeTab === "other" && (
            <div className="space-y-2 animate-fade-in">
              {/* CASE A: Search Results */}
              {searchQuery ? (
                <>
                  {loading && <div className="text-center py-10 text-gray-400">Searching...</div>}
                  {!loading && results.length === 0 && <div className="text-center py-10 text-gray-400 text-sm">No results found.</div>}

                  {results.map((item) => {
                    const youtubeId = item.youtubeId;
                    const already = isAlreadyAdded(youtubeId);
                    const isCurrent = currentSong?.youtubeId === youtubeId;

                    return (
                      <div
                        key={youtubeId}
                        className={`flex items-center justify-between p-3 rounded-xl cursor-pointer group transition-colors ${isCurrent ? "bg-gray-100 border border-gray-200" : "hover:bg-gray-50"}`}
                        onClick={() => {
                          const cleanSong = makeCleanSong(item);
                          const cleanQueue = makeCleanQueue(results);
                          if (isCurrent) togglePlay();
                          else playSong(cleanSong, cleanQueue, "Search");
                        }}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0 mr-4">
                          <div className="relative w-12 h-12 shrink-0 rounded-lg overflow-hidden bg-gray-200">
                            <img
                              src={item.thumbnail || "/fallback.jpg"}
                              onError={(e) => (e.target.src = "/fallback.jpg")}
                              className="w-full h-full object-cover"
                              alt={item.title || "thumbnail"}
                            />
                            {isCurrent && isPlaying ? (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <Pause size={16} />
                              </div>
                            ) : (
                              <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <Play size={16} />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className={`font-bold text-sm truncate ${isCurrent ? "text-black" : "text-gray-900"}`} dangerouslySetInnerHTML={{ __html: item.title }} />
                            <p className="text-xs text-gray-500 truncate">{item.author}</p>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const yt = item.youtubeId;
                            if (already) {
                              // find doc id from myFeed
                              const found = myFeed.find((s) => s.youtubeId === yt);
                              removeFromLibrary(found?.id || yt, yt);
                            } else {
                              addToLibrary(item);
                            }
                          }}
                          disabled={processingId === item.youtubeId}
                          className={`shrink-0 text-xs px-4 py-1.5 rounded-full flex items-center gap-1 transition-all ${already ? "bg-gray-100 text-black font-bold border border-gray-200" : "bg-black text-white hover:opacity-80"}`}
                        >
                          {already ? <Check size={14} /> : (processingId === item.youtubeId ? "..." : "ADD")}
                        </button>
                      </div>
                    );
                  })}
                </>
              ) : (
                // CASE B: Current Queue listing
                <div className=" divide-gray-50">
                  {queue.length > 0 ? (
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-2 px-2">
                      Current Queue: {queueSource || "Unknown"}
                    </div>
                  ) : (
                    <div className="text-center py-20 text-gray-400 text-sm">
                      Type above to search for new music.
                    </div>
                  )}

                  {queue.map((song, index) => {
                    const isCurrent = currentSong?.youtubeId === song.youtubeId;
                    const yt = song.youtubeId || song.id;
                    return (
                      <div
                        key={yt || index}
                        onClick={() => {
                          const cleanSong = makeCleanSong(song);
                          const cleanQueue = makeCleanQueue(queue);
                          if (isCurrent) togglePlay();
                          else playSong(cleanSong, cleanQueue, queueSource || "Queue");
                        }}
                        className={`flex items-center justify-between p-3 rounded-xl group transition-colors cursor-pointer w-full ${isCurrent ? "bg-gray-100 border border-gray-200" : "hover:bg-gray-50"}`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0 mr-4">
                          <div className="w-10 h-10 bg-gray-200 rounded-lg overflow-hidden shrink-0 relative">
                            <img src={song.thumbnail || "/fallback.jpg"} onError={(e) => (e.target.src = "/fallback.jpg")} className="w-full h-full object-cover" alt="" />
                            {isCurrent && isPlaying && <div className="absolute inset-0 bg-black/10 flex items-center justify-center"></div>}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className={`font-bold text-sm truncate ${isCurrent ? "text-black" : "text-gray-900"}`} dangerouslySetInnerHTML={{ __html: song.title }} />
                            <p className="text-xs text-gray-500 truncate">{song.author}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button className={`shrink-0 w-8 h-8 rounded-full border flex items-center justify-center transition-all ${isCurrent ? "bg-black border-black text-white" : "border-gray-200 text-black opacity-0 group-hover:opacity-100 hover:bg-black hover:text-white hover:border-black"}`}>
                            {isCurrent && isPlaying ? <Pause size={14} /> : <Play size={14} />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB: you (My Collection) */}
          {activeTab === "you" && (
            <div className="space-y-2 animate-fade-in">
              {myFeed.length === 0 ? (
                <div className="py-20 text-center text-gray-400 text-sm">
                  Your collection is empty. Switch tab to search!
                </div>
              ) : (
                <div className="divide-y divide-gray-50 border-t border-gray-100">
                  {myFeed.map((song, index) => {
                    const isCurrent = currentSong?.youtubeId === song.youtubeId;
                    const yt = song.youtubeId || song.id || `${index}`;

                    return (
                      <div
                        key={song.id || yt}
                        onClick={() => {
                          const cleanSong = makeCleanSong(song);
                          const cleanQueue = makeCleanQueue(myFeed);
                          if (isCurrent) togglePlay();
                          else playSong(cleanSong, cleanQueue, "You");
                        }}
                        className={`flex items-center justify-between p-3 rounded-xl group transition-colors cursor-pointer w-full ${isCurrent ? "bg-gray-100 border border-gray-200" : "hover:bg-gray-50"}`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0 mr-4">
                          <div className="w-10 h-10 bg-gray-200 rounded-lg overflow-hidden shrink-0 relative">
                            <img src={song.thumbnail || "/fallback.jpg"} onError={(e) => (e.target.src = "/fallback.jpg")} className="w-full h-full object-cover" alt="" />
                            {isCurrent && isPlaying && <div className="absolute inset-0 bg-black/10 flex items-center justify-center"></div>}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className={`font-bold text-sm truncate ${isCurrent ? "text-black" : "text-gray-900"}`} dangerouslySetInnerHTML={{ __html: song.title }} />
                            <p className="text-xs text-gray-500 truncate">{song.author}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFromLibrary(song.id, song.youtubeId);
                            }}
                            className="p-2 text-gray-400 hover:text-red-500 rounded-full transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
