<template>

  <!-- <div style="position: fixed; left: 300px; top: 100px;z-index: 9999; padding: 5px">
    <h3>🛠️ 流动线 调试器</h3>
    <div v-for="(item, key) in linePoints" :key="key" class="control-group">
      <label>点号 {{ item.name }}</label>

      <div v-for="(val, i) in item.points" :key="i">
        <input type="number" v-model.number="val.x" :step="1" @input="updateModel">
        <input type="number" v-model.number="val.y" :step="1" @input="updateModel">
        <input type="number" v-model.number="val.z" :step="1" @input="updateModel">
      </div>

        <input type="number" v-model.number="item.dashCount" :step="1" @input="updateModel">
    </div>
  </div> -->

  <template v-if="gltfStatus">
    <label style="position: fixed; left: 300px; bottom: 100px;z-index: 9999; padding: 5px">
      <input type="checkbox" v-model="inStatus" @change="changeStatus" />
      内部场景
    </label>
  </template>
</template>

<script setup>
// 厂房
import { reactive, ref, onMounted, onUnmounted, watch, getCurrentInstance, computed, markRaw, shallowRef } from 'vue'
import * as THREE from 'three'
import TWEEN from '@tweenjs/tween.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import ThreeEvents from '@/utils/ThreeEvents.js'
import FlowLine from '@/utils/FlowLine.js'; // 引入上面封装的类
import GLOBAL from '@/utils/GLOBAL.js'
import { useAppStore } from '@/store/modules/app';
const appStore = useAppStore();


const three = GLOBAL.three;
const { scene,
  camera,
  renderer,
  controls,
  raycaster,
  mouse
} = three

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  }
})

const gltfStatus = ref(false);

const loader = new GLTFLoader();
// 创建Draco加载器实例
const dracoLoader = new DRACOLoader();
// 设置Draco解码器路径（本地或CDN）
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
// dracoLoader.setDecoderPath('./static/plugins/ys3d/draco/');
// 将Draco加载器添加到GLTF加载器
loader.setDRACOLoader(dracoLoader);
let model = null;
let mixers = []
let pageModels = markRaw([])
let label
const modelUrl = computed(() => {
  const map = {
    overview: '🌾 总览',
    testfield: '🌱 试验田',
    workshop: '🏭 烘干车间',
    warehouse: '📦 仓库'
  }
  return map[props.mode] || '🌾 总览'
})
watch(() => props.data, (newMode) => {
  if (newMode) {
    remove()
    init(newMode)
  }
},
  {
    // deep: true,
    immediate: true
  }
)


onMounted(() => {
  ThreeEvents.add('LEFT_CLICK', onClick)
  ThreeEvents.add('LEFT_CLICK', onGetInfo)
})



onUnmounted(() => {
  mixers = []
  ThreeEvents.off('LEFT_CLICK', onClick)
  ThreeEvents.off('LEFT_CLICK', onGetInfo)

  remove()
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  removeLine()
})

function onGetInfo(e) {
  const position = camera.position;
  console.log('视角信息', position)
}

