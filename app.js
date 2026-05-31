/* ----------------------------------------------------
   PHOTO-TO-VIDEO GENERATOR - CORE APPLICATION LOGIC
   ---------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons
  lucide.createIcons();

  // --- STATE MANAGEMENT ---
  let uploadedImages = []; // Array of { id, file, src, name, zoom, rotate }
  let audioTrack = null;    // Object: { file, src, name, buffer, audioContext, source }
  let videoGenerated = false;
  
  // Playback Config
  const SLIDE_DURATION = 3.5; // seconds per photo
  let isPlaying = false;
  let currentTime = 0;
  let totalDuration = 0;
  let lastFrameTime = 0;
  let animationFrameId = null;
  let currentTheme = 'cinematic'; // cinematic, retro, cyberpunk, minimalist
  let activeAudio = null; // HTMLAudioElement for playback
  let audioCtx = null;
  let audioAnalyser = null;
  let audioNodeSrc = null;

  // Editing Modal State
  let editingImageIndex = -1;
  let tempZoom = 1.0;
  let tempRotate = 0;

  // --- DOM ELEMENTS ---
  const imageDropzone = document.getElementById('image-dropzone');
  const imageInput = document.getElementById('image-input');
  const audioBtn = document.getElementById('audio-btn');
  const audioInput = document.getElementById('audio-input');
  const audioMeta = document.getElementById('audio-meta');
  const audioFilename = document.getElementById('audio-filename');
  const audioRemove = document.getElementById('audio-remove');
  
  const waveformCanvas = document.getElementById('waveform-canvas');
  const waveformPlaceholder = document.getElementById('waveform-placeholder');
  
  const themeCards = document.querySelectorAll('.theme-card');
  const promptInput = document.getElementById('prompt-input');
  const generateTrigger = document.getElementById('generate-trigger');
  const apiStatus = document.getElementById('api-status');
  
  const videoCanvas = document.getElementById('video-canvas');
  const playerOverlay = document.getElementById('player-overlay');
  const playerStatusTag = document.getElementById('player-status-tag');
  
  const seekSlider = document.getElementById('seek-slider');
  const timeCurrent = document.getElementById('time-current');
  const timeTotal = document.getElementById('time-total');
  
  const btnRestart = document.getElementById('btn-restart');
  const btnPlay = document.getElementById('btn-play');
  const playIcon = document.getElementById('play-icon');
  const btnMute = document.getElementById('btn-mute');
  const muteIcon = document.getElementById('mute-icon');
  const volumeSlider = document.getElementById('volume-slider');
  const btnShuffle = document.getElementById('btn-shuffle');
  const btnFullscreen = document.getElementById('btn-fullscreen');
  
  const storyboardGrid = document.getElementById('storyboard-grid');
  const storyboardEmpty = document.getElementById('storyboard-empty');
  const photoCounter = document.getElementById('photo-counter');
  
  const exportInshot = document.getElementById('export-inshot');
  const exportYoucut = document.getElementById('export-youcut');
  const exportRender = document.getElementById('export-render');
  
  const cropModal = document.getElementById('crop-modal');
  const cropPreviewImg = document.getElementById('crop-preview-img');
  const cropZoom = document.getElementById('crop-zoom');
  const cropRotate = document.getElementById('crop-rotate');
  const zoomValue = document.getElementById('zoom-value');
  const rotateValue = document.getElementById('rotate-value');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalCancelBtn = document.getElementById('modal-cancel-btn');
  const modalSaveBtn = document.getElementById('modal-save-btn');

  // Custom caption overlay elements
  const photoCaption = document.getElementById('photo-caption');
  const captionColor = document.getElementById('caption-color');
  const captionSize = document.getElementById('caption-size');
  const sizeValue = document.getElementById('size-value');
  const captionStyle = document.getElementById('caption-style');
  const playerViewport = document.getElementById('player-viewport');
  const playerCenterBtn = document.getElementById('player-center-btn');
  const centerBtnIcon = document.getElementById('center-btn-icon');

  // Set up rendering context for play viewport
  const ctx = videoCanvas.getContext('2d');
  
  // Set initial canvas resolution
  videoCanvas.width = 1280;
  videoCanvas.height = 720;

  // Draw default blank state on video canvas
  drawPlaceholderCanvas("AuraMotion 16:9 Screen");

  // --- 1. MEDIA UPLOAD & MANAGEMENT ---

  // Drag & drop triggers
  imageDropzone.addEventListener('click', () => imageInput.click());
  
  imageDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    imageDropzone.classList.add('dragover');
  });

  imageDropzone.addEventListener('dragleave', () => {
    imageDropzone.classList.remove('dragover');
  });

  imageDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    imageDropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handleImageFiles(e.dataTransfer.files);
    }
  });

  imageInput.addEventListener('change', () => {
    if (imageInput.files.length > 0) {
      handleImageFiles(imageInput.files);
      imageInput.value = ''; // Reset
    }
  });

  function handleImageFiles(files) {
    const remainingSlots = 20 - uploadedImages.length;
    if (remainingSlots <= 0) {
      alert("You have reached the maximum limit of 20 photos.");
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    let loadedCount = 0;

    filesToUpload.forEach(file => {
      if (!file.type.startsWith('image/')) {
        alert(`File ${file.name} is not an image.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        uploadedImages.push({
          id: Date.now() + Math.random().toString(36).substr(2, 5),
          file: file,
          src: e.target.result,
          name: file.name,
          zoom: 1.0,
          rotate: 0,
          caption: "",
          captionColor: "#ffffff",
          captionSize: 28,
          captionStyle: "subtitle"
        });

        loadedCount++;
        if (loadedCount === filesToUpload.length) {
          updateStoryboard();
          recalculateDuration();
          triggerStateChange();
        }
      };
      reader.readAsDataURL(file);
    });

    if (files.length > remainingSlots) {
      alert(`Only ${remainingSlots} photos were added. The maximum limit is 20 photos.`);
    }
  }

  // Audio Upload Actions
  audioBtn.addEventListener('click', () => audioInput.click());

  audioInput.addEventListener('change', () => {
    if (audioInput.files.length > 0) {
      handleAudioFile(audioInput.files[0]);
      audioInput.value = '';
    }
  });

  function handleAudioFile(file) {
    if (!file.type.startsWith('audio/')) {
      alert("Please upload a valid audio file (MP3/WAV).");
      return;
    }

    // Clear previous audio
    if (activeAudio) {
      activeAudio.pause();
      activeAudio = null;
    }

    audioTrack = {
      file: file,
      src: URL.createObjectURL(file),
      name: file.name
    };

    audioFilename.textContent = file.name;
    audioMeta.classList.remove('hidden');
    waveformPlaceholder.classList.add('hidden');

    activeAudio = new Audio(audioTrack.src);
    activeAudio.volume = volumeSlider.value;
    activeAudio.loop = true;

    // Load Web Audio for visual rendering
    decodeAndRenderWaveform(file);
    triggerStateChange();
  }

  audioRemove.addEventListener('click', () => {
    if (activeAudio) {
      activeAudio.pause();
      activeAudio = null;
    }
    audioTrack = null;
    audioMeta.classList.add('hidden');
    waveformPlaceholder.classList.remove('hidden');
    
    // Clear waveform canvas
    const wCtx = waveformCanvas.getContext('2d');
    wCtx.clearRect(0, 0, waveformCanvas.width, waveformCanvas.height);
    
    triggerStateChange();
  });

  // Decode audio file and paint waveform on Canvas
  function decodeAndRenderWaveform(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const audioData = e.target.result;
      
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }

      audioCtx.decodeAudioData(audioData)
        .then(buffer => {
          renderWaveform(buffer);
        })
        .catch(err => {
          console.error("Waveform decode error:", err);
          waveformPlaceholder.textContent = "Waveform unavailable";
          waveformPlaceholder.classList.remove('hidden');
        });
    };
    reader.readAsArrayBuffer(file);
  }

  function renderWaveform(audioBuffer) {
    const width = waveformCanvas.width = waveformCanvas.parentElement.clientWidth;
    const height = waveformCanvas.height = 60;
    const wCtx = waveformCanvas.getContext('2d');
    
    const rawData = audioBuffer.getChannelData(0); // Left channel
    const samples = 120; // Number of bars to draw
    const blockSize = Math.floor(rawData.length / samples);
    const filteredData = [];

    for (let i = 0; i < samples; i++) {
      let blockStart = blockSize * i;
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum = sum + Math.abs(rawData[blockStart + j]);
      }
      filteredData.push(sum / blockSize);
    }

    const maxVal = Math.max(...filteredData);
    const normalizedData = filteredData.map(val => val / maxVal);

    wCtx.fillStyle = 'rgba(6, 182, 212, 0.05)';
    wCtx.fillRect(0, 0, width, height);

    const barWidth = width / samples;
    const gradient = wCtx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#8b5cf6'); // Violet
    gradient.addColorStop(0.5, '#ec4899'); // Pink
    gradient.addColorStop(1, '#06b6d4'); // Cyan

    wCtx.fillStyle = gradient;

    for (let i = 0; i < samples; i++) {
      const val = normalizedData[i] * height * 0.85;
      const x = i * barWidth;
      const y = (height - val) / 2;
      
      // Draw rounded bar
      wCtx.beginPath();
      wCtx.roundRect(x + 1, y, barWidth - 1, val, 2);
      wCtx.fill();
    }
  }

  // --- 2. AI GENERATION CONTROLS ---

  function parseCaptionsFromPrompt(promptText) {
    if (!promptText) return;
    
    // Reset all captions to empty strings first so if they change/delete prompt text, it updates
    uploadedImages.forEach(img => {
      img.caption = "";
    });

    // Strategy: Split by lines and commas to find statements
    const segments = promptText.split(/[\n\.,;]+/);
    
    segments.forEach(segment => {
      const seg = segment.trim();
      if (!seg) return;

      // Pattern A: Match 'photo 1: caption text' or 'image 1 - caption text' or '1: caption text'
      // Group 1: Photo Number, Group 2: Caption Text
      const patternA = /(?:photo|image|pic|slide|#)?\s*(\d+)\s*[\s:-]+\s*["'“‘]?([^"'”’]+)["'”’]?/i;
      
      // Pattern B: Match 'add caption "caption text" on photo 1' or 'caption "text" to image 2'
      // Group 1: Caption Text, Group 2: Photo Number
      const patternB = /(?:caption|text|label|subtitle)\s*["'“‘]?([^"'”’]+)["'”’]?\s*(?:on|to|for|at|in)?\s*(?:photo|image|pic|slide|#)?\s*(\d+)/i;

      let matched = false;

      // Try Pattern B first (higher specificity, e.g. caption "text" on photo 1)
      const matchB = seg.match(patternB);
      if (matchB) {
        const text = matchB[1].trim();
        const num = parseInt(matchB[2], 10);
        const index = num - 1;
        if (index >= 0 && index < uploadedImages.length) {
          uploadedImages[index].caption = text;
          matched = true;
        }
      }

      // Try Pattern A if B didn't match (e.g., photo 1: text)
      if (!matched) {
        const matchA = seg.match(patternA);
        if (matchA) {
          const num = parseInt(matchA[1], 10);
          const text = matchA[2].trim();
          const index = num - 1;
          const isJustWords = /^\d+$/.test(text); // Ignore if caption is just a number
          if (index >= 0 && index < uploadedImages.length && !isJustWords && text.length > 1) {
            uploadedImages[index].caption = text;
            matched = true;
          }
        }
      }
    });

    // Update storyboard cards immediately
    updateStoryboard();
  }

  // Theme selection toggles
  themeCards.forEach(card => {
    card.addEventListener('click', () => {
      themeCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      currentTheme = card.getAttribute('data-theme');
      
      if (videoGenerated) {
        drawCurrentFrame();
      }
    });
  });

  // Action Button - "Generate Video" simulation
  generateTrigger.addEventListener('click', () => {
    if (uploadedImages.length === 0) {
      alert("Please upload at least one photo before generating.");
      return;
    }

    // Parse captions from custom prompt instructions
    parseCaptionsFromPrompt(promptInput.value);

    generateTrigger.classList.add('generating');
    generateTrigger.querySelector('.btn-text').textContent = "Processing Frames...";
    apiStatus.style.borderColor = 'rgba(245, 158, 11, 0.4)';
    apiStatus.style.color = '#f59e0b';
    apiStatus.querySelector('.api-badge-dot').style.backgroundColor = '#f59e0b';
    apiStatus.querySelector('.api-badge-dot').style.animation = 'pulse-green 1.5s infinite';
    apiStatus.querySelector('span:last-child').textContent = "Compiling Assets...";

    playerOverlay.innerHTML = `
      <div class="spinner" style="display: block; width: 40px; height: 40px; border-width: 4px; margin-bottom: 1rem;"></div>
      <h3 class="player-overlay-title">AI Engine Generating Video</h3>
      <p class="player-overlay-desc" id="generator-progress-text">Applying theme transitions and panning filters...</p>
      <div style="width: 200px; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; margin-top: 0.5rem;">
        <div id="gen-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(to right, var(--primary), var(--secondary)); transition: width 0.1s ease;"></div>
      </div>
    `;
    playerOverlay.classList.remove('hidden');

    let progress = 0;
    const interval = setInterval(() => {
      progress += 4;
      const progressBar = document.getElementById('gen-progress-bar');
      const progressText = document.getElementById('generator-progress-text');
      
      if (progressBar) progressBar.style.width = `${progress}%`;
      if (progressText) {
        if (progress < 30) progressText.textContent = "Analyzing theme layout...";
        else if (progress < 60) progressText.textContent = "Generating transitional frames...";
        else if (progress < 90) progressText.textContent = "Injecting motion pan dynamics...";
        else progressText.textContent = "Synchronizing background music...";
      }

      if (progress >= 100) {
        clearInterval(interval);
        completeGeneration();
      }
    }, 100);
  });

  function completeGeneration() {
    videoGenerated = true;
    generateTrigger.classList.remove('generating');
    generateTrigger.querySelector('.btn-text').textContent = "Generate AI Video";
    
    apiStatus.style.borderColor = 'rgba(16, 185, 129, 0.2)';
    apiStatus.style.color = 'var(--success)';
    apiStatus.querySelector('.api-badge-dot').style.backgroundColor = 'var(--success)';
    apiStatus.querySelector('span:last-child').textContent = "AI Video Generated";

    playerOverlay.classList.add('hidden');
    playerStatusTag.textContent = "AI Rendered";
    playerStatusTag.classList.add('active');

    // Unlock controls
    seekSlider.removeAttribute('disabled');
    btnPlay.removeAttribute('disabled');
    btnRestart.removeAttribute('disabled');
    btnShuffle.removeAttribute('disabled');
    btnFullscreen.removeAttribute('disabled');
    exportRender.removeAttribute('disabled');

    currentTime = 0;
    recalculateDuration();
    updatePlayPauseUI(false); // Reset icons to default paused state
    drawCurrentFrame();
  }

  function recalculateDuration() {
    totalDuration = uploadedImages.length * SLIDE_DURATION;
    seekSlider.max = totalDuration;
    timeTotal.textContent = formatTime(totalDuration);
    timeCurrent.textContent = formatTime(currentTime);
  }

  function triggerStateChange() {
    if (videoGenerated) {
      playerStatusTag.textContent = "Draft (Modified)";
      playerStatusTag.classList.remove('active');
    }
  }

  // --- 3. CANVAS PLAYBACK ENGINE ---

  function drawPlaceholderCanvas(text) {
    ctx.fillStyle = '#06060c';
    ctx.fillRect(0, 0, videoCanvas.width, videoCanvas.height);
    
    // Draw neon glowing grid lines
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < videoCanvas.width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, videoCanvas.height);
      ctx.stroke();
    }
    for (let j = 0; j < videoCanvas.height; j += 40) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(videoCanvas.width, j);
      ctx.stroke();
    }

    // Text label
    ctx.font = "bold 20px 'Outfit', sans-serif";
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.textAlign = 'center';
    ctx.fillText(text, videoCanvas.width / 2, videoCanvas.height / 2);
  }

  function drawCurrentFrame() {
    if (uploadedImages.length === 0) {
      drawPlaceholderCanvas("Upload Photos To Preview");
      return;
    }

    // Determine current image
    const imageIndex = Math.min(Math.floor(currentTime / SLIDE_DURATION), uploadedImages.length - 1);
    const nextImageIndex = imageIndex + 1 < uploadedImages.length ? imageIndex + 1 : null;
    const currentSlideTime = currentTime % SLIDE_DURATION;
    
    // Clear canvas
    ctx.clearRect(0, 0, videoCanvas.width, videoCanvas.height);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, videoCanvas.width, videoCanvas.height);

    ctx.save();
    
    // 1. APPLY THEME FILTERS/SHADERS
    applyThemeShaders(ctx);

    // 2. RENDER SLIDE WITH MOTION
    const currentImgData = uploadedImages[imageIndex];
    const imgElement = new Image();
    imgElement.src = currentImgData.src;

    if (imgElement.complete) {
      renderSingleSlide(ctx, currentImgData, imgElement, currentSlideTime);
    } else {
      imgElement.onload = () => {
        if (!isPlaying) {
          // Re-render once loaded if static
          drawCurrentFrame();
        }
      };
      // Draw black background placeholder while loading
      ctx.fillStyle = "#111";
      ctx.fillRect(0, 0, videoCanvas.width, videoCanvas.height);
    }

    // 3. RENDER TRANSITION (CROSSFADE) TO NEXT SLIDE
    const fadeWindow = 0.5; // crossfade in last 0.5 seconds of slide
    if (nextImageIndex !== null && currentSlideTime > (SLIDE_DURATION - fadeWindow)) {
      const alpha = (currentSlideTime - (SLIDE_DURATION - fadeWindow)) / fadeWindow;
      const nextImgData = uploadedImages[nextImageIndex];
      const nextImgEl = new Image();
      nextImgEl.src = nextImgData.src;

      if (nextImgEl.complete) {
        ctx.globalAlpha = alpha;
        renderSingleSlide(ctx, nextImgData, nextImgEl, 0); // start next slide at time 0
        ctx.globalAlpha = 1.0;
      }
    }

    // 4. APPLY OVERLAYS (Scanlines, Glitches, Film Grain, Vignette)
    drawThemeOverlays(ctx);

    // 5. RENDER CAPTIONS OVERLAY
    drawCaption(ctx, currentImgData);

    ctx.restore();
    
    // Update seek bar and timestamp
    seekSlider.value = currentTime;
    timeCurrent.textContent = formatTime(currentTime);

    // Render active playhead indicator on waveform
    updateWaveformPlayhead();
  }

  function renderSingleSlide(context, imgData, img, slideTime) {
    const w = videoCanvas.width;
    const h = videoCanvas.height;

    context.save();
    
    // Slide motion parameters (Ken Burns effect)
    let zoomScale = 1.0 + (slideTime / SLIDE_DURATION) * 0.08; // subtle scale up
    
    // Apply user crop settings
    zoomScale *= imgData.zoom;
    const rotation = imgData.rotate * Math.PI / 180;

    // Pan camera based on style index (odd/even alternating direction)
    const panIndex = uploadedImages.indexOf(imgData);
    let tx = 0;
    let ty = 0;
    if (panIndex % 2 === 0) {
      tx = (slideTime / SLIDE_DURATION) * 20; // Pan right
    } else {
      ty = -(slideTime / SLIDE_DURATION) * 15; // Pan up
    }

    // Set origin to canvas center for rotation/zoom
    context.translate(w / 2, h / 2);
    context.rotate(rotation);
    context.scale(zoomScale, zoomScale);
    context.translate(tx, ty);

    // Draw centering image conserving aspect ratio
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

  function drawCaption(context, imgData) {
    if (!imgData || !imgData.caption) return;
    
    context.save();
    
    const caption = imgData.caption;
    const color = imgData.captionColor || "#ffffff";
    const size = imgData.captionSize || 28;
    const style = imgData.captionStyle || "subtitle";
    
    const w = videoCanvas.width;
    const h = videoCanvas.height;
    
    // Choose vertical offset depending on theme (cinematic bars)
    let yOffset = h - 80;
    if (currentTheme === 'cinematic') {
      yOffset = h - 90; // raise slightly above letterbox black bars
    }
    
    context.font = `bold ${size}px 'Outfit', sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    
    const x = w / 2;
    const y = yOffset;
    
    if (style === 'subtitle') {
      // Draw subtitle box background
      const metrics = context.measureText(caption);
      const textWidth = metrics.width;
      const paddingH = 20;
      const paddingV = 10;
      
      context.fillStyle = 'rgba(0, 0, 0, 0.65)';
      context.beginPath();
      context.roundRect(
        x - textWidth / 2 - paddingH,
        y - size / 2 - paddingV,
        textWidth + paddingH * 2,
        size + paddingV * 2,
        8
      );
      context.fill();
      
      // Draw text
      context.fillStyle = color;
      context.fillText(caption, x, y);
      
    } else if (style === 'neon') {
      // Draw neon glowing text
      context.shadowBlur = 15;
      context.shadowColor = color;
      context.fillStyle = color;
      
      // Double write to boost neon intensity in canvas
      context.fillText(caption, x, y);
      context.fillText(caption, x, y);
      
    } else if (style === 'minimal') {
      // Draw minimal drop shadow
      context.shadowBlur = 4;
      context.shadowColor = 'rgba(0, 0, 0, 0.85)';
      context.shadowOffsetX = 2;
      context.shadowOffsetY = 2;
      context.fillStyle = color;
      context.fillText(caption, x, y);
    }
    
    context.restore();
  }

  // Dynamic Theme Styling shaders using canvas composition filters
  function applyThemeShaders(context) {
    switch (currentTheme) {
      case 'cinematic':
        // Warm contrast cinema look
        context.filter = 'contrast(1.15) saturate(1.05) sepia(0.08)';
        break;
      case 'retro':
        // VHS/80s warm sepia low contrast
        context.filter = 'contrast(0.9) saturate(1.2) sepia(0.2)';
        break;
      case 'cyberpunk':
        // High neon glow vibe magenta tints
        context.filter = 'contrast(1.3) saturate(1.4) hue-rotate(-20deg)';
        break;
      case 'minimalist':
        // Black and white sharp look
        context.filter = 'grayscale(1) contrast(1.1)';
        break;
      default:
        context.filter = 'none';
    }
  }

  // Draw overlays on top of the image frame (e.g. VHS lines or glowing margins)
  function drawThemeOverlays(context) {
    const w = videoCanvas.width;
    const h = videoCanvas.height;

    // A. Subtle Vignette (Common to all except Minimalist)
    if (currentTheme !== 'minimalist') {
      const gradient = context.createRadialGradient(w/2, h/2, h/3, w/2, h/2, w/2 * 1.2);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.6)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, w, h);
    }

    // B. Special overlays per theme
    if (currentTheme === 'retro') {
      // Draw low-fi scanlines
      context.fillStyle = 'rgba(255, 255, 255, 0.03)';
      for (let y = 0; y < h; y += 4) {
        context.fillRect(0, y, w, 1);
      }
      
      // Top VHS badge
      context.font = "20px Courier New, monospace";
      context.fillStyle = "rgba(255, 255, 255, 0.6)";
      context.textAlign = "left";
      context.fillText("PLAY 📼", 40, 50);
      
      // Bottom VHS timestamp
      context.textAlign = "right";
      const simulatedYear = 1989 + Math.floor(currentTime);
      context.fillText(`MAY 30, ${simulatedYear}`, w - 40, h - 40);

    } else if (currentTheme === 'cyberpunk') {
      // Draw cyan/magenta grid border glows
      context.strokeStyle = 'rgba(236, 72, 153, 0.2)'; // Accent pink border
      context.lineWidth = 15;
      context.strokeRect(0,0, w, h);

      context.strokeStyle = 'rgba(6, 182, 212, 0.15)'; // Cyan inner border
      context.lineWidth = 5;
      context.strokeRect(10, 10, w-20, h-20);
      
      // Glitch simulation overlay
      if (isPlaying && Math.random() > 0.94) {
        context.fillStyle = 'rgba(6, 182, 212, 0.2)';
        context.fillRect(0, Math.random() * h, w, Math.random() * 40);
        context.fillStyle = 'rgba(236, 72, 153, 0.2)';
        context.fillRect(0, Math.random() * h, w, Math.random() * 30);
      }
    } else if (currentTheme === 'cinematic') {
      // Cinematic widescreen black bars (letterbox)
      context.fillStyle = '#000000';
      context.fillRect(0, 0, w, 40);
      context.fillRect(0, h - 40, w, 40);
    }
  }

  // Draw active playhead position line onto waveform canvas
  function updateWaveformPlayhead() {
    if (!audioTrack || !waveformCanvas) return;
    
    // Redraw waveform and overlay current line
    // To avoid lag, we simply overlay a moving slider visual cue line on the visual container
    const width = waveformCanvas.width;
    const progress = currentTime / totalDuration;
    const x = progress * width;
    
    // Remove previous playhead line elements if any
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
      waveformCanvas.parentElement.appendChild(indicator);
    }
    indicator.style.left = `${x}px`;
  }

  // --- PLAYBACK CONTROL LOOPS ---

  function updatePlayPauseUI(playing) {
    const playIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-play" style="fill: #fff;"><polygon points="6 3 20 12 6 21 6 3"/></svg>`;
    const pauseIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pause" style="fill: #fff;"><rect width="4" height="16" x="14" y="4" rx="1"/><rect width="4" height="16" x="6" y="4" rx="1"/></svg>`;
    
    const centerPlaySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-play" style="fill: #fff; margin-left: 4px;"><polygon points="6 3 20 12 6 21 6 3"/></svg>`;
    const centerPauseSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pause" style="fill: #fff;"><rect width="4" height="16" x="14" y="4" rx="1"/><rect width="4" height="16" x="6" y="4" rx="1"/></svg>`;

    if (playing) {
      btnPlay.innerHTML = pauseIconSvg;
      playerCenterBtn.innerHTML = centerPauseSvg;
      playerViewport.classList.remove('paused');
    } else {
      btnPlay.innerHTML = playIconSvg;
      playerCenterBtn.innerHTML = centerPlaySvg;
      playerViewport.classList.add('paused');
    }
  }

  function startPlayback() {
    if (uploadedImages.length === 0) return;
    isPlaying = true;
    lastFrameTime = performance.now();
    
    // Play HTML5 audio track
    if (activeAudio) {
      // Sync audio playhead to current video progress time
      activeAudio.currentTime = currentTime % activeAudio.duration;
      activeAudio.play().catch(err => console.log("Audio play fail:", err));
    }

    updatePlayPauseUI(true);

    animationFrameId = requestAnimationFrame(playbackLoop);
  }

  function pausePlayback() {
    isPlaying = false;
    if (activeAudio) {
      activeAudio.pause();
    }

    updatePlayPauseUI(false);

    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  }

  function playbackLoop(timestamp) {
    if (!isPlaying) return;

    const elapsed = (timestamp - lastFrameTime) / 1000;
    lastFrameTime = timestamp;

    currentTime += elapsed;
    
    if (currentTime >= totalDuration) {
      currentTime = 0; // Loop slideshow
      if (activeAudio) {
        activeAudio.currentTime = 0;
      }
    }

    drawCurrentFrame();
    animationFrameId = requestAnimationFrame(playbackLoop);
  }

  function togglePlayPause() {
    if (!videoGenerated) return;
    if (isPlaying) {
      pausePlayback();
    } else {
      startPlayback();
    }
  }

  // Play/Pause toggler
  btnPlay.addEventListener('click', togglePlayPause);
  videoCanvas.addEventListener('click', togglePlayPause);
  playerCenterBtn.addEventListener('click', togglePlayPause);

  // Restart trigger
  btnRestart.addEventListener('click', () => {
    currentTime = 0;
    if (activeAudio) {
      activeAudio.currentTime = 0;
    }
    drawCurrentFrame();
    if (!isPlaying) {
      updateWaveformPlayhead();
    }
  });

  // Seek slider changes
  seekSlider.addEventListener('input', () => {
    currentTime = parseFloat(seekSlider.value);
    if (activeAudio) {
      activeAudio.currentTime = currentTime % activeAudio.duration;
    }
    drawCurrentFrame();
  });

  // Mute volume toggler
  btnMute.addEventListener('click', () => {
    if (activeAudio) {
      activeAudio.muted = !activeAudio.muted;
      if (activeAudio.muted) {
        muteIcon.setAttribute('data-lucide', 'volume-x');
      } else {
        muteIcon.setAttribute('data-lucide', 'volume-2');
      }
      lucide.createIcons();
    }
  });

  // Volume slider input
  volumeSlider.addEventListener('input', () => {
    const val = parseFloat(volumeSlider.value);
    if (activeAudio) {
      activeAudio.volume = val;
      activeAudio.muted = false;
    }
    muteIcon.setAttribute('data-lucide', val === 0 ? 'volume-x' : 'volume-2');
    lucide.createIcons();
  });

  // Fullscreen option
  btnFullscreen.addEventListener('click', () => {
    if (videoCanvas.requestFullscreen) {
      videoCanvas.requestFullscreen();
    } else if (videoCanvas.webkitRequestFullscreen) {
      videoCanvas.webkitRequestFullscreen();
    } else if (videoCanvas.msRequestFullscreen) {
      videoCanvas.msRequestFullscreen();
    }
  });

  // --- 4. SHUFFLE SEQUENCE ALGORITHM ---

  btnShuffle.addEventListener('click', () => {
    if (uploadedImages.length <= 1) return;
    
    // Quick visual shake animation in timeline
    storyboardGrid.style.transform = 'scale(0.98)';
    setTimeout(() => {
      storyboardGrid.style.transform = 'none';
    }, 150);

    // Shuffle Array
    for (let i = uploadedImages.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [uploadedImages[i], uploadedImages[j]] = [uploadedImages[j], uploadedImages[i]];
    }

    updateStoryboard();
    currentTime = 0;
    drawCurrentFrame();
    triggerStateChange();
  });

  // --- 5. STORYBOARD INTERACTION & REORDERING (DRAG & DROP) ---

  function updateStoryboard() {
    // Clear list
    storyboardGrid.innerHTML = '';
    photoCounter.textContent = `${uploadedImages.length} / 20 Photos`;

    if (uploadedImages.length === 0) {
      storyboardGrid.appendChild(storyboardEmpty);
      return;
    }

    uploadedImages.forEach((imgData, index) => {
      const item = document.createElement('div');
      item.className = 'storyboard-item';
      item.setAttribute('draggable', 'true');
      item.setAttribute('data-id', imgData.id);
      item.setAttribute('data-index', index);

      // Number badge
      const badge = document.createElement('div');
      badge.className = 'storyboard-badge';
      badge.textContent = index + 1;
      item.appendChild(badge);

      // Thumbnail Image
      const img = document.createElement('img');
      img.className = 'storyboard-item-thumb';
      img.src = imgData.src;
      // apply crops directly to thumbs
      img.style.transform = `scale(${imgData.zoom}) rotate(${imgData.rotate}deg)`;
      item.appendChild(img);

      // Info Details
      const meta = document.createElement('div');
      meta.className = 'storyboard-item-meta';
      const title = document.createElement('div');
      title.className = 'storyboard-item-title';
      title.textContent = imgData.name;
      const durationLabel = document.createElement('div');
      durationLabel.textContent = `${SLIDE_DURATION}s`;
      durationLabel.style.color = 'var(--text-muted)';
      meta.appendChild(title);
      meta.appendChild(durationLabel);
      item.appendChild(meta);

      // Overlay Hover Actions
      const actions = document.createElement('div');
      actions.className = 'storyboard-item-actions';

      // Edit Button
      const editBtn = document.createElement('button');
      editBtn.className = 'storyboard-action-btn';
      editBtn.innerHTML = '<i data-lucide="crop" style="width: 12px; height: 12px;"></i>';
      editBtn.title = "Crop & Rotate";
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditModal(index);
      });
      actions.appendChild(editBtn);

      // Delete Button
      const delBtn = document.createElement('button');
      delBtn.className = 'storyboard-action-btn delete-btn';
      delBtn.innerHTML = '<i data-lucide="trash-2" style="width: 12px; height: 12px;"></i>';
      delBtn.title = "Delete Photo";
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteImage(index);
      });
      actions.appendChild(delBtn);

      item.appendChild(actions);

      // --- DRAG AND DROP NATIVE HANDLERS ---
      item.addEventListener('dragstart', handleDragStart);
      item.addEventListener('dragenter', handleDragEnter);
      item.addEventListener('dragover', handleDragOver);
      item.addEventListener('dragleave', handleDragLeave);
      item.addEventListener('drop', handleDrop);
      item.addEventListener('dragend', handleDragEnd);

      storyboardGrid.appendChild(item);
    });

    lucide.createIcons();
  }

  function deleteImage(index) {
    uploadedImages.splice(index, 1);
    updateStoryboard();
    recalculateDuration();
    if (currentTime >= totalDuration) {
      currentTime = Math.max(0, totalDuration - 0.1);
    }
    drawCurrentFrame();
    triggerStateChange();
  }

  // Reordering drag mechanics
  let dragSourceElement = null;

  function handleDragStart(e) {
    this.classList.add('dragging');
    dragSourceElement = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.getAttribute('data-index'));
  }

  function handleDragOver(e) {
    if (e.preventDefault) {
      e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
  }

  function handleDragEnter() {
    if (this !== dragSourceElement) {
      this.classList.add('drag-over');
    }
  }

  function handleDragLeave() {
    this.classList.remove('drag-over');
  }

  function handleDrop(e) {
    e.stopPropagation();
    e.preventDefault();
    
    this.classList.remove('drag-over');
    
    if (dragSourceElement !== this) {
      const srcIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
      const targetIndex = parseInt(this.getAttribute('data-index'), 10);

      // Splice swap item
      const itemToMove = uploadedImages.splice(srcIndex, 1)[0];
      uploadedImages.splice(targetIndex, 0, itemToMove);

      updateStoryboard();
      drawCurrentFrame();
      triggerStateChange();
    }
    return false;
  }

  function handleDragEnd() {
    this.classList.remove('dragging');
    const items = storyboardGrid.querySelectorAll('.storyboard-item');
    items.forEach(item => {
      item.classList.remove('drag-over');
    });
  }

  // --- 6. CROP & ROTATION MODAL ---

  function openEditModal(index) {
    editingImageIndex = index;
    const imgData = uploadedImages[index];
    
    tempZoom = imgData.zoom;
    tempRotate = imgData.rotate;
    tempCaption = imgData.caption || "";
    tempCaptionColor = imgData.captionColor || "#ffffff";
    tempCaptionSize = imgData.captionSize || 28;
    tempCaptionStyle = imgData.captionStyle || "subtitle";

    cropPreviewImg.src = imgData.src;
    cropZoom.value = tempZoom;
    cropRotate.value = tempRotate;
    
    // Set caption fields
    photoCaption.value = tempCaption;
    captionColor.value = tempCaptionColor;
    captionSize.value = tempCaptionSize;
    sizeValue.textContent = `${tempCaptionSize}px`;
    captionStyle.value = tempCaptionStyle;
    
    zoomValue.textContent = `${tempZoom.toFixed(1)}x`;
    rotateValue.textContent = `${tempRotate}°`;

    updateModalPreview();

    cropModal.classList.add('active');
  }

  function updateModalPreview() {
    cropPreviewImg.style.transform = `scale(${tempZoom}) rotate(${tempRotate}deg)`;
  }

  cropZoom.addEventListener('input', () => {
    tempZoom = parseFloat(cropZoom.value);
    zoomValue.textContent = `${tempZoom.toFixed(1)}x`;
    updateModalPreview();
  });

  cropRotate.addEventListener('input', () => {
    tempRotate = parseInt(cropRotate.value, 10);
    rotateValue.textContent = `${tempRotate}°`;
    updateModalPreview();
  });

  captionSize.addEventListener('input', () => {
    sizeValue.textContent = `${captionSize.value}px`;
  });

  modalSaveBtn.addEventListener('click', () => {
    if (editingImageIndex !== -1) {
      uploadedImages[editingImageIndex].zoom = tempZoom;
      uploadedImages[editingImageIndex].rotate = tempRotate;
      uploadedImages[editingImageIndex].caption = photoCaption.value;
      uploadedImages[editingImageIndex].captionColor = captionColor.value;
      uploadedImages[editingImageIndex].captionSize = parseInt(captionSize.value, 10);
      uploadedImages[editingImageIndex].captionStyle = captionStyle.value;
      
      updateStoryboard();
      drawCurrentFrame();
      closeModal();
      triggerStateChange();
    }
  });

  modalCancelBtn.addEventListener('click', closeModal);
  modalCloseBtn.addEventListener('click', closeModal);

  function closeModal() {
    cropModal.classList.remove('active');
    editingImageIndex = -1;
  }

  // --- 7. EXPORT INTEGRATIONS ---

  exportInshot.addEventListener('click', () => {
    simulateDirectExport("InShot");
  });

  exportYoucut.addEventListener('click', () => {
    simulateDirectExport("YouCut");
  });

  function simulateDirectExport(targetApp) {
    if (uploadedImages.length === 0) {
      alert("Please upload photos and build your sequence before exporting.");
      return;
    }

    const payload = {
      generator: "AuraMotion",
      theme: currentTheme,
      customPrompt: promptInput.value,
      slideCount: uploadedImages.length,
      duration: totalDuration,
      hasAudio: audioTrack !== null,
      audioName: audioTrack ? audioTrack.name : null,
      slides: uploadedImages.map(img => ({
        name: img.name,
        zoom: img.zoom,
        rotate: img.rotate,
        caption: img.caption || "",
        captionColor: img.captionColor || "#ffffff",
        captionSize: img.captionSize || 28,
        captionStyle: img.captionStyle || "subtitle"
      }))
    };

    const encodedPayload = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    const deepLink = `${targetApp.toLowerCase()}://create?payload=${encodedPayload}&source=auramotion`;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.style.zIndex = '2000';
    modal.innerHTML = `
      <div class="modal-container" style="max-width: 400px;">
        <div class="modal-header">
          <h3 class="modal-title">Export to ${targetApp}</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        <div class="modal-body" style="padding: 1.5rem; text-align: center; gap: 1.25rem;">
          <div class="logo-container" style="justify-content: center; margin-bottom: 0.5rem;">
            <div class="export-card-logo logo-${targetApp.toLowerCase()}">${targetApp.substring(0,2).toUpperCase()}</div>
          </div>
          <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4;">
            AuraMotion compiled a layout package matching your theme: <strong style="color:#fff;">${currentTheme.toUpperCase()}</strong>.
          </p>
          <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05); border-radius: var(--radius-sm); padding: 0.75rem; text-align: left;">
            <div style="font-family: monospace; font-size: 0.65rem; color: var(--text-muted); word-break: break-all; max-height: 80px; overflow-y: auto;">
              ${deepLink}
            </div>
          </div>
          <p style="font-size: 0.75rem; color: var(--text-muted);">
            Scan metadata tags inside ${targetApp} mobile app to edit in high precision.
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <a href="${deepLink}" class="generate-btn" style="text-decoration: none; padding: 0.5rem 1.25rem; font-size: 0.85rem; box-shadow: none;" onclick="this.closest('.modal-overlay').remove(); alert('Deep Link sent to mobile device simulator.');">
            Confirm Export
          </a>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  // --- Real-time High Quality rendering using MediaRecorder ---
  exportRender.addEventListener('click', () => {
    if (uploadedImages.length === 0) return;
    
    pausePlayback();
    currentTime = 0;
    drawCurrentFrame();
    
    exportRender.setAttribute('disabled', 'true');
    exportRender.querySelector('span').textContent = "Compiling...";

    const stream = videoCanvas.captureStream(30); // 30 FPS canvas stream
    const chunks = [];
    let recorder;

    // Check Audio Stream
    let combinedStream = stream;
    if (activeAudio && activeAudio.src) {
      try {
        // Capture audio context stream if initialized
        const audioStream = activeAudio.captureStream ? activeAudio.captureStream() : null;
        if (audioStream) {
          audioStream.getAudioTracks().forEach(track => stream.addTrack(track));
        }
      } catch (err) {
        console.warn("Unable to capture audio element stream direct: ", err);
      }
    }

    try {
      recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm;codecs=vp9' });
    } catch (e) {
      try {
        recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm' });
      } catch (e2) {
        recorder = new MediaRecorder(combinedStream);
      }
    }

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    // Render loading indicator inside overlay
    playerOverlay.innerHTML = `
      <div class="spinner" style="display: block; width: 40px; height: 40px; border-width: 4px; margin-bottom: 1rem;"></div>
      <h3 class="player-overlay-title">Compiling Video File</h3>
      <p class="player-overlay-desc">Recording canvas frames and background audio channels...</p>
      <div style="width: 200px; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; margin-top: 0.5rem;">
        <div id="compile-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(to right, var(--accent), var(--secondary)); transition: width 0.1s ease;"></div>
      </div>
    `;
    playerOverlay.classList.remove('hidden');

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      
      playerOverlay.classList.add('hidden');
      exportRender.removeAttribute('disabled');
      exportRender.querySelector('span').textContent = "Compile";

      // Download Trigger
      const a = document.createElement('a');
      a.href = url;
      a.download = `auramotion_${currentTheme}_video.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    // Start Recording
    recorder.start();
    
    // Play video slides and compile
    isPlaying = true;
    lastFrameTime = performance.now();
    
    if (activeAudio) {
      activeAudio.currentTime = 0;
      activeAudio.play().catch(e => console.log(e));
    }

    function recordLoop(timestamp) {
      if (!isPlaying) return;
      const elapsed = (timestamp - lastFrameTime) / 1000;
      lastFrameTime = timestamp;
      currentTime += elapsed;

      // Progress bar updates
      const compileBar = document.getElementById('compile-progress-bar');
      if (compileBar) {
        compileBar.style.width = `${(currentTime / totalDuration) * 100}%`;
      }

      if (currentTime >= totalDuration) {
        // Complete
        isPlaying = false;
        if (activeAudio) activeAudio.pause();
        currentTime = 0;
        drawCurrentFrame();
        recorder.stop();
      } else {
        drawCurrentFrame();
        requestAnimationFrame(recordLoop);
      }
    }

    requestAnimationFrame(recordLoop);
  });

  // --- HELPER FUNCTIONS ---
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

});
