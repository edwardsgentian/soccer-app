import { cn } from "@/lib/utils"

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gray-200",
        className
      )}
    />
  )
}

// Game Card Skeleton
export function GameCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <Skeleton className="h-6 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2 mb-2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <Skeleton className="h-8 w-16 rounded" />
      </div>
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
      
      <div className="flex items-center justify-end">
        <Skeleton className="h-8 w-20 rounded" />
      </div>
    </div>
  )
}

// Season Card Skeleton
export function SeasonCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <Skeleton className="h-6 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2 mb-2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <Skeleton className="h-8 w-16 rounded" />
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <Skeleton className="h-4 w-16 mb-1" />
          <Skeleton className="h-6 w-12" />
        </div>
        <div>
          <Skeleton className="h-4 w-16 mb-1" />
          <Skeleton className="h-6 w-12" />
        </div>
      </div>
      
      <div className="flex items-center justify-end">
        <Skeleton className="h-8 w-20 rounded" />
      </div>
    </div>
  )
}

// Group Card Skeleton
export function GroupCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-6 text-center">
        <div className="flex justify-center mb-4">
          <Skeleton className="w-16 h-16 rounded" />
        </div>
        
        <Skeleton className="h-6 w-3/4 mx-auto mb-4" />
        
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          <Skeleton className="h-6 w-16 rounded" />
          <Skeleton className="h-6 w-20 rounded" />
        </div>
        
        <div className="flex items-center justify-center gap-6">
          <div className="flex items-center text-gray-600 text-sm">
            <Skeleton className="w-4 h-4 mr-2" />
            <Skeleton className="h-4 w-4" />
          </div>
          <div className="flex items-center text-gray-600 text-sm">
            <Skeleton className="w-4 h-4 mr-2" />
            <Skeleton className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  )
}

// Avatar Skeleton
export function AvatarSkeleton({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8", 
    lg: "h-12 w-12"
  }
  
  return (
    <Skeleton className={`${sizeClasses[size]} rounded-full`} />
  )
}

// Avatar Group Skeleton
export function AvatarGroupSkeleton() {
  return (
    <div className="flex -space-x-2">
      <Skeleton className="h-6 w-6 rounded-full border-2 border-white" />
      <Skeleton className="h-6 w-6 rounded-full border-2 border-white" />
      <Skeleton className="h-6 w-6 rounded-full border-2 border-white" />
    </div>
  )
}

// Homepage Game Card Skeleton - matches the actual HomepageGameCard design
export function HomepageGameCardSkeleton() {
  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 flex flex-row">
        {/* Image Section - Left Side */}
        <div className="w-12 h-12 sm:w-24 sm:h-24 bg-gray-200 rounded-lg ml-4 mt-4 flex items-center justify-center relative flex-shrink-0">
          <Skeleton className="w-8 h-8 sm:w-16 sm:h-16 rounded-full" />
        </div>

        {/* Content Section - Right Side */}
        <div className="flex-1 p-4 pt-4">
          {/* Top Row: Game Name + Price */}
          <div className="flex items-start justify-between mb-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-6 w-12 rounded" />
          </div>

          {/* Time and Location */}
          <div className="space-y-1 mb-3">
            <div className="flex items-center">
              <Skeleton className="h-4 w-4 mr-2 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex items-center">
              <Skeleton className="h-4 w-4 mr-2 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>

          {/* Spots Available */}
          <div className="flex items-center mb-3">
            <div className="flex items-center -space-x-2 mr-2">
              <AvatarGroupSkeleton />
            </div>
            <Skeleton className="h-4 w-24" />
          </div>

          {/* Group Name */}
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    </div>
  )
}

// Homepage Season Card Skeleton - matches the actual SeasonCard design
export function HomepageSeasonCardSkeleton() {
  return (
    <div className="max-w-lg mx-auto">
      <div className="relative">
        {/* Stack of cards effect - positioned below main card */}
        <div className="absolute top-2 left-0 w-full h-full border border-gray-300 rounded-lg"></div>
        <div className="absolute top-1 left-0 w-full h-full border border-gray-300 rounded-lg"></div>
        <div className="relative bg-white rounded-lg border border-gray-200 flex flex-row">
          {/* Image Section - Left Side */}
          <div className="w-12 h-12 sm:w-24 sm:h-24 bg-gray-200 rounded-lg ml-4 mt-4 flex items-center justify-center relative flex-shrink-0">
            <Skeleton className="w-8 h-8 sm:w-16 sm:h-16 rounded-full" />
          </div>

          {/* Content Section - Right Side */}
          <div className="flex-1 p-4 pt-4">
            {/* Top Row: Season Name + Price */}
            <div className="flex items-start justify-between mb-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-6 w-12 rounded" />
            </div>

            {/* Time and Location */}
            <div className="space-y-1 mb-3">
              <div className="flex items-center">
                <Skeleton className="h-4 w-4 mr-2 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="flex items-center">
                <Skeleton className="h-4 w-4 mr-2 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>

            {/* Season Details */}
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <Skeleton className="h-3 w-12 mb-1" />
                <Skeleton className="h-4 w-8" />
              </div>
              <div>
                <Skeleton className="h-3 w-16 mb-1" />
                <Skeleton className="h-4 w-8" />
              </div>
            </div>

            {/* Spots Available */}
            <div className="flex items-center mb-3">
              <div className="flex items-center -space-x-2 mr-2">
                <AvatarGroupSkeleton />
              </div>
              <Skeleton className="h-4 w-24" />
            </div>

            {/* Group Name */}
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </div>
    </div>
  )
}

