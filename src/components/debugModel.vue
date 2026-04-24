<template>
  <div class="panel">
    <div className="FZTY-home-widget" :style={ position: 'fixed' , padding: '10px' , backgroundColor: '#fff' , zIndex: 999, }>
      <div>
        x坐标: {position.x}
        <div>
          <input type="number" value={position.x} min={0} max={180} step={0.001} @change={(e)=> {
          this.changeInfo('x', e);
          }}
          />
        </div>
        <input type="range" value={position.x} min={0} max={180} step={0.001} @change={(e)=> {
        this.changeInfo('x', e);
        }}
        />
      </div>
      <div>
        y坐标: {position.y}
        <div>
          <input type="number" min={0} max={90} value={position.y} step={0.001} @change={(e)=> {
          this.changeInfo('y', e);
          }}
          />
        </div>
        <input type="range" min={0} max={90} value={position.y} step={0.001} @change={(e)=> {
        this.changeInfo('y', e);
        }}
        />
      </div>
      <div>
        z坐标: {position.z}
        <div>
          <input type="number" min={-18000000} max={18000000} value={position.z} step={10} @change={(e)=> {
          this.changeInfo('z', e);
          }}
          />
        </div>
        <input type="range" min={-18000000} max={18000000} value={position.z} step={10} @change={(e)=> {
        this.changeInfo('z', e);
        }}
        />
      </div>
      <div>
        heading: {style.heading}
        <div>
          <input type="number" value={style.heading} min={-180} max={180} step={0.001} @change={(e)=> {
          this.changeInfo('heading', e);
          }}
          />
        </div>
        <input type="range" value={style.heading} min={-180} max={180} step={0.001} @change={(e)=> {
        this.changeInfo('heading', e);
        }}
        />
      </div>
      <div>
        pitch: {style.pitch}
        <div>
          <input type="number" value={style.pitch} min={-90} max={90} step={0.001} @change={(e)=> {
          this.changeInfo('pitch', e);
          }}
          />
        </div>
        <input type="range" value={style.pitch} min={-90} max={90} step={0.001} @change={(e)=> {
        this.changeInfo('pitch', e);
        }}
        />
      </div>
      <div>
        roll: {style.roll}
        <div>
          <input type="number" value={style.roll} min={-180} max={180} step={0.001} @change={(e)=> {
          this.changeInfo('roll', e);
          }}
          />
        </div>
        <input type="range" value={style.roll} min={-180} max={180} step={0.001} @change={(e)=> {
        this.changeInfo('roll', e);
        }}
        />
      </div>
      <div>
        scale: {style.scale}
        <div>
          <input type="number" value={style.scale} min={1} max={250000} step={0.01} @change={(e)=> {
          this.changeInfo('scale', e);
          }}
          />
        </div>
        <input type="range" value={style.scale} min={1} max={250000} step={0.01} @change={(e)=> {
        this.changeInfo('scale', e);
        }}
        />
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: String,
  data: Array
})

function changeInfo(key, e) {
  const value = e.target.value;
  console.log(key, e)
}

</script>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.panel-title {
  font-size: 13px;
  font-weight: 700;
  color: #27ae60;
  padding-bottom: 8px;
  border-bottom: 2px solid #2ecc71;
  display: flex;
  align-items: center;
  gap: 8px;
  letter-spacing: 0.5px;
}

.data-card {
  background: #ffffff;
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  padding: 14px;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.data-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.data-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.data-label {
  font-size: 12px;
  color: #7f8c8d;
  letter-spacing: 0.5px;
}

.data-status {
  font-size: 10px;
  padding: 3px 10px;
  border-radius: 12px;
  font-weight: 600;
}

.status-good {
  background: #e8f8f0;
  color: #27ae60;
}

.status-warning {
  background: #fef5e7;
  color: #e67e22;
}

.status-bad {
  background: #fdedec;
  color: #e74c3c;
}

.data-value {
  font-size: 26px;
  font-weight: 700;
  color: #2c3e50;
}

.data-unit {
  font-size: 12px;
  color: #95a5a6;
  margin-left: 4px;
  font-weight: 400;
}

.data-chart {
  height: 36px;
  margin-top: 10px;
  display: flex;
  align-items: flex-end;
  gap: 3px;
}

.chart-bar {
  flex: 1;
  background: linear-gradient(180deg, #2ecc71 0%, #a9dfbf 100%);
  border-radius: 3px 3px 0 0;
  transition: all 0.3s;
}

.chart-bar:hover {
  background: linear-gradient(180deg, #27ae60 0%, #82e0aa 100%);
}
</style>
