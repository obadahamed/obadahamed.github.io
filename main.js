// GitHub API Configuration
const GITHUB_USER = 'obadahamed';
const GITHUB_API = 'https://api.github.com';
const EXCLUDE_REPOS = ['obadahamed.github.io'];

// Static Professional Summary — no API needed
const STATIC_SUMMARY = `XENOS is a self-taught penetration tester from Syria, following a structured 52-week offensive security roadmap (2026–2027). Specializing in web application exploitation — including XSS, SQLi, IDOR, File Upload bypass, and XXE — alongside Linux privilege escalation and network pivoting techniques. Ranked in the top 2% globally on TryHackMe with over 151 rooms completed, XENOS approaches every target with a methodical mindset: enumerate thoroughly, understand the mechanism, exploit precisely, and document clearly.`;

// README fetch rate limiting
let README_FETCH_COUNT = 0;
const MAX_README_FETCHES = 5;

// ── GitHub Profile ────────────────────────────────────────────────
async function fetchGitHubProfile() {
    try {
        const response = await fetch(`${GITHUB_API}/users/${GITHUB_USER}`);
        if (!response.ok) throw new Error('Failed to fetch profile');
        const data = await response.json();

        const avatarEl = document.getElementById('avatarImg');
        if (avatarEl) avatarEl.src = data.avatar_url;

        const repoEl = document.getElementById('repoCount');
        if (repoEl) repoEl.textContent = data.public_repos;

        const followerEl = document.getElementById('followerCount');
        if (followerEl) followerEl.textContent = data.followers;

    } catch (error) {
        console.error('Profile fetch error:', error);
    }
}

// ── GitHub Repos ──────────────────────────────────────────────────
async function fetchGitHubRepos() {
    try {
        const response = await fetch(
            `${GITHUB_API}/users/${GITHUB_USER}/repos?per_page=100&sort=updated`
        );
        if (!response.ok) throw new Error('Failed to fetch repos');
        const repos = await response.json();

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
        const container = document.getElementById('writeupsList');
        if (container) {
            container.innerHTML = `
                <p style="grid-column:1/-1; text-align:center; color:var(--text-secondary);">
                    ⚠ Could not load repositories. Check your connection.
                </p>`;
        }
    }
}

// ── Fetch README ──────────────────────────────────────────────────
async function fetchRepoReadme(repoName) {
    if (README_FETCH_COUNT >= MAX_README_FETCHES) return null;
    try {
        const response = await fetch(
            `${GITHUB_API}/repos/${GITHUB_USER}/${repoName}/readme`,
            { headers: { 'Accept': 'application/vnd.github.v3.raw' } }
        );
        if (!response.ok) return null;
        README_FETCH_COUNT++;
        return await response.text();
    } catch {
        return null;
    }
}

// ── Extract Techniques ────────────────────────────────────────────
async function extractTechniques(repo) {
    let searchText = (repo.description || '').toLowerCase();

    if (README_FETCH_COUNT < MAX_README_FETCHES) {
        const readme = await fetchRepoReadme(repo.name);
        if (readme) searchText += ' ' + readme.toLowerCase();
    }

    const keywords = {
        'XSS':            ['xss', 'cross-site scripting', 'stored xss', 'reflected xss', 'dom xss'],
        'SQLi':           ['sqli', 'sql injection', 'sql'],
        'IDOR':           ['idor', 'insecure direct object'],
        'File Upload':    ['file upload', 'upload bypass', 'webshell'],
        'XXE':            ['xxe', 'xml external entity'],
        'LFI':            ['lfi', 'local file inclusion'],
        'RFI':            ['rfi', 'remote file inclusion'],
        'RCE':            ['rce', 'remote code execution', 'code execution'],
        'PrivEsc':        ['privesc', 'privilege escalation', 'suid', 'cron', 'capabilities'],
        'Path Hijacking': ['path hijacking', 'path hijack'],
        'LXD':            ['lxd', 'container escape'],
        'AD':             ['active directory', 'domain controller', 'kerberos'],
        'Pass-the-Hash':  ['pass-the-hash', 'pth', 'mimikatz'],
        'Pivoting':       ['pivoting', 'chisel', 'socks5', 'tunnel'],
        'SSRF':           ['ssrf', 'server-side request'],
        'Command Inj':    ['command injection', 'os command'],
        'Steganography':  ['steghide', 'steganography', 'binwalk'],
        'Hash Cracking':  ['john', 'hashcat', 'hash crack'],
        'Burp Suite':     ['burp', 'burpsuite', 'intercepted'],
        'Nmap':           ['nmap', 'port scan'],
    };

    const found = [];
    for (const [tech, patterns] of Object.entries(keywords)) {
        if (patterns.some(p => searchText.includes(p))) {
            found.push(tech);
            if (found.length >= 4) break;
        }
    }
    return found;
}

