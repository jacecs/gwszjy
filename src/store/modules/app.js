import { defineStore } from 'pinia';
import { ref, reactive, computed } from 'vue';
import { getToken } from './../../utils/api'

export const useAppStore = defineStore('app', () => {

  const GlbLoading = ref(false);
  const LoadingProgress = ref(0);

  let appInfo = reactive(null)

  const setScene = (sen) => {
    scene.value = sen
  }
  const setGlbLoading = (status) => {
    GlbLoading.value = status
  }

  const loadGLBModal = (loader, gltfurl) => {
    return new Promise((resolve, reject) => {

      GlbLoading.value = true
      LoadingProgress.value = 0
      // 加载 GLB 模型
      loader.load(gltfurl, // 模型路径
        // 成功回调函数
        function (gltf) {
          console.log('模型加载成功')
          GlbLoading.value = false
          resolve(gltf)
        },

        // 加载进度回调（可选）
        function (xhr) {
          LoadingProgress.value = Math.floor(xhr.loaded / xhr.total * 100)
          console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },

        // 错误回调（可选）
        function (error) {
          GlbLoading.value = false
          console.error('An error happened:', error);
        }
      );
    })



  }

  const getTokenInfo = () => { 
    const params = {
      username: 'ktdz',
      password: 'ktdz',
    }
    return getToken(params).then(res => {
      console.log('获取token成功')
      appInfo = res.data
      
    }).catch(err => {
      console.log('获取token失败')
    })
  }


  return {
    GlbLoading,
    LoadingProgress,
    appInfo,
    getTokenInfo,
    setGlbLoading,
    loadGLBModal
  };
});
