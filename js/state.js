export const state = {
  uploadedImages: [], // Array of { id, file, src, imgElement, name, zoom, rotate, caption, ... }
  audioTrack: null,    // Object: { file, src, name, buffer }
  videoGenerated: false,
  
  // Playback Config
  slideDuration: 3.5, // Default seconds per photo (if no beat sync)
  isPlaying: false,
  currentTime: 0,
  totalDuration: 0,
  lastFrameTime: 0,
  animationFrameId: null,
  currentTheme: 'cinematic', // cinematic, retro, cyberpunk, minimalist
  aspectRatio: '16:9',       // '16:9', '9:16', '1:1'
  beatSync: false,
  detectedBeats: [],         // Array of timestamps in seconds
  
  // Audio Objects
  activeAudio: null, // HTMLAudioElement for playback
  audioCtx: null,
  audioAnalyser: null,
  audioNodeSrc: null,

  // Editing Modal State
  editingImageIndex: -1,
  tempZoom: 1.0,
  tempRotate: 0,
  tempCaption: "",
  tempCaptionColor: "#ffffff",
  tempCaptionSize: 28,
  tempCaptionStyle: "subtitle"
};

export function triggerStateChange() {
  if (state.videoGenerated) {
    const playerStatusTag = document.getElementById('player-status-tag');
    if (playerStatusTag) {
      playerStatusTag.textContent = "Draft (Modified)";
      playerStatusTag.classList.remove('active');
    }
  }
}
