// Oura Ring Integration Module
let ouraData = {
  sleep: [],
  readiness: [],
  activity: []
};

let ouraConfig = {
  apiToken: null,
  connected: false,
  lastSync: null
};

function initOuraModule() {
    loadOuraConfig();
    loadOuraData();
    console.log('Oura module initialized');
}

function loadOuraConfig() {
    const stored = localStorage.getItem('innerscape_oura_config');
    if (stored) {
        ouraConfig = { ...ouraConfig, ...JSON.parse(stored) };
    }
}

function saveOuraConfig() {
    localStorage.setItem('innerscape_oura_config', JSON.stringify(ouraConfig));
}

function loadOuraData() {
    const stored = localStorage.getItem('innerscape_oura_data');
    if (stored) {
        ouraData = { ...ouraData, ...JSON.parse(stored) };
    }
}

function saveOuraData() {
    localStorage.setItem('innerscape_oura_data', JSON.stringify(ouraData));
}

function showOuraPage() {
    const content = `
        <div class="page-header">
            <h2>💍 Oura Ring</h2>
            <p>Biometric data + wellness insights</p>
        </div>
        
        ${!ouraConfig.connected ? `
            <div class="oura-setup">
                <div class="oura-welcome">
                    <div class="oura-icon">💍</div>
                    <h3>Connect Your Oura Ring</h3>
                    <p>Sync sleep, HRV, and readiness data to correlate with your mood tracking.</p>
                    
                    <div class="setup-steps">
                        <div class="setup-step">
                            <div class="step-number">1</div>
                            <div class="step-text">Get your personal access token from <a href="https://cloud.ouraring.com/personal-access-tokens" target="_blank">Oura Cloud</a></div>
                        </div>
                        <div class="setup-step">
                            <div class="step-number">2</div>
                            <div class="step-text">Paste it below to connect your ring</div>
                        </div>
                    </div>
                    
                    <div class="token-input">
                        <input type="password" id="oura-token" placeholder="Paste your Oura personal access token here..." />
                        <button onclick="connectOura()" class="primary-btn">🔗 Connect Ring</button>
                    </div>
                    
                    <div class="calibration-note">
                        <p><strong>Note:</strong> Your Oura Ring 4 needs 2 weeks to calibrate. Limited data will be available until then.</p>
                    </div>
                </div>
            </div>
        ` : `
            <div class="oura-dashboard">
                <div class="oura-status">
                    <div class="connection-status connected">
                        <span class="status-dot"></span>
                        Ring connected • Last sync: ${ouraConfig.lastSync ? formatDateTime(ouraConfig.lastSync) : 'Never'}
                    </div>
                    <button onclick="syncOuraData()" class="sync-btn">🔄 Sync Now</button>
                </div>
                
                <div class="oura-tabs">
                    <button class="oura-tab active" data-tab="sleep" onclick="switchOuraTab('sleep')">🌙 Sleep</button>
                    <button class="oura-tab" data-tab="readiness" onclick="switchOuraTab('readiness')">💓 Readiness</button>
                    <button class="oura-tab" data-tab="activity" onclick="switchOuraTab('activity')">🏃‍♀️ Activity</button>
                    <button class="oura-tab" data-tab="insights" onclick="switchOuraTab('insights')">📊 Insights</button>
                </div>
                
                <div id="oura-tab-content" class="oura-tab-content">
                    <!-- Content loads here -->
                </div>
            </div>
        `}
    `;
    
    document.getElementById('oura-content').innerHTML = content;
    
    if (ouraConfig.connected) {
        switchOuraTab('sleep');
    }
}

async function connectOura() {
    const token = document.getElementById('oura-token').value.trim();
    
    if (!token) {
        showToast('Please enter your Oura access token');
        return;
    }
    
    // Test the token
    try {
        const response = await fetch('https://api.ouraring.com/v2/usercollection/personal_info', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Invalid token or API error');
        }
        
        const userData = await response.json();
        
        ouraConfig.apiToken = token;
        ouraConfig.connected = true;
        ouraConfig.lastSync = Date.now();
        saveOuraConfig();
        
        showToast('🎉 Oura Ring connected successfully!');
        
        // Initial sync
        await syncOuraData();
        showOuraPage();
        
    } catch (error) {
        console.error('Oura connection error:', error);
        showToast('❌ Connection failed. Check your token and try again.');
    }
}

async function syncOuraData() {
    if (!ouraConfig.connected || !ouraConfig.apiToken) {
        showToast('Ring not connected');
        return;
    }
    
    showToast('🔄 Syncing Oura data...');
    
    try {
        // Get data for last 30 days
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0];
        
        const headers = {
            'Authorization': `Bearer ${ouraConfig.apiToken}`
        };
        
        // Fetch sleep data
        const sleepResponse = await fetch(`https://api.ouraring.com/v2/usercollection/sleep?start_date=${startDate}&end_date=${endDate}`, { headers });
        if (sleepResponse.ok) {
            const sleepData = await sleepResponse.json();
            ouraData.sleep = sleepData.data || [];
        }
        
        // Fetch readiness data
        const readinessResponse = await fetch(`https://api.ouraring.com/v2/usercollection/daily_readiness?start_date=${startDate}&end_date=${endDate}`, { headers });
        if (readinessResponse.ok) {
            const readinessData = await readinessResponse.json();
            ouraData.readiness = readinessData.data || [];
        }
        
        // Fetch activity data
        const activityResponse = await fetch(`https://api.ouraring.com/v2/usercollection/daily_activity?start_date=${startDate}&end_date=${endDate}`, { headers });
        if (activityResponse.ok) {
            const activityData = await activityResponse.json();
            ouraData.activity = activityData.data || [];
        }
        
        ouraConfig.lastSync = Date.now();
        saveOuraConfig();
        saveOuraData();
        
        showToast('✅ Oura data synced');
        
        // Refresh current view
        const activeTab = document.querySelector('.oura-tab.active')?.dataset.tab || 'sleep';
        switchOuraTab(activeTab);
        
    } catch (error) {
        console.error('Sync error:', error);
        showToast('❌ Sync failed. Check connection.');
    }
}

