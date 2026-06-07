import { state } from './state.js';
import { ui, formatTime } from './ui.js';

export const canvasCtx = ui.videoCanvas.getContext('2d');

export function initCanvas() {
  updateCanvasResolution();
  drawPlaceholderCanvas(`AuraMotion ${state.aspectRatio} Screen`);
}

export function updateCanvasResolution() {
  const wrapper = ui.playerViewport;
  if (state.aspectRatio === '16:9') {
    ui.videoCanvas.width = 1280;
    ui.videoCanvas.height = 720;
    wrapper.style.aspectRatio = '16/9';
  } else if (state.aspectRatio === '9:16') {
    ui.videoCanvas.width = 720;
    ui.videoCanvas.height = 1280;
    wrapper.style.aspectRatio = '9/16';
  } else if (state.aspectRatio === '1:1') {
    ui.videoCanvas.width = 1080;
    ui.videoCanvas.height = 1080;
    wrapper.style.aspectRatio = '1/1';
  }
}

export function drawPlaceholderCanvas(text) {
  canvasCtx.fillStyle = '#06060c';
  canvasCtx.fillRect(0, 0, ui.videoCanvas.width, ui.videoCanvas.height);
  
  canvasCtx.strokeStyle = 'rgba(139, 92, 246, 0.05)';
  canvasCtx.lineWidth = 1;
  for (let i = 0; i < ui.videoCanvas.width; i += 40) {
    canvasCtx.beginPath();
    canvasCtx.moveTo(i, 0);
    canvasCtx.lineTo(i, ui.videoCanvas.height);
    canvasCtx.stroke();
  }
  for (let j = 0; j < ui.videoCanvas.height; j += 40) {
    canvasCtx.beginPath();
    canvasCtx.moveTo(0, j);
    canvasCtx.lineTo(ui.videoCanvas.width, j);
    canvasCtx.stroke();
  }

  canvasCtx.font = "bold 20px 'Outfit', sans-serif";
  canvasCtx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  canvasCtx.textAlign = 'center';
  canvasCtx.fillText(text, ui.videoCanvas.width / 2, ui.videoCanvas.height / 2);
}

export function drawCurrentFrame() {
  if (state.uploadedImages.length === 0) {
    drawPlaceholderCanvas("Upload Photos To Preview");
    return;
  }

  let imageIndex = 0;
  let currentSlideTime = 0;
  let slideDuration = state.slideDuration;

  if (state.beatSync && state.detectedBeats.length > 0) {
    // Find how many beats have passed
    let beatIdx = -1;
    for (let i = 0; i < state.detectedBeats.length; i++) {
      if (state.detectedBeats[i] <= state.currentTime) {
        beatIdx = i;
      } else {
        break;
      }
    }
    
    // imageIndex is based on beat count
    imageIndex = Math.min(beatIdx + 1, state.uploadedImages.length - 1);
    
    // Calculate slide progress for motion (Ken Burns)
    const startTime = beatIdx === -1 ? 0 : state.detectedBeats[beatIdx];
    const endTime = (beatIdx + 1 >= state.detectedBeats.length) ? state.totalDuration : state.detectedBeats[beatIdx + 1];
    slideDuration = endTime - startTime;
    currentSlideTime = state.currentTime - startTime;
  } else {
    imageIndex = Math.min(Math.floor(state.currentTime / state.slideDuration), state.uploadedImages.length - 1);
    currentSlideTime = state.currentTime % state.slideDuration;
    slideDuration = state.slideDuration;
  }

  const nextImageIndex = imageIndex + 1 < state.uploadedImages.length ? imageIndex + 1 : null;
  
  canvasCtx.clearRect(0, 0, ui.videoCanvas.width, ui.videoCanvas.height);
  canvasCtx.fillStyle = '#000000';
  canvasCtx.fillRect(0, 0, ui.videoCanvas.width, ui.videoCanvas.height);

  canvasCtx.save();
  applyThemeShaders(canvasCtx);

  const currentImgData = state.uploadedImages[imageIndex];
  const imgElement = currentImgData.imgElement;
  if (imgElement) {
    renderSingleSlide(canvasCtx, currentImgData, imgElement, currentSlideTime, slideDuration);
  } else {
    canvasCtx.fillStyle = "#111";
    canvasCtx.fillRect(0, 0, ui.videoCanvas.width, ui.videoCanvas.height);
  }

  // Transitions
  const fadeWindow = 0.5; 
  if (nextImageIndex !== null && currentSlideTime > (slideDuration - fadeWindow)) {
    const alpha = (currentSlideTime - (slideDuration - fadeWindow)) / fadeWindow;
    const nextImgData = state.uploadedImages[nextImageIndex];
    const nextImgEl = nextImgData.imgElement;

    if (nextImgEl) {
      canvasCtx.globalAlpha = alpha;
      // For the next slide preview in fade, we assume its start time is 0 for motion
      renderSingleSlide(canvasCtx, nextImgData, nextImgEl, 0, slideDuration); 
      canvasCtx.globalAlpha = 1.0;
    }
  }

  drawThemeOverlays(canvasCtx);
  drawCaption(canvasCtx, currentImgData);

  canvasCtx.restore();
  
  ui.seekSlider.value = state.currentTime;
  ui.timeCurrent.textContent = formatTime(state.currentTime);

  updateWaveformPlayhead();
}

