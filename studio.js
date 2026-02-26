/* ── Art Studio ── */
const STUDIO_KEY = 'innerscape_studio_assets';
let studioCurrentCat = 'all';
let studioEditingAsset = null;

function initStudio() {
  // Upload zone
  const uploadZone = $('#studio-upload-zone');
  const fileInput = $('#studio-file-input');
  
  uploadZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', handleStudioUpload);
  
  // Drag and drop
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  });
  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragover');
  });
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
      handleFiles(e.dataTransfer.files);
    }
  });
  
  // Category filters
  $$('.studio-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.studio-cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      studioCurrentCat = btn.dataset.cat;
      renderStudioGallery();
    });
  });
  
  // Detail modal
  $('#studio-detail-save').addEventListener('click', saveAssetDetails);
  $('#studio-detail-close').addEventListener('click', closeStudioDetail);
  $('#studio-detail-delete').addEventListener('click', deleteStudioAsset);
}

function handleStudioUpload(e) {
  handleFiles(e.target.files);
  e.target.value = '';
}

async function handleFiles(files) {
  if (!currentUser || !firebase.storage) {
    showToast('Please wait for sync to connect...');
    return;
  }
  
  const storage = firebase.storage();
  const total = files.length;
  let uploaded = 0;
  
  showToast(`Uploading ${total} file(s)...`);
  
  for (const file of files) {
    try {
      const fileId = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
      const ext = file.name.split('.').pop().toLowerCase();
      const path = `studio/${currentUser.uid}/${fileId}.${ext}`;
      
      const ref = storage.ref(path);
      await ref.put(file);
      const downloadURL = await ref.getDownloadURL();
      
      // Guess category from file type
      let category = 'illustrations';
      if (ext === 'svg') category = 'icons';
      if (ext === 'gif' || ext === 'json' || ext === 'mp4' || ext === 'webm') category = 'animations';
      if (file.name.toLowerCase().includes('bg') || file.name.toLowerCase().includes('background')) category = 'backgrounds';
      if (file.name.toLowerCase().includes('ui') || file.name.toLowerCase().includes('button') || file.name.toLowerCase().includes('icon')) category = 'ui';
      
      const asset = {
        id: fileId,
        name: file.name.replace(/\.[^.]+$/, ''),
        filename: file.name,
        category: category,
        url: downloadURL,
        path: path,
        type: file.type,
        size: file.size,
        notes: '',
        status: 'pending',
        uploadedAt: Date.now()
      };
      
      saveStudioAsset(asset);
      uploaded++;
      
    } catch (error) {
      showToast(`Failed to upload ${file.name}`);
    }
  }
  
  if (uploaded > 0) {
    showToast(`✅ Uploaded ${uploaded} asset(s)`);
    renderStudioGallery();
  }
}

function loadStudioAssets() {
  try { return JSON.parse(localStorage.getItem(STUDIO_KEY)) || []; } catch { return []; }
}

function saveStudioAssets(assets) {
  localStorage.setItem(STUDIO_KEY, JSON.stringify(assets));
}

function saveStudioAsset(asset) {
  const assets = loadStudioAssets();
  const idx = assets.findIndex(a => a.id === asset.id);
  if (idx >= 0) {
    assets[idx] = asset;
  } else {
    assets.push(asset);
  }
  saveStudioAssets(assets);
  
  // Sync to Firestore
  if (currentUser && db) {
    db.collection('users').doc(currentUser.uid)
      .collection('studio_assets').doc(asset.id).set(asset);
  }
}

