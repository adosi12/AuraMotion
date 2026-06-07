# 📘 AuraMotion User Guide

Welcome to **AuraMotion**, the next-generation AI Photo-to-Video generator. This guide explains how to use every feature of the platform, from uploading media to exporting high-fidelity cinematic videos.

---

## 🚀 Getting Started

AuraMotion is built with modern **ES6 Modules**. To run it locally, you **must** use a local web server to handle module imports.

**Quick Start (Python):**
```bash
python -m http.server 8080
```
Then visit `http://localhost:8080` in your browser.

---

## 🎨 Core Features & How to Use Them

### 1. Media Upload & Management
*   **Image Upload**: Drag and drop up to 20 photos into the **Media & Music Upload** zone. You can also click the zone to open a file picker.
*   **Audio Upload**: Click the **Add Audio Track** button to upload an MP3 or WAV file.
*   **Waveform Visualizer**: Once audio is uploaded, a real-time waveform is generated. You can see your current playback position (playhead) move across this waveform.

### 2. Generation Tuning (New AI Features)
*   **Aspect Ratio (Competitive Upgrade)**:
    *   **16:9**: Ideal for YouTube and presentations.
    *   **9:16**: Perfect for TikTok, Instagram Reels, and YouTube Shorts.
    *   **1:1**: Optimized for square social media posts.
*   **Theme Styles**: Select from **Cinematic**, **Retro VHS**, **Cyberpunk**, or **Minimalist**. Each theme applies unique color shaders (LUTs), overlays (scanlines, cinematic bars), and motion dynamics.
*   **Audio Beat-Sync (Pro Feature)**:
    *   Toggle **Audio Beat-Sync** on to automatically align photo transitions with the peaks/beats of your music.
    *   When off, the slideshow uses a standard 3.5s duration per slide.
*   **AI Prompting**: Type instructions like *"Slow zoom on photo 1, add glowing text to photo 2"* to influence the AI's rendering logic.

### 3. Storyboard & Timeline Editor
*   **Reordering**: Drag and drop photos within the **Storyboard Timeline** to change their sequence.
*   **Editing (Crop & Rotate)**: Hover over a photo and click the **Crop icon** to open the Edit Modal.
    *   **Zoom Scale**: Adjust the Ken Burns zoom level.
    *   **Rotate**: Rotate images in 90° increments.
    *   **Captions**: Add custom text overlays. Choose your color, font size, and style (Subtitle Box, Neon Glow, or Minimal).
*   **Deleting**: Use the **Trash icon** on a storyboard tile to remove it.
*   **Shuffling**: Click **Shuffle Grid** in the player controls to randomize your sequence instantly.

### 4. Video Preview Player
*   **Playback**: Use the center Play button or the toolbar controls to preview your video.
*   **Seeking**: Drag the timeline slider to jump to any point in the video.
*   **Fullscreen**: Click the Maximize icon to view your creation in high-def fullscreen.

### 5. Advanced Export Options
*   **High Quality Render**: Click **Compile** to render your video locally using the MediaRecorder API. This captures the canvas stream and audio into a `.webm` file.
*   **Deep-Link Integration**: Export your project metadata directly to mobile editors like **InShot** or **YouCut** via specialized deep links.

---

## 🛠 Developer Architecture

The project has been modularized for high maintainability:

*   `js/state.js`: Centralized global state.
*   `js/ui.js`: DOM references and UI utility functions.
*   `js/media.js`: Audio processing, beat detection, and file handling.
*   `js/canvas.js`: The rendering engine, Ken Burns effects, and themes.
*   `js/storyboard.js`: Timeline management and modal logic.
*   `js/export.js`: Export payloads and deep-linking.
*   `js/main.js`: Entry point initializing all event listeners.

*   `css/`: Categorized styles into `base.css`, `layout.css`, `components.css`, and `player.css`.

---

## 🌟 Tips for Best Results
1.  **Beat-Sync**: Use music with clear, strong drum beats for the most dramatic transitions.
2.  **Captions**: Use the "Neon" style for Cyberpunk themes and "Subtitle Box" for Cinematic themes.
3.  **Aspect Ratio**: Match your aspect ratio to your target platform *before* adding captions to ensure perfect placement.
