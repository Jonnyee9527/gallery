<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NSpace,
  NButton,
  NRate,
  NTag,
  NText,
  NH2,
  NSpin,
  NAvatar,
  NGrid,
  NGi,
  NSelect,
  NEmpty
} from 'naive-ui'
import type { MovieDetail } from '../../../shared/types'
import { useFilterStore } from '@renderer/stores/filterStore'

const route = useRoute()
const router = useRouter()
const filterStore = useFilterStore()

const movie = ref<MovieDetail | null>(null)
const loading = ref(true)

const posterSrc = computed(() => {
  if (movie.value?.poster_path) {
    return `media://${encodeURIComponent(movie.value.poster_path)}`
  }
  return ''
})

const fanartSrc = computed(() => {
  if (movie.value?.fanart_path) {
    return `media://${encodeURIComponent(movie.value.fanart_path)}`
  }
  return ''
})

const availableTags = computed(() => {
  if (!movie.value) return []
  const existingIds = new Set(movie.value.tags.map((t) => t.id))
  return filterStore.tags.filter((t) => !existingIds.has(t.id))
})

onMounted(async () => {
  const id = Number(route.params.id)
  loading.value = true
  try {
    movie.value = await window.api.getMovieDetail(id)
    await filterStore.fetchTags()
  } finally {
    loading.value = false
  }
})

async function handleRating(val: number): Promise<void> {
  if (!movie.value) return
  const rating = val * 2
  await window.api.updateMovieRating(movie.value.id, rating)
  movie.value.rating_local = rating
}

async function handleFavorite(): Promise<void> {
  if (!movie.value) return
  const isFav = await window.api.toggleMovieFavorite(movie.value.id)
  movie.value.is_favorite = isFav ? 1 : 0
}

async function handlePlay(): Promise<void> {
  if (!movie.value?.file_path) return
  await window.api.openPlayer(movie.value.file_path)
}

async function handleOpenDir(): Promise<void> {
  if (!movie.value) return
  const filePath = movie.value.file_path || movie.value.nfo_path
  if (filePath) await window.api.openDirectory(filePath)
}

async function addTag(tagId: number): Promise<void> {
  if (!movie.value) return
  await window.api.addTagToMovie(movie.value.id, tagId)
  movie.value = await window.api.getMovieDetail(movie.value.id)
}

async function removeTag(tagId: number): Promise<void> {
  if (!movie.value) return
  await window.api.removeTagFromMovie(movie.value.id, tagId)
  movie.value = await window.api.getMovieDetail(movie.value.id)
}

function getActorThumb(thumb: string): string {
  if (thumb) return `media://${encodeURIComponent(thumb)}`
  return ''
}
</script>

