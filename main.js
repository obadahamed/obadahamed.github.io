// GitHub API Configuration
const GITHUB_USER = 'obadahamed';
const GITHUB_API = 'https://api.github.com';
const EXCLUDE_REPOS = ['obadahamed.github.io'];

// Anthropic API Configuration
let ANTHROPIC_API_KEY = null;

// Fetch GitHub Profile Data
async function fetchGitHubProfile() {
    try {
        const response = await fetch(`${GITHUB_API}/users/${GITHUB_USER}`);
        if (!response.ok) throw new Error('Failed to fetch profile');
        
        const data = await response.json();
        document.getElementById('avatarImg').src = data.avatar_url;
        document.getElementById('repoCount').textContent = data.public_repos;
        document.getElementById('followerCount').textContent = data.followers;
    } catch (error) {
        console.error('Profile fetch error:', error);
        showFallbackMessage('profile-stats');
    }
}

// Fetch GitHub Repositories
async function fetchGitHubRepos() {
    try {
        const response = await fetch(`${GITHUB_API}/users/${GITHUB_USER}/repos?per_page=100&sort=updated`);
        if (!response.ok) throw new Error('Failed to fetch repos');
        
        const repos = await response.json();
        
        // Filter and categorize
        const writeupRepos = [];
        const otherRepos = [];
        
        for (const repo of repos) {
            if (EXCLUDE_REPOS.includes(repo.name)) continue;
            
            const isWriteup = /writeup|ctf|lab|pentest|tryhackme|portswigger|hackthebox/i.test(
                repo.name + ' ' + (repo.description || '')
            );
            
            if (isWriteup) {
                writeupRepos.push(repo);
            } else {
                otherRepos.push(repo);
            }
        }
        
        await renderWriteups([...writeupRepos, ...otherRepos]);
    } catch (error) {
        console.error('Repo fetch error:', error);
        showFallbackMessage('writeups-grid');
    }
}

// Render Write-ups
async function renderWriteups(repos) {
    const container = document.getElementById('writeupsList');
    container.innerHTML = '';
    
    if (repos.length === 0) {
        container.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: var(--text-secondary);">No write-ups found yet. Check back soon!</p>';
        return;
    }
    
    for (const repo of repos) {
        const platform = detectPlatform(repo.name, repo.description);
        const techniques = await extractTechniques(repo);
        
        const card = document.createElement('div');
        card.className = `writeup-card`;
        card.setAttribute('data-platform', platform);
        
        card.innerHTML = `
            <span class="writeup-platform ${platform}">${platform}</span>
            <h3 class="writeup-title">${repo.name}</h3>
            ${techniques.length > 0 ? `
                <div class="writeup-technique">
                    ${techniques.map(t => `<span class="writeup-tech-badge">${t}</span>`).join('')}
                </div>
            ` : ''}
            <a href="${repo.html_url}" target="_blank" rel="noopener noreferrer" class="writeup-link">View Repository →</a>
        `;
        
        container.appendChild(card);
    }
    
    setupFilterButtons();
}

// Detect Platform
function detectPlatform(name, description) {
    const text = (name + ' ' + (description || '')).toLowerCase();
    if (text.includes('tryhackme')) return 'tryhackme';
    if (text.includes('portswigger')) return 'portswigger';
    if (text.includes('hackthebox') || text.includes('htb')) return 'hackthebox';
    return 'other';
}

// Extract Techniques from Repo (stub)
async function extractTechniques(repo) {
    // This is a placeholder - in production, you'd fetch the README
    const description = repo.description || '';
    const techniques = [];
    
    const keywords = {
        'XSS': ['xss', 'cross-site', 'stored', 'reflected'],
        'SQLi': ['sql', 'injection', 'sqli'],
        'IDOR': ['idor', 'insecure direct'],
        'PrivEsc': ['privesc', 'privilege', 'escalation'],
        'RCE': ['rce', 'code execution'],
        'XXE': ['xxe', 'xml'],
        'LFI': ['lfi', 'local file', 'include'],
        'AD': ['active directory', 'ad', 'domain'],
        'Burp': ['burp', 'burpsuite'],
    };
    
    for (const [tech, patterns] of Object.entries(keywords)) {
        if (patterns.some(p => description.toLowerCase().includes(p))) {
            techniques.push(tech);
        }
    }
    
    return techniques.slice(0, 3); // Max 3 badges
}

