// ===== STATE =====
let gridSize = 32;
let currentColor = '#e8e8e8';
let currentTool = 'draw';
let showGrid = true;
let isDrawing = false;
let pixelData = [];
let undoStack = [];
let redoStack = [];
let recentColors = [];

// ===== DOM =====
const pixelCanvas = document.getElementById('pixelCanvas');
const gridCanvas = document.getElementById('gridCanvas');
const pCtx = pixelCanvas.getContext('2d');
const gCtx = gridCanvas.getContext('2d');
const canvasWrapper = document.getElementById('canvasWrapper');
const canvasContainer = document.getElementById('canvasContainer');
const colorPicker = document.getElementById('colorPicker');
const currentColorEl = document.getElementById('currentColor');
const paletteEl = document.getElementById('palette');
const recentColorsEl = document.getElementById('recentColors');
const galleryList = document.getElementById('galleryList');

// ===== PALETTE =====
const paletteColors = [
  '#000000', '#333333', '#555555', '#777777', '#aaaaaa', '#ffffff',
  '#e8e8e8', '#d4d4d4', '#b0b0b0', '#808080', '#404040', '#1a1a1a',
  '#ff0000', '#ff4444', '#ff8888', '#cc0000', '#880000', '#440000',
  '#ff8800', '#ffaa44', '#ffcc88', '#cc6600', '#884400', '#442200',
  '#ffff00', '#ffff44', '#ffff88', '#cccc00', '#888800', '#444400',
  '#00ff00', '#44ff44', '#88ff88', '#00cc00', '#008800', '#004400',
  '#00ffff', '#44ffff', '#88ffff', '#00cccc', '#008888', '#004444',
  '#0000ff', '#4444ff', '#8888ff', '#0000cc', '#000088', '#000044',
  '#ff00ff', '#ff44ff', '#ff88ff', '#cc00cc', '#880088', '#440044',
  '#ff0088', '#ff4488', '#ff88aa', '#cc0066', '#880044', '#440022',
];

function renderPalette() {
  paletteEl.innerHTML = paletteColors.map(c =>
    `<div class="palette-color${c === currentColor ? ' active' : ''}" data-color="${c}" style="background:${c};"></div>`
  ).join('');

  paletteEl.querySelectorAll('.palette-color').forEach(el => {
    el.addEventListener('click', () => {
      setColor(el.dataset.color);
    });
  });
}

function setColor(color) {
  currentColor = color;
  currentColorEl.style.background = color;
  colorPicker.value = color;

  paletteEl.querySelectorAll('.palette-color').forEach(el => {
    el.classList.toggle('active', el.dataset.color === color);
  });

  addRecentColor(color);
}

colorPicker.addEventListener('input', (e) => setColor(e.target.value));
currentColorEl.addEventListener('click', () => colorPicker.click());

function addRecentColor(color) {
  recentColors = recentColors.filter(c => c !== color);
  recentColors.unshift(color);
  if (recentColors.length > 12) recentColors.pop();
  renderRecent();
}

function renderRecent() {
  recentColorsEl.innerHTML = recentColors.map(c =>
    `<div class="recent-swatch" style="background:${c};" data-color="${c}"></div>`
  ).join('');
  recentColorsEl.querySelectorAll('.recent-swatch').forEach(el => {
    el.addEventListener('click', () => setColor(el.dataset.color));
  });
}

// ===== CANVAS INIT =====
function initCanvas() {
  pixelData = [];
  for (let y = 0; y < gridSize; y++) {
    pixelData[y] = [];
    for (let x = 0; x < gridSize; x++) {
      pixelData[y][x] = null;
    }
  }
  undoStack = [];
  redoStack = [];
  resizeCanvas();
  drawPixels();
  drawGrid();
}

function resizeCanvas() {
  const containerSize = Math.min(canvasContainer.clientWidth - 40, canvasContainer.clientHeight - 40, 640);
  const size = Math.floor(containerSize / gridSize) * gridSize;

  pixelCanvas.width = gridSize;
  pixelCanvas.height = gridSize;
  pixelCanvas.style.width = size + 'px';
  pixelCanvas.style.height = size + 'px';

  gridCanvas.width = size;
  gridCanvas.height = size;
  gridCanvas.style.width = size + 'px';
  gridCanvas.style.height = size + 'px';

  canvasWrapper.style.width = size + 'px';
  canvasWrapper.style.height = size + 'px';
}