<template>
  <NSpin :show="loading">
    <div v-if="movie">
      <!-- Fanart Background -->
      <div
        v-if="fanartSrc"
        style="
          position: relative;
          margin: -20px -20px 20px -20px;
          height: 300px;
          overflow: hidden;
          background: #0a0a0a;
        "
      >
        <img :src="fanartSrc" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.4" />
        <div
          style="
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 100px;
            background: linear-gradient(transparent, #18181c);
          "
        />
      </div>

      <div style="display: flex; gap: 24px; flex-wrap: wrap">
        <!-- Poster -->
        <div style="flex-shrink: 0; width: 250px">
          <img
            v-if="posterSrc"
            :src="posterSrc"
            :alt="movie.title"
            style="width: 100%; border-radius: 8px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5)"
          />
          <div
            v-else
            style="
              width: 250px;
              height: 375px;
              background: #1a1a2e;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 60px;
            "
          >
            🎬
          </div>
        </div>

        <!-- Info -->
        <div style="flex: 1; min-width: 300px">
          <NButton text style="margin-bottom: 8px" @click="router.back()">← 返回</NButton>
          <NH2 style="margin: 0 0 4px 0">{{ movie.title }}</NH2>
          <NText
            v-if="movie.original_title && movie.original_title !== movie.title"
            depth="3"
            style="display: block; margin-bottom: 12px"
          >
            {{ movie.original_title }}
          </NText>

          <NSpace align="center" style="margin-bottom: 12px">
            <NRate
              :value="(movie.rating_local || 0) / 2"
              :count="5"
              allow-half
              @update:value="handleRating"
            />
            <NText depth="3">{{ movie.rating_local || '-' }} / 10</NText>
            <NButton
              :type="movie.is_favorite ? 'warning' : 'default'"
              size="small"
              @click="handleFavorite"
            >
              {{ movie.is_favorite ? '★ 已收藏' : '☆ 收藏' }}
            </NButton>
          </NSpace>

          <NSpace style="margin-bottom: 12px" :size="[16, 4]">
            <NText v-if="movie.year"><strong>年份:</strong> {{ movie.year }}</NText>
            <NText v-if="movie.runtime"><strong>时长:</strong> {{ movie.runtime }}分钟</NText>
            <NText v-if="movie.director"><strong>导演:</strong> {{ movie.director }}</NText>
            <NText v-if="movie.studio"><strong>制片厂:</strong> {{ movie.studio }}</NText>
          </NSpace>

          <!-- Genres -->
          <div v-if="movie.genres.length > 0" style="margin-bottom: 12px">
            <NText strong style="margin-right: 8px">类型:</NText>
            <NTag
              v-for="g in movie.genres"
              :key="g.id"
              size="small"
              type="info"
              style="margin: 2px"
            >
              {{ g.name }}
            </NTag>
          </div>

          <!-- Tags -->
          <div style="margin-bottom: 12px">
            <NText strong style="margin-right: 8px">标签:</NText>
            <NTag
              v-for="t in movie.tags"
              :key="t.id"
              closable
              size="small"
              :type="t.is_custom ? 'success' : 'default'"
              style="margin: 2px"
              @close="removeTag(t.id)"
            >
              {{ t.name }}
            </NTag>
            <NSelect
              :options="availableTags.map((t) => ({ label: t.name, value: t.id }))"
              placeholder="添加标签"
              filterable
              size="small"
              style="width: 150px; display: inline-block; vertical-align: middle"
              @update:value="addTag"
            />
          </div>

          <!-- Plot -->
          <div v-if="movie.plot" style="margin-bottom: 16px">
            <NText strong>剧情简介:</NText>
            <p style="margin-top: 4px; color: #aaa; line-height: 1.6">{{ movie.plot }}</p>
          </div>

          <!-- Actions -->
          <NSpace>
            <NButton type="primary" :disabled="!movie.file_path" @click="handlePlay">
              ▶ 播放
            </NButton>
            <NButton @click="handleOpenDir">📁 打开目录</NButton>
          </NSpace>
        </div>
      </div>

      <!-- Actors -->
      <div v-if="movie.actors.length > 0" style="margin-top: 30px">
        <NH2 style="font-size: 16px">演员</NH2>
        <NGrid :x-gap="12" :y-gap="12" cols="3 s:4 m:5 l:6 xl:8" responsive="screen">
          <NGi v-for="actor in movie.actors" :key="actor.id">
            <div style="text-align: center">
              <NAvatar v-if="actor.thumb" round :size="64" :src="getActorThumb(actor.thumb)" />
              <NAvatar v-else round :size="64">
                {{ actor.name.charAt(0) }}
              </NAvatar>
              <div style="margin-top: 4px">
                <NText style="font-size: 12px; display: block">{{ actor.name }}</NText>
                <NText depth="3" style="font-size: 11px">{{ actor.role }}</NText>
              </div>
            </div>
          </NGi>
        </NGrid>
      </div>
    </div>
    <NEmpty v-else-if="!loading" description="电影不存在" />
  </NSpin>
</template>