function renderStudioGallery() {
  const assets = loadStudioAssets();
  const filtered = studioCurrentCat === 'all' 
    ? assets 
    : assets.filter(a => a.category === studioCurrentCat);
  
  const gallery = $('#studio-gallery');
  const empty = $('#studio-empty');
  
  gallery.innerHTML = '';
  
  // Update stats
  const total = assets.length;
  const implemented = assets.filter(a => a.status === 'implemented').length;
  const pending = assets.filter(a => a.status === 'pending').length;
  $('#studio-total').textContent = total;
  $('#studio-implemented').textContent = implemented;
  $('#studio-pending').textContent = pending;
  
  if (!filtered.length) {
    empty.classList.add('show');
    return;
  }
  empty.classList.remove('show');
  
  // Sort by newest first
  filtered.sort((a, b) => b.uploadedAt - a.uploadedAt);
  
  filtered.forEach(asset => {
    const card = document.createElement('div');
    card.className = 'studio-card';
    
    const statusIcon = {
      'pending': '🟡',
      'implemented': '🟢',
      'revision': '🔴'
    }[asset.status] || '🟡';
    
    const isImage = asset.type && asset.type.startsWith('image/');
    const preview = isImage 
      ? `<img src="${asset.url}" alt="${asset.name}" class="studio-card-img" loading="lazy">`
      : `<div class="studio-card-file">${asset.filename.split('.').pop().toUpperCase()}</div>`;
    
    card.innerHTML = `
      ${preview}
      <div class="studio-card-info">
        <span class="studio-card-name">${asset.name}</span>
        <span class="studio-card-status">${statusIcon}</span>
      </div>
      ${asset.notes ? `<div class="studio-card-notes">${asset.notes.slice(0, 50)}${asset.notes.length > 50 ? '...' : ''}</div>` : ''}
    `;
    
    card.addEventListener('click', () => openStudioDetail(asset));
    gallery.appendChild(card);
  });
}

function openStudioDetail(asset) {
  studioEditingAsset = asset;
  const modal = $('#studio-detail-modal');
  
  const isImage = asset.type && asset.type.startsWith('image/');
  const preview = $('#studio-detail-preview');
  preview.innerHTML = isImage 
    ? `<img src="${asset.url}" alt="${asset.name}" style="max-width:100%;max-height:300px;border-radius:12px;">`
    : `<div style="padding:40px;text-align:center;font-size:48px;">${asset.filename.split('.').pop().toUpperCase()}</div>`;
  
  $('#studio-detail-name').value = asset.name;
  $('#studio-detail-cat').value = asset.category;
  $('#studio-detail-notes').value = asset.notes || '';
  $('#studio-detail-status').value = asset.status;
  
  modal.classList.remove('hidden');
}

function saveAssetDetails() {
  if (!studioEditingAsset) return;
  
  studioEditingAsset.name = $('#studio-detail-name').value.trim() || studioEditingAsset.name;
  studioEditingAsset.category = $('#studio-detail-cat').value;
  studioEditingAsset.notes = $('#studio-detail-notes').value.trim();
  studioEditingAsset.status = $('#studio-detail-status').value;
  
  saveStudioAsset(studioEditingAsset);
  closeStudioDetail();
  renderStudioGallery();
  showToast('Asset updated ✓');
}

function closeStudioDetail() {
  $('#studio-detail-modal').classList.add('hidden');
  studioEditingAsset = null;
}

async function deleteStudioAsset() {
  if (!studioEditingAsset) return;
  
  const asset = studioEditingAsset;
  
  // Delete from Firebase Storage
  try {
    if (asset.path && firebase.storage) {
      await firebase.storage().ref(asset.path).delete();
    }
  } catch {}
  
  // Delete from Firestore
  try {
    if (currentUser && db) {
      await db.collection('users').doc(currentUser.uid)
        .collection('studio_assets').doc(asset.id).delete();
    }
  } catch {}
  
  // Delete from local
  const assets = loadStudioAssets().filter(a => a.id !== asset.id);
  saveStudioAssets(assets);
  
  closeStudioDetail();
  renderStudioGallery();
  showToast('Asset deleted');
}

// Sync studio assets from cloud
function syncStudioAssets() {
  if (!currentUser || !db) return;
  
  db.collection('users').doc(currentUser.uid)
    .collection('studio_assets').get().then(snapshot => {
      const cloudAssets = [];
      snapshot.forEach(doc => cloudAssets.push({id: doc.id, ...doc.data()}));
      
      const localAssets = loadStudioAssets();
      
      // Merge: add cloud assets not in local
      const toAdd = cloudAssets.filter(cloud => 
        !localAssets.find(local => local.id === cloud.id)
      );
      
      if (toAdd.length > 0) {
        const merged = [...localAssets, ...toAdd];
        saveStudioAssets(merged);
        renderStudioGallery();
      }
      
      // Upload local assets not in cloud
      const toUpload = localAssets.filter(local => 
        !cloudAssets.find(cloud => cloud.id === local.id)
      );
      toUpload.forEach(asset => {
        db.collection('users').doc(currentUser.uid)
          .collection('studio_assets').doc(asset.id).set(asset);
      });
    });
}
