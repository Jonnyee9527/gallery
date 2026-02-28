<script setup lang="ts">
import { h, ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  NLayout,
  NLayoutSider,
  NLayoutContent,
  NMenu,
  NInput,
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  darkTheme
} from 'naive-ui'
import type { MenuOption } from 'naive-ui'
import { useMovieStore } from '@renderer/stores/movieStore'
import ScanProgress from '@renderer/components/ScanProgress.vue'

const router = useRouter()
const route = useRoute()
const movieStore = useMovieStore()
const searchValue = ref('')

const menuOptions: MenuOption[] = [
  {
    label: '媒体库',
    key: 'library',
    icon: () => h('span', { style: 'font-size: 18px' }, '🎬')
  },
  {
    label: '设置',
    key: 'settings',
    icon: () => h('span', { style: 'font-size: 18px' }, '⚙️')
  }
]

const activeKey = computed(() => {
  if (route.path.startsWith('/settings')) return 'settings'
  return 'library'
})

function handleMenuUpdate(key: string): void {
  if (key === 'library') router.push('/')
  else if (key === 'settings') router.push('/settings')
}

function handleSearch(): void {
  movieStore.filter.search = searchValue.value
  movieStore.filter.page = 1
  movieStore.fetchMovies()
  if (route.path !== '/') router.push('/')
}
</script>

<template>
  <NConfigProvider :theme="darkTheme">
    <NMessageProvider>
      <NDialogProvider>
        <NLayout has-sider style="height: 100vh">
          <NLayoutSider
            bordered
            :width="200"
            :collapsed-width="64"
            collapse-mode="width"
            show-trigger
            style="height: 100vh"
          >
            <div style="padding: 16px; text-align: center; font-size: 18px; font-weight: bold">
              Gallery
            </div>
            <NMenu :value="activeKey" :options="menuOptions" @update:value="handleMenuUpdate" />
          </NLayoutSider>
          <NLayout>
            <div
              style="
                padding: 12px 20px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.09);
                display: flex;
                align-items: center;
                gap: 12px;
              "
            >
              <NInput
                v-model:value="searchValue"
                placeholder="搜索电影..."
                clearable
                style="max-width: 400px"
                @keydown.enter="handleSearch"
                @clear="handleSearch"
              />
              <ScanProgress />
            </div>
            <NLayoutContent style="padding: 20px; height: calc(100vh - 57px); overflow: auto">
              <router-view />
            </NLayoutContent>
          </NLayout>
        </NLayout>
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>
