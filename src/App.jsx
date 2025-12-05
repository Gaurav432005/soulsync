import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PlayerProvider } from './context/PlayerContext';
import Login from './pages/Login';
import Home from './pages/Home';
import World from './pages/World';
import Friends from './pages/Friends'; // NEW
import UserProfile from './pages/UserProfile';
import Layout from './components/layout/Layout';

const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" />;
  return children;
};

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PlayerProvider>
          <Toaster position="top-center" reverseOrder={false} />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Home />} />
              <Route path="world" element={<World />} />
              <Route path="friends" element={<Friends />} /> {/* NEW ROUTE */}
              <Route path="profile/:userId" element={<UserProfile />} />
            </Route>
          </Routes>
        </PlayerProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;