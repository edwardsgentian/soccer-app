'use client'

import { motion } from 'framer-motion'
import { AnimatedAvatar } from './animated-avatar'

interface AvatarData {
  id: string
  name: string
  photo_url?: string
  fallback?: string
}

interface AnimatedAvatarGroupProps {
  avatars: AvatarData[]
  maxVisible?: number
  size?: 'sm' | 'md' | 'lg' | 'xl'
  overlap?: number
  hoverEffect?: 'scale' | 'lift' | 'rotate' | 'up'
  className?: string
}

export function AnimatedAvatarGroup({
  avatars,
  maxVisible = 3,
  size = 'sm',
  overlap = 8,
  hoverEffect = 'lift',
  className = ''
}: AnimatedAvatarGroupProps) {
  const visibleAvatars = avatars.slice(0, maxVisible)
  const remainingCount = avatars.length - maxVisible

  return (
    <div className={`flex items-center ${className}`}>
      {visibleAvatars.map((avatar, index) => (
        <motion.div
          key={avatar.id}
          style={{ 
            marginLeft: index > 0 ? `-${overlap}px` : '0',
            zIndex: maxVisible - index
          }}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ 
            delay: index * 0.1,
            duration: 0.3,
            ease: "easeOut"
          }}
        >
          <AnimatedAvatar
            src={avatar.photo_url}
            alt={avatar.name || 'Player'}
            fallback={avatar.fallback || avatar.name?.charAt(0).toUpperCase() || '?'}
            name={avatar.name || 'Player'}
            size={size}
            hoverEffect={hoverEffect}
            overlap={true}
            zIndex={maxVisible - index}
          />
        </motion.div>
      ))}
      
      {remainingCount > 0 && (
        <motion.div
          style={{ 
            marginLeft: `-${overlap}px`,
            zIndex: 0
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ 
            delay: visibleAvatars.length * 0.1,
            duration: 0.3,
            ease: "easeOut"
          }}
        >
          <AnimatedAvatar
            fallback={`+${remainingCount}`}
            name={`${remainingCount} more`}
            size={size}
            hoverEffect={hoverEffect}
            overlap={true}
            zIndex={0}
            className="bg-gray-200 text-gray-600"
          />
        </motion.div>
      )}
    </div>
  )
}
