<script setup lang="ts">
import { onMounted, watch } from 'vue'
import {
  NSpace,
  NSelect,
  NButton,
  NButtonGroup,
  NEmpty,
  NSpin,
  NPagination,
  NGrid,
  NGi,
  NDataTable,
  NRate
} from 'naive-ui'
import { useMovieStore } from '@renderer/stores/movieStore'
import { useFilterStore } from '@renderer/stores/filterStore'
import MovieCard from '@renderer/components/MovieCard.vue'
import { useRouter } from 'vue-router'
import type { DataTableColumns } from 'naive-ui'
import type { Movie } from '../../../shared/types'

const movieStore = useMovieStore()
const filterStore = useFilterStore()
const router = useRouter()

const sortOptions = [
  { label: '添加时间', value: 'created_at' },
  { label: '标题', value: 'title' },
  { label: '年份', value: 'year' },
  { label: '评分', value: 'rating_local' }
]

const orderOptions = [
  { label: '降序', value: 'desc' },
  { label: '升序', value: 'asc' }
]

const tableColumns: DataTableColumns<Movie> = [
  { title: '标题', key: 'title', ellipsis: true, width: 250 },
  { title: '年份', key: 'year', width: 80 },
  { title: '导演', key: 'director', width: 120, ellipsis: true },
  { title: '制片厂', key: 'studio', width: 120, ellipsis: true },
  {
    title: '评分',
    key: 'rating_local',
    width: 150,
    render(row) {
      return h(NRate, {
        value: (row.rating_local || 0) / 2,
        count: 5,
        allowHalf: true,
        size: 'small',
        onUpdateValue: (val: number) => handleRating(row.id, val * 2)
      })
    }
  },
  { title: '时长', key: 'runtime', width: 80, render: (row) => (row.runtime ? `${row.runtime}分` : '-') }
]

import { h } from 'vue'

onMounted(async () => {
  await filterStore.fetchAll()
  await movieStore.fetchMovies()
})

watch(
  () => [movieStore.filter.sortBy, movieStore.filter.sortOrder],
  () => {
    movieStore.filter.page = 1
    movieStore.fetchMovies()
  }
)

function handleRating(movieId: number, rating: number): void {
  window.api.updateMovieRating(movieId, rating).then(() => {
    const movie = movieStore.movies.find((m) => m.id === movieId)
    if (movie) movie.rating_local = rating
  })
}

function handlePageChange(page: number): void {
  movieStore.filter.page = page
  movieStore.fetchMovies()
}

// Genre filter
const genreOptions = filterStore.genres.map((g) => ({ label: g.name, value: g.id }))
watch(() => filterStore.genres, (genres) => {
  genreOptions.length = 0
  genreOptions.push(...genres.map(g => ({ label: g.name, value: g.id })))
})

function handleGenreFilter(values: number[]): void {
  movieStore.filter.genres = values
  movieStore.filter.page = 1
  movieStore.fetchMovies()
}

function handleRowClick(row: Movie): void {
  router.push(`/movie/${row.id}`)
}
</script>

<template>
  <div>
    <!-- Toolbar -->
    <NSpace align="center" justify="space-between" style="margin-bottom: 16px">
      <NSpace align="center">
        <NButtonGroup>
          <NButton :type="movieStore.viewMode === 'grid' ? 'primary' : 'default'" @click="movieStore.viewMode = 'grid'">
            海报墙
          </NButton>
          <NButton :type="movieStore.viewMode === 'list' ? 'primary' : 'default'" @click="movieStore.viewMode = 'list'">
            列表
          </NButton>
        </NButtonGroup>

        <NSelect
          :value="movieStore.filter.sortBy"
          :options="sortOptions"
          style="width: 120px"
          @update:value="(v: string) => movieStore.filter.sortBy = v as any"
        />
        <NSelect
          :value="movieStore.filter.sortOrder"
          :options="orderOptions"
          style="width: 80px"
          @update:value="(v: string) => movieStore.filter.sortOrder = v as any"
        />

        <NSelect
          :value="movieStore.filter.genres"
          :options="genreOptions"
          multiple
          clearable
          placeholder="类型筛选"
          style="min-width: 150px"
          @update:value="handleGenreFilter"
        />
      </NSpace>

      <NSpace>
        <span style="color: #999; font-size: 13px">共 {{ movieStore.total }} 部</span>
      </NSpace>
    </NSpace>

    <!-- Content -->
    <NSpin :show="movieStore.loading">
      <NEmpty v-if="!movieStore.loading && movieStore.movies.length === 0" description="暂无电影，请先配置目录并扫描" />

      <!-- Grid view -->
      <template v-if="movieStore.viewMode === 'grid' && movieStore.movies.length > 0">
        <NGrid :x-gap="16" :y-gap="16" cols="2 s:3 m:4 l:5 xl:6 2xl:8" responsive="screen">
          <NGi v-for="movie in movieStore.movies" :key="movie.id">
            <MovieCard :movie="movie" @rating-update="handleRating" />
          </NGi>
        </NGrid>
      </template>

      <!-- List view -->
      <template v-if="movieStore.viewMode === 'list' && movieStore.movies.length > 0">
        <NDataTable
          :columns="tableColumns"
          :data="movieStore.movies"
          :row-props="(row: Movie) => ({ style: 'cursor: pointer', onClick: () => handleRowClick(row) })"
          size="small"
        />
      </template>
    </NSpin>

    <!-- Pagination -->
    <div v-if="movieStore.total > (movieStore.filter.pageSize || 50)" style="margin-top: 20px; display: flex; justify-content: center">
      <NPagination
        :page="movieStore.filter.page || 1"
        :page-size="movieStore.filter.pageSize || 50"
        :item-count="movieStore.total"
        @update:page="handlePageChange"
      />
    </div>
  </div>
</template>
