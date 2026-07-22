<template>
  <div class="cesium-wrapper">
    <div class="cesium-container" ref="container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, markRaw  } from 'vue'
import GLOBAL from '@/utils/GLOBAL.js'
import ViewerEvents from '@/utils/ViewerEvents.js'
const props = defineProps({
  ionToken: {
    type: String,
    default: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJkZmRiNDYzOS1iZjZjLTQzZmYtOTI2MS1iNTQzOTE3MWI4YmMiLCJpZCI6MzM3NDkyLCJpYXQiOjE3NTY4MDMxODR9.Zy5CdLX440ruPH6EcGGycTnHzDUF-wGdbCRykFjhM2M'
  }
})

const container = ref(null)
const modelEntity = ref(null)
let viewer = null
let Cesium = null
let mapClickHandler = null
const emit = defineEmits(['mapClick', 'initSuccess'])

const locations = {
  overview: { lon: 120.08949750428685, lat: 32.239695454280, height: 836, pitch: -45 },
  testfield: { lon: 120.097553, lat: 32.250635, height: 500, pitch: -45 },
  workshop: { lon: 120.089928, lat: 32.244513, height: 300, pitch: -45 },
  warehouse: { lon: 120.089928, lat: 32.244513, height: 300, pitch: -45 }
}

async function loadCesium() {
  return new Promise((resolve) => {
    if (window.Cesium) {
      resolve(window.Cesium)
      return
    }
    const script = document.createElement('script')
    const cesiumBaseUrl = `${import.meta.env.BASE_URL}cesium/`
    window.CESIUM_BASE_URL = cesiumBaseUrl
    script.src = `${cesiumBaseUrl}Cesium.js`
    script.onload = () => resolve(window.Cesium)
    document.head.appendChild(script)
  })
}

async function initCesium() {
  try {
    Cesium = await loadCesium()
    Cesium.Ion.defaultAccessToken = props.ionToken


    // 先定义 provider
    const imgLayerProvider = new Cesium.WebMapTileServiceImageryProvider({
    url: `http://t{s}.tianditu.gov.cn/img_w/wmts?tk=231a651f4e2511b1fd5ab2f5bbc69c76`,
    layer: "img",
    style: "default",
    format: "tiles",
    tileMatrixSetID: "w", // 球面墨卡托投影
    subdomains: ["0", "1", "2", "3", "4", "5", "6", "7"], // 节点子域名
    maximumLevel: 18     // 最大层级
  });

    viewer = markRaw(new Cesium.Viewer(container.value, {
      baseLayerPicker: false,
      // imageryProvider: false,

      // 3. 使用 baseLayer 属性（最新版写法）
      baseLayer: new Cesium.ImageryLayer(imgLayerProvider),
      fullscreenButton: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      sceneModePicker: false,
      selectionIndicator: false,
      timeline: false,
      navigationHelpButton: false,
      creditContainer: document.createElement('div'),
      enableMouseEvent: true,
      targetFrameRate: 30,
      useBrowserRecommendedResolution: true,
      // terrain: Cesium.Terrain.fromWorldTerrain(),
      skyBox: new Cesium.SkyBox({
        show: false
      }),
      skyAtmosphere: new Cesium.SkyAtmosphere()
    })) 
    const scene = markRaw(viewer.scene)


    scene.globe.enableLighting = false

    // Make globe surface transparent for lower layers to show through
    // Use Imagery layer instead for terrain visualization
    try {
      scene.globe.baseColor = new Cesium.Color(0.1, 0.2, 0.15, 1.0)
    } catch (e) {
      // ignore if not supported
    }

    // Set a dark/nature style background for when terrain is loading
    scene.backgroundColor = new Cesium.Color(0.02, 0.05, 0.08, 1.0)

    const camera = viewer.camera
    camera.constrainedAxis = undefined

    scene.screenSpaceCameraController.zoomEventTypes = [
      Cesium.CameraEventType.WHEEL,
      Cesium.CameraEventType.PINCH
    ]
    scene.screenSpaceCameraController.rotateEventTypes = [
      Cesium.CameraEventType.LEFT_DRAG
    ]
    scene.screenSpaceCameraController.panEventTypes = [
      Cesium.CameraEventType.RIGHT_DRAG
    ]
    scene.screenSpaceCameraController.tiltEventTypes = [
      Cesium.CameraEventType.MIDDLE_DRAG
    ]

    scene.screenSpaceCameraController.minimumZoomDistance = 100
    scene.screenSpaceCameraController.maximumZoomDistance = 5000000
    scene.screenSpaceCameraController.inertia = 0.9

    // Add a marker at the main location
    // viewer.entities.add({
    //   position: Cesium.Cartesian3.fromDegrees(120.07, 32.18, 50),
    //   point: {
    //     pixelSize: 12,
    //     color: Cesium.Color.RED,
    //     outlineColor: Cesium.Color.WHITE,
    //     outlineWidth: 2
    //   }
    // })

    ViewerEvents.init(viewer)
    // setViewer(viewer)
    GLOBAL.viewer = viewer
    emit('initSuccess', true)
    const loc = {
      "lon": 120.06647,
      "lat": 32.18264,
      "height": 9700.3,
      "heading": 0,
      "pitch": -50,
      "roll": 0
    }
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(loc.lon, loc.lat, loc.height),
      orientation: {
        heading: Cesium.Math.toRadians(loc.heading),
        pitch: Cesium.Math.toRadians(loc.pitch),
        roll: loc.roll
      },
      duration: 1.5
    })

    // 监听地图点击事件，获取动态经纬度
    mapClickHandler = (click) => {
      const ray = viewer.camera.getPickRay(click.position)
      const cartesian = scene.globe.pick(ray, scene)
      if (cartesian) {
        const cartographic = Cesium.Cartographic.fromCartesian(cartesian)
        const lon = Cesium.Math.toDegrees(cartographic.longitude).toFixed(6)
        const lat = Cesium.Math.toDegrees(cartographic.latitude).toFixed(6)
        emit('mapClick', { lon, lat })
      }

      const camera = viewer.camera;

      // 1. 获取相机的姿态（角度）- 弧度转角度
      const heading = Cesium.Math.toDegrees(camera.heading); // 方向角（正北为0，顺时针为正）
      const pitch = Cesium.Math.toDegrees(camera.pitch);     // 俯仰角（俯视<-90, 水平为0）
      const roll = Cesium.Math.toDegrees(camera.roll);       // 翻滚角
      // 2. 获取相机的地理位置（经纬度高度）
      const cartographic = camera.positionCartographic;
      const lon = Cesium.Math.toDegrees(cartographic.longitude);
      const lat = Cesium.Math.toDegrees(cartographic.latitude);
      const height = cartographic.height; // 相机离地面的高度（米）

      console.log('当前视图视角',{
        lon: +lon.toFixed(5),
        lat: +lat.toFixed(5),
        height: +height.toFixed(1),
        heading: +heading.toFixed(1),
        pitch: +pitch.toFixed(1),
        roll: +roll.toFixed(1)
      });

    }
    ViewerEvents.add('LEFT_CLICK', mapClickHandler)

    console.log('✅ Cesium initialized')
  } catch (e) {
    console.error('❌ Cesium init failed:', e)
  }
}

