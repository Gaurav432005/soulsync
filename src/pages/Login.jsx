import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast'; // Toast
import { Disc, Globe, Shield, Music, CheckCircle } from 'lucide-react';

const Login = () => {
  const { loginWithGoogle, currentUser } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (currentUser) navigate('/');
  }, [currentUser, navigate]);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Toast Loading
    const toastId = toast.loading(isLogin ? "Signing in..." : "Creating account...");

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success("Welcome back!", { id: toastId });
      } else {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(res.user, { displayName: name });
        await setDoc(doc(db, "users", res.user.uid), {
          uid: res.user.uid,
          displayName: name,
          email: email,
          photoURL: null,
          createdAt: new Date()
        });
        toast.success("Account created successfully!", { id: toastId });
      }
    } catch (err) {
      // Clean Error Message
      const errorMsg = err.message.replace("Firebase: ", "").replace("auth/", "").replace(/-/g, " ");
      toast.error(errorMsg.charAt(0).toUpperCase() + errorMsg.slice(1), { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      toast.success("Logged in with Google!");
    } catch (error) {
      toast.error("Google login failed.");
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* Header */}
      <header className="px-6 py-4 md:px-12 flex items-center gap-2">
        <div className="bg-black text-white p-2 rounded-lg">
          <Disc size={20} />
        </div>
        <span className="font-bold text-xl tracking-tight">SoulSync</span>
      </header>

      {/* Main Content Split */}
      <main className="flex-1 flex flex-col md:flex-row items-center justify-center w-full max-w-7xl mx-auto px-6 md:px-12 gap-12 md:gap-24 mb-10">
        
        {/* Left Side: Branding (Hidden on small mobile, visible on tablet+) */}
        <div className="hidden md:flex flex-col flex-1 space-y-8">
          <h1 className="text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight">
            Share Your <br />
            <span className="text-gray-400">Soul's Rhythm</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-md leading-relaxed">
            Join and see how people share vibes, stories, and playlists on SoulSync.
          </p>

          <div className="space-y-6 mt-4">
            <FeatureItem icon={Music} title="Curate Freely" desc="Express your music taste without limits" />
            <FeatureItem icon={Globe} title="Connect Globally" desc="Vibe with a worldwide community" />
            <FeatureItem icon={Shield} title="Safe & Secure" desc="Your personal playlist is protected" />
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="w-full md:w-[450px] bg-white md:shadow-2xl md:border border-gray-100 rounded-3xl p-8 md:p-10">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">{isLogin ? "Welcome Back" : "Join SoulSync"}</h2>
            <p className="text-gray-400 text-sm">
              {isLogin ? "Login to continue your journey" : "Create an account to get started"}
            </p>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-5">
            {!isLogin && (
              <div>
                <input 
                  type="text" 
                  placeholder="Full Name" 
                  className="w-full bg-gray-50 border border-gray-200 px-5 py-4 rounded-xl outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                  value={name} onChange={e => setName(e.target.value)} required 
                />
              </div>
            )}
            <div>
              <input 
                type="email" 
                placeholder="Email Address" 
                className="w-full bg-gray-50 border border-gray-200 px-5 py-4 rounded-xl outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                value={email} onChange={e => setEmail(e.target.value)} required 
              />
            </div>
            <div>
              <input 
                type="password" 
                placeholder="Password" 
                className="w-full bg-gray-50 border border-gray-200 px-5 py-4 rounded-xl outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                value={password} onChange={e => setPassword(e.target.value)} required 
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gray-900 text-white font-semibold py-4 rounded-xl hover:bg-black transition-all shadow-lg hover:shadow-xl disabled:opacity-70 flex justify-center items-center gap-2"
            >
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>}
              {isLogin ? 'Log In' : 'Create Account'}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
            <div className="relative flex justify-center text-xs uppercase tracking-wide text-gray-400 font-medium"><span className="px-4 bg-white">Or Continue With</span></div>
          </div>

          <button 
            onClick={handleGoogleLogin}
            className="w-full border border-gray-200 py-4 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-all flex items-center justify-center gap-3"
          >
             <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
             Continue with Google
          </button>

          <p className="mt-8 text-center text-sm text-gray-600">
            {isLogin ? "New here?" : "Already member?"} 
            <button onClick={() => setIsLogin(!isLogin)} className="ml-1 font-bold text-black hover:underline">
              {isLogin ? "Create Account" : "Log In"}
            </button>
          </p>
        </div>

      </main>

      <footer className="text-center py-6 text-gray-400 text-sm">
        © 2025 SoulSync. Made with 🖤 by You.
      </footer>
    </div>
  );
};

const FeatureItem = ({ icon: Icon, title, desc }) => (
  <div className="flex items-start gap-4">
    <div className="p-3 bg-gray-50 rounded-xl text-gray-900">
      <Icon size={24} />
    </div>
    <div>
      <h3 className="font-bold text-gray-900">{title}</h3>
      <p className="text-gray-500 text-sm">{desc}</p>
    </div>
  </div>
);

export default Login;