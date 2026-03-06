// Stool Tracker Module
let stoolEntries = [];

function initStoolModule() {
    loadStoolData();
    console.log('Stool module initialized');
}

function loadStoolData() {
    const stored = localStorage.getItem('innerscape_stool_entries');
    stoolEntries = stored ? JSON.parse(stored) : [];
}

function saveStoolData() {
    localStorage.setItem('innerscape_stool_entries', JSON.stringify(stoolEntries));
}

function showStoolPage() {
    const content = `
        <div class="page-header">
            <h2>💩 Stool Tracker</h2>
            <p>Track digestive patterns for IBS management</p>
        </div>
        
        <div class="stool-form">
            <div class="bristol-chart">
                <h3>Bristol Stool Chart</h3>
                <div class="bristol-options">
                    ${[1,2,3,4,5,6,7].map(type => `
                        <label class="bristol-option">
                            <input type="radio" name="bristol" value="${type}">
                            <div class="bristol-type">
                                <div class="bristol-number">Type ${type}</div>
                                <div class="bristol-desc">${getBristolDescription(type)}</div>
                            </div>
                        </label>
                    `).join('')}
                </div>
            </div>
            
            <div class="stool-details">
                <div class="form-group">
                    <label>💨 How it came out:</label>
                    <select id="stool-manner">
                        <option value="">Select...</option>
                        <option value="normal">Normal</option>
                        <option value="urgent">Urgent</option>
                        <option value="explosive">Explosive/Splattering</option>
                        <option value="difficult">Difficult/Straining</option>
                        <option value="incomplete">Felt incomplete</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>📏 Amount:</label>
                    <select id="stool-amount">
                        <option value="">Select...</option>
                        <option value="small">Small</option>
                        <option value="normal">Normal</option>
                        <option value="large">Large</option>
                        <option value="minimal">Just traces</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>⚠️ Symptoms (check any):</label>
                    <div class="symptom-checks">
                        <label><input type="checkbox" id="pain"> Abdominal pain</label>
                        <label><input type="checkbox" id="cramping"> Cramping</label>
                        <label><input type="checkbox" id="bloating"> Bloating</label>
                        <label><input type="checkbox" id="urgency"> Urgency</label>
                        <label><input type="checkbox" id="incomplete"> Felt incomplete</label>
                        <label><input type="checkbox" id="blood"> Blood present</label>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>📝 Notes:</label>
                    <textarea id="stool-notes" placeholder="Any other details, triggers, or observations..."></textarea>
                </div>
                
                <button class="primary-btn" onclick="saveStoolEntry()">💾 Save Entry</button>
            </div>
        </div>
        
        <div class="stool-history">
            <h3>Recent Entries</h3>
            <div id="stool-list"></div>
        </div>
    `;
    
    document.getElementById('stool-content').innerHTML = content;
    renderStoolList();
}

function getBristolDescription(type) {
    const descriptions = {
        1: "Hard lumps (constipated)",
        2: "Lumpy sausage (slightly constipated)", 
        3: "Sausage with cracks (normal)",
        4: "Smooth sausage (normal)",
        5: "Soft blobs (lacking fiber)",
        6: "Mushy consistency (mild diarrhea)",
        7: "Liquid consistency (severe diarrhea)"
    };
    return descriptions[type] || "";
}

function saveStoolEntry() {
    const bristol = document.querySelector('input[name="bristol"]:checked');
    const manner = document.getElementById('stool-manner').value;
    const amount = document.getElementById('stool-amount').value;
    const notes = document.getElementById('stool-notes').value;
    
    if (!bristol) {
        alert('Please select a Bristol type');
        return;
    }
    
    // Get checked symptoms
    const symptoms = [];
    document.querySelectorAll('.symptom-checks input:checked').forEach(cb => {
        symptoms.push(cb.parentElement.textContent.trim());
    });
    
    const entry = {
        id: 'stool-' + Date.now(),
        timestamp: Date.now(),
        bristol: parseInt(bristol.value),
        bristolDesc: getBristolDescription(parseInt(bristol.value)),
        manner: manner,
        amount: amount,
        symptoms: symptoms,
        notes: notes
    };
    
    stoolEntries.unshift(entry);
    saveStoolData();
    
    // Clear form
    document.querySelector('input[name="bristol"]:checked').checked = false;
    document.getElementById('stool-manner').value = '';
    document.getElementById('stool-amount').value = '';
    document.getElementById('stool-notes').value = '';
    document.querySelectorAll('.symptom-checks input').forEach(cb => cb.checked = false);
    
    renderStoolList();
    
    // Show success
    showToast('💾 Stool entry saved');
}

function renderStoolList() {
    const list = document.getElementById('stool-list');
    if (!list) return;
    
    if (stoolEntries.length === 0) {
        list.innerHTML = '<div class="empty-state">No entries yet. Add your first stool entry above.</div>';
        return;
    }
    
    list.innerHTML = stoolEntries.slice(0, 10).map(entry => `
        <div class="stool-entry">
            <div class="stool-header">
                <div class="stool-time">${formatDateTime(entry.timestamp)}</div>
                <div class="bristol-badge">Type ${entry.bristol}</div>
            </div>
            <div class="stool-details">
                <div><strong>Bristol:</strong> ${entry.bristolDesc}</div>
                ${entry.manner ? `<div><strong>Manner:</strong> ${entry.manner}</div>` : ''}
                ${entry.amount ? `<div><strong>Amount:</strong> ${entry.amount}</div>` : ''}
                ${entry.symptoms.length ? `<div><strong>Symptoms:</strong> ${entry.symptoms.join(', ')}</div>` : ''}
                ${entry.notes ? `<div><strong>Notes:</strong> ${entry.notes}</div>` : ''}
            </div>
            <div class="entry-actions">
                <button onclick="deleteStoolEntry('${entry.id}')" class="delete-btn">🗑️</button>
            </div>
        </div>
    `).join('');
}

function deleteStoolEntry(id) {
    if (!confirm('Delete this stool entry?')) return;
    
    stoolEntries = stoolEntries.filter(e => e.id !== id);
    saveStoolData();
    renderStoolList();
    showToast('Entry deleted');
}

// Initialize when DOM loads
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', initStoolModule);
}