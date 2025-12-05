import React from 'react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import MusicPlayer from '../MusicPlayer';
import { usePlayer } from '../../context/PlayerContext';
import { Outlet } from 'react-router-dom';

const Layout = () => {
  const { currentSong } = usePlayer();

  return (

    <div className="flex h-[100dvh] bg-white text-black font-sans overflow-hidden">
      
      <Sidebar />
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col w-full h-full relative min-w-0">

        <div className="flex-1 h-full relative flex flex-col overflow-hidden">
           <Outlet />
        </div>
      </main>
      
      <MobileNav />
      
      {currentSong && (
        <div className="z-50"> 
          <MusicPlayer />
        </div>
      )}
    </div>
  );
};

export default Layout;