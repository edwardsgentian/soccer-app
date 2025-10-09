'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface GlassyButtonProps {
  children: ReactNode
  href?: string
  onClick?: () => void
  className?: string
  tooltip?: string
  disabled?: boolean
}

export function GlassyButton({ 
  children, 
  href, 
  onClick, 
  className = '', 
  tooltip,
  disabled = false 
}: GlassyButtonProps) {
  const buttonContent = (
    <motion.div
      className={`
        relative inline-flex items-center justify-center
        w-10 h-10 rounded-xl
        bg-gradient-to-br from-gray-100/20 via-gray-200/10 to-gray-300/20 backdrop-blur-md
        border border-gray-300/30
        shadow-lg shadow-gray-900/20
        cursor-pointer
        overflow-hidden
        before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-br before:from-gray-200/40 before:via-gray-100/20 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      whileHover={disabled ? {} : { 
        scale: 1.05,
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}
      whileTap={disabled ? {} : { scale: 0.95 }}
      transition={{ 
        type: "spring", 
        stiffness: 400, 
        damping: 17 
      }}
    >
      {/* Glass shine effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent rounded-xl"
        initial={{ opacity: 0 }}
        whileHover={disabled ? {} : { opacity: 1 }}
        transition={{ duration: 0.2 }}
      />
      
      {/* Content */}
      <div className="relative z-10 text-gray-600 group-hover:text-gray-900 transition-colors duration-200">
        {children}
      </div>
      
      {/* Subtle inner glow */}
      <motion.div
        className="absolute inset-0 rounded-xl"
        style={{
          background: 'radial-gradient(circle at 30% 30%, rgba(156,163,175,0.15) 0%, transparent 50%)'
        }}
        initial={{ opacity: 0 }}
        whileHover={disabled ? {} : { opacity: 1 }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  )

  if (href) {
    return (
      <div className="relative group">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          {buttonContent}
        </a>
        {tooltip && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-black text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
            {tooltip}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative group">
      <div onClick={disabled ? undefined : onClick}>
        {buttonContent}
      </div>
      {tooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-black text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
          {tooltip}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
        </div>
      )}
    </div>
  )
}
