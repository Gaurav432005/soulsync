import React, { useState, useEffect } from 'react';
import { Search, Play, X, PlusCircle, Check, ListMusic, User, Trash2 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { addDoc, deleteDoc, doc, collection, serverTimestamp, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'react-hot-toast';

const Home = () => {
  const { playSong, queue, currentSong } = usePlayer(); 
  const { currentUser } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]); 
  const [myFeed, setMyFeed] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null); // Used for loading state of Add/Remove

  const [activeTab, setActiveTab] = useState('library');

  useEffect(() => {
    if (queue.length > 1) {
        setActiveTab('queue');
    }
  }, [queue.length]);

  const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY; 

  // Fetch Library
  useEffect(() => {
    if (!currentUser) return;
    const fetchFeed = async () => {
      try {
        const q = query(
          collection(db, "users", currentUser.uid, "favourites"), 
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        const songs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setMyFeed(songs);
      } catch (error) {
        console.error("Feed error:", error);
      }
    };
    fetchFeed();
  }, [currentUser]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoading(true);
    setResults([]);
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(searchQuery)}&type=video&key=${API_KEY}`
      );
      if (!response.ok) throw new Error("API Limit");
      const data = await response.json();
      const formattedResults = data.items
        .filter(item => item.id.videoId)
        .map(item => ({
          id: item.id.videoId,
          title: item.snippet.title,
          author: item.snippet.channelTitle,
          thumbnail: item.snippet.thumbnails.default.url
        }));
      setResults(formattedResults);
    } catch (error) {
      setTimeout(() => {
        setResults([
          { id: "jfKfPfyJRdk", title: "lofi hip hop radio", author: "Lofi Girl", thumbnail: "https://img.youtube.com/vi/jfKfPfyJRdk/default.jpg" },
        ]);
      }, 500);
    } finally {
      setLoading(false);
    }
  };

  // --- ADD SONG ---
  const addToLibrary = async (song) => {
    setProcessingId(song.id);
    const toastId = toast.loading("Adding...");
    try {
      // Create new doc
      const docRef = await addDoc(collection(db, "users", currentUser.uid, "favourites"), {
        youtubeId: song.id,
        title: song.title,
        thumbnail: song.thumbnail,
        author: song.author,
        createdAt: serverTimestamp()
      });
      
      // Update local state immediately
      setMyFeed(prev => [{...song, youtubeId: song.id, id: docRef.id, createdAt: new Date()}, ...prev]);
      toast.success("Added to library", { id: toastId });
    } catch (error) {
      toast.error("Failed to add song", { id: toastId });
    }
    setProcessingId(null);
  };

  // --- REMOVE SONG ---
  const removeFromLibrary = async (songId, youtubeId) => {
    // We need the Firestore Document ID to delete.
    // If passed from Search Results, we might only have youtubeId, so we find the docId.
    let docId = songId;
    
    if (!docId && youtubeId) {
        const foundSong = myFeed.find(s => s.youtubeId === youtubeId);
        if (foundSong) docId = foundSong.id;
    }

    if (!docId) return;

    setProcessingId(docId); // Show loading
    const toastId = toast.loading("Removing...");
    
    try {
        await deleteDoc(doc(db, "users", currentUser.uid, "favourites", docId));
        
        // Remove from local state
        setMyFeed(prev => prev.filter(s => s.id !== docId));
        toast.success("Removed from library", { id: toastId });
    } catch (error) {
        console.error(error);
        toast.error("Failed to remove", { id: toastId });
    }
    setProcessingId(null);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setResults([]);
  };

  const getFirstName = () => currentUser?.displayName ? currentUser.displayName.split(' ')[0] : 'Soul';

  const displayList = activeTab === 'queue' ? queue : myFeed;

  return (
    <div className="h-full flex flex-col bg-white">
      
      {/* HEADER */}
      <div className="shrink-0 p-4 md:p-8 pb-2 z-10 bg-white border-b border-gray-50">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-black">
              Hi, {getFirstName()} 👋
            </h1>
            
            <div className="flex bg-gray-100 p-1 rounded-full">
                <button 
                    onClick={() => setActiveTab('library')}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeTab === 'library' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <User size={14} /> Library
                </button>
                <button 
                    onClick={() => setActiveTab('queue')}
                    disabled={queue.length === 0}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeTab === 'queue' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600 disabled:opacity-30'}`}
                >
                    <ListMusic size={14} /> Now Playing
                </button>
            </div>
          </div>

          <form onSubmit={handleSearch} className="relative w-full">
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search songs..." 
              className="w-full bg-gray-100 border-none text-black pl-10 pr-10 py-3 rounded-xl outline-none focus:bg-white focus:ring-1 focus:ring-black transition-all text-sm font-medium"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            {searchQuery && (
              <button type="button" onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-black">
                <X size={16} />
              </button>
            )}
          </form>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-2">
        <div className="max-w-4xl mx-auto pb-24">
            
            {/* SEARCH RESULTS */}
            {(loading || results.length > 0) && (
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mb-8">
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                    <span className="text-xs font-bold uppercase text-gray-500">Search Results</span>
                    <button onClick={clearSearch} className="text-xs font-bold text-red-500">CLOSE</button>
                </div>
                <div className="divide-y divide-gray-50">
                    {results.map((item) => {
                    // Check if song is already in library
                    const isAlreadyAdded = myFeed.some(song => song.youtubeId === item.id);
                    // Find Firestore ID if added
                    const firestoreId = isAlreadyAdded ? myFeed.find(s => s.youtubeId === item.id)?.id : null;

                    return (
                        <div key={item.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer group" onClick={() => playSong({ youtubeId: item.id, ...item })}>
                            <div className="relative w-12 h-12 shrink-0 rounded bg-gray-200 overflow-hidden">
                                <img src={item.thumbnail} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100"><Play size={14} fill="white" className="text-white"/></div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-sm text-gray-900 truncate" dangerouslySetInnerHTML={{__html: item.title}} />
                                <p className="text-xs text-gray-500 truncate">{item.author}</p>
                            </div>
                            
                            {/* TOGGLE ADD/REMOVE BUTTON */}
                            <button 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    if(isAlreadyAdded) removeFromLibrary(firestoreId, item.id);
                                    else addToLibrary(item);
                                }}
                                disabled={processingId === item.id || processingId === firestoreId}
                                className={`shrink-0 text-xs px-3 py-1.5 rounded-full flex items-center gap-1 transition-all ${
                                    isAlreadyAdded 
                                    ? "bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-600 font-bold" 
                                    : "bg-black text-white hover:opacity-80"
                                }`}
                            >
                                {isAlreadyAdded ? (
                                    // Hover pe text change karna complex hai React me bina extra state ke, 
                                    // to simply Added dikhate hai, click pe remove hoga.
                                    <><Check size={12}/> ADDED</>
                                ) : (
                                    (processingId === item.id) ? "..." : "ADD"
                                )}
                            </button>
                        </div>
                    );
                    })}
                </div>
                </div>
            )}

            {/* LIST: LIBRARY OR QUEUE */}
            {!loading && results.length === 0 && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between px-2 mb-2">
                        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                            {activeTab === 'queue' ? 'Current Queue' : 'Your Collection'}
                        </h2>
                        {activeTab === 'queue' && (
                            <span className="text-xs text-black font-medium bg-gray-100 px-2 py-0.5 rounded">Playing from World</span>
                        )}
                    </div>

                    <div className="divide-y divide-gray-50 border-t border-gray-100">

                        {displayList.map((song, index) => {
                            const isCurrent = currentSong?.youtubeId === song.youtubeId;
                            
                            return (
                                <div 
                                    key={`${song.id}-${index}`} 
                                    onClick={() => playSong(song, displayList)} 
                                    className={`flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer group rounded-xl transition-all ${isCurrent ? 'bg-purple-50 hover:bg-purple-100' : ''}`}
                                >
                                    <span className={`hidden md:block w-6 text-center text-xs font-medium group-hover:hidden ${isCurrent ? 'text-purple-600' : 'text-gray-400'}`}>
                                        {isCurrent ? <ListMusic size={14}/> : index + 1}
                                    </span>
                                    <div className="hidden md:group-hover:flex w-6 justify-center"><Play size={14} className="text-black" fill="black"/></div>
                                    
                                    <div className="relative w-12 h-12 shrink-0 rounded overflow-hidden bg-gray-200">
                                        <img src={song.thumbnail} className="w-full h-full object-cover" />
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <h3 className={`font-medium text-sm truncate ${isCurrent ? 'text-purple-700 font-bold' : 'text-gray-900'}`} dangerouslySetInnerHTML={{__html: song.title}} />
                                        <p className="text-xs text-gray-500 truncate">{song.author}</p>
                                    </div>

                                    {/* ACTIONS AREA */}
                                    <div className="flex items-center gap-2">
                                        {isCurrent && (
                                            <div className="flex gap-0.5 items-end h-3 mr-2">
                                                <div className="w-0.5 bg-purple-500 animate-[bounce_1s_infinite] h-2"></div>
                                                <div className="w-0.5 bg-purple-500 animate-[bounce_1.2s_infinite] h-3"></div>
                                                <div className="w-0.5 bg-purple-500 animate-[bounce_0.8s_infinite] h-1.5"></div>
                                            </div>
                                        )}

                                        {/* DELETE BUTTON (Only in Library Tab) */}
                                        {activeTab === 'library' && (
                                            <button 
                                                onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    removeFromLibrary(song.id, song.youtubeId); 
                                                }}
                                                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {displayList.length === 0 && (
                            <div className="py-10 text-center text-gray-400 text-sm">
                                {activeTab === 'library' ? "Start adding songs!" : "Queue is empty."}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Home;