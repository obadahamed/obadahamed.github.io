// XENOS Portfolio Functionality

// Function to load GitHub stats
async function loadGitHubStats(username) {
    const response = await fetch(`https://api.github.com/users/${username}`);
    const data = await response.json();
    return data;
}

// Function to load writeups from repositories
async function loadWriteups(repos) {
    const writeups = [];
    for (const repo of repos) {
        const response = await fetch(`https://api.github.com/repos/${repo}/contents`);
        const data = await response.json();
        writeups.push(...data);
    }
    return writeups;
}

// Filter functionality
function filterWriteups(writeups, keyword) {
    return writeups.filter(writeup => writeup.name.includes(keyword));
}

// Function to generate AI summary
async function generateAISummary(text) {
    const response = await fetch('https://api.openai.com/v1/engines/davinci-codex/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer YOUR_API_KEY`
        },
        body: JSON.stringify({
            prompt: text,
            max_tokens: 100
        })
    });
    const summary = await response.json();
    return summary.choices[0].text;
}

// Example usage
(async () => {
    const username = 'obadahamed';
    const stats = await loadGitHubStats(username);
    console.log(stats);
    
    const repos = ['repo1', 'repo2']; // Add your repos
    const writeups = await loadWriteups(repos);
    console.log(writeups);
    
    const filteredWriteups = filterWriteups(writeups, 'keyword'); // Replace 'keyword'
    console.log(filteredWriteups);

    const aiSummary = await generateAISummary('Here is the text to summarize.');
    console.log(aiSummary);
});