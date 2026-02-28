<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { NCard, NRate, NText, NDropdown } from 'naive-ui'
import type { Movie } from '../../../shared/types'

const props = defineProps<{
  movie: Movie
}>()

const emit = defineEmits<{
  ratingUpdate: [movieId: number, rating: number]
}>()

const router = useRouter()

const posterSrc = computed(() => {
  if (props.movie.poster_path) {
    return `media://${encodeURIComponent(props.movie.poster_path)}`
  }
  return ''
})

const menuOptions = [
  { label: '播放', key: 'play' },
  { label: '打开目录', key: 'openDir' },
  { label: '查看详情', key: 'detail' },
  { label: '删除', key: 'delete' }
]

function handleMenuSelect(key: string): void {
  if (key === 'play' && props.movie.file_path) {
    window.api.openPlayer(props.movie.file_path)
  } else if (key === 'openDir') {
    const filePath = props.movie.file_path || props.movie.nfo_path
    if (filePath) window.api.openDirectory(filePath)
  } else if (key === 'detail') {
    router.push(`/movie/${props.movie.id}`)
  } else if (key === 'delete') {
    window.api.deleteMovie(props.movie.id)
  }
}

function handleClick(): void {
  router.push(`/movie/${props.movie.id}`)
}

function handleRating(val: number): void {
  emit('ratingUpdate', props.movie.id, val * 2) // 5-star UI → 10-point scale
}
</script>

<template>
  <NDropdown :options="menuOptions" trigger="manual" :show="false" @select="handleMenuSelect">
    <NCard
      hoverable
      :bordered="false"
      style="
        cursor: pointer;
        background: rgba(255, 255, 255, 0.04);
        border-radius: 8px;
        overflow: hidden;
      "
      :content-style="{ padding: 0 }"
      @click="handleClick"
      @contextmenu.prevent="
        () => {
          /* handled by dropdown */
        }
      "
    >
      <div style="position: relative; padding-top: 150%; background: #1a1a2e">
        <img
          v-if="posterSrc"
          :src="posterSrc"
          :alt="movie.title"
          loading="lazy"
          style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover"
        />
        <div
          v-else
          style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #555;
            font-size: 40px;
          "
        >
          🎬
        </div>
        <div
          style="
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: linear-gradient(transparent, rgba(0, 0, 0, 0.85));
            padding: 8px;
          "
        >
          <NRate
            :value="(movie.rating_local || 0) / 2"
            :count="5"
            allow-half
            size="small"
            style="display: flex"
            @update:value="handleRating"
            @click.stop
          />
        </div>
      </div>
      <div style="padding: 8px">
        <NText
          strong
          style="
            display: block;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-size: 13px;
          "
        >
          {{ movie.title }}
        </NText>
        <NText depth="3" style="font-size: 12px">{{ movie.year || '-' }}</NText>
      </div>
    </NCard>
  </NDropdown>
</template>
