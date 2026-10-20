import { createDemoModel } from '../models/createDemoModel.js';
import { ModelLoader } from '../loaders/ModelLoader.js';
import { formatLength } from '../config/units.js';
import { Viewer } from '../viewer/Viewer.js';

const numberFormat = new Intl.NumberFormat('zh-CN');

export class AppController {
  constructor(root) {
    this.root = root;
    this.elements = Object.fromEntries(
      [
        'viewport', 'model-file', 'open-model', 'fit-view', 'capture', 'toggle-panel', 'inspector',
        'drop-zone', 'viewport-status', 'status-text', 'tool-orbit', 'tool-measure', 'measure-hint',
        'clear-measurements', 'view-iso', 'view-top', 'view-front', 'loading', 'loading-file', 'toast',
        'scale-value', 'scale-line', 'model-name', 'format-badge', 'size-x', 'size-y', 'size-z',
        'copy-dimensions', 'unit-select', 'scale-number', 'scale-range', 'toggle-grid', 'toggle-bounds',
        'toggle-wireframe', 'mesh-count', 'triangle-count', 'material-count', 'reset-model',
      ].map((id) => [id, root.querySelector(`#${id}`)]),
    );
    this.loader = new ModelLoader();
    this.viewer = new Viewer(this.elements.viewport, {
      onScaleChange: (dimensions, ruler) => this.updateDimensions(dimensions, ruler),
    });
    this.currentMeta = null;
    this.toastTimer = null;
  }

  initialize() {
    this.bindEvents();
    this.loadDemo();
  }

