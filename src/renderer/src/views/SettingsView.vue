<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  NH2,
  NCard,
  NSpace,
  NButton,
  NInput,
  NSelect,
  NList,
  NListItem,
  NTag,
  NText,
  NPopconfirm,
  useMessage
} from 'naive-ui'
import { useSettingsStore } from '@renderer/stores/settingsStore'
import { useFilterStore } from '@renderer/stores/filterStore'

declare global {
  interface Window {
    api: {
      selectDirectory: () => Promise<string | null>
      addDirectory: (dir: { path: string; type: 'nfo' | 'video'; label: string }) => Promise<void>
      removeDirectory: (id: number) => Promise<void>
      selectFile: () => Promise<string | null>
      setSetting: (key: string, value: any) => Promise<void>
      createTag: (name: string) => Promise<void>
      deleteTag: (id: number) => Promise<void>
      createCustomField: (name: string, fieldType: string) => Promise<void>
      deleteCustomField: (id: number) => Promise<void>
      resetDatabase: () => Promise<void>
    }
  }
}

const settingsStore = useSettingsStore()
const filterStore = useFilterStore()
const message = useMessage()

const newTagName = ref('')
const newFieldName = ref('')
const newFieldType = ref('text')

const fieldTypeOptions = [
  { label: '文本', value: 'text' },
  { label: '数字', value: 'number' },
  { label: '日期', value: 'date' },
  { label: '布尔值', value: 'boolean' }
]

onMounted(async () => {
  await settingsStore.fetchAll()
  await filterStore.fetchTags()
})

// Directory management
async function addNfoDir(): Promise<void> {
  const path = await window.api.selectDirectory()
  if (!path) return
  await window.api.addDirectory({ path, type: 'nfo', label: '' })
  await settingsStore.fetchDirectories()
  message.success('NFO 目录已添加')
}

async function addVideoDir(): Promise<void> {
  const path = await window.api.selectDirectory()
  if (!path) return
  await window.api.addDirectory({ path, type: 'video', label: '' })
  await settingsStore.fetchDirectories()
  message.success('视频目录已添加')
}

async function removeDir(id: number): Promise<void> {
  await window.api.removeDirectory(id)
  await settingsStore.fetchDirectories()
  message.success('目录已移除')
}

// Player path
async function selectPlayerPath(): Promise<void> {
  const path = await window.api.selectFile()
  if (!path) return
  await window.api.setSetting('externalPlayerPath', path)
  settingsStore.externalPlayerPath = path
  message.success('播放器路径已设置')
}

async function clearPlayerPath(): Promise<void> {
  await window.api.setSetting('externalPlayerPath', '')
  settingsStore.externalPlayerPath = ''
}

// Tags
async function createTag(): Promise<void> {
  if (!newTagName.value.trim()) return
  await window.api.createTag(newTagName.value.trim())
  newTagName.value = ''
  await filterStore.fetchTags()
  message.success('标签已创建')
}

async function deleteTag(tagId: number): Promise<void> {
  await window.api.deleteTag(tagId)
  await filterStore.fetchTags()
  message.success('标签已删除')
}

// Custom Fields
async function createField(): Promise<void> {
  if (!newFieldName.value.trim()) return
  await window.api.createCustomField(newFieldName.value.trim(), newFieldType.value)
  newFieldName.value = ''
  await settingsStore.fetchCustomFields()
  message.success('自定义字段已创建')
}

async function deleteField(id: number): Promise<void> {
  await window.api.deleteCustomField(id)
  await settingsStore.fetchCustomFields()
  message.success('字段已删除')
}

// Database
async function handleResetDb(): Promise<void> {
  await window.api.resetDatabase()
  message.success('数据库已重置')
}
</script>

<template>
  <div style="max-width: 800px">
    <NH2>设置</NH2>

    <!-- NFO Directories -->
    <NCard title="NFO 目录" style="margin-bottom: 16px">
      <NList v-if="settingsStore.nfoDirectories.length > 0" bordered>
        <NListItem v-for="dir in settingsStore.nfoDirectories" :key="dir.id">
          <NText>{{ dir.path }}</NText>
          <template #suffix>
            <NButton text type="error" @click="removeDir(dir.id)">删除</NButton>
          </template>
        </NListItem>
      </NList>
      <NText v-else depth="3" style="display: block; margin-bottom: 8px">尚未添加 NFO 目录</NText>
      <NButton style="margin-top: 8px" @click="addNfoDir">+ 添加 NFO 目录</NButton>
    </NCard>

    <!-- Video Directories -->
    <NCard title="视频目录" style="margin-bottom: 16px">
      <NList v-if="settingsStore.videoDirectories.length > 0" bordered>
        <NListItem v-for="dir in settingsStore.videoDirectories" :key="dir.id">
          <NText>{{ dir.path }}</NText>
          <template #suffix>
            <NButton text type="error" @click="removeDir(dir.id)">删除</NButton>
          </template>
        </NListItem>
      </NList>
      <NText v-else depth="3" style="display: block; margin-bottom: 8px">尚未添加视频目录</NText>
      <NButton style="margin-top: 8px" @click="addVideoDir">+ 添加视频目录</NButton>
    </NCard>

    <!-- External Player -->
    <NCard title="外部播放器" style="margin-bottom: 16px">
      <NSpace align="center">
        <NText>{{ settingsStore.externalPlayerPath || '使用系统默认播放器' }}</NText>
        <NButton size="small" @click="selectPlayerPath">选择播放器</NButton>
        <NButton v-if="settingsStore.externalPlayerPath" size="small" @click="clearPlayerPath"
          >清除</NButton
        >
      </NSpace>
    </NCard>

    <!-- Custom Tags -->
    <NCard title="自定义标签" style="margin-bottom: 16px">
      <div style="margin-bottom: 8px">
        <NTag
          v-for="tag in filterStore.tags.filter((t) => t.is_custom)"
          :key="tag.id"
          closable
          type="success"
          style="margin: 2px"
          @close="deleteTag(tag.id)"
        >
          {{ tag.name }}
        </NTag>
      </div>
      <NSpace>
        <NInput
          v-model:value="newTagName"
          placeholder="标签名称"
          size="small"
          @keydown.enter="createTag"
        />
        <NButton size="small" type="primary" @click="createTag">创建</NButton>
      </NSpace>
    </NCard>

    <!-- Custom Fields -->
    <NCard title="自定义字段" style="margin-bottom: 16px">
      <NList v-if="settingsStore.customFields.length > 0" bordered style="margin-bottom: 8px">
        <NListItem v-for="field in settingsStore.customFields" :key="field.id">
          <NSpace align="center">
            <NText>{{ field.name }}</NText>
            <NTag size="small" type="info">{{ field.field_type }}</NTag>
          </NSpace>
          <template #suffix>
            <NButton text type="error" @click="deleteField(field.id)">删除</NButton>
          </template>
        </NListItem>
      </NList>
      <NSpace>
        <NInput v-model:value="newFieldName" placeholder="字段名称" size="small" />
        <NSelect
          v-model:value="newFieldType"
          :options="fieldTypeOptions"
          size="small"
          style="width: 100px"
        />
        <NButton size="small" type="primary" @click="createField">添加</NButton>
      </NSpace>
    </NCard>

    <!-- Database Operations -->
    <NCard title="数据库操作" style="margin-bottom: 16px">
      <NPopconfirm @positive-click="handleResetDb">
        <template #trigger>
          <NButton type="error">重置数据库</NButton>
        </template>
        确定要清空并重建数据库吗？此操作不可逆。
      </NPopconfirm>
    </NCard>
  </div>
</template>
