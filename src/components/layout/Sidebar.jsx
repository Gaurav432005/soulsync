import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Globe, User, Disc } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = () => {
  const { currentUser } = useAuth(); // Logout function not needed here anymore

  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Globe, label: "World", path: "/world" },
    { icon: User, label: "My Profile", path: `/profile/${currentUser?.uid}` },
  ];

  return (
    <div className="hidden md:flex flex-col w-64 h-screen bg-white border-r border-gray-100 sticky top-0 p-6 z-20">
      <div className="flex items-center gap-3 mb-12">
        <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white">
          <Disc size={18} />
        </div>
        <h1 className="text-xl font-bold tracking-tight">SoulSync</h1>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium ${
                isActive
                  ? "bg-black text-white"
                  : "text-gray-500 hover:bg-gray-100 hover:text-black"
              }`
            }
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

    </div>
  );
};

export default Sidebar;