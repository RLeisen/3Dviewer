import {
  ArrowDownToLine,
  Box,
  Camera,
  ChevronDown,
  Copy,
  Crosshair,
  Cuboid,
  FileUp,
  FolderOpen,
  Grid3x3,
  MousePointer2,
  PanelRight,
  RotateCcw,
  Ruler,
  Scan,
  Square,
  Waypoints,
  createIcons,
} from 'lucide';
import { AppController } from './ui/AppController.js';
import { renderApp } from './ui/template.js';
import './styles/index.css';

const appRoot = document.querySelector('#app');
appRoot.innerHTML = renderApp();
createIcons({
  icons: {
    ArrowDownToLine,
    Box,
    Camera,
    ChevronDown,
    Copy,
    Crosshair,
    Cuboid,
    FileUp,
    FolderOpen,
    Grid3x3,
    MousePointer2,
    PanelRight,
    RotateCcw,
    Ruler,
    Scan,
    Square,
    Waypoints,
  },
});

const app = new AppController(appRoot);
app.initialize();

window.addEventListener('beforeunload', () => app.dispose());
