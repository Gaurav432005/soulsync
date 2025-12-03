import React from 'react';

const Avatar = ({ user, size = "md" }) => {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-12 h-12 text-sm",
    lg: "w-24 h-24 text-2xl"
  };

  if (user?.photoURL) {
    return <img src={user.photoURL} className={`${sizeClasses[size]} rounded-full object-cover border border-gray-100`} alt="User" />;
  }

  // Generate initials from display name or email
  const name = user?.displayName || user?.email || "User";
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className={`${sizeClasses[size]} rounded-full bg-black text-white flex items-center justify-center font-bold`}>
      {initial}
    </div>
  );
};

export default Avatar;