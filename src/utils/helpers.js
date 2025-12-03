// src/utils/helpers.js
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Tailwind merger for cleaner classes
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// COMPRESSION UTILITY: Resize images before uploading to Firestore
// Reduces 5MB images to ~30KB strings.
export const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 300; // Thumbnail size is enough for avatars
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Compress to JPEG at 70% quality
        resolve(canvas.toDataURL('image/jpeg', 0.7)); 
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};