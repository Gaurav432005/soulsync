import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  limit,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import {
  Search,
  UserPlus,
  UserCheck,
  Play,
  ArrowLeft,
  Users,
  Music,
} from "lucide-react";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { usePlayer } from "../context/PlayerContext";
import Avatar from "../components/Avatar";
import toast from "react-hot-toast";

const Friends = () => {
  const { currentUser } = useAuth();
  const { playSong } = usePlayer();

  // Data States
  const [friends, setFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  // Selection States
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [friendPlaylist, setFriendPlaylist] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  // UI States
  const [showMobileProfile, setShowMobileProfile] = useState(false);

  // 1. Fetch My Following List (Real-time)
  useEffect(() => {
    if (!currentUser) {
      setFriends([]);
      return;
    }
    const q = collection(db, "users", currentUser.uid, "following");
    const unsub = onSnapshot(
      q,
      (snap) => {
        const following = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setFriends(following);
      },
      (err) => {
        console.error("Following snapshot error:", err);
      }
    );
    return unsub;
  }, [currentUser]);

  // 2. Real-time Search (debounced)
  useEffect(() => {
    let mounted = true;
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const fetchUsers = async () => {
      if (!mounted) return;
      if (!currentUser) {
        // If not logged in, don't try to filter by uid
        setSearchResults([]);
        return;
      }

      setLoadingSearch(true);
      try {
        const q = query(collection(db, "users"), limit(50));
        const snap = await getDocs(q);
        const users = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const filtered = users.filter(
          (u) =>
            u.id !== currentUser.uid &&
            (u.displayName || "").toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (mounted) setSearchResults(filtered);
      } catch (error) {
        console.error("Search error:", error);
        if (mounted) setSearchResults([]);
      } finally {
        if (mounted) setLoadingSearch(false);
      }
    };

    const timeoutId = setTimeout(() => {
      fetchUsers();
    }, 500);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [searchQuery, currentUser]);

  // 3. Fetch Playlist when Selected Friend Changes
  useEffect(() => {
    if (!selectedFriend) {
      setFriendPlaylist([]);
      return;
    }

    let mounted = true;
    setFriendPlaylist([]);

    const fetchPlaylist = async () => {
      try {
        const userId = selectedFriend.uid || selectedFriend.id;
        if (!userId) return;

        const q = query(
          collection(db, "users", userId, "favourites"),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        if (!mounted) return;
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setFriendPlaylist(data);
      } catch (error) {
        console.error("Playlist error", error);
        if (mounted) setFriendPlaylist([]);
      }
    };

    fetchPlaylist();

    return () => {
      mounted = false;
    };
  }, [selectedFriend]);

  // Actions
  const handleUserSelect = (user) => {
    setSelectedFriend(user);
    setShowMobileProfile(true);
  };

  const toggleFollow = async (user) => {
    if (!currentUser) return;
    const isFollowing = friends.some((f) => f.id === user.id);
    const myRef = doc(db, "users", currentUser.uid, "following", user.id);

    try {
      if (isFollowing) {
        await deleteDoc(myRef);
        toast.success(`Unfollowed ${user.displayName || "user"}`);
      } else {
        await setDoc(myRef, {
          displayName: user.displayName || null,
          photoURL: user.photoURL || null,
          uid: user.id,
        });
        toast.success(`Following ${user.displayName || "user"}`);
      }
    } catch (error) {
      console.error("Follow toggle error:", error);
      toast.error("Action failed");
    }
  };

  // Determine which list to show in Left Pane
  const displayList = searchQuery ? searchResults : friends;

  // Utility: cleaned queue generator
  const makeCleanQueue = (arr) =>
    arr.map((s) => ({
      youtubeId: s.youtubeId,
      title: s.title || "",
      thumbnail: s.thumbnail || null,
      id: s.id || s.youtubeId || null,
      author: s.author || "",
    }));

  // Utility: cleaned song
  const makeCleanSong = (s) => ({
    youtubeId: s.youtubeId,
    title: s.title || "",
    thumbnail: s.thumbnail || null,
    id: s.id || s.youtubeId || null,
    author: s.author || "",
  });

  return (
    <div className="flex h-full bg-white overflow-hidden text-black">
      {/* --- LEFT PANE (List/Search) --- */}
      <div
        className={`${showMobileProfile ? "hidden md:flex" : "flex"
          } w-full md:w-1/3 flex-col border-r border-gray-100 bg-white`}
      >
        {/* Header & Search */}
        <div className="p-4 border-b border-gray-100 flex flex-col gap-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users size={24} /> Friends
          </h1>
          <div className="relative w-full">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find friends..."
              className="w-full bg-gray-50 py-3 pl-10 pr-4 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-black/5 transition-all"
            />
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-2">
          {loadingSearch && (
            <div className="text-center py-4 text-xs text-gray-400">Searching...</div>
          )}

          {!loadingSearch && displayList.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              {searchQuery ? "No user found." : "You aren't following anyone yet."}
            </div>
          ) : (
            <div className="space-y-1">
              {displayList.map((user) => {
                const isSelected = selectedFriend?.id === user.id;
                const isFollowing = friends.some((f) => f.id === user.id);

                return (
                  <div
                    key={user.id}
                    onClick={() => handleUserSelect(user)}
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${isSelected ? "bg-slate-200" : "hover:bg-gray-100"
                      }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <Avatar user={user} size="md" />
                      <div className="min-w-0">
                        <h3
                          className={`font-bold truncate ${isSelected ? "text-black" : "text-gray-900"
                            }`}
                        >
                          {user.displayName || "Unnamed"}
                        </h3>
                        <p
                          className={`text-xs truncate ${isSelected ? "text-gray-400" : "text-gray-500"
                            }`}
                        >
                          {isFollowing ? "Following" : "Tap to view"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFollow(user);
                        }}
                        className="px-3 py-1 rounded-full text-sm font-medium border bg-white"
                      >
                        {isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* --- RIGHT PANE (Profile Details) --- */}
      <div
        className={`${!showMobileProfile ? "hidden md:flex" : "flex"
          } flex-1 flex-col bg-gray-50/30 h-full`}
      >
        {selectedFriend ? (
          <div className="flex flex-col h-full animate-fade-in">
            {/* Profile Header */}
            <div className="p-4 bg-white border-b border-gray-100 z-10">
              <button
                onClick={() => setShowMobileProfile(false)}
                className="md:hidden mb-4 flex items-center gap-2 text-sm text-gray-500 hover:text-black"
              >
                <ArrowLeft size={16} /> Back to list
              </button>

              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <div className="w-24 h-24 shrink-0">
                  <Avatar user={selectedFriend} size="lg" />
                </div>

                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-3xl font-bold text-gray-900">
                    {selectedFriend.displayName || "Unnamed"}
                  </h2>
                  <p className="text-gray-500 text-sm mt-1 mb-4">
                    {friends.some((f) => f.id === selectedFriend.id) ? "Friend" : "Not Following"}
                  </p>

                  <div className="flex items-center justify-center md:justify-start gap-3">
                    <button
                      onClick={() => toggleFollow(selectedFriend)}
                      className={`px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${friends.some((f) => f.id === selectedFriend.id)
                        ? "bg-gray-100 text-black border border-gray-200"
                        : "bg-black text-white hover:scale-105"
                        }`}
                    >
                      {friends.some((f) => f.id === selectedFriend.id) ? (
                        <>
                          <UserCheck size={16} /> Following
                        </>
                      ) : (
                        <>
                          <UserPlus size={16} /> Follow
                        </>
                      )}
                    </button>

                    {friendPlaylist.length > 0 && (
                      <button
                        onClick={() => {
                          const cleanQueue = makeCleanQueue(friendPlaylist);
                          const first = makeCleanSong(friendPlaylist[0]);
                          playSong(first, cleanQueue, `${selectedFriend.displayName || "Friend"}`);
                        }}
                        className="px-6 py-2 bg-black text-white rounded-full text-sm font-bold flex items-center gap-2 hover:opacity-80 transition-opacity"
                      >
                        <Play size={16} /> Play All
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Playlist Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
              <h3 className="font-bold text-gray-500 uppercase text-xs tracking-wider mb-4">
                Collection ({friendPlaylist.length})
              </h3>

              {friendPlaylist.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                  <Music size={48} className="mx-auto mb-4 opacity-20" />
                  <p>No songs added yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {friendPlaylist.map((song, i) => {
                    const keyId = song.id || song.youtubeId || `${i}`;
                    return (
                      <div
                        key={keyId}
                        onClick={() => {
                          const cleanQueue = makeCleanQueue(friendPlaylist);
                          const cleanSong = makeCleanSong(song);
                          playSong(cleanSong, cleanQueue, `${selectedFriend.displayName || "Friend"}`);
                        }}
                        className="flex items-center gap-4 p-3 bg-white hover:bg-gray-100 rounded-xl cursor-pointer border border-transparent hover:border-gray-200 transition-all group"
                      >
                        <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden shrink-0 relative">
                          <img
                            src={song.thumbnail || "/fallback.jpg"}
                            onError={(e) => (e.target.src = "/fallback.jpg")}
                            className="w-full h-full object-cover"
                            alt={song.title || "song thumbnail"}
                          />
                          <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-gray-900 truncate">{song.title || "Untitled"}</p>
                          <p className="text-sm text-gray-500 truncate">{song.author || ""}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Spacer for Player */}
              <div className="h-32"></div>
            </div>
          </div>
        ) : (
          /* EMPTY STATE (Desktop Right Pane) */
          <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Users size={40} className="opacity-20 text-black" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Select a Friend</h2>
            <p className="max-w-xs text-sm">
              Click on a user from the list to see their profile and playlist here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Friends;
