class ThreeEvents {
  constructor() {
    this.three = null;

    this._events = {
      LEFT_CLICK: [],
      MOUSE_MOVE: [],
      WHEEL: []
    }
  }
  init(three) {
    this.three = three
    const { renderer, mouse, raycaster, scene, camera } = three
    // 点击事件

    let time

    renderer.domElement.addEventListener('mousedown', (click) => { 
      if (click.button === 0) { 
        // 鼠标
        time = new Date().getTime()
      }
    }, false)
    renderer.domElement.addEventListener('mouseup', (click) => {
      if (click.button === 0) {
        const currentTime = new Date().getTime()
        if (currentTime - time < 300) {
          time = currentTime
          // 鼠标
          const rect = renderer.domElement.getBoundingClientRect();
          mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

          // 4. 更新射线并执行检测
          raycaster.setFromCamera(mouse, camera);
          // intersectObjects 返回一个按距离排序的相交数组
          const intersects = raycaster.intersectObjects(scene.children, true);
          console.log('坐标信息:', intersects[0]?.point);
          console.log('点击物体信息:', intersects);
          // 5. 处理交互结果
          if (intersects.length > 0) {
            // intersects 是距离相机最近的相交物体
            const tmp = intersects.find(it => it.object.visible)
            // intersects 是距离相机最近的相交物体
             console.log('点击最近物体信息:', tmp);
              this._events['LEFT_CLICK'].forEach(fn => fn(tmp))
          } else {
            // 如果没有点击到任何物体，可以将立方体恢复为绿色
            this._events['LEFT_CLICK'].forEach(fn => fn(''))
          }
        }
      }

    }, false)

    // hover事件
    renderer.domElement.addEventListener('mouseover', (e) => {

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // 4. 更新射线并执行检测
      raycaster.setFromCamera(mouse, camera);
      // intersectObjects 返回一个按距离排序的相交数组
      const intersects = raycaster.intersectObjects(scene.children, true);

      // 5. 处理交互结果
      if (intersects.length > 0) {
          const tmp = intersects.find(it => it.object.visible)
        // intersects 是距离相机最近的相交物体
          console.log('mouseover:', intersects);
          this._events['MOUSE_MOVE'].forEach(fn => fn(tmp))
      } else {
          this._events['MOUSE_MOVE'].forEach(fn => fn(''))
      }

    }, false)

  }

  add(type, handler) {
    this._events[type].push(handler)
  }

  Once(type, handler) {
    this._events[type].push(handler)
    let that = this
    function func() {
      let args = Array.prototype.slice.call(arguments, 0)
      handler.apply(that, args)
      this.off(eventName, func)
    }
    this.add(eventName, func)
  }
  off(type, handler) {
    let events = this._events[type]
    if (events) {
      this._events[type] = events.filter(event => {
        return event !== handler
      })
    }
  }

}
if (!window.ThreeEvents) {
  window.ThreeEvents = new ThreeEvents()
}
export default window.ThreeEvents