function flyTo(mode) {
  if (!viewer) return
  return
  const loc = locations[mode] || locations.overview

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(loc.lon, loc.lat, loc.height),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(loc.pitch),
      roll: 0
    },
    duration: 1.5
  })

  // Update entity marker
  viewer.entities.removeAll()
  viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(loc.lon, loc.lat, 50),
    point: {
      pixelSize: 12,
      color: Cesium.Color.RED,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2
    }
  })

  // Add mode-specific labels
  if (mode === 'overview') {
    viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(120.07, 32.18, 100),
      label: {
        text: '🌾 叶垛家利 - 20亩智慧农田',
        font: '14px sans-serif',
        fillColor: Cesium.Color.fromCssColorString('#00FF88'),
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM
      }
    })
  } else if (mode === 'testfield') {
    viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(120.07, 32.18, 100),
      label: {
        text: '🌱 试验田监测区域',
        font: '14px sans-serif',
        fillColor: Cesium.Color.fromCssColorString('#00FF88'),
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM
      }
    })
  } else if (mode === 'workshop') {
    viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(120.08, 32.17, 100),
      label: {
        text: '🏭 烘干车间 A & B',
        font: '14px sans-serif',
        fillColor: Cesium.Color.fromCssColorString('#00FF88'),
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM
      }
    })
  } else if (mode === 'warehouse') {
    viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(120.08, 32.17, 100),
      label: {
        text: '📦 仓库 A & B',
        font: '14px sans-serif',
        fillColor: Cesium.Color.fromCssColorString('#00FF88'),
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM
      }
    })
  }
}

function getViewer() {
  return viewer
}



defineExpose({ flyTo, getViewer })

onMounted(() => {
  initCesium()
})

// function init(viewer) {
//   // return 
//   console.log(111111,viewer)
//   const config = reactive({ 
//   lon: 120.0894,
//   lat: 32.24715,
//   height: 0,
//   scale: 0.32,
//   heading: 88.5,
//   pitch: 0,
//   roll: 0,
//   show: true
//  })
//   modelEntity.value = viewer && viewer?.entities?.add({
//     name: 'Model',
//     position: Cesium.Cartesian3.fromDegrees(config.lon, config.lat, config.height),
//     show: true,
//     model: {
//       show: true,
//       uri: './static/glb/厂房1.glb',
//       color: new Cesium.Color(1.2, 1.2, 1.2, 1.0), // 增加RGB值来提亮
//       scale: config.scale,
//       // minimumPixelSize: 128,
//       // maximumScale: 20000,
//       // 开启调试模式
//       //debugShowBoundingVolume: true, // 显示包围盒，帮助定位模型
//       orientation: Cesium.Transforms.headingPitchRollQuaternion(
//         Cesium.Cartesian3.fromDegrees(config.lon, config.lat, config.height),
//         new Cesium.HeadingPitchRoll(
//           Cesium.Math.toRadians(config.heading),   // 偏航角（绕垂直轴旋转，类似指南针方向）
//           Cesium.Math.toRadians(config.pitch),    // 俯仰角（上下倾斜）
//           Cesium.Math.toRadians(config.roll)     // 翻滚角（绕模型自身轴旋转）
//         )
//       )
//     }
//   })

//   viewer && viewer.flyTo(modelEntity.value);
// }

onUnmounted(() => {
  if (mapClickHandler) {
    ViewerEvents.off('LEFT_CLICK', mapClickHandler)
    mapClickHandler = null
  }
  if (viewer) {
    const viewerToDestroy = viewer
    if (GLOBAL.viewer === viewerToDestroy) GLOBAL.viewer = null
    viewer = null
    emit('initSuccess', false)
    window.setTimeout(() => {
      try {
        if (!viewerToDestroy.isDestroyed?.()) viewerToDestroy.destroy()
      } catch (e) {
        console.warn('[CesiumMap] destroy viewer failed:', e)
      }
    }, 0)
  }
})
</script>

<style scoped>
.cesium-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1;
}

.cesium-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
</style>
