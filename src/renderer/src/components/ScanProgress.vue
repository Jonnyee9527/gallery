<script setup lang="ts">
import { ref, computed } from 'vue'
import { useScanStore } from '@renderer/stores/scanStore'
import { NButton, NProgress, NText, NModal, NList, NListItem, NCheckbox, NSpace } from 'naive-ui'

const scanStore = useScanStore()

// Conflict dialog: track which movies the user selects to overwrite
const selectedConflictIds = ref<number[]>([])

const allSelected = computed(
  () =>
    scanStore.nfoConflicts.length > 0 &&
    selectedConflictIds.value.length === scanStore.nfoConflicts.length
)

function toggleSelectAll(checked: boolean): void {
  selectedConflictIds.value = checked ? scanStore.nfoConflicts.map((c) => c.movieId) : []
}

function toggleConflict(movieId: number, checked: boolean): void {
  if (checked) {
    selectedConflictIds.value.push(movieId)
  } else {
    selectedConflictIds.value = selectedConflictIds.value.filter((id) => id !== movieId)
  }
}

function handleScan(): void {
  scanStore.startScan()
}

function handleImportNfo(): void {
  scanStore.importNfo()
}

function handleForceImport(): void {
  if (selectedConflictIds.value.length === 0) return
  scanStore.importNfoForce(selectedConflictIds.value)
  selectedConflictIds.value = []
}

function handleDismissConflicts(): void {
  scanStore.dismissConflicts()
  selectedConflictIds.value = []
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
    <template v-else-if="scanStore.isImportingNfo">
      <NText depth="3" style="font-size: 12px">正在导入 NFO 数据...</NText>
    </template>
    <template v-else>
      <NButton size="small" type="primary" @click="handleScan">扫描媒体库</NButton>
      <NButton size="small" @click="handleImportNfo">导入 NFO</NButton>
      <NText v-if="scanStore.lastStats" depth="3" style="font-size: 12px">
        新增 {{ scanStore.lastStats.added }} | 跳过 {{ scanStore.lastStats.skipped }} | 失败
        {{ scanStore.lastStats.failed }}
      </NText>
      <NText
        v-if="scanStore.nfoImportResult && !scanStore.showConflictDialog"
        depth="3"
        style="font-size: 12px"
      >
        NFO: 应用 {{ scanStore.nfoImportResult.applied }} | 跳过
        {{ scanStore.nfoImportResult.skipped }} | 失败
        {{ scanStore.nfoImportResult.failed }}
      </NText>
    </template>

    <!-- NFO Conflict Dialog -->
    <NModal
      v-model:show="scanStore.showConflictDialog"
      :mask-closable="false"
      preset="card"
      title="NFO 覆盖确认"
      style="width: 600px; max-width: 90vw"
    >
      <NText depth="2" style="display: block; margin-bottom: 12px">
        以下 {{ scanStore.nfoConflicts.length }} 部影片已导入过 NFO 数据，是否覆盖？
      </NText>
      <div style="margin-bottom: 8px">
        <NCheckbox :checked="allSelected" @update:checked="toggleSelectAll">全选</NCheckbox>
      </div>
      <NList bordered style="max-height: 300px; overflow-y: auto">
        <NListItem v-for="conflict in scanStore.nfoConflicts" :key="conflict.movieId">
          <NSpace align="center">
            <NCheckbox
              :checked="selectedConflictIds.includes(conflict.movieId)"
              @update:checked="(v: boolean) => toggleConflict(conflict.movieId, v)"
            />
            <div>
              <NText>{{ conflict.title }}</NText>
              <br />
              <NText depth="3" style="font-size: 12px">{{ conflict.filePath }}</NText>
            </div>
          </NSpace>
        </NListItem>
      </NList>
      <NSpace justify="end" style="margin-top: 12px">
        <NButton @click="handleDismissConflicts">跳过</NButton>
        <NButton
          type="primary"
          :disabled="selectedConflictIds.length === 0"
          @click="handleForceImport"
        >
          覆盖选中 ({{ selectedConflictIds.length }})
        </NButton>
      </NSpace>
    </NModal>
  </div>
</template>
