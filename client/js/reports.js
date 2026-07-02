import { auth, isMockMode } from './firebase-config.js';
import { FirebaseService } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
  const reportsList = document.getElementById('reports-cards-list');
  const emptyState = document.getElementById('reports-empty-state');
  const loader = document.getElementById('reports-loader');

  // Auth State Guard trigger visibility show
  auth.onAuthStateChanged((user) => {
    if (user || isMockMode) {
      document.documentElement.style.visibility = 'visible';
      loadUserReports();
    } else {
      const mockParam = isMockMode ? '?mock=true' : '';
      window.location.href = `login.html${mockParam}`;
    }
  });

  async function loadUserReports() {
    try {
      if (loader) loader.style.display = 'flex';
      if (reportsList) reportsList.style.display = 'none';
      if (emptyState) emptyState.style.display = 'none';

      const idToken = isMockMode ? 'mock-token' : await auth.currentUser.getIdToken();
      const response = await fetch(`${FirebaseService.getApiBase()}/reports`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      const data = await response.json();

      if (loader) loader.style.display = 'none';

      if (response.ok && data.success && data.reports && data.reports.length > 0) {
        renderReports(data.reports);
      } else {
        if (emptyState) emptyState.style.display = 'block';
      }
    } catch (err) {
      console.error('Failed to load user reports:', err);
      if (loader) loader.style.display = 'none';
      if (emptyState) emptyState.style.display = 'block';
    }
  }

  function renderReports(reports) {
    if (!reportsList) return;
    reportsList.innerHTML = '';
    reportsList.style.display = 'flex';

    reports.forEach(report => {
      const card = document.createElement('div');
      card.className = 'panel';
      card.style.cssText = 'padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; border: 1px solid var(--border-color); border-radius: var(--radius-lg); background: var(--bg-card);';

      // Prettify timestamp: date, month, year and time
      const date = new Date(report.createdAt);
      const options = { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false };
      const timestampStr = date.toLocaleDateString('en-GB', options).replace(',', ' at');

      // Prettify type badge style
      let typeColor = 'var(--text-muted)';
      if (report.issueType === 'Bug') typeColor = '#f43f5e';
      else if (report.issueType === 'Wrong Analysis') typeColor = '#f59e0b';
      else if (report.issueType === 'UI Problem') typeColor = '#3b82f6';
      else if (report.issueType === 'Account Issue') typeColor = '#10b981';

      // Status badge
      const statusBadge = report.status === 'open' 
        ? `<span style="padding: 0.25rem 0.5rem; background: rgba(245, 158, 11, 0.1); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.25); border-radius: var(--radius-sm); font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">Open</span>`
        : `<span style="padding: 0.25rem 0.5rem; background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.25); border-radius: var(--radius-sm); font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">Resolved</span>`;

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span style="padding: 0.25rem 0.5rem; background: ${typeColor}15; color: ${typeColor}; border: 1px solid ${typeColor}25; border-radius: var(--radius-sm); font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">${escapeHTML(report.issueType)}</span>
            ${statusBadge}
          </div>
          <span style="font-size: 0.8rem; color: var(--text-muted);">${timestampStr}</span>
        </div>
        
        <p style="margin: 0; font-size: 0.9rem; line-height: 1.5; color: var(--text-main); white-space: pre-wrap;">${escapeHTML(report.issueDescription)}</p>
      `;

      reportsList.appendChild(card);
    });
  }

  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
});
