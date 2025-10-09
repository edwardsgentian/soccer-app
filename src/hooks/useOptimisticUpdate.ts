import { useState, useCallback } from 'react'

interface OptimisticUpdateOptions<T> {
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
  rollbackOnError?: boolean
}

export function useOptimisticUpdate<T>(
  initialData: T,
  options: OptimisticUpdateOptions<T> = {}
) {
  const [data, setData] = useState<T>(initialData)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const updateOptimistically = useCallback(
    async (
      optimisticUpdate: (currentData: T) => T,
      actualUpdate: () => Promise<T>
    ) => {
      const previousData = data
      
      // Apply optimistic update immediately
      setData(optimisticUpdate(data))
      setIsLoading(true)
      setError(null)

      try {
        // Perform actual update
        const result = await actualUpdate()
        setData(result)
        options.onSuccess?.(result)
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Update failed')
        setError(error)
        
        // Rollback on error if enabled
        if (options.rollbackOnError !== false) {
          setData(previousData)
        }
        
        options.onError?.(error)
      } finally {
        setIsLoading(false)
      }
    },
    [data, options]
  )

  return {
    data,
    isLoading,
    error,
    updateOptimistically,
    setData
  }
}
