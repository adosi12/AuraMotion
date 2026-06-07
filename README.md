# 🎬 AuraMotion — AI Photo-to-Video Generator

AuraMotion is a highly innovative, premium, responsive dark-mode Single Page Application (SPA) that enables users to compile photo sequences into thematic videos synchronized with background audio. 

Built with high-fidelity UI/UX design paradigms like **Glassmorphism**, neon accent shadows, smooth animations, and interactive controls, it represents a state-of-the-art frontend canvas workspace.

---

## ✨ Key Features

### 📂 1. Media Upload & Management
* **Multi-Image Drag-and-Drop**: Upload up to 20 photos simultaneously using a sleek, interactive drag zone or standard file picker.
* **Audio Track Sync**: Support for custom background tracks (MP3/WAV).
* **Interactive Waveform**: Generates a real-time, double-sided, multi-colored audio waveform visualizer using the **Web Audio API**.

### 🎨 2. AI Theme Customization
* **4 Style Themes**:
  * **Cinematic 🎬**: Cinematic anamorphic black letterbox bars, warm high-contrast lighting, and subtle camera zooms.
  * **Retro VHS 📺**: Vintage scanlines overlay, low-fi tracking static, low-contrast sepia tint, and dynamic clock timestamp.
  * **Cyberpunk 🌌**: Glowing pink/cyan ambient borders, neon text-shadow elements, and random horizontal glitch-slice frame effects.
  * **Minimalist ◽**: Elegant grayscale black-and-white layouts with clean high-contrast presentation.
* **Custom AI Prompting**: An interactive text prompt field to describe camera motions, mood settings, and transitions.

### 🛠️ 3. Post-Processing Workspace (The Innovation Hub)
* **Canvas Preview Player**: High-performance slideshow render engine powered by `requestAnimationFrame` supporting Ken Burns camera zooms, panning transitions, cross-fades, and color shaders.
* **Timeline Storyboard Track**: 
  * Reorder photos instantly by dragging and dropping them left/right.
  * Hover overlay actions to delete individual frames.
  * **Crop & Rotate Dialog**: Click to open a modal to scale images (1.0x to 2.5x), rotate (90°, 180°, etc.), and add **Custom Caption Overlays** (choose colors, size, and style formats: *Subtitle Box, Neon Glow, Minimal Shadow*) rendered directly on top of the moving frame.
* **Sequence Shuffler**: Shuffle button to instantly randomize the photo array order.

### 📤 4. Export & Mobile Integration
* **InShot & YouCut Deep-linking**: Pre-packages project timeline cues, audio tags, and cropping states into base64 JSON payload parameters wrapped in native mobile deep links (`inshot://create?payload=...`).
* **High-Fidelity Local Recording**: Captures the canvas frame stream and audio outputs synchronously using the browser's **MediaRecorder API** to compile and download a physical `.webm` video file.

---

## 🛠️ Technologies Used
* **HTML5 Canvas**: Frame-by-frame image drawing, Ken Burns transforms, theme filters, and caption rendering.
* **CSS3 Vanilla**: Modern variables, layout grids, glassmorphic filters, and keyframe animations.
* **Web Audio API**: Decodes binary audio data to compute sample array blocks and paint waveforms.
* **ES6+ JavaScript**: Native drag-and-drop index splicing, file reading, state controllers, and recording loops.
* **MediaRecorder API**: Real-time canvas streams compilation.

---

## 📁 File Structure
```bash
AuraMotion/
├── index.html     # Semantic layouts, controls, modal dialog, and tooltips
├── style.css      # Core design tokens, gradients, animations, and responsiveness
├── app.js         # Upload loaders, canvas rendering, timeline sorting, and recorders
└── README.md      # User guide and project overview
```

---

## 🚀 How to Run the Project Locally

### Option 1: Open Directly (Instant)
1. Go to your local folder: `D:\2026Projects\AimToApply\untitled`
2. Right-click on **`index.html`** -> **Open With** -> Select Chrome or Edge.
*(Note: Some features like Web Audio API decoding and recording output may be blocked by browser sandbox restrictions when opening files via `file://` protocols).*

### Option 2: Run a Local Web Server (Recommended)
Running a local web server solves origin permissions. 

1. Open your **Command Prompt** (cmd) or **PowerShell**.
2. Navigate to your project folder:
   ```bash
   cd D:\2026Projects\AimToApply\untitled
   ```
3. Start a quick Python server:
   ```bash
   python -m http.server 8080
   ```
4. Open your browser and go to: **[http://localhost:8080](http://localhost:8080)**

---

## 🐙 Git Repository commands

We have initialized a Git repository locally in the project directory.

To link this local workspace and push it to your remote account (e.g., GitHub):

1. **Create a new repository** on GitHub named `AuraMotion`. Do *not* initialize it with a README or gitignore.
2. Open terminal in the project folder and run:
   ```bash
   # Add your GitHub repository remote
   git remote add origin https://github.com/adosi12/AuraMotion.git
   
   # Rename default branch to main
   git branch -M main
   
   # Push files
   git push -u origin main
   ```
