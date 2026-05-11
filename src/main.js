
import { createApp } from 'vue';
import store from './store';
import router from './router'
import './style.css'
import Home from './App.vue'

const app = createApp(Home)
app.use(store);
app.use(router)
app.mount('#app')
export const setViewer = (viewer) => {
  app.config.globalProperties.$viewer = viewer
}
export const setThree = (three) => {
  app.config.globalProperties.$three = three
}