export function renderSingleSlide(context, imgData, img, slideTime, slideDuration) {
  const w = ui.videoCanvas.width;
  const h = ui.videoCanvas.height;

  context.save();
  
  let zoomScale = 1.0 + (slideTime / slideDuration) * 0.08; 
  zoomScale *= imgData.zoom;
  const rotation = imgData.rotate * Math.PI / 180;

  const panIndex = state.uploadedImages.indexOf(imgData);
  let tx = 0;
  let ty = 0;
  if (panIndex % 2 === 0) {
    tx = (slideTime / state.slideDuration) * 20; 
  } else {
    ty = -(slideTime / state.slideDuration) * 15; 
  }

  context.translate(w / 2, h / 2);
  context.rotate(rotation);
  context.scale(zoomScale, zoomScale);
  context.translate(tx, ty);

  const imgRatio = img.width / img.height;
  const canvasRatio = w / h;
  let dw, dh;

  if (imgRatio > canvasRatio) {
    dw = w;
    dh = w / imgRatio;
  } else {
    dh = h;
    dw = h * imgRatio;
  }

  context.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  context.restore();
}

export function drawCaption(context, imgData) {
  if (!imgData || !imgData.caption) return;
  
  context.save();
  
  const caption = imgData.caption;
  const color = imgData.captionColor || "#ffffff";
  const size = imgData.captionSize || 28;
  const style = imgData.captionStyle || "subtitle";
  
  const w = ui.videoCanvas.width;
  const h = ui.videoCanvas.height;
  
  let yOffset = h - 80;
  if (state.currentTheme === 'cinematic') {
    yOffset = h - 90; 
  }
  
  context.font = `bold ${size}px 'Outfit', sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  
  const x = w / 2;
  const y = yOffset;
  
  if (style === 'subtitle') {
    const metrics = context.measureText(caption);
    const textWidth = metrics.width;
    const paddingH = 20;
    const paddingV = 10;
    
    context.fillStyle = 'rgba(0, 0, 0, 0.65)';
    context.beginPath();
    if (context.roundRect) {
      context.roundRect(
        x - textWidth / 2 - paddingH,
        y - size / 2 - paddingV,
        textWidth + paddingH * 2,
        size + paddingV * 2,
        8
      );
    } else {
      context.rect(
        x - textWidth / 2 - paddingH,
        y - size / 2 - paddingV,
        textWidth + paddingH * 2,
        size + paddingV * 2
      );
    }
    context.fill();
    
    context.fillStyle = color;
    context.fillText(caption, x, y);
    
  } else if (style === 'neon') {
    context.shadowBlur = 15;
    context.shadowColor = color;
    context.fillStyle = color;
    context.fillText(caption, x, y);
    context.fillText(caption, x, y);
    
  } else if (style === 'minimal') {
    context.shadowBlur = 4;
    context.shadowColor = 'rgba(0, 0, 0, 0.85)';
    context.shadowOffsetX = 2;
    context.shadowOffsetY = 2;
    context.fillStyle = color;
    context.fillText(caption, x, y);
  }
  
  context.restore();
}

export function applyThemeShaders(context) {
  switch (state.currentTheme) {
    case 'cinematic':
      context.filter = 'contrast(1.15) saturate(1.05) sepia(0.08)';
      break;
    case 'retro':
      context.filter = 'contrast(0.9) saturate(1.2) sepia(0.2)';
      break;
    case 'cyberpunk':
      context.filter = 'contrast(1.3) saturate(1.4) hue-rotate(-20deg)';
      break;
    case 'minimalist':
      context.filter = 'grayscale(1) contrast(1.1)';
      break;
    default:
      context.filter = 'none';
  }
}

export function drawThemeOverlays(context) {
  const w = ui.videoCanvas.width;
  const h = ui.videoCanvas.height;

  if (state.currentTheme !== 'minimalist') {
    const gradient = context.createRadialGradient(w/2, h/2, h/3, w/2, h/2, w/2 * 1.2);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.6)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, w, h);
  }

  if (state.currentTheme === 'retro') {
    context.fillStyle = 'rgba(255, 255, 255, 0.03)';
    for (let y = 0; y < h; y += 4) {
      context.fillRect(0, y, w, 1);
    }
    
    context.font = "20px Courier New, monospace";
    context.fillStyle = "rgba(255, 255, 255, 0.6)";
    context.textAlign = "left";
    context.fillText("PLAY 📼", 40, 50);
    
    context.textAlign = "right";
    const simulatedYear = 1989 + Math.floor(state.currentTime);
    context.fillText(`MAY 30, ${simulatedYear}`, w - 40, h - 40);

  } else if (state.currentTheme === 'cyberpunk') {
    context.strokeStyle = 'rgba(236, 72, 153, 0.2)'; 
    context.lineWidth = 15;
    context.strokeRect(0,0, w, h);

    context.strokeStyle = 'rgba(6, 182, 212, 0.15)'; 
    context.lineWidth = 5;
    context.strokeRect(10, 10, w-20, h-20);
    
    if (state.isPlaying && Math.random() > 0.94) {
      context.fillStyle = 'rgba(6, 182, 212, 0.2)';
      context.fillRect(0, Math.random() * h, w, Math.random() * 40);
      context.fillStyle = 'rgba(236, 72, 153, 0.2)';
      context.fillRect(0, Math.random() * h, w, Math.random() * 30);
    }
  } else if (state.currentTheme === 'cinematic') {
    context.fillStyle = '#000000';
    context.fillRect(0, 0, w, 40);
    context.fillRect(0, h - 40, w, 40);
  }
}

export function updateWaveformPlayhead() {
  if (!state.audioTrack || !ui.waveformCanvas) return;
  
  const width = ui.waveformCanvas.width;
  const progress = state.currentTime / state.totalDuration;
  const x = progress * width;
  
  let indicator = document.getElementById('waveform-playhead');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'waveform-playhead';
    indicator.style.position = 'absolute';
    indicator.style.top = '0';
    indicator.style.bottom = '0';
    indicator.style.width = '2px';
    indicator.style.backgroundColor = 'var(--accent)';
    indicator.style.boxShadow = '0 0 8px var(--accent)';
    indicator.style.pointerEvents = 'none';
    ui.waveformCanvas.parentElement.appendChild(indicator);
  }
  indicator.style.left = `${x}px`;
}