  bindEvents() {
    const el = this.elements;
    el['open-model'].addEventListener('click', () => el['model-file'].click());
    el['model-file'].addEventListener('change', (event) => this.loadFiles(event.target.files));
    el['fit-view'].addEventListener('click', () => this.viewer.fitToModel());
    el.capture.addEventListener('click', () => this.saveCapture());
    el['toggle-panel'].addEventListener('click', () => el.inspector.classList.toggle('is-collapsed'));
    el['view-iso'].addEventListener('click', () => this.viewer.setView('iso'));
    el['view-top'].addEventListener('click', () => this.viewer.setView('top'));
    el['view-front'].addEventListener('click', () => this.viewer.setView('front'));
    el['tool-orbit'].addEventListener('click', () => this.setTool('orbit'));
    el['tool-measure'].addEventListener('click', () => this.setTool('measure'));
    el['clear-measurements'].addEventListener('click', () => this.viewer.measurement.clear());
    el['reset-model'].addEventListener('click', () => this.loadDemo());

    el['unit-select'].addEventListener('change', (event) => this.viewer.setSourceUnit(event.target.value));
    el['scale-range'].addEventListener('input', (event) => this.setScale(event.target.value, 'range'));
    el['scale-number'].addEventListener('input', (event) => {
      if (event.target.value !== '') this.setScale(event.target.value, 'number');
    });
    el['scale-number'].addEventListener('change', (event) => {
      const scale = Math.min(100, Math.max(0.01, Number(event.target.value) || 1));
      event.target.value = scale.toFixed(2).replace(/\.00$/, '');
      this.setScale(scale, 'number');
    });
    el['toggle-grid'].addEventListener('change', (event) => this.viewer.setGridVisible(event.target.checked));
    el['toggle-bounds'].addEventListener('change', (event) => this.viewer.setBoundsVisible(event.target.checked));
    el['toggle-wireframe'].addEventListener('change', (event) => this.viewer.setWireframe(event.target.checked));
    el['copy-dimensions'].addEventListener('click', () => this.copyDimensions());

    ['dragenter', 'dragover'].forEach((type) => {
      el.viewport.addEventListener(type, (event) => {
        event.preventDefault();
        el['drop-zone'].classList.add('is-visible');
      });
    });
    ['dragleave', 'drop'].forEach((type) => {
      el.viewport.addEventListener(type, (event) => {
        event.preventDefault();
        if (type === 'dragleave' && el.viewport.contains(event.relatedTarget)) return;
        el['drop-zone'].classList.remove('is-visible');
        if (type === 'drop' && event.dataTransfer.files.length) this.loadFiles(event.dataTransfer.files);
      });
    });

    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') this.setTool('orbit');
      if (event.key.toLowerCase() === 'f' && !['INPUT', 'SELECT'].includes(document.activeElement.tagName)) this.viewer.fitToModel();
    });
  }

  loadDemo() {
    const object = createDemoModel();
    const stats = this.viewer.setModel(object, { sourceUnit: 'mm' });
    this.currentMeta = { name: '工业工作台', format: 'DEMO' };
    this.elements['unit-select'].value = 'mm';
    this.setScaleInputs(1);
    this.updateModelMeta(this.currentMeta, stats);
    this.setTool('orbit');
    this.showStatus('演示模型', false);
  }

  async loadFiles(files) {
    if (!files?.length) return;
    this.setLoading(true, files[0].name);
    try {
      const result = await this.loader.loadFiles(files);
      const stats = this.viewer.setModel(result.object, { sourceUnit: result.defaultUnit });
      this.currentMeta = result;
      this.elements['unit-select'].value = result.defaultUnit;
      this.setScaleInputs(1);
      this.updateModelMeta(result, stats);
      this.setTool('orbit');
      this.showStatus('模型已载入', false);
      this.showToast(`${result.name} 已载入`);
    } catch (error) {
      console.error(error);
      this.showStatus('载入失败', true);
      this.showToast(error.message || '模型解析失败，请检查文件是否完整。', true);
    } finally {
      this.setLoading(false);
      this.elements['model-file'].value = '';
    }
  }

  updateModelMeta(meta, stats) {
    this.elements['model-name'].textContent = meta.name.replace(/\.[^.]+$/, '');
    this.elements['format-badge'].textContent = meta.format;
    this.elements['mesh-count'].textContent = numberFormat.format(stats.meshes);
    this.elements['triangle-count'].textContent = numberFormat.format(stats.triangles);
    this.elements['material-count'].textContent = numberFormat.format(stats.materials);
    this.updateDimensions(this.viewer.getDimensionsMeters());
  }

  updateDimensions(dimensions, ruler) {
    if (dimensions) {
      const unit = this.viewer?.sourceUnit ?? this.elements['unit-select'].value ?? 'mm';
      this.elements['size-x'].textContent = formatLength(dimensions.x, unit);
      this.elements['size-y'].textContent = formatLength(dimensions.y, unit);
      this.elements['size-z'].textContent = formatLength(dimensions.z, unit);
    }
    if (ruler) {
      this.elements['scale-value'].textContent = ruler.label;
      this.elements['scale-line'].style.width = `${ruler.width}px`;
    }
  }

  setTool(tool) {
    const measuring = tool === 'measure';
    this.viewer.setMeasureEnabled(measuring);
    this.elements['tool-orbit'].setAttribute('aria-pressed', String(!measuring));
    this.elements['tool-measure'].setAttribute('aria-pressed', String(measuring));
    this.elements['measure-hint'].hidden = !measuring;
  }

  setScale(value, source) {
    const scale = Math.min(100, Math.max(0.01, Number(value) || 1));
    this.viewer.setUserScale(scale);
    if (source === 'range') this.elements['scale-number'].value = scale.toFixed(2).replace(/\.00$/, '');
    else this.elements['scale-range'].value = Math.min(4, scale);
  }

  setScaleInputs(value) {
    this.elements['scale-number'].value = value;
    this.elements['scale-range'].value = value;
  }

  async copyDimensions() {
    const text = `X ${this.elements['size-x'].textContent} × Y ${this.elements['size-y'].textContent} × Z ${this.elements['size-z'].textContent}`;
    try {
      await navigator.clipboard.writeText(text);
      this.showToast('尺寸已复制');
    } catch {
      this.showToast('浏览器未允许访问剪贴板', true);
    }
  }

  async saveCapture() {
    const blob = await this.viewer.capture();
    if (!blob) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${this.currentMeta?.name?.replace(/\.[^.]+$/, '') || 'model'}-view.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    this.showToast('视图截图已保存');
  }

  setLoading(loading, filename = '') {
    this.elements.loading.hidden = !loading;
    this.elements['loading-file'].textContent = filename;
  }

  showStatus(text, isError) {
    this.elements['status-text'].textContent = text;
    this.elements['viewport-status'].classList.toggle('is-error', isError);
  }

  showToast(message, isError = false) {
    clearTimeout(this.toastTimer);
    this.elements.toast.textContent = message;
    this.elements.toast.classList.toggle('is-error', isError);
    this.elements.toast.classList.add('is-visible');
    this.toastTimer = setTimeout(() => this.elements.toast.classList.remove('is-visible'), 3200);
  }

  dispose() {
    clearTimeout(this.toastTimer);
    this.loader.dispose();
    this.viewer.dispose();
  }
}
