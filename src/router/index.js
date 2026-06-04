import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import AlertDetail from '../views/AlertDetail.vue'
import { useAppStore } from '@/store/modules/app';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/alert-detail',
    name: 'AlertDetail',
    component: AlertDetail
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})


// 全局前置守卫
router.beforeEach(async (to, from, next) => {
  // 示例：检查用户是否登录
  // const isLoggedIn = store.state.user.isLoggedIn; 
  next();
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
