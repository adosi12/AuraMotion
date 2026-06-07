export const ui = {
  get imageDropzone() { return document.getElementById('image-dropzone'); },
  get imageInput() { return document.getElementById('image-input'); },
  get audioBtn() { return document.getElementById('audio-btn'); },
  get audioInput() { return document.getElementById('audio-input'); },
  get audioMeta() { return document.getElementById('audio-meta'); },
  get audioFilename() { return document.getElementById('audio-filename'); },
  get audioRemove() { return document.getElementById('audio-remove'); },
  
  get waveformCanvas() { return document.getElementById('waveform-canvas'); },
  get waveformPlaceholder() { return document.getElementById('waveform-placeholder'); },
  
  get themeCards() { return document.querySelectorAll('.theme-card'); },
  get promptInput() { return document.getElementById('prompt-input'); },
  get generateTrigger() { return document.getElementById('generate-trigger'); },
  get apiStatus() { return document.getElementById('api-status'); },

  // Music Search UI
  get musicSearchInput() { return document.getElementById('music-search-input'); },
  get musicSearchBtn() { return document.getElementById('music-search-btn'); },
  get musicResultsContainer() { return document.getElementById('music-results-container'); },
  get suggestMusicBtn() { return document.getElementById('suggest-music-btn'); },

  get videoCanvas() { return document.getElementById('video-canvas'); },
  get playerOverlay() { return document.getElementById('player-overlay'); },
  get playerStatusTag() { return document.getElementById('player-status-tag'); },
  
  get seekSlider() { return document.getElementById('seek-slider'); },
  get timeCurrent() { return document.getElementById('time-current'); },
  get timeTotal() { return document.getElementById('time-total'); },
  
  get btnRestart() { return document.getElementById('btn-restart'); },
  get btnPlay() { return document.getElementById('btn-play'); },
  get btnMute() { return document.getElementById('btn-mute'); },
  get muteIcon() { return document.getElementById('mute-icon'); },
  get volumeSlider() { return document.getElementById('volume-slider'); },
  get btnShuffle() { return document.getElementById('btn-shuffle'); },
  get btnFullscreen() { return document.getElementById('btn-fullscreen'); },
  
  get storyboardGrid() { return document.getElementById('storyboard-grid'); },
  get storyboardEmpty() { return document.getElementById('storyboard-empty'); },
  get photoCounter() { return document.getElementById('photo-counter'); },
  
  get exportInshot() { return document.getElementById('export-inshot'); },
  get exportYoucut() { return document.getElementById('export-youcut'); },
  get exportRender() { return document.getElementById('export-render'); },
  
  get cropModal() { return document.getElementById('crop-modal'); },
  get cropPreviewImg() { return document.getElementById('crop-preview-img'); },
  get cropZoom() { return document.getElementById('crop-zoom'); },
  get cropRotate() { return document.getElementById('crop-rotate'); },
  get zoomValue() { return document.getElementById('zoom-value'); },
  get rotateValue() { return document.getElementById('rotate-value'); },
  get modalCloseBtn() { return document.getElementById('modal-close-btn'); },
  get modalCancelBtn() { return document.getElementById('modal-cancel-btn'); },
  get modalSaveBtn() { return document.getElementById('modal-save-btn'); },

  get photoCaption() { return document.getElementById('photo-caption'); },
  get captionColor() { return document.getElementById('caption-color'); },
  get captionSize() { return document.getElementById('caption-size'); },
  get sizeValue() { return document.getElementById('size-value'); },
  get captionStyle() { return document.getElementById('caption-style'); },
  get playerViewport() { return document.getElementById('player-viewport'); },
  get playerCenterBtn() { return document.getElementById('player-center-btn'); },
  get centerBtnIcon() { return document.getElementById('center-btn-icon'); }
};

export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function updatePlayPauseUI(playing) {
  const pauseIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pause" style="fill: #fff;"><rect width="4" height="16" x="14" y="4" rx="1"/><rect width="4" height="16" x="6" y="4" rx="1"/></svg>`;
  const playIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-play" style="fill: #fff;"><polygon points="6 3 20 12 6 21 6 3"/></svg>`;
  
  const centerPauseSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pause" style="fill: #fff;"><rect width="4" height="16" x="14" y="4" rx="1"/><rect width="4" height="16" x="6" y="4" rx="1"/></svg>`;
  const centerPlaySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-play" style="fill: #fff; margin-left: 4px;"><polygon points="6 3 20 12 6 21 6 3"/></svg>`;

  if (playing) {
    ui.btnPlay.innerHTML = pauseIconSvg;
    ui.playerCenterBtn.innerHTML = centerPauseSvg;
    ui.playerViewport.classList.remove('paused');
  } else {
    ui.btnPlay.innerHTML = playIconSvg;
    ui.playerCenterBtn.innerHTML = centerPlaySvg;
    ui.playerViewport.classList.add('paused');
  }
}
