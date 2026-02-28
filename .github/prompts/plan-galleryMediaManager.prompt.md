## Plan: 本地媒体库管理器（Gallery）

基于现有 electron-vite + Vue 3 脚手架，构建一个电影媒体资源管理应用。核心流程：用户配置 NFO 目录和视频目录 → 扫描 NFO（Jellyfin/Emby XML 格式）→ 通过文件名匹配关联视频文件 → 数据入库 → 海报墙浏览/筛选/评分/标签管理。技术栈选用 **Naive UI** 作为 UI 框架、**better-sqlite3** 作为本地数据库、**Pinia** 状态管理、**Vue Router** 路由。

---

**Steps**

### 第一阶段：项目基础设施

1. **安装核心依赖**
   - 运行时依赖：`naive-ui`、`pinia`、`vue-router`、`better-sqlite3`、`fast-xml-parser`（解析 NFO XML）
   - 开发依赖：`@types/better-sqlite3`
   - Naive UI 需要在 `src/renderer/src/main.ts` 中注册

2. **配置 electron-vite 的 native 模块支持**
   - 在 `electron.vite.config.ts` 中将 `better-sqlite3` 设为 externals（主进程侧）
   - 确认 electron-builder 配置（`electron-builder.yml`）中 `better-sqlite3` 能正确打包（`asarUnpack` 添加 native 模块路径）

3. **调整 CSP 策略**
   - 修改 `src/renderer/index.html` 的 CSP，允许加载本地磁盘图片（`img-src 'self' data: file:` 或通过自定义协议）

4. **注册自定义协议 `media://`**
   - 在 `src/main/index.ts` 中使用 `protocol.registerFileProtocol` 注册 `media://` 协议，用于安全加载本地磁盘上的封面图和缩略图，避免 CSP 限制

### 第二阶段：数据库层

5. **创建数据库管理模块** `src/main/database/index.ts`
   - 使用 `better-sqlite3`，数据库文件存储在 `app.getPath('userData')` 下
   - 启动时自动创建/迁移表结构

6. **数据库 Schema 设计**（创建 `src/main/database/schema.ts`）

   | 表名 | 关键字段 |
   |---|---|
   | `movies` | id, title, original_title, sort_title, year, plot, rating_local(用户评分), rating_nfo(NFO中评分), runtime, studio, director, file_path, nfo_path, poster_path, fanart_path, is_favorite, created_at, updated_at |
   | `genres` | id, name |
   | `movie_genres` | movie_id, genre_id |
   | `actors` | id, name, thumb |
   | `movie_actors` | movie_id, actor_id, role, sort_order |
   | `tags` | id, name, is_custom (区分NFO标签和用户自建标签) |
   | `movie_tags` | movie_id, tag_id |
   | `custom_fields` | id, name, field_type (text/number/date/boolean) |
   | `movie_custom_fields` | movie_id, field_id, value |
   | `directories` | id, path, type ('nfo'/'video'), label |
   | `settings` | key, value (键值对存储应用设置) |

7. **创建数据库 DAO 层** `src/main/database/dao/`
   - `movieDao.ts` — CRUD、分页查询、多条件筛选、全文搜索
   - `tagDao.ts` — 标签增删改查
   - `settingsDao.ts` — 应用设置读写
   - 所有查询使用 prepared statements，支持复合筛选（评分范围、年份、类型、演员、标签、自定义字段的 AND/OR 组合）

### 第三阶段：NFO 解析与扫描引擎

8. **创建 NFO 解析器** `src/main/scanner/nfoParser.ts`
   - 使用 `fast-xml-parser` 解析 Jellyfin/Emby 格式的 movie NFO
   - 提取字段：`title`, `originaltitle`, `sorttitle`, `year`, `plot`, `runtime`, `genre`（多个）, `tag`（多个）, `studio`, `director`, `actor`（name + role + thumb）, `rating`, `uniqueid`（IMDB/TMDB）
   - 同目录下查找封面图：`poster.jpg/png`, `fanart.jpg/png`, `thumb.jpg/png`，以及与 NFO 同名的 `-poster.jpg`, `-fanart.jpg`

9. **创建目录扫描器** `src/main/scanner/directoryScanner.ts`
   - 递归扫描指定 NFO 目录，收集所有 `.nfo` 文件
   - 按文件名（去后缀）在视频目录中查找匹配的视频文件（支持 `.mp4`, `.mkv`, `.avi`, `.wmv`, `.mov`, `.ts`, `.flv` 等）
   - 支持增量扫描（对比数据库中已有记录，仅处理新增/变更文件）
   - 扫描进度通过 IPC 事件推送到渲染进程

10. **创建扫描主控** `src/main/scanner/scanManager.ts`
    - 协调解析与入库流程：扫描 NFO → 解析 → 匹配视频 → 写入数据库
    - 处理冲突/重复检测（基于文件路径去重）
    - 支持取消扫描

### 第四阶段：IPC 通信层

11. **设计 IPC API**（`src/main/ipc/` 目录）
    - `ipc/movieHandlers.ts` — 电影列表查询、详情、评分更新、收藏切换
    - `ipc/scanHandlers.ts` — 触发扫描、扫描进度事件、取消扫描
    - `ipc/tagHandlers.ts` — 标签管理
    - `ipc/settingsHandlers.ts` — 目录管理、外部播放器路径设置、应用设置
    - `ipc/fileHandlers.ts` — 打开外部播放器、打开文件所在目录

12. **更新 Preload 脚本** `src/preload/index.ts`
    - 通过 `contextBridge` 暴露类型安全的 API 到 `window.api`
    - 定义通道名称常量，统一管理

13. **创建 IPC 类型定义** `src/shared/types.ts`
    - 定义 Movie、Actor、Genre、Tag、ScanProgress 等 TypeScript 接口
    - 主进程和渲染进程共享类型

### 第五阶段：渲染进程 — 路由与状态管理

14. **配置 Vue Router** `src/renderer/src/router/index.ts`
    - 路由：`/` (首页/媒体库)、`/movie/:id` (详情)、`/settings` (设置)、`/scan` (扫描导入)

15. **配置 Pinia Store** `src/renderer/src/stores/`
    - `movieStore.ts` — 电影列表、当前筛选条件、分页状态、排序方式
    - `filterStore.ts` — 可用筛选项（类型列表、年份范围、演员列表、标签列表）
    - `settingsStore.ts` — 应用设置（目录配置、播放器路径、UI偏好）
    - `scanStore.ts` — 扫描状态与进度

### 第六阶段：渲染进程 — 页面与组件

16. **布局组件** `src/renderer/src/layouts/MainLayout.vue`
    - 左侧/顶部导航栏（Naive UI `n-layout` + `n-menu`）
    - 导航项：媒体库、设置
    - 顶部搜索栏
    - 暗色主题（利用现有 `base.css` 的暗色变量 + Naive UI 暗色主题）

17. **媒体库首页** `src/renderer/src/views/LibraryView.vue`
    - **海报墙模式**：响应式网格，每张卡片显示封面图、标题、年份、用户评分星级
    - **列表模式**：表格视图，更多列信息
    - 顶部工具栏：视图切换、排序（标题/年份/评分/添加时间）、扫描按钮
    - 侧边/顶部筛选面板：类型多选、年份范围滑块、评分范围、演员搜索、标签筛选、自定义字段筛选
    - 虚拟滚动（Naive UI `n-virtual-list` 或 `vue-virtual-scroller`）应对大量数据
    - 无限滚动加载或分页

18. **电影卡片组件** `src/renderer/src/components/MovieCard.vue`
    - 封面图（通过 `media://` 协议加载）、悬浮显示评分/操作按钮
    - 右键菜单：打开播放器、打开目录、编辑、删除
    - 快速评分（悬浮星级组件）

19. **电影详情页** `src/renderer/src/views/MovieDetailView.vue`
    - 顶部：大封面图 + fanart 背景
    - 信息区：标题、原始标题、年份、时长、导演、制片厂、剧情简介
    - 评分：可编辑的星级评分组件（1-10分或5星）
    - 标签区：显示已有标签，支持添加/移除自定义标签
    - 演员列表：头像 + 姓名 + 角色
    - 收藏按钮
    - 自定义字段区域
    - 操作按钮：播放（调用外部播放器）、打开文件目录

20. **设置页面** `src/renderer/src/views/SettingsView.vue`
    - 目录管理：添加/删除 NFO 目录和视频目录（使用 Electron `dialog.showOpenDialog`）
    - 外部播放器路径设置
    - 自定义字段管理（增删改字段名、类型）
    - 自定义标签管理
    - 数据库操作：清空/重建数据库、导出/导入数据

21. **扫描进度组件** `src/renderer/src/components/ScanProgress.vue`
    - 显示扫描进度条、当前处理文件、已处理/总数
    - 支持取消扫描
    - 扫描完成后显示统计（新增/更新/跳过/失败数量）

### 第七阶段：对接与联调

22. **外部播放器调用** `src/main/player/externalPlayer.ts`
    - 通过 `child_process.spawn` 启动外部播放器，传入视频文件路径
    - 支持 PotPlayer、VLC、mpv 等常见播放器
    - 默认使用系统关联的播放器（`shell.openPath`）

23. **封面图缩略图缓存**
    - 在 `userData` 目录下创建缩略图缓存，首次加载时生成缩略图（降低分辨率）
    - 避免每次渲染时加载原始大图，提升海报墙性能

### 第八阶段：优化与完善

24. **性能优化**
    - 数据库查询添加索引（title、year、rating_local、file_path）
    - 海报墙使用虚拟滚动 + 图片懒加载
    - 大量扫描时使用批量插入事务

25. **错误处理与日志**
    - 挂载磁盘不可用时的友好提示（扫描前检测目录可达性）
    - NFO 解析失败时的容错处理与日志记录
    - IPC 通信错误统一处理

26. **应用打包配置**
    - 更新 `electron-builder.yml` 的 `appId`、图标等
    - 确保 `better-sqlite3` native 模块在打包后正常工作（`asarUnpack`）

---

**Verification**

- **单元测试**：NFO 解析器使用若干真实/模拟的 NFO 文件测试正确解析
- **集成测试**：扫描流程 — 准备测试目录结构（NFO + 视频 mock 文件），验证入库数据完整性
- **手动测试清单**：
  1. 添加 NFO 目录和视频目录 → 触发扫描 → 确认海报墙显示正确
  2. 筛选：按类型、年份、评分、演员、标签分别验证
  3. 评分：修改评分 → 刷新后数据持久化
  4. 标签：创建自定义标签、关联/取消关联
  5. 播放：点击播放 → 外部播放器正确打开
  6. 增量扫描：新增 NFO 后重新扫描 → 仅新增入库
  7. 挂载磁盘离线时 → 友好提示而非崩溃

---

**Decisions**

- **数据库选型**：`better-sqlite3` — 同步 API、无需额外进程、Electron 生态成熟，优于 `sql.js`（性能）和 `nedb`（功能有限）
- **NFO 解析库**：`fast-xml-parser` — 比 `xml2js` 更快、zero dependency、支持属性解析
- **本地图片加载**：通过自定义 `media://` 协议解决 CSP 限制，优于修改 CSP 为 `file://`（更安全）
- **评分与标签仅存本地**：不写回 NFO 文件，避免对刮削数据造成污染
- **先外部播放器，预留内置播放接口**：降低初期复杂度，后续可集成 `video.js` 或 `mpv.js`
