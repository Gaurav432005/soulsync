import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { LogOut, UserPen } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';

const UserProfile = () => {
  const { userId } = useParams();
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const [songCount, setSongCount] = useState(0);

  const isOwner = currentUser?.uid === userId;

  useEffect(() => {
    if (!userId) return;

    // Collection reference → Correct way: collection(db, "users", userId, "favourites")
    const favRef = collection(db, "users", userId, "favourites");

    const q = query(favRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setSongCount(snapshot.size);
      },
      (error) => {
        console.error("Snapshot Error:", error);
      }
    );

    return unsubscribe;
  }, [userId]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">

      {/* Header */}
      <div className="px-6 py-6 border-b border-gray-100 flex gap-3 items-center">
        <UserPen size={24} className="text-black" />
        <h1 className="text-xl font-bold">Profile</h1>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-10">

        <div className="flex flex-col items-center">
          
          {/* Avatar */}
          <div className="mb-6">
            <div className="w-28 h-28 rounded-full border-2 border-gray-100 shadow-sm flex items-center justify-center overflow-hidden bg-white">
              <Avatar
                user={isOwner ? currentUser : { displayName: "User" }}
                size="lg"
              />
            </div>
          </div>

          {/* Name */}
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            {isOwner ? currentUser?.displayName || "User" : "User"}
          </h2>

          {/* Email */}
          {isOwner && (
            <p className="text-sm text-gray-500 mb-6">
              {currentUser?.email}
            </p>
          )}

          {/* Stats */}
          <div className="bg-gray-50 px-8 py-4 rounded-2xl border border-gray-100 mb-8 flex flex-col items-center">
            <span className="text-3xl font-bold text-black">{songCount}</span>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Songs Added
            </span>
          </div>

          {/* Logout Button */}
          {isOwner && (
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-red-50 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors w-full max-w-[200px]"
            >
              <LogOut size={18} /> Logout
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default UserProfile;
