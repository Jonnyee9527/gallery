<script setup lang="ts">
import { useScanStore } from '@renderer/stores/scanStore'
import { NButton, NProgress, NText } from 'naive-ui'

const scanStore = useScanStore()

function handleScan(): void {
  scanStore.startScan()
}
</script>

<template>
  <div style="display: flex; align-items: center; gap: 8px; flex: 1">
    <template v-if="scanStore.isScanning">
      <NProgress
        type="line"
        :percentage="
          scanStore.progress.total > 0
            ? Math.round((scanStore.progress.current / scanStore.progress.total) * 100)
            : 0
        "
        :show-indicator="false"
        style="width: 200px"
      />
      <NText
        depth="3"
        style="
          font-size: 12px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 300px;
        "
      >
        {{ scanStore.progress.current }}/{{ scanStore.progress.total }}
        {{
          scanStore.progress.currentFile
            ? `- ${scanStore.progress.currentFile.split(/[\\/]/).pop()}`
            : ''
        }}
      </NText>
      <NButton size="small" type="error" @click="scanStore.cancelScan()">取消</NButton>
    </template>
    <template v-else>
      <NButton size="small" type="primary" @click="handleScan">扫描媒体库</NButton>
      <NText v-if="scanStore.lastStats" depth="3" style="font-size: 12px">
        新增 {{ scanStore.lastStats.added }} | 跳过 {{ scanStore.lastStats.skipped }} | 失败
        {{ scanStore.lastStats.failed }}
      </NText>
    </template>
  </div>
</template>