// Setup Filter Buttons
function setupFilterButtons() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const cards = document.querySelectorAll('.writeup-card');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const filter = btn.getAttribute('data-filter');
            
            cards.forEach(card => {
                if (filter === 'all' || card.getAttribute('data-platform') === filter) {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });
}

// API Key Management
function setupAPIKeyInput() {
    const statusEl = document.getElementById('apiKeyStatus');
    const storedKey = sessionStorage.getItem('anthropic-api-key');
    
    if (storedKey) {
        ANTHROPIC_API_KEY = storedKey;
        statusEl.textContent = '✓ API Key loaded';
        statusEl.style.color = 'var(--accent-green)';
        generateSummary();
    } else {
        const key = prompt('Enter your Anthropic API key (stored in session only):\n\nGet one at: https://console.anthropic.com');
        if (key) {
            sessionStorage.setItem('anthropic-api-key', key);
            ANTHROPIC_API_KEY = key;
            statusEl.textContent = '✓ API Key set';
            statusEl.style.color = 'var(--accent-green)';
            generateSummary();
        } else {
            statusEl.textContent = '⚠ API Key required for AI summary';
            statusEl.style.color = 'var(--accent-blue)';
        }
    }
}

// Generate AI Summary
async function generateSummary() {
    if (!ANTHROPIC_API_KEY) {
        setupAPIKeyInput();
        return;
    }
    
    const summaryEl = document.getElementById('aiSummary');
    summaryEl.classList.add('loading');
    summaryEl.textContent = 'Generating professional summary...';
    
    try {
        const userPrompt = `Create a professional third-person portfolio summary for this cybersecurity professional:

Name: XENOS (obadahamed)
Title: Penetration Tester | Security Researcher
Bio: Penetration Tester in training | Web Exploitation · Linux PrivEsc · CTF Player
Following a structured 52-week roadmap (2026–2027) | TryHackMe Top 2% Globally

Skills: Web Exploitation (XSS, SQLi, IDOR, File Upload, XXE, LFI/RFI), Linux Privilege Escalation, Network Pivoting, Burp Suite, Nmap, Metasploit, Python, Bash

Write 3-4 sentences. Confident, professional, not arrogant. Focus on expertise and dedication to the field.`;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 300,
                system: 'Write a professional third-person portfolio summary for a cybersecurity professional. 3-4 sentences. Confident, not arrogant.',
                messages: [
                    {
                        role: 'user',
                        content: userPrompt
                    }
                ]
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'API call failed');
        }
        
        const data = await response.json();
        const summary = data.content[0].text;
        
        summaryEl.classList.remove('loading');
        summaryEl.textContent = summary;
    } catch (error) {
        console.error('AI Summary error:', error);
        summaryEl.classList.remove('loading');
        summaryEl.innerHTML = `<em>Could not generate summary: ${error.message}</em><br><small style="color: var(--text-secondary);">Try checking your API key or try again later.</small>`;
    }
}

// Regenerate Button
document.addEventListener('DOMContentLoaded', () => {
    const regenerateBtn = document.getElementById('regenerateBtn');
    if (regenerateBtn) {
        regenerateBtn.addEventListener('click', generateSummary);
    }
});

// Fallback Message
function showFallbackMessage(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
        el.innerHTML += '<p style="color: var(--text-secondary); font-size: 0.9rem;">⚠ Could not load live data. Please check your connection.</p>';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchGitHubProfile();
    fetchGitHubRepos();
    setupAPIKeyInput();
});
