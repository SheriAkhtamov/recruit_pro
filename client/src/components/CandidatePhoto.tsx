import React from 'react';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CandidatePhotoProps {
  photoUrl?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
};

const iconSizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

export function CandidatePhoto({ photoUrl, name, size = 'md', className }: CandidatePhotoProps) {
  const initials = name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (photoUrl) {
    return (
      <div 
        className={cn(
          'relative rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 flex-shrink-0',
          sizeClasses[size],
          className
        )}
      >
        <img
          src={photoUrl}
          alt={`${name}'s photo`}
          className="w-full h-full object-cover"
          onError={(e) => {
            // If image fails to load, hide it and show fallback
            e.currentTarget.style.display = 'none';
            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
            if (fallback) {
              fallback.style.display = 'flex';
            }
          }}
        />
        {/* Fallback content (hidden by default) */}
        <div 
          className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-medium"
          style={{ display: 'none' }}
        >
          {initials || <User className={iconSizeClasses[size]} />}
        </div>
      </div>
    );
  }

  // No photo - show initials or user icon
  return (
    <div 
      className={cn(
        'rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-medium flex-shrink-0',
        sizeClasses[size],
        className
      )}
    >
      {initials || <User className={iconSizeClasses[size]} />}
    </div>
  );
}