function switchOuraTab(tab) {
    document.querySelectorAll('.oura-tab').forEach(t => 
        t.classList.toggle('active', t.dataset.tab === tab)
    );
    
    const content = document.getElementById('oura-tab-content');
    
    switch(tab) {
        case 'sleep':
            content.innerHTML = renderSleepTab();
            break;
        case 'readiness':
            content.innerHTML = renderReadinessTab();
            break;
        case 'activity':
            content.innerHTML = renderActivityTab();
            break;
        case 'insights':
            content.innerHTML = renderInsightsTab();
            break;
    }
}

function renderSleepTab() {
    if (ouraData.sleep.length === 0) {
        return `
            <div class="empty-state">
                <span class="empty-icon">🌙</span>
                <p>No sleep data yet</p>
                <p class="empty-sub">Sync your ring or wait for calibration to complete</p>
            </div>
        `;
    }
    
    const recent = ouraData.sleep.slice(0, 7);
    
    return `
        <div class="sleep-overview">
            <h3>Recent Sleep</h3>
            <div class="sleep-cards">
                ${recent.map(sleep => `
                    <div class="sleep-card">
                        <div class="sleep-date">${formatDate(sleep.day)}</div>
                        <div class="sleep-score ${getScoreClass(sleep.score)}">${sleep.score || 'N/A'}</div>
                        <div class="sleep-details">
                            <div><strong>Duration:</strong> ${formatDuration(sleep.total_sleep_duration)}</div>
                            <div><strong>Efficiency:</strong> ${sleep.efficiency}%</div>
                            <div><strong>HRV:</strong> ${sleep.heart_rate?.rmssd || 'N/A'}ms</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="dreams-correlation">
            <h3>Sleep + Dreams</h3>
            <p>Your dream entries from recent nights:</p>
            <div id="sleep-dreams"></div>
        </div>
    `;
}

function renderReadinessTab() {
    if (ouraData.readiness.length === 0) {
        return `
            <div class="empty-state">
                <span class="empty-icon">💓</span>
                <p>No readiness data yet</p>
            </div>
        `;
    }
    
    const recent = ouraData.readiness.slice(0, 7);
    
    return `
        <div class="readiness-overview">
            <h3>Recent Readiness</h3>
            <div class="readiness-cards">
                ${recent.map(day => `
                    <div class="readiness-card">
                        <div class="readiness-date">${formatDate(day.day)}</div>
                        <div class="readiness-score ${getScoreClass(day.score)}">${day.score || 'N/A'}</div>
                        <div class="readiness-contributors">
                            ${day.contributors ? Object.entries(day.contributors).map(([key, value]) => 
                                `<div class="contributor"><span>${key}:</span> ${value}</div>`
                            ).join('') : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderActivityTab() {
    if (ouraData.activity.length === 0) {
        return `
            <div class="empty-state">
                <span class="empty-icon">🏃‍♀️</span>
                <p>No activity data yet</p>
            </div>
        `;
    }
    
    const recent = ouraData.activity.slice(0, 7);
    
    return `
        <div class="activity-overview">
            <h3>Recent Activity</h3>
            <div class="activity-cards">
                ${recent.map(day => `
                    <div class="activity-card">
                        <div class="activity-date">${formatDate(day.day)}</div>
                        <div class="activity-score ${getScoreClass(day.score)}">${day.score || 'N/A'}</div>
                        <div class="activity-metrics">
                            <div><strong>Steps:</strong> ${day.steps?.toLocaleString() || 'N/A'}</div>
                            <div><strong>Calories:</strong> ${day.active_calories || 'N/A'}</div>
                            <div><strong>Active:</strong> ${formatDuration(day.active_duration)}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderInsightsTab() {
    return `
        <div class="insights-placeholder">
            <h3>📊 Coming Soon: Correlations</h3>
            <p>Once you have more Oura data, we'll show correlations like:</p>
            <ul>
                <li>Sleep quality vs. your mood scores</li>
                <li>HRV trends vs. your body ratings</li>
                <li>Readiness vs. your energy levels</li>
                <li>Activity vs. your check-in patterns</li>
            </ul>
            <p>Keep tracking both to build meaningful insights! 💜</p>
        </div>
    `;
}

// Helper functions
function formatDuration(seconds) {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
}

function getScoreClass(score) {
    if (!score) return '';
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 55) return 'fair';
    return 'poor';
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });
}

// Initialize when DOM loads
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', initOuraModule);
}