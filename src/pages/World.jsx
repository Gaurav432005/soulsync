import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import Avatar from '../components/Avatar';
import { Play, ChevronRight, Music, ArrowLeft, Loader2 } from 'lucide-react';

const World = () => {
  const { currentUser } = useAuth();
  const { playSong } = usePlayer();
  
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [playlist, setPlaylist] = useState([]);
  const [loadingPlaylist, setLoadingPlaylist] = useState(false);

  // 1. Fetch Users (Realtime)
  useEffect(() => {
    // Limit to 50 active users to prevent heavy load
    const q = query(collection(db, "users"), limit(50));
    
    const unsub = onSnapshot(q, (snapshot) => {
      const allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Filter out self
      const filtered = allUsers.filter(u => u.id !== currentUser?.uid);
      setUsers(filtered);
    });
    
    return unsub;
  }, [currentUser]);

  // 2. Handle User Click -> Fetch their playlist
  const handleUserSelect = async (user) => {
    setSelectedUser(user);
    setLoadingPlaylist(true);
    setPlaylist([]); // Clear old list immediately for better UX
    
    try {
      const q = query(
        collection(db, "users", user.id, "favourites"), 
        orderBy("createdAt", "desc"), 
        limit(50)
      );
      const snap = await getDocs(q);
      const songs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPlaylist(songs);
    } catch (err) {
      console.error("Error fetching playlist:", err);
    }
    setLoadingPlaylist(false);
  };

  // 3. Play All Logic
  const playEntirePlaylist = () => {
    if (playlist.length > 0) {
      playSong(playlist[0], playlist); // Pass entire queue for random shuffle
    }
  };

  return (
    // MAIN CONTAINER: Page Locked, No Body Scroll
    <div className="h-full flex flex-col md:flex-row bg-white overflow-hidden">
      
      {/* =============================================
        LEFT PANEL: User List 
        Mobile: Hidden if user selected
        Desktop: Always visible (1/3 width)
        =============================================
      */}
      <div className={`
        ${selectedUser ? 'hidden md:flex' : 'flex'} 
        w-full md:w-1/3 border-r border-gray-200 flex-col bg-gray-50/50
      `}>
        {/* Fixed Header */}
        <div className="p-6 shrink-0 bg-white/80 backdrop-blur border-b border-gray-100 z-10">
          <h2 className="text-xl font-bold tracking-tight">World</h2>
          <p className="text-gray-500 text-sm">{users.length} vibes active</p>
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto pb-24 md:pb-0">
          {users.map(user => (
            <div 
              key={user.id} 
              onClick={() => handleUserSelect(user)}
              className={`p-4 flex items-center gap-4 cursor-pointer hover:bg-white transition-colors border-b border-gray-50 last:border-0 ${selectedUser?.id === user.id ? 'bg-white border-l-4 border-l-black' : 'border-l-4 border-l-transparent'}`}
            >
              <Avatar user={user} size="md" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{user.displayName || 'Anonymous'}</h3>
                <p className="text-xs text-gray-400 truncate">Tap to explore</p>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </div>
          ))}
          
          {users.length === 0 && (
            <div className="p-10 text-center text-gray-400">
               <Loader2 className="animate-spin mx-auto mb-2"/>
               <p className="text-xs">Finding people...</p>
            </div>
          )}
        </div>
      </div>

      {/* =============================================
        RIGHT PANEL: Playlist 
        Mobile: Full screen if selected
        Desktop: Full height (2/3 width)
        =============================================
      */}
      <div className={`
        ${!selectedUser ? 'hidden md:flex' : 'flex'} 
        flex-1 flex-col bg-white h-full relative
      `}>
        {selectedUser ? (
          <>
            {/* Header (Fixed at top of panel) */}
            <div className="shrink-0 p-4 md:p-8 border-b border-gray-100 bg-white z-10">
               {/* Mobile Back Button */}
               <button 
                  onClick={() => setSelectedUser(null)} 
                  className="md:hidden flex items-center gap-2 text-xs font-bold text-gray-400 mb-4 hover:text-black uppercase tracking-wider"
               >
                  <ArrowLeft size={14} /> Back to Users
               </button>

               <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <Avatar user={selectedUser} size="lg" />
                    <div>
                      <h1 className="text-xl md:text-2xl font-bold text-black">{selectedUser.displayName}</h1>
                      <p className="text-sm text-gray-500">{playlist.length} Tracks Shared</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={playEntirePlaylist}
                    disabled={playlist.length === 0}
                    className="bg-black text-white px-6 py-3 rounded-full font-medium hover:scale-105 transition-transform flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
                  >
                    <Play fill="white" size={18} /> Play All
                  </button>
               </div>
            </div>

            {/* Scrollable Playlist Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-40">
               {loadingPlaylist ? (
                 <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <Loader2 className="animate-spin mb-2" size={32}/>
                    <p>Loading vibes...</p>
                 </div>
               ) : playlist.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-gray-300">
                    <Music size={48} className="mb-4 opacity-20" />
                    <p>This user hasn't added any songs yet.</p>
                 </div>
               ) : (
                 <div className="space-y-2">
                   {playlist.map((song, idx) => (
                      <div 
                        key={song.id} 
                        onClick={() => playSong(song, playlist)}
                        className="group flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 cursor-pointer border border-transparent transition-all"
                      >
                        <span className="text-gray-300 font-bold w-6 text-center text-sm group-hover:hidden">{idx + 1}</span>
                        <div className="hidden group-hover:flex w-6 justify-center">
                           <Play size={16} fill="black"/>
                        </div>
                        
                        <div className="relative w-10 h-10 shrink-0 rounded overflow-hidden bg-gray-200">
                           <img src={song.thumbnail} className="w-full h-full object-cover" alt="" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 text-sm truncate">{song.title}</h4>
                          <p className="text-xs text-gray-500 truncate">{song.author}</p>
                        </div>
                      </div>
                   ))}
                 </div>
               )}
            </div>
          </>
        ) : (
          /* Empty State (Desktop) */
          <div className="h-full flex flex-col items-center justify-center text-gray-300 p-6 text-center bg-gray-50/30">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
               <Music size={40} className="text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Select a User</h3>
            <p className="max-w-xs mx-auto">Click on a profile from the left to explore their music collection.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default World;