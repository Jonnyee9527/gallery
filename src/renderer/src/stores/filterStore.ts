import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Genre, Tag, Actor } from '../../../shared/types'

export const useFilterStore = defineStore('filter', () => {
  const genres = ref<Genre[]>([])
  const tags = ref<Tag[]>([])
  const actors = ref<Actor[]>([])

  async function fetchGenres(): Promise<void> {
    genres.value = (await window.api.getGenres()) as Genre[]
  }

  async function fetchTags(): Promise<void> {
    tags.value = await window.api.getTags()
  }

  async function fetchActors(): Promise<void> {
    actors.value = (await window.api.getActors()) as Actor[]
  }

  async function fetchAll(): Promise<void> {
    await Promise.all([fetchGenres(), fetchTags(), fetchActors()])
  }

  return { genres, tags, actors, fetchGenres, fetchTags, fetchActors, fetchAll }
})
