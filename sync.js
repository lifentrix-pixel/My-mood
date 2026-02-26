/* ── Firebase Sync ── */

function initFirebase() {
  updateSyncStatus('🔥 Connecting...');
  
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
      updateSyncStatus('🔥 App initialized...');
    }
    
    db = firebase.firestore();
    auth = firebase.auth();
    updateSyncStatus('🔥 Services ready...');
    
    auth.signInAnonymously()
      .then(result => {
        currentUser = result.user;
        updateSyncStatus('🟢 Online');
        setTimeout(() => startCloudSync(), 1000);
      })
      .catch(err => {
        updateSyncStatus('❌ Auth Failed');
      });
    
    window.addEventListener('online', () => {
      isOnline = true;
      if (currentUser) updateSyncStatus('🟢 Online');
    });
    
    window.addEventListener('offline', () => {
      isOnline = false;
      updateSyncStatus('🔴 Offline');
    });
    
  } catch (error) {
    updateSyncStatus('❌ Setup Failed');
  }
}

function updateSyncStatus(status) {
  const statusEl = $('#sync-status');
  if (statusEl) statusEl.textContent = status;
}

function syncData(type, data) {
  if (!currentUser || !db || !isOnline) return;
  
  const userDoc = db.collection('users').doc(currentUser.uid);
  const collectionName = {
    'mood': 'mood_entries',
    'dreams': 'dreams', 
    'activities': 'activities',
    'time': 'time_entries',
    'meditations': 'meditations',
    'food': 'food_entries',
    'medications': 'medications',
    'medication_logs': 'medication_logs'
  }[type] || type;
  
  if (Array.isArray(data)) {
    data.forEach(item => {
      if (item.id) {
        userDoc.collection(collectionName).doc(item.id).set(item);
      } else {
        userDoc.collection(collectionName).add(item);
      }
    });
  } else if (data && data.id) {
    userDoc.collection(collectionName).doc(data.id).set(data);
  }
}

function syncAllData() {
  if (!currentUser || !db || !isOnline) return;
  syncMoodEntries();
  syncDreams();
  syncActivities();
  syncTimeEntries();
  syncMeditations();
  syncFoodEntries();
  syncMedications();
  syncMedicationLogs();
}

function syncMoodEntries() {
  if (!currentUser || !db) return;
  const localEntries = loadEntries();
  const userDoc = db.collection('users').doc(currentUser.uid);
  
  userDoc.collection('mood_entries').get().then(snapshot => {
    const cloudEntries = [];
    snapshot.forEach(doc => cloudEntries.push({id: doc.id, ...doc.data()}));
    
    const toUpload = localEntries.filter(local => 
      !cloudEntries.find(cloud => cloud.ts === local.ts)
    );
    toUpload.forEach(entry => {
      userDoc.collection('mood_entries').add(entry);
    });
    
    const toDownload = cloudEntries.filter(cloud => 
      !localEntries.find(local => local.ts === cloud.ts)
    );
    if (toDownload.length > 0) {
      const merged = [...localEntries, ...toDownload];
      localStorage.setItem(STORE_KEY, JSON.stringify(merged));
    }
    
    updateSyncStatus('☁️ Synced');
    setTimeout(() => updateSyncStatus(isOnline ? '🟢 Online' : '🔴 Offline'), 2000);
  })
  .catch(err => {
    updateSyncStatus('⚠️ Sync Error');
  });
}

function syncDreams() {
  if (!currentUser || !db) return;
  const localDreams = loadDreams();
  const userDoc = db.collection('users').doc(currentUser.uid);
  
  userDoc.collection('dreams').get().then(snapshot => {
    const cloudDreams = [];
    snapshot.forEach(doc => cloudDreams.push({id: doc.id, ...doc.data()}));
    
    const toUpload = localDreams.filter(local => 
      !cloudDreams.find(cloud => cloud.id === local.id)
    );
    toUpload.forEach(dream => {
      userDoc.collection('dreams').doc(dream.id).set(dream);
    });
    
    const toDownload = cloudDreams.filter(cloud => 
      !localDreams.find(local => local.id === cloud.id)
    );
    if (toDownload.length > 0) {
      const merged = [...localDreams, ...toDownload];
      localStorage.setItem(DREAM_STORE_KEY, JSON.stringify(merged));
      // Force re-render dreams view if active
      if (typeof renderDreams === 'function') {
        renderDreams();
      }
    }
  });
}

function syncActivities() {
  if (!currentUser || !db) return;
  const localActivities = loadActivities();
  const deletedIds = getDeletedIds('activities');
  const userDoc = db.collection('users').doc(currentUser.uid);
  
  userDoc.collection('activities').get().then(snapshot => {
    const cloudActivities = [];
    snapshot.forEach(doc => cloudActivities.push({id: doc.id, ...doc.data()}));
    
    const toUpload = localActivities.filter(local => 
      !cloudActivities.find(cloud => cloud.id === local.id)
    );
    toUpload.forEach(activity => {
      userDoc.collection('activities').doc(activity.id).set(activity);
    });
    
    const toDownload = cloudActivities.filter(cloud => 
      !localActivities.find(local => local.id === cloud.id) &&
      !deletedIds.includes(cloud.id)
    );
    if (toDownload.length > 0) {
      const merged = [...localActivities, ...toDownload];
      saveActivities(merged);
    }
  });
}

