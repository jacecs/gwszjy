import * as THREE from 'three';

/**
 * 直线/折线流动特效封装类 (支持控制间隔和穿透遮挡)
 */
export default class FlowLine extends THREE.Group {
    constructor(points, options = {}) {
        super();

        if (!points || points.length < 2) {
            console.error('FlowLine: points 数组至少需要2个 THREE.Vector3 点');
            return;
        }

        // --- 增加 dashRatio 配置项 ---
        this.config = {
            color: options.color || 0x00ffff,
            radius: options.radius || 0.5,
            speed: options.speed || 2.0,
            dashCount: options.dashCount || 10.0,     // 决定整条线上有几个流光段
            dashRatio: options.dashRatio || 0.5,      // 【新增】决定流光与间隔的比例 (0~1)，越小间隔越大
            showBaseLine: options.showBaseLine !== false,
            tubularSegments: options.tubularSegments || points.length * 10, 
            radialSegments: options.radialSegments || 8
        };

        this._materials =[];
        this._geometries =[];

        this._init(points);
    }

    _init(points) {
        const curvePath = new THREE.CurvePath();
        for (let i = 0; i < points.length - 1; i++) {
            const lineCurve = new THREE.LineCurve3(points[i], points[i + 1]);
            curvePath.add(lineCurve);
        }

        const geometry = new THREE.TubeGeometry(
            curvePath, 
            this.config.tubularSegments, 
            this.config.radius, 
            this.config.radialSegments, 
            false
        );
        this._geometries.push(geometry);

        // --- 底层半透明实体管 ---
        if (this.config.showBaseLine ) {
            const baseMaterial = new THREE.MeshBasicMaterial({
                color: this.config.color,
                transparent: true,
                opacity: 0.15,
                side: THREE.DoubleSide,
                depthTest: false, // 穿透遮挡
                depthWrite: false
            });
            const baseMesh = new THREE.Mesh(geometry, baseMaterial);
            baseMesh.renderOrder = 999; 
            this._materials.push(baseMaterial);
            this.add(baseMesh);
        }

        // --- 流光 Shader 材质 ---
        this.flowMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0.0 },
                uColor: { value: new THREE.Color(this.config.color) },
                uSpeed: { value: this.config.speed },
                uDashCount: { value: this.config.dashCount },
                uDashRatio: { value: this.config.dashRatio } // 【新增】：传入间隔比例
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv; 
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            // 【核心修改】：在片元着色器中通过 uDashRatio 控制空白间隔
            fragmentShader: `
                uniform float uTime;
                uniform vec3 uColor;
                uniform float uSpeed;
                uniform float uDashCount;
                uniform float uDashRatio;
                varying vec2 vUv;

                void main() {
                    // phase 生成类似 0.0 ~ 1.0 的周期循环
                    float phase = vUv.x * uDashCount - uTime * uSpeed;
                    float offset = fract(phase); 
                    
                    // 用 uDashRatio 来动态控制显示范围和淡入淡出效果
                    // 假设 uDashRatio = 0.5，那么在 offset 超过 0.5 的部分，alpha 会直接归零，形成间距空白
                    float alpha = smoothstep(0.0, uDashRatio * 0.3, offset) 
                                * smoothstep(uDashRatio, uDashRatio * 0.8, offset);
                                
                    gl_FragColor = vec4(uColor, alpha * 0.9);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthTest: false, // 穿透遮挡
            depthWrite: false
        });
        
        this._materials.push(this.flowMaterial);

        const flowMesh = new THREE.Mesh(geometry, this.flowMaterial);
        flowMesh.scale.set(1.01, 1.01, 1.01);
        flowMesh.renderOrder = 999; 
        this.add(flowMesh);
    }

    update(time) {
        if (this.flowMaterial) {
            this.flowMaterial.uniforms.uTime.value = time;
        }
    }

    dispose() {
        this.removeFromParent();
        this._geometries.forEach(geo => geo.dispose());
        this._materials.forEach(mat => mat.dispose());
        this._geometries =[];
        this._materials =[];
        this.flowMaterial = null;
    }
}