'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { ReactNode } from 'react'

interface AnimatedAvatarProps {
  src?: string
  alt?: string
  fallback?: string
  name?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  showTooltip?: boolean
  hoverEffect?: 'scale' | 'lift' | 'rotate' | 'up'
  overlap?: boolean
  zIndex?: number
}

export function AnimatedAvatar({
  src,
  alt = '',
  fallback,
  name,
  size = 'md',
  className = '',
  showTooltip = true,
  hoverEffect = 'lift',
  overlap = false,
  zIndex = 1
}: AnimatedAvatarProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg'
  }

  const getHoverVariants = () => {
    switch (hoverEffect) {
      case 'scale':
        return {
          scale: 1.1,
          transition: { type: "spring", stiffness: 400, damping: 17 }
        }
      case 'lift':
        return {
          y: -4,
          scale: 1.05,
          transition: { type: "spring", stiffness: 400, damping: 17 }
        }
      case 'rotate':
        return {
          rotate: 5,
          scale: 1.1,
          transition: { type: "spring", stiffness: 400, damping: 17 }
        }
      case 'up':
        return {
          y: -6,
          transition: { type: "spring", stiffness: 400, damping: 17 }
        }
      default:
        return {
          y: -4,
          scale: 1.05,
          transition: { type: "spring", stiffness: 400, damping: 17 }
        }
    }
  }

  const avatarContent = (
    <motion.div
      className={`
        relative rounded-full border-2 border-white flex items-center justify-center cursor-pointer overflow-hidden
        ${sizeClasses[size]}
        ${className}
      `}
      style={{ zIndex }}
      whileHover={getHoverVariants()}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {src && src !== 'undefined' ? (
        <Image
          src={src}
          alt={alt || 'Avatar'}
          width={64}
          height={64}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
          {fallback && fallback !== 'undefined' ? fallback : '?'}
        </div>
      )}
      
      {/* Subtle shine effect */}
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 via-transparent to-transparent"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      />
    </motion.div>
  )

  if (showTooltip && name) {
    return (
      <div className="relative group">
        {avatarContent}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-black text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
          {name}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-black"></div>
        </div>
      </div>
    )
  }

  return avatarContent
}
