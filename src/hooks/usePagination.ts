import { useState, useMemo, useCallback } from 'react'

interface PaginationOptions {
  pageSize?: number
  initialPage?: number
}

interface PaginationResult<T> {
  currentPage: number
  totalPages: number
  pageSize: number
  totalItems: number
  paginatedData: T[]
  hasNextPage: boolean
  hasPreviousPage: boolean
  goToPage: (page: number) => void
  nextPage: () => void
  previousPage: () => void
  setPageSize: (size: number) => void
  setData: (data: T[]) => void
}

export function usePagination<T>(
  data: T[],
  options: PaginationOptions = {}
): PaginationResult<T> {
  const { pageSize: initialPageSize = 10, initialPage = 1 } = options
  
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [pageSize, setPageSize] = useState(initialPageSize)

  const totalItems = data.length
  const totalPages = Math.ceil(totalItems / pageSize)

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return data.slice(startIndex, endIndex)
  }, [data, currentPage, pageSize])

  const hasNextPage = currentPage < totalPages
  const hasPreviousPage = currentPage > 1

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }, [totalPages])

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1)
    }
  }, [hasNextPage])

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      setCurrentPage(prev => prev - 1)
    }
  }, [hasPreviousPage])

  const handleSetPageSize = useCallback((newPageSize: number) => {
    setPageSize(newPageSize)
    setCurrentPage(1) // Reset to first page when page size changes
  }, [])

  const setData = useCallback(() => {
    // Reset to first page when data changes
    setCurrentPage(1)
  }, [])

  return {
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    paginatedData,
    hasNextPage,
    hasPreviousPage,
    goToPage,
    nextPage,
    previousPage,
    setPageSize: handleSetPageSize,
    setData
  }
}

// Hook for server-side pagination
interface ServerPaginationOptions {
  pageSize?: number
  initialPage?: number
}

interface ServerPaginationResult {
  currentPage: number
  pageSize: number
  offset: number
  limit: number
  goToPage: (page: number) => void
  nextPage: () => void
  previousPage: () => void
  setPageSize: (size: number) => void
}

export function useServerPagination(
  options: ServerPaginationOptions = {}
): ServerPaginationResult {
  const { pageSize: initialPageSize = 10, initialPage = 1 } = options
  
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [pageSize, setPageSize] = useState(initialPageSize)

  const offset = (currentPage - 1) * pageSize
  const limit = pageSize

  const goToPage = useCallback((page: number) => {
    if (page >= 1) {
      setCurrentPage(page)
    }
  }, [])

  const nextPage = useCallback(() => {
    setCurrentPage(prev => prev + 1)
  }, [])

  const previousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1)
    }
  }, [currentPage])

  const handleSetPageSize = useCallback((newPageSize: number) => {
    setPageSize(newPageSize)
    setCurrentPage(1) // Reset to first page when page size changes
  }, [])

  return {
    currentPage,
    pageSize,
    offset,
    limit,
    goToPage,
    nextPage,
    previousPage,
    setPageSize: handleSetPageSize
  }
}
