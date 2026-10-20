import { MODEL_FILE_ACCEPT } from '../config/formats.js';
import { UNITS } from '../config/units.js';

const iconButton = (icon, label, id, extra = '') => `
  <button class="icon-button" id="${id}" type="button" aria-label="${label}" title="${label}" ${extra}>
    <i data-lucide="${icon}" aria-hidden="true"></i>
  </button>`;

export function renderApp() {
  const unitOptions = Object.entries(UNITS)
    .map(([value, unit]) => `<option value="${value}">${unit.label} (${unit.suffix})</option>`)
    .join('');

  return `
    <main class="app-shell">
      <header class="topbar">
        <div class="brand" aria-label="标尺三维模型查看器">
          <span class="brand-mark"><i data-lucide="box" aria-hidden="true"></i></span>
          <span class="brand-copy"><strong>标尺</strong><small>3D MODEL INSPECTOR</small></span>
        </div>

        <div class="top-actions">
          <input id="model-file" type="file" accept="${MODEL_FILE_ACCEPT},.bin,.mtl,image/*" multiple hidden />
          <button class="primary-button" id="open-model" type="button">
            <i data-lucide="folder-open" aria-hidden="true"></i><span>打开模型</span>
          </button>
          <span class="separator" aria-hidden="true"></span>
          ${iconButton('scan', '适应窗口', 'fit-view')}
          ${iconButton('camera', '保存截图', 'capture')}
          ${iconButton('panel-right', '显示或隐藏检查面板', 'toggle-panel')}
        </div>
      </header>

      <section class="workspace">
        <div class="viewport" id="viewport">
          <div class="drop-zone" id="drop-zone" aria-hidden="true">
            <div><i data-lucide="file-up" aria-hidden="true"></i><strong>放开以载入模型</strong></div>
          </div>

          <div class="viewport-status" id="viewport-status">
            <span class="status-dot"></span><span id="status-text">演示模型</span>
          </div>

          <nav class="view-toolbar" aria-label="模型工具">
            ${iconButton('mouse-pointer-2', '旋转视图', 'tool-orbit', 'aria-pressed="true"')}
            ${iconButton('ruler', '两点测距', 'tool-measure', 'aria-pressed="false"')}
            <span class="toolbar-rule" aria-hidden="true"></span>
            ${iconButton('box', '等轴视图', 'view-iso')}
            ${iconButton('arrow-down-to-line', '顶视图', 'view-top')}
            ${iconButton('square', '前视图', 'view-front')}
          </nav>

          <div class="measure-hint" id="measure-hint" hidden>
            <i data-lucide="crosshair" aria-hidden="true"></i>
            <span>在模型表面依次选取两个点</span>
            <button id="clear-measurements" type="button">清除</button>
          </div>

          <div class="scale-ruler" aria-label="视图比例尺">
            <span id="scale-value">1 m</span>
            <span class="scale-line" id="scale-line"></span>
          </div>

          <div class="axis-compass" aria-hidden="true">
            <span class="axis axis-y">Y</span>
            <span class="axis axis-x">X</span>
            <span class="axis axis-z">Z</span>
            <span class="axis-origin"></span>
          </div>

          <div class="loading" id="loading" hidden>
            <span class="loading-ring"></span>
            <strong>正在解析模型</strong>
            <small id="loading-file">请稍候…</small>
          </div>

          <div class="toast" id="toast" role="status" aria-live="polite"></div>
        </div>

        <aside class="inspector" id="inspector">
          <div class="inspector-header">
            <div><span class="eyebrow">当前模型</span><h1 id="model-name">工业工作台</h1></div>
            <span class="format-badge" id="format-badge">DEMO</span>
          </div>

          <div class="panel-section dimension-section">
            <div class="section-heading">
              <h2>整体尺寸</h2>
              <button class="text-button" id="copy-dimensions" type="button" title="复制尺寸">
                <i data-lucide="copy" aria-hidden="true"></i><span>复制</span>
              </button>
            </div>
            <div class="dimension-visual" aria-label="模型三轴尺寸">
              <div class="dimension-cube"><span class="cube-top"></span><span class="cube-front"></span><span class="cube-side"></span></div>
              <dl class="dimension-list">
                <div><dt><span class="dimension-key key-x">X</span> 宽度</dt><dd id="size-x">1,800 mm</dd></div>
                <div><dt><span class="dimension-key key-y">Y</span> 高度</dt><dd id="size-y">1,450 mm</dd></div>
                <div><dt><span class="dimension-key key-z">Z</span> 深度</dt><dd id="size-z">800 mm</dd></div>
              </dl>
            </div>
          </div>

          <div class="panel-section">
            <div class="section-heading"><h2>尺度设置</h2></div>
            <label class="field-label" for="unit-select">模型原始单位</label>
            <div class="select-wrap">
              <select id="unit-select">${unitOptions}</select>
              <i data-lucide="chevron-down" aria-hidden="true"></i>
            </div>

            <div class="scale-heading">
              <label class="field-label" for="scale-range">比例因子</label>
              <div class="number-field"><span>×</span><input id="scale-number" type="number" value="1" min="0.01" max="100" step="0.01" /></div>
            </div>
            <input class="range" id="scale-range" type="range" value="1" min="0.01" max="4" step="0.01" aria-label="比例因子" />
            <div class="range-labels"><span>0.01</span><span>1.00</span><span>4.00</span></div>
          </div>

          <div class="panel-section">
            <div class="section-heading"><h2>显示</h2></div>
            <div class="toggle-list">
              <label><span><i data-lucide="grid-3x3" aria-hidden="true"></i>地面网格</span><input type="checkbox" id="toggle-grid" checked /><span class="switch"></span></label>
              <label><span><i data-lucide="cuboid" aria-hidden="true"></i>边界框</span><input type="checkbox" id="toggle-bounds" checked /><span class="switch"></span></label>
              <label><span><i data-lucide="waypoints" aria-hidden="true"></i>线框模式</span><input type="checkbox" id="toggle-wireframe" /><span class="switch"></span></label>
            </div>
          </div>

          <div class="panel-section model-stats">
            <div class="section-heading"><h2>模型信息</h2></div>
            <dl>
              <div><dt>网格</dt><dd id="mesh-count">18</dd></div>
              <div><dt>三角面</dt><dd id="triangle-count">624</dd></div>
              <div><dt>材质</dt><dd id="material-count">5</dd></div>
            </dl>
          </div>

          <footer class="inspector-footer">
            <span>GLB · GLTF · OBJ · FBX · STL</span>
            <button id="reset-model" type="button"><i data-lucide="rotate-ccw" aria-hidden="true"></i>重置模型</button>
          </footer>
        </aside>
      </section>
    </main>`;
}
