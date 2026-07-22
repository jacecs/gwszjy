import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue')
  },
  {
    path: '/alert-detail',
    name: 'AlertDetail',
    component: () => import('../views/AlertDetail.vue')
  },
  {
    path: '/camera-monitor',
    name: 'CameraMonitor',
    component: () => import('../views/CameraMonitor.vue')
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})


// 全局前置守卫
router.beforeEach(async (to, from) => {
  // 示例：检查用户是否登录
  // const isLoggedIn = store.state.user.isLoggedIn; 
  return true
  // return 
  // const appStore = useAppStore();
  // console.log(`导航从 ${from.path} 到 ${to.path}`);

  // if (appStore.appInfo &&  Object.keys(appStore.appInfo).length) {
  //   console.log('appInfo', appStore.appInfo);
  //   next();
  // } else {
  //   await  appStore.getTokenInfo()
  //   next();
  // }
});

export default router
