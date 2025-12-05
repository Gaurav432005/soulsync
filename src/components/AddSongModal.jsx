import React, { useState } from 'react';
import { X, Link as LinkIcon, Save, Loader2 } from 'lucide-react';
import { db } from '../firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

const AddSongModal = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);

  const extractVideoID = (url) => {
    const regExp =
      /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[7].length === 11 ? match[7] : false;
  };

  const handleUrlChange = async (e) => {
    const val = e.target.value;
    setUrl(val);

    const id = extractVideoID(val);
    if (!id) return setPreview(null);

    setFetchLoading(true);

    try {
      const res = await fetch(
        `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${id}`
      );
      const data = await res.json();

      setPreview({
        id,
        thumb: `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
        title: data.title || `Song ${id}`,
      });
    } catch (err) {
      setPreview({
        id,
        thumb: `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
        title: `Song ${id}`,
      });
    }

    setFetchLoading(false);
  };

  const handleSave = async () => {
    if (!preview || !currentUser) return;
    setLoading(true);

    try {
      await addDoc(collection(db, 'users', currentUser.uid, 'favourites'), {
        youtubeId: preview.id,
        title: preview.title,
        thumbnail: preview.thumb,
        createdAt: serverTimestamp(),
      });

      onClose();
      setUrl('');
      setPreview(null);
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md p-6 rounded-2xl shadow-xl relative animate-fade-in">
        
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-pink-600">
          Add to Library
        </h2>

        <div className="space-y-4">

          {/* Input */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              YouTube URL
            </label>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-within:ring-2 ring-violet-100 transition-all">
              <LinkIcon size={16} className="text-gray-400" />
              <input
                type="text"
                value={url}
                onChange={handleUrlChange}
                placeholder="Paste YouTube link..."
                className="bg-transparent w-full text-sm outline-none"
              />
              {fetchLoading && (
                <Loader2 size={16} className="animate-spin text-violet-500" />
              )}
            </div>
          </div>

          {/* Preview */}
          {preview && (
            <div className="rounded-xl overflow-hidden shadow-sm border border-gray-100 bg-gray-50">
              <img
                src={preview.thumb}
                className="w-full h-32 object-cover"
                alt="Preview"
              />
              <div className="p-3">
                <p className="text-xs font-bold text-gray-800 line-clamp-1">
                  {preview.title}
                </p>
              </div>
            </div>
          )}

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={!preview || loading || fetchLoading}
            className="w-full py-3 bg-black text-white rounded-xl font-medium shadow-lg hover:bg-gray-900 active:scale-95 transition-all disabled:opacity-50 flex justify-center gap-2"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <Save size={18} />
                Add Song
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddSongModal;
