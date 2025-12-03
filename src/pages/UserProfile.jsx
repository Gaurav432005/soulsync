import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Camera, Edit2, Save, Loader2, LogOut } from 'lucide-react';
import Avatar from '../components/Avatar';
import { toast } from 'react-hot-toast';
import { compressImage } from '../utils/helpers';

const UserProfile = () => {
  const { userId } = useParams();
  const { currentUser, logout } = useAuth(); // Get logout function
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [uploading, setUploading] = useState(false);
  
  const isOwnProfile = currentUser?.uid === userId;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const docSnap = await getDoc(doc(db, "users", userId));
        if (docSnap.exists()) {
          setProfile(docSnap.data());
          setNewName(docSnap.data().displayName);
        } else {
            toast.error("User not found");
        }
      } catch (e) {
        console.error(e);
      }
    };
    if (userId) fetchProfile();
  }, [userId]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const compressedBase64 = await compressImage(file);
      await updateDoc(doc(db, "users", userId), { photoURL: compressedBase64 });
      setProfile(prev => ({ ...prev, photoURL: compressedBase64 }));
      toast.success("Profile updated");
    } catch (error) {
      console.error(error);
      toast.error("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const saveProfile = async () => {
    if (!newName.trim()) return;
    try {
        await updateDoc(doc(db, "users", userId), { displayName: newName });
        setProfile(prev => ({ ...prev, displayName: newName }));
        setIsEditing(false);
        toast.success("Name updated");
    } catch (e) {
        toast.error("Failed to update name");
    }
  };

  if (!profile) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin"/></div>;

  return (
    <div className="max-w-2xl mx-auto p-6 md:p-12 space-y-8 pb-32">
      <h1 className="text-3xl font-bold">Profile Settings</h1>
      
      <div className="flex flex-col items-center border-b border-gray-100 pb-8 gap-6">
        {/* Avatar Section */}
        <div className="relative group">
          <Avatar user={profile} size="lg" />
          {isOwnProfile && (
            <label className={`absolute bottom-0 right-0 bg-black text-white p-2 rounded-full cursor-pointer hover:bg-gray-800 transition-colors shadow-lg ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {uploading ? <Loader2 size={18} className="animate-spin"/> : <Camera size={18} />}
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
            </label>
          )}
        </div>

        {/* Name Section */}
        <div className="text-center w-full max-w-sm space-y-2">
          {isEditing ? (
            <div className="flex gap-2">
              <input 
                value={newName} 
                onChange={e => setNewName(e.target.value)}
                className="w-full border p-2 rounded-lg text-center font-bold text-xl outline-none ring-2 ring-purple-100"
                autoFocus
              />
              <button onClick={saveProfile} className="bg-black text-white p-2 rounded-lg"><Save size={20}/></button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-2xl font-bold">{profile.displayName}</h2>
              {isOwnProfile && (
                <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-black">
                  <Edit2 size={16} />
                </button>
              )}
            </div>
          )}
          <p className="text-gray-500">{profile.email}</p>
        </div>
      </div>
      
      {/* Account Actions (Only visible on own profile) */}
      {isOwnProfile && (
        <div className="pt-4">
            <h3 className="font-semibold text-lg mb-4 text-gray-900">Account</h3>
            <button 
                onClick={logout}
                className="flex items-center justify-center gap-2 px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl font-medium transition-colors"
            >
                <LogOut size={20} />
                Log Out
            </button>
        </div>
      )}
    </div>
  );
};

export default UserProfile;