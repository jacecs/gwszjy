class ElectronicFence {
    static _isInitialized = false;

    // 内部方法：初始化并注册自定义着色器和材质（仅执行一次）
    static _initCesiumMaterial() {
        if (this._isInitialized) return;

        // 1. 定义自定义材质属性类
        class FenceMaterialProperty {
            constructor(options = {}) {
                this._definitionChanged = new Cesium.Event();
                this._color = undefined;
                this.color = options.color || Cesium.Color.CYAN.withAlpha(0.6);
                this.duration = options.duration || 2000; // 动画周期
                this.density = options.density || 50.0;   // 栅格立柱密度
                this._time = performance.now();
            }
            get isConstant() { return false; }
            get definitionChanged() { return this._definitionChanged; }
            getType(time) { return 'ElectronicFence'; }
            getValue(time, result) {
                if (!Cesium.defined(result)) { result = {}; }
                result.color = Cesium.Property.getValueOrClonedDefault(this._color, time, Cesium.Color.WHITE, result.color);
                result.time = ((performance.now() - this._time) % this.duration) / this.duration;
                result.density = this.density;
                return result;
            }
            equals(other) { return this === other; }
        }

        // 绑定颜色监听
        Object.defineProperty(FenceMaterialProperty.prototype, 'color', {
            get: function() { return this._color; },
            set: function(value) {
                const oldValue = this._color;
                if (oldValue !== value) {
                    this._color = new Cesium.ConstantProperty(value);
                    this._definitionChanged.raiseEvent(this, 'color', value, oldValue);
                }
            }
        });

        // 暴露到 Cesium 命名空间，方便后续获取
        Cesium.FenceMaterialProperty = FenceMaterialProperty;

        // 2. 将 GLSL 着色器注册到 Cesium
        Cesium.Material._materialCache.addMaterial('ElectronicFence', {
            fabric: {
                type: 'ElectronicFence',
                uniforms: {
                    color: new Cesium.Color(0.0, 1.0, 1.0, 0.5),
                    time: 0.0,
                    density: 50.0 // 动态接收栅格密度
                },
                source: `
                    czm_material czm_getMaterial(czm_materialInput materialInput) {
                        czm_material material = czm_getDefaultMaterial(materialInput);
                        vec2 st = materialInput.st;
                        float d = fract(st.t - time);
                        float glow = smoothstep(0.7, 1.0, d);
                        float border = step(0.95, st.t) + step(st.t, 0.05);
                        float grid = step(0.98, fract(st.s * density));
                        float alpha = color.a * (0.2 + glow * 0.6 + border * 0.8 + grid * 0.4);
                        material.diffuse = color.rgb;
                        material.alpha = clamp(alpha, 0.0, 1.0);
                        return material;
                    }
                `
            },
            translucent: function() { return true; }
        });

        this._isInitialized = true;
    }

    /**
     * 核心调用方法：创建电子围栏
     * @param {Cesium.Viewer} viewer - Cesium 视窗实例
     * @param {Object} options - 配置参数
     * @param {Array} options.positions - 坐标数组 [经度1, 纬度1, 经度2, 纬度2...] 或 Cartesian3 数组
     * @param {Number} [options.height=300] - 围栏高度 (米)
     * @param {Cesium.Color} [options.color] - 颜色 (推荐带 Alpha 的颜色)
     * @param {Number} [options.duration=2000] - 扫描动画周期(毫秒)，越小跑得越快
     * @param {Number} [options.density=50.0] - 垂直立柱的密度（数字越大越密集）
     * @param {Boolean} [options.bloom=false] - 是否自动开启泛光效果
     * @returns {Cesium.Entity} 返回创建的 Entity，方便后续删除或操作
     */
    static create(viewer, options) {
        this._initCesiumMaterial();

        let pts = options.positions;
        if (!pts || pts.length === 0) {
            console.error("电子围栏: positions 参数不能为空");
            return null;
        }

        // 自动兼容纯数字数组 [lon, lat, lon, lat...]
        if (typeof pts[0] === 'number') {
            pts = Cesium.Cartesian3.fromDegreesArray(pts);
        }

        const height = options.height || 300;
        
        // 开启全局泛光(Bloom)
        if (options.bloom) {
            viewer.scene.postProcessStages.bloom.enabled = true;
            viewer.scene.postProcessStages.bloom.uniforms.glowOnly = false;
            viewer.scene.postProcessStages.bloom.uniforms.contrast = 128;
            viewer.scene.postProcessStages.bloom.uniforms.brightness = -0.1;
        }

        // 创建实体
        const fenceEntity = viewer.entities.add({
            wall: {
                positions: pts,
                maximumHeights: new Array(pts.length).fill(height), // 顶部高度
                minimumHeights: new Array(pts.length).fill(0),      // 底部贴地
                material: new Cesium.FenceMaterialProperty({
                    color: options.color || Cesium.Color.CYAN.withAlpha(0.6),
                    duration: options.duration || 2000,
                    density: options.density || 50.0
                })
            }
        });

        return fenceEntity;
    }
}

export default ElectronicFence;