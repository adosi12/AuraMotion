import { state, triggerStateChange } from './state.js';
import { ui } from './ui.js';

let dragSourceElement = null;

export function updateStoryboard(openEditModal, deleteImage) {
  ui.storyboardGrid.innerHTML = '';
  ui.photoCounter.textContent = `${state.uploadedImages.length} / 20 Photos`;

  if (state.uploadedImages.length === 0) {
    ui.storyboardGrid.appendChild(ui.storyboardEmpty);
    return;
  }

  state.uploadedImages.forEach((imgData, index) => {
    const item = document.createElement('div');
    item.className = 'storyboard-item';
    item.setAttribute('draggable', 'true');
    item.setAttribute('data-id', imgData.id);
    item.setAttribute('data-index', index);

    const badge = document.createElement('div');
    badge.className = 'storyboard-badge';
    badge.textContent = index + 1;
    item.appendChild(badge);

    const img = document.createElement('img');
    img.className = 'storyboard-item-thumb';
    img.src = imgData.src;
    img.style.transform = `scale(${imgData.zoom}) rotate(${imgData.rotate}deg)`;
    item.appendChild(img);

    const meta = document.createElement('div');
    meta.className = 'storyboard-item-meta';
    const title = document.createElement('div');
    title.className = 'storyboard-item-title';
    title.textContent = imgData.name;
    
    const captionTextNode = document.createElement('div');
    captionTextNode.style.fontSize = '0.6rem';
    captionTextNode.style.color = 'var(--secondary)';
    captionTextNode.style.overflow = 'hidden';
    captionTextNode.style.textOverflow = 'ellipsis';
    captionTextNode.style.whiteSpace = 'nowrap';
    captionTextNode.style.fontWeight = '600';
    captionTextNode.style.marginTop = '2px';
    captionTextNode.textContent = imgData.caption ? `💬 ${imgData.caption}` : "";

    const durationLabel = document.createElement('div');
    durationLabel.textContent = `${state.slideDuration}s`;
    durationLabel.style.color = 'var(--text-muted)';
    meta.appendChild(title);
    meta.appendChild(captionTextNode);
    meta.appendChild(durationLabel);
    item.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'storyboard-item-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'storyboard-action-btn';
    editBtn.innerHTML = '<i data-lucide="crop" style="width: 12px; height: 12px;"></i>';
    editBtn.title = "Crop & Rotate";
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditModal(index);
    });
    actions.appendChild(editBtn);

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

    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragenter', handleDragEnter);
    item.addEventListener('dragover', handleDragOver);
    item.addEventListener('dragleave', handleDragLeave);
    item.addEventListener('drop', (e) => handleDrop(e, updateStoryboard));
    item.addEventListener('dragend', handleDragEnd);

    ui.storyboardGrid.appendChild(item);
  });

  if (window.lucide) lucide.createIcons();
}

function handleDragStart(e) {
  this.classList.add('dragging');
  dragSourceElement = this;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', this.getAttribute('data-index'));
}

function handleDragOver(e) {
  if (e.preventDefault) e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  return false;
}

function handleDragEnter() {
  if (this !== dragSourceElement) this.classList.add('drag-over');
}

function handleDragLeave() {
  this.classList.remove('drag-over');
}

function handleDrop(e, refreshStoryboard) {
  e.stopPropagation();
  e.preventDefault();
  
  this.classList.remove('drag-over');
  
  if (dragSourceElement !== this) {
    const srcIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    const targetIndex = parseInt(this.getAttribute('data-index'), 10);

    const itemToMove = state.uploadedImages.splice(srcIndex, 1)[0];
    state.uploadedImages.splice(targetIndex, 0, itemToMove);

    refreshStoryboard();
    triggerStateChange();
  }
  return false;
}

function handleDragEnd() {
  this.classList.remove('dragging');
  const items = ui.storyboardGrid.querySelectorAll('.storyboard-item');
  items.forEach(item => item.classList.remove('drag-over'));
}

export function openEditModal(index) {
  state.editingImageIndex = index;
  const imgData = state.uploadedImages[index];
  
  state.tempZoom = imgData.zoom;
  state.tempRotate = imgData.rotate;
  state.tempCaption = imgData.caption || "";
  state.tempCaptionColor = imgData.captionColor || "#ffffff";
  state.tempCaptionSize = imgData.captionSize || 28;
  state.tempCaptionStyle = imgData.captionStyle || "subtitle";

  ui.cropPreviewImg.src = imgData.src;
  ui.cropZoom.value = state.tempZoom;
  ui.cropRotate.value = state.tempRotate;
  
  ui.photoCaption.value = state.tempCaption;
  ui.captionColor.value = state.tempCaptionColor;
  ui.captionSize.value = state.tempCaptionSize;
  ui.sizeValue.textContent = `${state.tempCaptionSize}px`;
  ui.captionStyle.value = state.tempCaptionStyle;
  
  ui.zoomValue.textContent = `${state.tempZoom.toFixed(1)}x`;
  ui.rotateValue.textContent = `${state.tempRotate}°`;

  updateModalPreview();
  ui.cropModal.classList.add('active');
}

export function updateModalPreview() {
  ui.cropPreviewImg.style.transform = `scale(${state.tempZoom}) rotate(${state.tempRotate}deg)`;
}

export function closeModal() {
  ui.cropModal.classList.remove('active');
  state.editingImageIndex = -1;
}