function syncTimeEntries() {
  if (!currentUser || !db) return;
  const localEntries = loadTimeEntries();
  const userDoc = db.collection('users').doc(currentUser.uid);
  
  userDoc.collection('time_entries').get().then(snapshot => {
    const cloudEntries = [];
    snapshot.forEach(doc => cloudEntries.push({id: doc.id, ...doc.data()}));
    
    const toUpload = localEntries.filter(local => 
      !cloudEntries.find(cloud => cloud.id === local.id)
    );
    toUpload.forEach(entry => {
      userDoc.collection('time_entries').doc(entry.id).set(entry);
    });
    
    const toDownload = cloudEntries.filter(cloud => 
      !localEntries.find(local => local.id === cloud.id)
    );
    if (toDownload.length > 0) {
      const merged = [...localEntries, ...toDownload];
      saveTimeEntries(merged);
    }
  });
}

function syncMeditations() {
  if (!currentUser || !db) return;
  const localMeditations = loadMeditations();
  const userDoc = db.collection('users').doc(currentUser.uid);
  
  userDoc.collection('meditations').get().then(snapshot => {
    const cloudMeditations = [];
    snapshot.forEach(doc => cloudMeditations.push({id: doc.id, ...doc.data()}));
    
    const toUpload = localMeditations.filter(local => 
      !cloudMeditations.find(cloud => cloud.ts === local.ts)
    );
    toUpload.forEach(med => {
      userDoc.collection('meditations').add(med);
    });
    
    const toDownload = cloudMeditations.filter(cloud => 
      !localMeditations.find(local => local.ts === cloud.ts)
    );
    if (toDownload.length > 0) {
      const merged = [...localMeditations, ...toDownload];
      localStorage.setItem(MED_STORE_KEY, JSON.stringify(merged));
    }
  });
}

function syncFoodEntries() {
  if (!currentUser || !db) return;
  const localFood = loadFoodEntries();
  const userDoc = db.collection('users').doc(currentUser.uid);
  
  userDoc.collection('food_entries').get().then(snapshot => {
    const cloudFood = [];
    snapshot.forEach(doc => cloudFood.push({id: doc.id, ...doc.data()}));
    
    const toUpload = localFood.filter(local => 
      !cloudFood.find(cloud => cloud.id === local.id)
    );
    toUpload.forEach(food => {
      userDoc.collection('food_entries').doc(food.id).set(food);
    });
    
    const toDownload = cloudFood.filter(cloud => 
      !localFood.find(local => local.id === cloud.id)
    );
    if (toDownload.length > 0) {
      const merged = [...localFood, ...toDownload];
      saveFoodEntries(merged);
    }
  });
}

function syncMedications() {
  if (!currentUser || !db) return;
  const localMeds = loadMedications();
  const userDoc = db.collection('users').doc(currentUser.uid);
  
  userDoc.collection('medications').get().then(snapshot => {
    const cloudMeds = [];
    snapshot.forEach(doc => cloudMeds.push({id: doc.id, ...doc.data()}));
    
    const toUpload = localMeds.filter(local => 
      !cloudMeds.find(cloud => cloud.id === local.id)
    );
    toUpload.forEach(medication => {
      userDoc.collection('medications').doc(medication.id).set(medication);
    });
    
    const toDownload = cloudMeds.filter(cloud => 
      !localMeds.find(local => local.id === cloud.id)
    );
    if (toDownload.length > 0) {
      const merged = [...localMeds, ...toDownload];
      saveMedications(merged);
    }
  });
}

function syncMedicationLogs() {
  if (!currentUser || !db) return;
  const localLogs = loadMedicationLogs();
  const userDoc = db.collection('users').doc(currentUser.uid);
  
  userDoc.collection('medication_logs').get().then(snapshot => {
    const cloudLogs = [];
    snapshot.forEach(doc => cloudLogs.push({id: doc.id, ...doc.data()}));
    
    const toUpload = localLogs.filter(local => 
      !cloudLogs.find(cloud => cloud.id === local.id)
    );
    toUpload.forEach(log => {
      userDoc.collection('medication_logs').doc(log.id).set(log);
    });
    
    const toDownload = cloudLogs.filter(cloud => 
      !localLogs.find(local => local.id === cloud.id)
    );
    if (toDownload.length > 0) {
      const merged = [...localLogs, ...toDownload];
      saveMedicationLogs(merged);
    }
  });
}

function startCloudSync() {
  syncAllData();
  setInterval(syncAllData, 5 * 60 * 1000);
}

function setupRealtimeSync() {
  if (!currentUser || !db) return;
  // Simplified sync setup
}