function remove() {
  if (label) {
    label.removeFromParent()
    label = null
  }
  console.log('remove', model)



  if (pageModels && pageModels.length) {
    for (let index = 0; index < pageModels.length; index++) {
      const model = pageModels[index];
      
      const modelScene = model.scene;

      if (modelScene) {
        scene.remove(modelScene);

        // 【重要】遍历模型，释放几何体和材质，防止内存泄漏
        modelScene.traverse((object) => {
          if (object.geometry) {
            object.geometry.dispose();
          }
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(material => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        });
      }
    }
  }

  pageModels = markRaw([])


  if (model) {
    const modelScene = model.scene;

    if (modelScene) {
      scene.remove(modelScene);

      // 【重要】遍历模型，释放几何体和材质，防止内存泄漏
      modelScene.traverse((object) => {
        if (object.geometry) {
          object.geometry.dispose();
        }
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
    }
    model = null;
  }
}

function onClick(item) {
  if (item) {
    const label = showTooltip(item.object, item.point)
  }
}

function init(obj) {
  centerAt(obj.threeCamera)
  renderModel(obj)
}
function centerAt(camera) {
  const { x, y, z, tx=0, ty=0, tz=0 } = camera ?? {x: 56, y: 500, z: -400, tx: 0, ty: 0, tz: 0}
   // 定位
  const cameraPos = new THREE.Vector3(x, y, z)
  const lookAt = new THREE.Vector3(tx, ty, tz)
  flyToSmoothly(cameraPos, lookAt)
}
async function renderModel(obj) {

  // 创建 GLTF 加载器
  const gltfs = obj.gltfs
  if (gltfs && gltfs.length) {
    for (let index = 0; index < gltfs.length; index++) {
      const gltf = gltfs[index];
      const key = gltf.url
      console.log('模型', obj)
      if (!GLOBAL[key]) {
        const modal = await appStore.loadGLBModal(loader, gltf.url)
        modal.modelId = gltf.id
        GLOBAL[key] = modal
        console.log('模型加载成功', modal)
      }
      const model = markRaw(GLOBAL[key])
      pageModels.push(model)
      scene.add(GLOBAL[key].scene);
      // 可以对模型进行操作
      GLOBAL[key].scene.scale.set(gltf.scale, gltf.scale, gltf.scale);
      GLOBAL[key].scene.position.set(gltf.x, gltf.y, gltf.z);
    }
  }

}

function getModelById(id) {
  return pageModels.find(item => item.modelId === id)
}


// 进入到内部
function changeStatus(value) {
  if (model) {
    const list = model.scene.children
    const outList = ['太阳能']
    for (let index = 0; index < outList.length; index++) {
      const name = outList[index];
      let obj
      obj = getModal(model.scene, name)
      obj && obj.traverse((child) => { child.visible = !value });
      obj && (obj.visible = !value)
    }
    // 定位
    const targetPos = new THREE.Vector3(90, 220, -10)
    const targetLookAt = new THREE.Vector3(170, 45, 100); // 假设看着 Z 轴更小的地方

    // const focusPoint = 
    flyTo(targetPos, targetLookAt)

  }
}

function getModal(obj, name) {
  let tmp = null
  if (obj.name == name) {
    tmp = obj
    return tmp
  } else if (obj.children && obj.children.length) {
    for (let index = 0; index < obj.children.length; index++) {
      const item = obj.children[index];
      const value = getModal(item, name)
      if (value) {
        tmp = value
        break;
      }
    }
  }
  return tmp
}

function ctrlAnimation() {
  if (model && model.scene) {
    model.animations.forEach((clip, index) => {
      const name = clip.name
      if (name == '高温区机器人' || name == '低温区机器人') {
        const bone = model.scene.getObjectByName(name)
        if (bone) {
          const mixer = new THREE.AnimationMixer(bone)
          mixer.clipAction(clip).play()
          mixers.push(mixer)
        }
      } else {
        const action = this.modalMixer.clipAction(clip);
        action.play();
      }
    });
  }
}
async function showTooltip(model, point) {
  if (label) {
    label.removeFromParent()
    label = null
  }

  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  // const list = await loadData()
  tooltip.innerHTML = `
      <div class="js-tooltip" style="padding: 10px; pointer-events: none; color: #000; font-size: 16px; display: inline-block;transform: translate(-50%, -100%);background: #ffffff">
        <div class="modal-name" >
        ${model.name}
      </div>
      <div class="main-modal-info">
      </div>
      </div>
      `;
  // 通过CSS3DObject绑定位置
  label = new CSS2DObject(tooltip);
  // label.position.set(point.x, point.y, point.z);
  console.log(label, model.position.x, model.position.y, model.position.z)
  // scene.add(label);
  model.add(label)
  return label
}

function loadData() {
  return new Promise(resolve => {
    resolve({
      "编号": "厂房",
      "参数1": "0.00",
    })
  })
}

// 2. 定义飞到的函数
function flyToSmoothly(targetPos, focusPoint) {
  // 直接设置目标
  focusPoint && controls.target.copy(focusPoint);

  // 直接设置相机位置
  targetPos && camera.position.copy(targetPos);

}

function flyTo(targetPosition, targetLookAt, duration = 1500) {
  camera.position.set(targetPosition.x, targetPosition.y, targetPosition.z)
  controls.target.set(targetLookAt.x, targetLookAt.y, targetLookAt.z)
  controls.update()
  return
  // 1. 获取当前状态作为起点
  const currentPos = camera.position.clone();
  const currentTarget = controls.target.clone();

  // 如果没有传入目标视角，则保持当前视角不变
  const finalLookAt = targetLookAt || currentTarget;

  new TWEEN.Tween({
    // 动画起点
    x: currentPos.x,
    y: currentPos.y,
    z: currentPos.z,
    tx: currentTarget.x,
    ty: currentTarget.y,
    tz: currentTarget.z,
  })
    .to({
      // 动画终点
      x: targetPosition.x,
      y: targetPosition.y,
      z: targetPosition.z,
      tx: finalLookAt.x,
      ty: finalLookAt.y,
      tz: finalLookAt.z,
    }, duration)
    .easing(TWEEN.Easing.Quadratic.InOut) // 添加缓动函数，让起步和停下更平滑
    .onUpdate(function (obj) {
      // 【修复】：取消注释，真正动态改变相机位置
      camera.position.set(obj.x, obj.y, obj.z);

      // 动态改变控制器目标点 (也就是视线的焦点)
      controls.target.set(obj.tx, obj.ty, obj.tz);

      // 更新控制器
      controls.update();
    })
    .onComplete(function (obj) {
      controls.target.set(obj.tx, obj.ty, obj.tz);
      controls.update();
    })
    .start();
}


let flowLines = markRaw([])

const linePoints1 = reactive([
  {
    x: 230,
    y: -8,
    z: 100
  },
  {
    x: 230,
    y: 4,
    z: 100
  },

  {
    x: 160,
    y: 4,
    z: 106.5
  }
])

function removeLine() {

  if (flowLines && flowLines.length) {
    for (let index = 0; index < flowLines.length; index++) {
      const line = flowLines[index];
      line && line.dispose();
    }
    flowLines = []
  }
}

function updateModel() {
  removeLine()
  createLine()
}

function create1() {

  const points = linePoints1.map(it => new THREE.Vector3(it.x, it.y, it.z))

  // 2. 实例化流动线
  const line = new FlowLine(points, {
    color: 0xff0000,     // 青色流光
    radius: 1.0,         // 管道粗细
    speed: 3.0,          // 流动速度 (数值越大越快)
    dashCount: 10,       // 流光的段数 (密度)
    showBaseLine: false   // 是否显示底层管道
  });


  flowLines.push(line)

  console.log(flowLines)

  // 3. 添加到场景
  scene.add(line);

  return


  // 1. 定义路径点 (比如从 A 点到 B 点到 C 点)

  for (let index = 0; index < linePoints.length; index++) {
    const tmpPoints = linePoints[index];

    const points = tmpPoints.map(it => new THREE.Vector3(it.x, it.y, it.z))

    // 2. 实例化流动线
    const line = new FlowLine(points, {
      color: 0xff0000,     // 青色流光
      radius: 1.0,         // 管道粗细
      speed: 3.0,          // 流动速度 (数值越大越快)
      dashCount: 10,       // 流光的段数 (密度)
      showBaseLine: false   // 是否显示底层管道
    });


    flowLines.push(line)

    console.log(flowLines)

    // 3. 添加到场景
    scene.add(line);
  }


}

const linePoints = reactive([
  {
    points: [
      {
        x: 140,
        y: -8,
        z: 155
      },
      {
        x: 140,
        y: 6,
        z: 155
      },
      {
        x: 140,
        y: 6,
        z: 175
      },

      {
        x: 105,
        y: 6,
        z: 178
      }
    ],
    name: 'line1'
  },
  {
    points:
      [
        {
          x: 190,
          y: -8,
          z: 155
        },
        {
          x: 190,
          y: 6,
          z: 155
        },
        {
          x: 190,
          y: 6,
          z: 170
        },

        {
          x: 150,
          y: 6,
          z: 173
        }
      ],
    name: 'line2'
  },
  {
    points: [
      {
        x: 243,
        y: -8,
        z: 145
      },
      {
        x: 243,
        y: 6,
        z: 145
      },
      {
        x: 245,
        y: 6,
        z: 165
      },

      {
        x: 200,
        y: 6,
        z: 170
      }
    ],
    name: 'line3'
  },

  {
    points: [
      {
        x: 245,
        y: 6,
        z: 165
      },

      {
        x: 265,
        y: 6,
        z: 163
      }
    ],
    name: 'line31',
    dashCount: 4
  },
  {
    points: [
      {
        x: 128,
        y: -8,
        z: 130
      },
      {
        x: 128,
        y: 4,
        z: 130
      },
      {
        x: 125,
        y: 4,
        z: 110
      },

      {
        x: 110,
        y: 4,
        z: 111.5
      }
    ],
    name: 'line4',
    dashCount: 8
  },
  {
    points: [
      {
        x: 125,
        y: 4,
        z: 110
      },

      {
        x: 160,
        y: 4,
        z: 106.5
      }
    ],
    name: 'line41',
    dashCount: 4
  },
  {
    points: [{
      x: 230,
      y: -8,
      z: 100
    },
    {
      x: 230,
      y: 4,
      z: 100
    },

    {
      x: 160,
      y: 4,
      z: 106.5
    }],
    name: 'line5'
  },
])

function createLine() {

  // 1. 定义路径点 (比如从 A 点到 B 点到 C 点)

  for (let index = 0; index < linePoints.length; index++) {
    const lp = linePoints[index];

    const points = lp.points.map(it => new THREE.Vector3(it.x, it.y, it.z))

    // 2. 实例化流动线
    const line = new FlowLine(points, {
      color: 0xff0000,     // 青色流光
      radius: 1.0,         // 管道粗细
      speed: 3.0,          // 流动速度 (数值越大越快)
      dashCount: lp.dashCount ??  10,       // 流光的段数 (密度)
      showBaseLine: false   // 是否显示底层管道
    });


    flowLines.push(line)

    console.log(flowLines)

    // 3. 添加到场景
    scene.add(line);
  }


}






// --- 4. 动画循环 ---
const clock = new THREE.Clock();
let animationId = null;
function animate() {
  animationId = requestAnimationFrame(animate);
  const time = clock.getElapsedTime();

  // 更新所有流动线路
  if (flowLines && flowLines.length) {
    for (let index = 0; index < flowLines.length; index++) {
      const line = flowLines[index];

      line && line.update(time);
    }
  }

}

animate();

</script>
