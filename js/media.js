import { state, triggerStateChange } from './state.js';
import { ui } from './ui.js';

export function handleImageFiles(files, updateStoryboard, recalculateDuration) {
  const remainingSlots = 20 - state.uploadedImages.length;
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
      const imgEl = new Image();
      imgEl.onload = () => {
        state.uploadedImages.push({
          id: Date.now() + Math.random().toString(36).substr(2, 5),
          file: file,
          src: e.target.result,
          imgElement: imgEl,
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
      imgEl.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

  if (files.length > remainingSlots) {
    alert(`Only ${remainingSlots} photos were added. The maximum limit is 20 photos.`);
  }
}

export function handleAudioFile(file) {
  if (!file.type.startsWith('audio/')) {
    alert("Please upload a valid audio file (MP3/WAV).");
    return;
  }

  if (state.activeAudio) {
    state.activeAudio.pause();
    state.activeAudio = null;
  }

  state.audioTrack = {
    file: file,
    src: URL.createObjectURL(file),
    name: file.name
  };

  ui.audioFilename.textContent = file.name;
  ui.audioMeta.classList.remove('hidden');
  ui.waveformPlaceholder.classList.add('hidden');

  state.activeAudio = new Audio(state.audioTrack.src);
  state.activeAudio.volume = ui.volumeSlider.value;
  state.activeAudio.loop = true;

  decodeAndRenderWaveform(file);
  triggerStateChange();
}

export function decodeAndRenderWaveform(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const audioData = e.target.result;
    
    if (!state.audioCtx) {
      state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    state.audioCtx.decodeAudioData(audioData)
      .then(buffer => {
        state.audioTrack.buffer = buffer;
        renderWaveform(buffer);
      })
      .catch(err => {
        console.error("Waveform decode error:", err);
        ui.waveformPlaceholder.textContent = "Waveform unavailable";
        ui.waveformPlaceholder.classList.remove('hidden');
      });
  };
  reader.readAsArrayBuffer(file);
}

export function renderWaveform(audioBuffer) {
  const width = ui.waveformCanvas.width = ui.waveformCanvas.parentElement.clientWidth;
  const height = ui.waveformCanvas.height = 60;
  const wCtx = ui.waveformCanvas.getContext('2d');
  
  const rawData = audioBuffer.getChannelData(0); 
  const samples = 120; 
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
  gradient.addColorStop(0, '#8b5cf6'); 
  gradient.addColorStop(0.5, '#ec4899'); 
  gradient.addColorStop(1, '#06b6d4'); 

  wCtx.fillStyle = gradient;

  for (let i = 0; i < samples; i++) {
    const val = normalizedData[i] * height * 0.85;
    const x = i * barWidth;
    const y = (height - val) / 2;
    
    wCtx.beginPath();
    wCtx.roundRect(x + 1, y, barWidth - 1, val, 2);
    wCtx.fill();
  }
}

export function detectBeats(audioBuffer) {
  const data = audioBuffer.getChannelData(0);
  const step = Math.floor(audioBuffer.sampleRate * 0.02); // 20ms steps
  const peaks = [];
  const threshold = 0.65; // Sensitivity
  
  for (let i = 0; i < data.length; i += step) {
    let max = 0;
    for (let j = 0; j < step && i + j < data.length; j++) {
      const val = Math.abs(data[i + j]);
      if (val > max) max = val;
    }
    
    if (max > threshold) {
      const time = i / audioBuffer.sampleRate;
      // Prevent too many peaks close together (min 300ms apart)
      if (peaks.length === 0 || time - peaks[peaks.length - 1] > 0.3) {
        peaks.push(time);
      }
    }
  }
  
  state.detectedBeats = peaks;
  console.log(`Detected ${peaks.length} beats.`);
}