function drawPixels() {
  pCtx.clearRect(0, 0, gridSize, gridSize);

  // Checkerboard background for transparency
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      pCtx.fillStyle = (x + y) % 2 === 0 ? '#2a2a3a' : '#222233';
      pCtx.fillRect(x, y, 1, 1);
    }
  }

  // Draw pixels
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (pixelData[y][x]) {
        pCtx.fillStyle = pixelData[y][x];
        pCtx.fillRect(x, y, 1, 1);
      }
    }
  }
}

function drawGrid() {
  const w = gridCanvas.width;
  const h = gridCanvas.height;
  const cellSize = w / gridSize;

  gCtx.clearRect(0, 0, w, h);

  if (!showGrid) return;

  gCtx.strokeStyle = 'rgba(255,255,255,0.08)';
  gCtx.lineWidth = 0.5;

  for (let i = 0; i <= gridSize; i++) {
    const pos = i * cellSize;
    gCtx.beginPath();
    gCtx.moveTo(pos, 0);
    gCtx.lineTo(pos, h);
    gCtx.stroke();

    gCtx.beginPath();
    gCtx.moveTo(0, pos);
    gCtx.lineTo(w, pos);
    gCtx.stroke();
  }
}

// ===== DRAWING =====
function getPixelCoords(e) {
  const rect = pixelCanvas.getBoundingClientRect();
  const scaleX = gridSize / rect.width;
  const scaleY = gridSize / rect.height;
  const x = Math.floor((e.clientX - rect.left) * scaleX);
  const y = Math.floor((e.clientY - rect.top) * scaleY);
  return { x: Math.max(0, Math.min(gridSize - 1, x)), y: Math.max(0, Math.min(gridSize - 1, y)) };
}

function saveState() {
  undoStack.push(JSON.stringify(pixelData));
  if (undoStack.length > 50) undoStack.shift();
  redoStack = [];
}

function setPixel(x, y, color) {
  if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) return;
  pixelData[y][x] = color;
  drawPixels();
}

function handleDraw(e) {
  const { x, y } = getPixelCoords(e);

  if (currentTool === 'draw') {
    setPixel(x, y, currentColor);
  } else if (currentTool === 'erase') {
    setPixel(x, y, null);
  } else if (currentTool === 'fill') {
    floodFill(x, y, currentColor);
  } else if (currentTool === 'pick') {
    const color = pixelData[y][x];
    if (color) setColor(color);
  }
}

// Mouse events on the wrapper (gridCanvas overlays pixelCanvas)
gridCanvas.addEventListener('mousedown', (e) => {
  isDrawing = true;
  saveState();
  handleDraw(e);
});

gridCanvas.addEventListener('mousemove', (e) => {
  if (!isDrawing) return;
  if (currentTool === 'draw' || currentTool === 'erase') {
    handleDraw(e);
  }
});

document.addEventListener('mouseup', () => { isDrawing = false; });

// Touch
gridCanvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  isDrawing = true;
  saveState();
  handleDraw(e.touches[0]);
});

gridCanvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (!isDrawing) return;
  if (currentTool === 'draw' || currentTool === 'erase') {
    handleDraw(e.touches[0]);
  }
});

gridCanvas.addEventListener('touchend', () => { isDrawing = false; });

// Make gridCanvas receive pointer events
gridCanvas.style.pointerEvents = 'auto';

// ===== FLOOD FILL =====
function floodFill(startX, startY, fillColor) {
  const targetColor = pixelData[startY][startX];
  if (targetColor === fillColor) return;

  const stack = [[startX, startY]];
  const visited = new Set();

  while (stack.length > 0) {
    const [x, y] = stack.pop();
    const key = `${x},${y}`;
    if (visited.has(key)) continue;
    if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) continue;
    if (pixelData[y][x] !== targetColor) continue;

    visited.add(key);
    pixelData[y][x] = fillColor;

    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  drawPixels();
}

// ===== UNDO / REDO =====
document.getElementById('undoBtn').addEventListener('click', undo);
document.getElementById('redoBtn').addEventListener('click', redo);

function undo() {
  if (undoStack.length === 0) return;
  redoStack.push(JSON.stringify(pixelData));
  pixelData = JSON.parse(undoStack.pop());
  drawPixels();
}

function redo() {
  if (redoStack.length === 0) return;
  undoStack.push(JSON.stringify(pixelData));
  pixelData = JSON.parse(redoStack.pop());
  drawPixels();
}

// ===== TOOLS =====
document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentTool = btn.dataset.tool;
  });
});

