import React, { useState } from 'react';
import { X, Link as LinkIcon, Save } from 'lucide-react';
import { db } from '../firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

const AddSongModal = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const extractVideoID = (url) => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : false;
  };

  const handleUrlChange = (e) => {
    const val = e.target.value;
    setUrl(val);
    const id = extractVideoID(val);
    if (id) {
      setPreview({
        id,
        thumb: `https://img.youtube.com/vi/${id}/mqdefault.jpg`
      });
    } else {
      setPreview(null);
    }
  };

  const handleSave = async () => {
    if (!preview) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "users", currentUser.uid, "favourites"), {
        youtubeId: preview.id,
        title: `Song ${preview.id}`, // In real app, fetch title via API or let user type
        note: note,
        thumbnail: preview.thumb,
        createdAt: serverTimestamp()
      });
      onClose();
      setUrl('');
      setNote('');
      setPreview(null);
    } catch (error) {
      console.error("Error adding song:", error);
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="glass-card w-full max-w-md p-6 relative bg-white">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>
        
        <h2 className="text-xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">Add to Playlist</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">YouTube URL</label>
            <div className="flex items-center gap-2 bg-gray-50 border rounded-xl px-3 py-2">
              <LinkIcon size={16} className="text-gray-400"/>
              <input 
                type="text" 
                value={url}
                onChange={handleUrlChange}
                placeholder="Paste link here..."
                className="bg-transparent border-none outline-none w-full text-sm"
              />
            </div>
          </div>

          {preview && (
            <div className="rounded-xl overflow-hidden shadow-sm border border-gray-100">
              <img src={preview.thumb} className="w-full h-32 object-cover" />
            </div>
          )}

          <div>
             <label className="block text-sm font-medium text-gray-600 mb-1">Note / Vibe (Optional)</label>
             <textarea 
               value={note}
               onChange={(e) => setNote(e.target.value)}
               placeholder="Why do you love this song?"
               className="w-full bg-gray-50 border rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 ring-purple-400"
             />
          </div>

          <button 
            onClick={handleSave}
            disabled={!preview || loading}
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex justify-center gap-2"
          >
            {loading ? "Saving..." : <><Save size={18} /> Add to My Playlist</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddSongModal;