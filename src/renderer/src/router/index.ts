import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'library',
      component: () => import('@renderer/views/LibraryView.vue')
    },
    {
      path: '/movie/:id',
      name: 'movieDetail',
      component: () => import('@renderer/views/MovieDetailView.vue'),
      props: true
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@renderer/views/SettingsView.vue')
    }
  ]
})

export default router