// ===== CLEAR =====
document.getElementById('clearBtn').addEventListener('click', () => {
  saveState();
  for (let y = 0; y < gridSize; y++)
    for (let x = 0; x < gridSize; x++)
      pixelData[y][x] = null;
  drawPixels();
});

// ===== GRID TOGGLE =====
document.getElementById('gridToggle').addEventListener('click', () => {
  showGrid = !showGrid;
  drawGrid();
});

// ===== GRID SIZE =====
document.getElementById('gridSize').addEventListener('change', (e) => {
  gridSize = parseInt(e.target.value);
  initCanvas();
});

// ===== EXPORT =====
document.getElementById('exportBtn').addEventListener('click', () => {
  const exportCanvas = document.createElement('canvas');
  const scale = Math.max(1, Math.floor(512 / gridSize));
  exportCanvas.width = gridSize * scale;
  exportCanvas.height = gridSize * scale;
  const eCtx = exportCanvas.getContext('2d');
  eCtx.imageSmoothingEnabled = false;

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (pixelData[y][x]) {
        eCtx.fillStyle = pixelData[y][x];
        eCtx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  }

  const link = document.createElement('a');
  link.download = `pixeldraw-${gridSize}x${gridSize}.png`;
  link.href = exportCanvas.toDataURL('image/png');
  link.click();
});

// ===== SAVE / GALLERY =====
document.getElementById('saveBtn').addEventListener('click', saveToGallery);

function saveToGallery() {
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = gridSize;
  exportCanvas.height = gridSize;
  const eCtx = exportCanvas.getContext('2d');

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (pixelData[y][x]) {
        eCtx.fillStyle = pixelData[y][x];
        eCtx.fillRect(x, y, 1, 1);
      }
    }
  }

  const dataUrl = exportCanvas.toDataURL();
  const gallery = JSON.parse(localStorage.getItem('pd_gallery') || '[]');
  gallery.unshift({ img: dataUrl, size: gridSize, date: Date.now() });
  if (gallery.length > 10) gallery.pop();
  localStorage.setItem('pd_gallery', JSON.stringify(gallery));
  renderGallery();
}

function renderGallery() {
  const gallery = JSON.parse(localStorage.getItem('pd_gallery') || '[]');
  galleryList.innerHTML = gallery.map((item, i) =>
    `<img class="gallery-thumb" src="${item.img}" data-index="${i}" title="${item.size}x${item.size}">`
  ).join('');

  galleryList.querySelectorAll('.gallery-thumb').forEach(img => {
    img.addEventListener('click', () => {
      const idx = parseInt(img.dataset.index);
      const gallery = JSON.parse(localStorage.getItem('pd_gallery') || '[]');
      const item = gallery[idx];
      if (!item) return;

      // Load into canvas
      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = item.size;
      tmpCanvas.height = item.size;
      const tmpCtx = tmpCanvas.getContext('2d');
      const tmpImg = new Image();
      tmpImg.onload = () => {
        tmpCtx.drawImage(tmpImg, 0, 0);
        gridSize = item.size;
        document.getElementById('gridSize').value = item.size;
        initCanvas();

        const imgData = tmpCtx.getImageData(0, 0, item.size, item.size);
        for (let y = 0; y < item.size; y++) {
          for (let x = 0; x < item.size; x++) {
            const i = (y * item.size + x) * 4;
            const r = imgData.data[i], g = imgData.data[i + 1], b = imgData.data[i + 2], a = imgData.data[i + 3];
            if (a > 0) {
              pixelData[y][x] = `rgb(${r},${g},${b})`;
            }
          }
        }
        drawPixels();
      };
      tmpImg.src = item.img;
    });
  });
}

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

  if (e.key === 'd') selectTool('draw');
  else if (e.key === 'e') selectTool('erase');
  else if (e.key === 'f') selectTool('fill');
  else if (e.key === 'p') selectTool('pick');
  else if (e.key === 'g') { showGrid = !showGrid; drawGrid(); }
  else if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
  else if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); }
});

function selectTool(tool) {
  currentTool = tool;
  document.querySelectorAll('.tool-btn[data-tool]').forEach(b => {
    b.classList.toggle('active', b.dataset.tool === tool);
  });
}

// ===== RESIZE HANDLER =====
window.addEventListener('resize', () => {
  resizeCanvas();
  drawPixels();
  drawGrid();
});

// ===== INIT =====
renderPalette();
renderGallery();
initCanvas();
setColor('#e8e8e8');
