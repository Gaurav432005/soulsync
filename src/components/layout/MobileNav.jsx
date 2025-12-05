import React from "react";
import { NavLink } from "react-router-dom";
import { Home, Globe, User, Users } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const MobileNav = () => {
  const { currentUser } = useAuth();

  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Users, label: "Friends", path: "/friends" },
    { icon: Globe, label: "World", path: "/world" },
    { 
      icon: User, 
      label: "Profile", 
      path: currentUser ? `/profile/${currentUser.uid}` : "/profile" 
    },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex justify-between z-40 pb-safe">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
        >
          {({ isActive }) => (
            <div className={`flex flex-col items-center gap-1 ${isActive ? "text-black" : "text-gray-400"}`}>
              <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </div>
          )}
        </NavLink>
      ))}
    </div>
  );
};

export default MobileNav;
