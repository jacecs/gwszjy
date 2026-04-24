
import App from './App.vue'
import { createApp } from 'vue';
import store from './store';
import router from './router'
import './style.css'


const app = createApp(App)
app.use(router)
app.use(store);
app.mount('#app')
export const setViewer = (viewer) => {
  app.config.globalProperties.$viewer = viewer
}
export const setThree = (three) => {
  app.config.globalProperties.$three = three
}