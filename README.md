# 标尺 · 3D 模型查看器

面向 3ds Max 导出模型的浏览器查看器。支持 `GLB/GLTF`、`OBJ/MTL`、`FBX` 和 `STL`，包含真实单位换算、统一比例缩放、三轴包围尺寸、两点测距、视图预设、网格、边界框和截图。

## 本地开发

要求 Node.js 20 或更高版本，推荐使用 pnpm。

```bash
corepack enable
pnpm install
pnpm dev
```

打开 `http://localhost:4173`。

## 模型导出建议

- 首选 `GLB`：材质、贴图和几何体可封装在一个文件中，网页端最稳定。
- 使用 `GLTF` 时，请一次选择或拖入 `.gltf`、`.bin` 和贴图文件。
- 使用 `OBJ` 时，请将 `.obj`、`.mtl` 和贴图一起选择或拖入。
- `FBX`、`OBJ` 和 `STL` 默认按毫米解释；`GLB/GLTF` 按米解释。载入后可在右侧“模型原始单位”中修正。
- 浏览器不会直接解析 `.max` 工程文件，请先在 3ds Max 中导出上述格式。

## Docker 部署

```bash
docker build -t dimension-3d-viewer .
docker run --rm -p 8080:80 dimension-3d-viewer
```

打开 `http://localhost:8080`。容器提供 `/health` 健康检查端点，静态资源带长期缓存，单页路由由 Nginx 回退到 `index.html`。

## 目录结构

```text
.
├── docker/                # Nginx 运行配置
├── src/
│   ├── config/            # 格式与单位配置
│   ├── loaders/           # 模型加载与依赖文件映射
│   ├── models/            # 内置演示模型
│   ├── styles/            # 设计变量、布局、组件、响应式样式
│   ├── tools/             # 测距等查看工具
│   ├── ui/                # 页面模板与交互控制
│   └── viewer/            # Three.js 场景、相机和渲染器
├── Dockerfile
└── vite.config.js
```