// ── Detect Platform ───────────────────────────────────────────────
function detectPlatform(name, description) {
    const text = (name + ' ' + (description || '')).toLowerCase();
    if (text.includes('tryhackme') || text.includes('try-hack-me')) return 'tryhackme';
    if (text.includes('portswigger'))                                  return 'portswigger';
    if (text.includes('hackthebox') || text.includes('htb'))           return 'hackthebox';
    return 'other';
}

function formatPlatformName(platform) {
    const names = {
        tryhackme:   'TryHackMe',
        portswigger: 'PortSwigger',
        hackthebox:  'HackTheBox',
        other:       'Project',
    };
    return names[platform] || 'Project';
}

// ── Render Write-ups ──────────────────────────────────────────────
async function renderWriteups(repos) {
    const container = document.getElementById('writeupsList');
    if (!container) return;
    container.innerHTML = '';

    if (repos.length === 0) {
        container.innerHTML = `
            <p style="grid-column:1/-1; text-align:center; color:var(--text-secondary);">
                No write-ups found yet. Check back soon!
            </p>`;
        return;
    }

    for (const repo of repos) {
        const platform   = detectPlatform(repo.name, repo.description);
        const techniques = await extractTechniques(repo);

        const updatedAt = repo.updated_at
            ? new Date(repo.updated_at).toLocaleDateString('en-GB', { year:'numeric', month:'short' })
            : '';

        const card = document.createElement('div');
        card.className = 'writeup-card';
        card.setAttribute('data-platform', platform);

        card.innerHTML = `
            <span class="writeup-platform ${platform}">${formatPlatformName(platform)}</span>
            <h3 class="writeup-title">${repo.name.replace(/-/g, ' ')}</h3>
            ${repo.description ? `<p class="writeup-desc">${repo.description}</p>` : ''}
            ${techniques.length > 0 ? `
                <div class="writeup-technique">
                    ${techniques.map(t => `<span class="writeup-tech-badge">${t}</span>`).join('')}
                </div>` : ''}
            <div class="writeup-footer">
                ${updatedAt ? `<span class="writeup-date">Updated: ${updatedAt}</span>` : ''}
                <a href="${repo.html_url}" target="_blank" rel="noopener noreferrer" class="writeup-link">
                    View on GitHub →
                </a>
            </div>`;

        container.appendChild(card);
    }

    setupFilterButtons();
}

// ── Filter Buttons ────────────────────────────────────────────────
function setupFilterButtons() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const getCards   = () => document.querySelectorAll('.writeup-card');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.getAttribute('data-filter');
            getCards().forEach(card => {
                card.style.display =
                    (filter === 'all' || card.getAttribute('data-platform') === filter)
                        ? '' : 'none';
            });
        });
    });
}

// ── Static Summary ────────────────────────────────────────────────
function loadStaticSummary() {
    const el = document.getElementById('aiSummary');
    if (!el) return;
    el.classList.remove('loading');
    el.textContent = STATIC_SUMMARY;

    const controls = document.querySelector('.ai-controls');
    if (controls) controls.style.display = 'none';
}

// ── Init ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    fetchGitHubProfile();
    fetchGitHubRepos();
    loadStaticSummary();
});
