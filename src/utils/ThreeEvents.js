class ThreeEvents {
  constructor() {
    this.three = null;

    this._events = {
      LEFT_CLICK: [],
      DOUBLE_CLICK: [],
      RIGHT_CLICK: [],
      MOUSE_MOVE: [],
      WHEEL: []
    }
  }
  _getIntersect(mouseEvent) {
    const { renderer, mouse, raycaster, scene, camera } = this.three
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((mouseEvent.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((mouseEvent.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
      return intersects.find(it => it.object.visible)
    }

    return ''
  }
  init(three) {
    this.three = three
    const { renderer } = three
    // 点击事件

    let time
    let clickTimer = null
    const clickDelay = 300

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
          if (clickTimer) {
            clearTimeout(clickTimer)
            clickTimer = null
          }
          clickTimer = setTimeout(() => {
            const tmp = this._getIntersect(click)
            this._events['LEFT_CLICK'].forEach(fn => fn(tmp))
            clickTimer = null
          }, clickDelay)
        }
      }

    }, false)

    // 双击事件
    renderer.domElement.addEventListener('dblclick', (click) => {
      console.log('双击事件')
      if (click.button === 0) {
        if (clickTimer) {
          clearTimeout(clickTimer)
          clickTimer = null
        }
        const tmp = this._getIntersect(click)
        this._events['DOUBLE_CLICK'].forEach(fn => fn(tmp))
      }
    }, false)

    // 右击事件
    renderer.domElement.addEventListener('contextmenu', (click) => {
      click.preventDefault()
      const tmp = this._getIntersect(click)
      console.log('右击事件')
      this._events['RIGHT_CLICK'].forEach(fn => fn(tmp))
    }, false)

    // hover事件
    renderer.domElement.addEventListener('mouseover', (e) => {

      const tmp = this._getIntersect(e)
      this._events['MOUSE_MOVE'].forEach(fn => fn(tmp))

    }, false)

  }

  add(type, handler) {
    this._events[type]?.push(handler)
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
