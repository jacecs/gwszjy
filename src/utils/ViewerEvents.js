class ViewerEvents {
  constructor() {
    this.viewer = null;

    this._events = {
      LEFT_CLICK: [],
      MOUSE_MOVE: [],
      WHEEL: []
    }
  }
  init (viewer) {
    this.viewer = viewer
    // 点击事件
    viewer.screenSpaceEventHandler.setInputAction((click) => {
      this._events['LEFT_CLICK'].forEach(fn => fn(click))
    }, 
    Cesium.ScreenSpaceEventType.LEFT_CLICK)

    // hover事件
    viewer.screenSpaceEventHandler.setInputAction((click) => {
      this._events['MOUSE_MOVE'].forEach(fn => fn(click))
    }, 
    Cesium.ScreenSpaceEventType.MOUSE_MOVE)

    // 滚轮事件
    viewer.screenSpaceEventHandler.setInputAction((click) => {
      this._events['WHEEL'].forEach(fn => fn(click))
    }, 
    Cesium.ScreenSpaceEventType.WHEEL)
  }

  add (type, handler) {
    this._events[type].push(handler)
  }

  Once (type, handler) {
    this._events[type].push(handler)
    let that = this
    function func() {
      let args = Array.prototype.slice.call(arguments, 0)
      handler.apply(that, args)
      this.off(eventName, func)
    }
    this.add(eventName, func)
  }
  off (type, handler) {
    let events = this._events[type]
    if (events) {
      this._events[type] = events.filter(event => {
        return event !== handler
      })
    }
  }

}
if (!window.ViewerEvents) {
  window.ViewerEvents = new ViewerEvents()
}
export default window.ViewerEvents