import React from 'react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import MusicPlayer from '../MusicPlayer';
import { usePlayer } from '../../context/PlayerContext';
import { Outlet } from 'react-router-dom';

const Layout = () => {
  const { currentSong } = usePlayer();

  return (
    <div className="flex h-screen bg-white text-black font-sans overflow-hidden">
      <Sidebar />
      
      {/* Change: h-screen & overflow-hidden 
         Mobile Nav Height approx 60px padding adjust
      */}
      <main className="flex-1 flex flex-col w-full h-full relative">
        <div className="flex-1 overflow-hidden relative">
           <Outlet />
        </div>
        
        {/* Spacer for Mobile Nav / Player */}
        <div className={`shrink-0 ${currentSong ? 'h-[140px]' : 'h-[60px]'} md:h-0`} />
      </main>
      
      <MobileNav />
      
      {currentSong && (
        <div className="fixed bottom-[56px] md:bottom-0 left-0 md:left-64 right-0 z-50">
          <MusicPlayer />
        </div>
      )}
    </div>
  );
};

export default Layout;