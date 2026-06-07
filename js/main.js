import { state, triggerStateChange } from './state.js';
import { ui, updatePlayPauseUI } from './ui.js';
import { handleImageFiles, handleAudioFile, detectBeats } from './media.js';
import { initCanvas, drawCurrentFrame, drawPlaceholderCanvas, updateCanvasResolution } from './canvas.js';
import { updateStoryboard, openEditModal, closeModal, updateModalPreview } from './storyboard.js';
import { simulateDirectExport } from './export.js';
import { searchMusic, suggestKeywords } from './musicApi.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log("AuraMotion DOM Content Loaded. Initializing listeners...");
  
  // Initialize Lucide icons
  if (window.lucide) lucide.createIcons();

  initCanvas();

  // --- EVENT LISTENERS ---

  // Music Search & Suggestions
  if (ui.musicSearchBtn) {
    ui.musicSearchBtn.addEventListener('click', () => {
      const query = ui.musicSearchInput.value.trim();
      if (query) performMusicSearch(query);
    });
  } else {
    console.error("musicSearchBtn not found in DOM");
  }

  if (ui.musicSearchInput) {
    ui.musicSearchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const query = ui.musicSearchInput.value.trim();
        if (query) performMusicSearch(query);
      }
    });
  }

  if (ui.suggestMusicBtn) {
    console.log("suggestMusicBtn listener attached");
    ui.suggestMusicBtn.addEventListener('click', () => {
      const prompt = ui.promptInput ? ui.promptInput.value.trim() : "";
      const theme = state.currentTheme;
      console.log(`Suggesting music for prompt: "${prompt}" and theme: "${theme}"`);
      const query = suggestKeywords(prompt, theme);
      console.log(`Generated query: "${query}"`);
      if (ui.musicSearchInput) ui.musicSearchInput.value = query;
      performMusicSearch(query);
    });
  } else {
    console.error("suggestMusicBtn not found in DOM");
  }

  async function performMusicSearch(query) {
    const cleanQuery = query.trim();
    console.log(`AuraMotion | UI Triggered Search: "${cleanQuery}"`);
    
    ui.musicResultsContainer.innerHTML = `
      <div style="text-align:center; padding: 1rem;">
        <div class="spinner" style="display:inline-block; width: 20px; height: 20px; border-width: 2px;"></div>
        <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.5rem;">Searching Jamendo library...</div>
      </div>
    `;
    
    try {
      const results = await searchMusic(cleanQuery);
      console.log(`AuraMotion | UI Results Count: ${results.length}`);
      
      if (results.length === 0) {
        ui.musicResultsContainer.innerHTML = `<div style="font-size: 0.7rem; color: var(--text-muted); text-align: center; padding: 1rem;">No tracks found for "${cleanQuery}". Try different keywords.</div>`;
        return;
      }

      ui.musicResultsContainer.innerHTML = '';
      results.forEach(track => {
        const item = document.createElement('div');
        item.className = 'music-track-item';
        item.innerHTML = `
          <img src="${track.image}" class="track-thumb" alt="Cover">
          <div class="track-info">
            <span class="track-name">${track.name}</span>
            <span class="track-artist">${track.artist_name}</span>
          </div>
          <div class="track-actions">
            <button class="btn-track-action btn-preview" title="Preview">
              <i data-lucide="play" style="width: 14px; height: 14px;"></i>
            </button>
            <button class="btn-track-action btn-select" title="Select track">
              <i data-lucide="check" style="width: 14px; height: 14px;"></i>
            </button>
          </div>
        `;

        const previewBtn = item.querySelector('.btn-preview');
        const selectBtn = item.querySelector('.btn-select');
        let previewAudio = null;

        previewBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (previewAudio && !previewAudio.paused) {
            previewAudio.pause();
            previewBtn.innerHTML = `<i data-lucide="play" style="width: 14px; height: 14px;"></i>`;
            if (window.lucide) lucide.createIcons();
          } else {
            document.querySelectorAll('.btn-preview').forEach(b => {
              b.innerHTML = `<i data-lucide="play" style="width: 14px; height: 14px;"></i>`;
            });
            
            if (!previewAudio) {
              previewAudio = new Audio(track.audio);
            }
            previewAudio.play();
            previewBtn.innerHTML = `<i data-lucide="pause" style="width: 14px; height: 14px;"></i>`;
            if (window.lucide) lucide.createIcons();
            
            previewAudio.onended = () => {
              previewBtn.innerHTML = `<i data-lucide="play" style="width: 14px; height: 14px;"></i>`;
              if (window.lucide) lucide.createIcons();
            };
          }
        });

        selectBtn.addEventListener('click', async () => {
          if (previewAudio) previewAudio.pause();
          
          try {
            selectBtn.innerHTML = `<div class="spinner" style="display:inline-block; width: 12px; height: 12px; border-width: 2px;"></div>`;
            const audioUrl = track.audio;
            const response = await fetch(audioUrl);
            const blob = await response.blob();
            const file = new File([blob], `${track.name}.mp3`, { type: 'audio/mpeg' });
            
            handleAudioFile(file);
            
            ui.musicResultsContainer.querySelectorAll('.btn-select').forEach(b => {
              b.classList.remove('active');
              b.innerHTML = `<i data-lucide="check" style="width: 14px; height: 14px;"></i>`;
            });
            selectBtn.classList.add('active');
            selectBtn.innerHTML = `<i data-lucide="check" style="width: 14px; height: 14px;"></i>`;
            if (window.lucide) lucide.createIcons();
          } catch (err) {
            console.error("Selection error:", err);
            alert("Failed to load track. It might be blocked by your browser's security settings.");
            selectBtn.innerHTML = `<i data-lucide="check" style="width: 14px; height: 14px;"></i>`;
            if (window.lucide) lucide.createIcons();
          }
        });

        ui.musicResultsContainer.appendChild(item);
      });
      
      if (window.lucide) lucide.createIcons();
    } catch (error) {
      console.error("Search failure:", error);
      ui.musicResultsContainer.innerHTML = `
        <div style="font-size: 0.7rem; color: #ef4444; text-align: center; padding: 1rem;">
          <i data-lucide="alert-circle" style="width: 16px; height: 16px; margin-bottom: 0.5rem;"></i>
          <p>Search failed: ${error.message}</p>
          <p style="margin-top: 0.5rem; font-size: 0.6rem;">Check if your Client ID is valid or if an ad-blocker is active.</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
    }
  }

  // Image Uploads
  ui.imageDropzone.addEventListener('click', () => ui.imageInput.click());
  ui.imageDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    ui.imageDropzone.classList.add('dragover');
  });
  ui.imageDropzone.addEventListener('dragleave', () => ui.imageDropzone.classList.remove('dragover'));
  ui.imageDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    ui.imageDropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handleImageFiles(e.dataTransfer.files, refreshStoryboard, recalculateDuration);
    }
  });
  ui.imageInput.addEventListener('change', () => {
    if (ui.imageInput.files.length > 0) {
      handleImageFiles(ui.imageInput.files, refreshStoryboard, recalculateDuration);
      ui.imageInput.value = '';
    }
  });

  // Audio Uploads
  ui.audioBtn.addEventListener('click', () => ui.audioInput.click());
  ui.audioInput.addEventListener('change', () => {
    if (ui.audioInput.files.length > 0) {
      handleAudioFile(ui.audioInput.files[0]);
      ui.audioInput.value = '';
    }
  });
  ui.audioRemove.addEventListener('click', () => {
    if (state.activeAudio) {
      state.activeAudio.pause();
      state.activeAudio = null;
    }
    state.audioTrack = null;
    ui.audioMeta.classList.add('hidden');
    ui.waveformPlaceholder.classList.remove('hidden');
    const wCtx = ui.waveformCanvas.getContext('2d');
    wCtx.clearRect(0, 0, ui.waveformCanvas.width, ui.waveformCanvas.height);
    triggerStateChange();
  });

  // Theme selection
  ui.themeCards.forEach(card => {
    card.addEventListener('click', () => {
      ui.themeCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      state.currentTheme = card.getAttribute('data-theme');
      if (state.videoGenerated) drawCurrentFrame();
    });
  });

  // Aspect Ratio Selection
  const ratioBtns = document.querySelectorAll('.ratio-btn');
  ratioBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      ratioBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.aspectRatio = btn.getAttribute('data-ratio');
      updateCanvasResolution();
      if (state.videoGenerated) drawCurrentFrame();
    });
  });

  // Beat Sync Toggle
  const beatsyncToggle = document.getElementById('beatsync-toggle');
  beatsyncToggle.addEventListener('change', () => {
    state.beatSync = beatsyncToggle.checked;
    if (state.beatSync && state.audioTrack && state.audioTrack.buffer) {
      detectBeats(state.audioTrack.buffer);
    }
    recalculateDuration();
    if (state.videoGenerated) drawCurrentFrame();
  });

  // Generation
  ui.generateTrigger.addEventListener('click', () => {
    if (state.uploadedImages.length === 0) {
      alert("Please upload at least one photo before generating.");
      return;
    }
    parseCaptionsFromPrompt(ui.promptInput.value);
    simulateGeneration();
  });

  // Player Controls
  ui.btnPlay.addEventListener('click', togglePlayPause);
  ui.videoCanvas.addEventListener('click', togglePlayPause);
  ui.playerCenterBtn.addEventListener('click', togglePlayPause);

  ui.btnRestart.addEventListener('click', () => {
    state.currentTime = 0;
    if (state.activeAudio) state.activeAudio.currentTime = 0;
    drawCurrentFrame();
  });

  ui.seekSlider.addEventListener('input', () => {
    state.currentTime = parseFloat(ui.seekSlider.value);
    if (state.activeAudio) {
      state.activeAudio.currentTime = state.currentTime % state.activeAudio.duration;
    }
    drawCurrentFrame();
  });

  ui.btnMute.addEventListener('click', () => {
    if (state.activeAudio) {
      state.activeAudio.muted = !state.activeAudio.muted;
      ui.muteIcon.setAttribute('data-lucide', state.activeAudio.muted ? 'volume-x' : 'volume-2');
      if (window.lucide) lucide.createIcons();
    }
  });

  ui.volumeSlider.addEventListener('input', () => {
    const val = parseFloat(ui.volumeSlider.value);
    if (state.activeAudio) {
      state.activeAudio.volume = val;
      state.activeAudio.muted = false;
    }
    ui.muteIcon.setAttribute('data-lucide', val === 0 ? 'volume-x' : 'volume-2');
    if (window.lucide) lucide.createIcons();
  });

  ui.btnShuffle.addEventListener('click', () => {
    if (state.uploadedImages.length <= 1) return;
    for (let i = state.uploadedImages.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [state.uploadedImages[i], state.uploadedImages[j]] = [state.uploadedImages[j], state.uploadedImages[i]];
    }
    refreshStoryboard();
    state.currentTime = 0;
    drawCurrentFrame();
    triggerStateChange();
  });

  ui.btnFullscreen.addEventListener('click', () => {
    const v = ui.videoCanvas;
    if (v.requestFullscreen) v.requestFullscreen();
    else if (v.webkitRequestFullscreen) v.webkitRequestFullscreen();
    else if (v.msRequestFullscreen) v.msRequestFullscreen();
  });

  // Modal Controls
  ui.cropZoom.addEventListener('input', () => {
    state.tempZoom = parseFloat(ui.cropZoom.value);
    ui.zoomValue.textContent = `${state.tempZoom.toFixed(1)}x`;
    updateModalPreview();
  });

  ui.cropRotate.addEventListener('input', () => {
    state.tempRotate = parseInt(ui.cropRotate.value, 10);
    ui.rotateValue.textContent = `${state.tempRotate}°`;
    updateModalPreview();
  });

  ui.captionSize.addEventListener('input', () => {
    ui.sizeValue.textContent = `${ui.captionSize.value}px`;
  });

  ui.modalSaveBtn.addEventListener('click', () => {
    if (state.editingImageIndex !== -1) {
      const img = state.uploadedImages[state.editingImageIndex];
      img.zoom = state.tempZoom;
      img.rotate = state.tempRotate;
      img.caption = ui.photoCaption.value;
      img.captionColor = ui.captionColor.value;
      img.captionSize = parseInt(ui.captionSize.value, 10);
      img.captionStyle = ui.captionStyle.value;
      refreshStoryboard();
      drawCurrentFrame();
      closeModal();
      triggerStateChange();
    }
  });

  ui.modalCancelBtn.addEventListener('click', closeModal);
  ui.modalCloseBtn.addEventListener('click', closeModal);

  // Export
  ui.exportInshot.addEventListener('click', () => simulateDirectExport("InShot"));
  ui.exportYoucut.addEventListener('click', () => simulateDirectExport("YouCut"));
  ui.exportRender.addEventListener('click', startRecording);

  // --- HELPER FUNCTIONS ---

  function refreshStoryboard() {
    updateStoryboard(openEditModal, deleteImage);
  }

  function deleteImage(index) {
    state.uploadedImages.splice(index, 1);
    refreshStoryboard();
    recalculateDuration();
    if (state.currentTime >= state.totalDuration) {
      state.currentTime = Math.max(0, state.totalDuration - 0.1);
    }
    drawCurrentFrame();
    triggerStateChange();
  }

  function recalculateDuration() {
    if (state.beatSync && state.detectedBeats.length > 0) {
      const lastImageIdx = state.uploadedImages.length;
      if (lastImageIdx < state.detectedBeats.length) {
        state.totalDuration = state.detectedBeats[lastImageIdx];
      } else {
        state.totalDuration = state.uploadedImages.length * state.slideDuration;
      }
    } else {
      state.totalDuration = state.uploadedImages.length * state.slideDuration;
    }
    ui.seekSlider.max = state.totalDuration;
    ui.timeTotal.textContent = (state.totalDuration >= 0) ? formatTime(state.totalDuration) : "00:00";
    ui.timeCurrent.textContent = formatTime(state.currentTime);
  }

  function parseCaptionsFromPrompt(promptText) {
    if (!promptText) return;
    state.uploadedImages.forEach(img => img.caption = "");
    const segments = promptText.split(/[\n\.,;]+/);
    segments.forEach(segment => {
      const seg = segment.trim();
      if (!seg) return;
      const patternA = /(?:photo|image|pic|slide|#)?\s*(\d+)\s*[\s:-]+\s*["'“‘]?([^"'”’]+)["'”’]?/i;
      const patternB = /(?:caption|text|label|subtitle)\s*["'“‘]?([^"'”’]+)["'”’]?\s*(?:on|to|for|at|in)?\s*(?:photo|image|pic|slide|#)?\s*(\d+)/i;
      let matched = false;
      const matchB = seg.match(patternB);
      if (matchB) {
        const text = matchB[1].trim();
        const num = parseInt(matchB[2], 10);
        const index = num - 1;
        if (index >= 0 && index < state.uploadedImages.length) {
          state.uploadedImages[index].caption = text;
          matched = true;
        }
      }
      if (!matched) {
        const matchA = seg.match(patternA);
        if (matchA) {
          const num = parseInt(matchA[1], 10);
          const text = matchA[2].trim();
          const index = num - 1;
          if (index >= 0 && index < state.uploadedImages.length && !/^\d+$/.test(text) && text.length > 1) {
            state.uploadedImages[index].caption = text;
          }
        }
      }
    });
    refreshStoryboard();
  }

  function simulateGeneration() {
    ui.generateTrigger.classList.add('generating');
    ui.generateTrigger.querySelector('.btn-text').textContent = "Processing Frames...";
    ui.apiStatus.style.borderColor = 'rgba(245, 158, 11, 0.4)';
    ui.apiStatus.style.color = '#f59e0b';
    ui.apiStatus.querySelector('.api-badge-dot').style.backgroundColor = '#f59e0b';
    ui.apiStatus.querySelector('.api-badge-dot').style.animation = 'pulse-green 1.5s infinite';
    ui.apiStatus.querySelector('span:last-child').textContent = "Compiling Assets...";

    ui.playerOverlay.innerHTML = `
      <div class="spinner" style="display: block; width: 40px; height: 40px; border-width: 4px; margin-bottom: 1rem;"></div>
      <h3 class="player-overlay-title">AI Engine Generating Video</h3>
      <p class="player-overlay-desc" id="generator-progress-text">Analyzing theme layout...</p>
      <div style="width: 200px; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; margin-top: 0.5rem;">
        <div id="gen-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(to right, var(--primary), var(--secondary)); transition: width 0.1s ease;"></div>
      </div>
    `;
    ui.playerOverlay.classList.remove('hidden');

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
  }

  function completeGeneration() {
    state.videoGenerated = true;
    ui.generateTrigger.classList.remove('generating');
    ui.generateTrigger.querySelector('.btn-text').textContent = "Generate AI Video";
    ui.apiStatus.style.borderColor = 'rgba(16, 185, 129, 0.2)';
    ui.apiStatus.style.color = 'var(--success)';
    ui.apiStatus.querySelector('.api-badge-dot').style.backgroundColor = 'var(--success)';
    ui.apiStatus.querySelector('span:last-child').textContent = "AI Video Generated";
    ui.playerOverlay.classList.add('hidden');
    ui.playerStatusTag.textContent = "AI Rendered";
    ui.playerStatusTag.classList.add('active');
    ui.seekSlider.removeAttribute('disabled');
    ui.btnPlay.removeAttribute('disabled');
    ui.btnRestart.removeAttribute('disabled');
    ui.btnShuffle.removeAttribute('disabled');
    ui.btnFullscreen.removeAttribute('disabled');
    ui.exportRender.removeAttribute('disabled');
    state.currentTime = 0;
    recalculateDuration();
    updatePlayPauseUI(false);
    drawCurrentFrame();
  }

  function togglePlayPause() {
    if (!state.videoGenerated) return;
    if (state.isPlaying) pausePlayback();
    else startPlayback();
  }

  function startPlayback() {
    if (state.uploadedImages.length === 0) return;
    state.isPlaying = true;
    state.lastFrameTime = performance.now();
    if (state.activeAudio) {
      state.activeAudio.currentTime = state.currentTime % state.activeAudio.duration;
      state.activeAudio.play().catch(e => console.log(e));
    }
    updatePlayPauseUI(true);
    state.animationFrameId = requestAnimationFrame(playbackLoop);
  }

  function pausePlayback() {
    state.isPlaying = false;
    if (state.activeAudio) state.activeAudio.pause();
    updatePlayPauseUI(false);
    if (state.animationFrameId) cancelAnimationFrame(state.animationFrameId);
  }

  function playbackLoop(timestamp) {
    if (!state.isPlaying) return;
    const elapsed = (timestamp - state.lastFrameTime) / 1000;
    state.lastFrameTime = timestamp;
    state.currentTime += elapsed;
    if (state.currentTime >= state.totalDuration) {
      state.currentTime = 0;
      if (state.activeAudio) state.activeAudio.currentTime = 0;
    }
    drawCurrentFrame();
    state.animationFrameId = requestAnimationFrame(playbackLoop);
  }

  function startRecording() {
    if (state.uploadedImages.length === 0) return;
    pausePlayback();
    state.currentTime = 0;
    drawCurrentFrame();
    ui.exportRender.setAttribute('disabled', 'true');
    ui.exportRender.querySelector('span').textContent = "Compiling...";

    const stream = ui.videoCanvas.captureStream(30);
    const chunks = [];
    let recorder;
    let combinedStream = stream;

    if (state.activeAudio && state.activeAudio.src) {
      try {
        const audioStream = state.activeAudio.captureStream ? state.activeAudio.captureStream() : null;
        if (audioStream) audioStream.getAudioTracks().forEach(track => stream.addTrack(track));
      } catch (e) {}
    }

    try {
      recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm;codecs=vp9' });
    } catch (e) {
      try { recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm' }); }
      catch (e2) { recorder = new MediaRecorder(combinedStream); }
    }

    recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
    ui.playerOverlay.innerHTML = `
      <div class="spinner" style="display: block; width: 40px; height: 40px; border-width: 4px; margin-bottom: 1rem;"></div>
      <h3 class="player-overlay-title">Compiling Video File</h3>
      <p class="player-overlay-desc">Recording canvas frames and audio...</p>
      <div style="width: 200px; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; margin-top: 0.5rem;">
        <div id="compile-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(to right, var(--accent), var(--secondary)); transition: width 0.1s ease;"></div>
      </div>
    `;
    ui.playerOverlay.classList.remove('hidden');

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      ui.playerOverlay.classList.add('hidden');
      ui.exportRender.removeAttribute('disabled');
      ui.exportRender.querySelector('span').textContent = "Download Video";
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `auramotion_${state.currentTheme}_video.webm`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    };

    recorder.start();
    state.isPlaying = true;
    state.lastFrameTime = performance.now();
    if (state.activeAudio) { state.activeAudio.currentTime = 0; state.activeAudio.play(); }

    function recordLoop(timestamp) {
      if (!state.isPlaying) return;
      const elapsed = (timestamp - state.lastFrameTime) / 1000;
      state.lastFrameTime = timestamp;
      state.currentTime += elapsed;
      const compileBar = document.getElementById('compile-progress-bar');
      if (compileBar) compileBar.style.width = `${(state.currentTime / state.totalDuration) * 100}%`;
      if (state.currentTime >= state.totalDuration) {
        state.isPlaying = false;
        if (state.activeAudio) state.activeAudio.pause();
        state.currentTime = 0;
        drawCurrentFrame();
        recorder.stop();
      } else {
        drawCurrentFrame();
        requestAnimationFrame(recordLoop);
      }
    }
    requestAnimationFrame(recordLoop);
  }
});
