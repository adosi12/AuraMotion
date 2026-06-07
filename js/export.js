import { state } from './state.js';
import { ui } from './ui.js';

export function simulateDirectExport(targetApp) {
  if (state.uploadedImages.length === 0) {
    alert("Please upload photos and build your sequence before exporting.");
    return;
  }

  const payload = {
    generator: "AuraMotion",
    theme: state.currentTheme,
    customPrompt: ui.promptInput.value,
    slideCount: state.uploadedImages.length,
    duration: state.totalDuration,
    hasAudio: state.audioTrack !== null,
    audioName: state.audioTrack ? state.audioTrack.name : null,
    slides: state.uploadedImages.map(img => ({
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
          AuraMotion compiled a layout package matching your theme: <strong style="color:#fff;">${state.currentTheme.toUpperCase()}</strong>.
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
        <button class="generate-btn" style="text-decoration: none; padding: 0.5rem 1.25rem; font-size: 0.85rem; box-shadow: none;" onclick="this.closest('.modal-overlay').remove(); alert('Deep Link sent to mobile device simulator.');">
          Confirm Export
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}
