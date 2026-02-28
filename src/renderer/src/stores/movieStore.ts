import { defineStore } from 'pinia'
import { ref, reactive, toRaw } from 'vue'
import type { Movie, MovieFilter, PaginatedResult } from '../../../shared/types'

/** 将 reactive filter 转为可供 IPC 传输的纯对象（去除 Vue Proxy） */
function serializeFilter(filter: MovieFilter): MovieFilter {
  return JSON.parse(JSON.stringify(toRaw(filter)))
}

export const useMovieStore = defineStore('movie', () => {
  const movies = ref<Movie[]>([])
  const total = ref(0)
  const loading = ref(false)
  const viewMode = ref<'grid' | 'list'>('grid')

  const filter = reactive<MovieFilter>({
    search: '',
    genres: [],
    tags: [],
    actors: [],
    yearFrom: undefined,
    yearTo: undefined,
    ratingFrom: undefined,
    ratingTo: undefined,
    isFavorite: undefined,
    sortBy: 'created_at',
    sortOrder: 'desc',
    page: 1,
    pageSize: 50
  })

  async function fetchMovies(): Promise<void> {
    loading.value = true
    try {
      const result: PaginatedResult<Movie> = await window.api.getMovies(serializeFilter(filter))
      movies.value = result.items
      total.value = result.total
    } finally {
      loading.value = false
    }
  }

  async function loadMore(): Promise<void> {
    if (loading.value) return
    const nextPage = (filter.page || 1) + 1
    const maxPage = Math.ceil(total.value / (filter.pageSize || 50))
    if (nextPage > maxPage) return

    loading.value = true
    try {
      filter.page = nextPage
      const result = await window.api.getMovies(serializeFilter(filter))
      movies.value = [...movies.value, ...result.items]
      total.value = result.total
    } finally {
      loading.value = false
    }
  }

  function resetFilter(): void {
    filter.search = ''
    filter.genres = []
    filter.tags = []
    filter.actors = []
    filter.yearFrom = undefined
    filter.yearTo = undefined
    filter.ratingFrom = undefined
    filter.ratingTo = undefined
    filter.isFavorite = undefined
    filter.sortBy = 'created_at'
    filter.sortOrder = 'desc'
    filter.page = 1
  }

  return { movies, total, loading, viewMode, filter, fetchMovies, loadMore, resetFilter }
})
