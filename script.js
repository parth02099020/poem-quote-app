// DOM Elements
const keywordInput = document.getElementById('keywordInput');
const fetchPoemsBtn = document.getElementById('fetchPoemsBtn');
const fetchQuotesBtn = document.getElementById('fetchQuotesBtn');
const fetchBothBtn = document.getElementById('fetchBothBtn');
const clearResultsBtn = document.getElementById('clearResultsBtn');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const shuffleResultsBtn = document.getElementById('shuffleResultsBtn');
const retryBtn = document.getElementById('retryBtn');
const loadingIndicator = document.getElementById('loadingIndicator');
const loadingText = document.getElementById('loadingText');
const resultsContainer = document.getElementById('resultsContainer');
const resultsTitle = document.getElementById('resultsTitle');
const resultsContent = document.getElementById('resultsContent');
const resultsCount = document.getElementById('resultsCount');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const totalSearches = document.getElementById('totalSearches');
const exactMatch = document.getElementById('exactMatch');
const dynamicBg = document.getElementById('dynamicBg');
const dynamicBackground = document.getElementById('dynamicBackground');
const inputSuggestions = document.getElementById('inputSuggestions');

// API Status Elements
const poetryStatus = document.getElementById('poetryStatus');
const quotableStatus = document.getElementById('quotableStatus');
const zenquotesStatus = document.getElementById('zenquotesStatus');

// API URLs and Configuration
const APIS = {
    poetry: {
        base: 'https://poetrydb.org',
        status: poetryStatus
    },
    quotable: {
        base: 'https://api.quotable.io',
        status: quotableStatus
    },
    zenquotes: {
        base: 'https://zenquotes.io/api',
        status: zenquotesStatus
    },
    unsplash: {
        base: 'https://source.unsplash.com'
    }
};

// State management
let currentRequest = null;
let searchCount = 0;
let currentResults = [];
let currentKeyword = '';
let currentSearchType = '';
let displayedResults = 0;
const RESULTS_PER_PAGE = 5;

// Popular keywords for suggestions
const POPULAR_KEYWORDS = [
    'love', 'nature', 'hope', 'dreams', 'happiness', 'peace', 'friendship', 'courage',
    'wisdom', 'beauty', 'life', 'freedom', 'success', 'family', 'strength', 'faith',
    'joy', 'inspiration', 'time', 'heart', 'soul', 'mind', 'light', 'darkness',
    'ocean', 'mountain', 'sunset', 'moon', 'stars', 'rain', 'flower', 'tree',
    'journey', 'passion', 'truth', 'healing', 'gratitude', 'purpose', 'adventure'
];

// Utility Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function highlightKeyword(text, keyword) {
    if (!keyword || !text) return text;
    const regex = new RegExp(`(${keyword})`, 'gi');
    return text.replace(regex, '<span class="keyword-highlight">$1</span>');
}

function updateApiStatus(apiName, status) {
    const statusElement = APIS[apiName]?.status;
    if (statusElement) {
        statusElement.className = `status-indicator ${status}`;
        statusElement.textContent = status === 'online' ? '●' : status === 'offline' ? '●' : '●';
    }
}

// Background Management
function updateDynamicBackground(keyword) {
    if (!dynamicBg.checked || !keyword) return;
    
    const searchTerms = [
        keyword,
        `${keyword} abstract`,
        `${keyword} minimalist`,
        `${keyword} peaceful`
    ];
    
    const randomTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
    const imageUrl = `${APIS.unsplash.base}/1920x1080/?${encodeURIComponent(randomTerm)}&blur=2`;
    
    // Preload the image to ensure smooth transition
    const img = new Image();
    img.onload = () => {
        dynamicBackground.style.backgroundImage = `linear-gradient(135deg, rgba(255, 245, 240, 0.8) 0%, rgba(255, 232, 214, 0.8) 100%), url('${imageUrl}')`;
        dynamicBackground.style.backgroundSize = 'cover';
        dynamicBackground.style.backgroundPosition = 'center';
        dynamicBackground.style.backgroundAttachment = 'fixed';
    };
    img.src = imageUrl;
}

// Input Suggestions
function showSuggestions(keyword) {
    if (!keyword || keyword.length < 2) {
        inputSuggestions.style.display = 'none';
        return;
    }
    
    const filtered = POPULAR_KEYWORDS.filter(k => 
        k.toLowerCase().includes(keyword.toLowerCase()) && 
        k.toLowerCase() !== keyword.toLowerCase()
    ).slice(0, 5);
    
    if (filtered.length === 0) {
        inputSuggestions.style.display = 'none';
        return;
    }
    
    inputSuggestions.innerHTML = filtered.map(k => 
        `<div class="suggestion-item" data-keyword="${k}">${k}</div>`
    ).join('');
    
    inputSuggestions.style.display = 'block';
}

// API Functions
async function fetchWithTimeout(url, timeout = 10000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, { 
            signal: controller.signal,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

async function checkApiStatus() {
    const checks = [
        { name: 'poetry', url: `${APIS.poetry.base}/title/Sonnet` },
        { name: 'quotable', url: `${APIS.quotable.base}/quotes?limit=1` },
        { name: 'zenquotes', url: `${APIS.zenquotes.base}/random` }
    ];
    
    for (const check of checks) {
        try {
            updateApiStatus(check.name, 'checking');
            const response = await fetchWithTimeout(check.url, 5000);
            updateApiStatus(check.name, response.ok ? 'online' : 'offline');
        } catch (error) {
            updateApiStatus(check.name, 'offline');
        }
    }
}

async function fetchPoetry(keyword) {
    const results = [];
    const searchQueries = [
        `${APIS.poetry.base}/lines/${encodeURIComponent(keyword)}`,
        `${APIS.poetry.base}/title/${encodeURIComponent(keyword)}`,
        `${APIS.poetry.base}/author/${encodeURIComponent(keyword)}`
    ];
    
    for (const url of searchQueries) {
        try {
            updateApiStatus('poetry', 'checking');
            const response = await fetchWithTimeout(url);
            
            if (!response.ok) {
                if (response.status === 404) continue;
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            updateApiStatus('poetry', 'online');
            
            if (Array.isArray(data) && data.length > 0) {
                const processedPoems = data.slice(0, 10).map(poem => ({
                    type: 'poem',
                    title: poem.title || 'Untitled',
                    author: poem.author || 'Unknown',
                    content: Array.isArray(poem.lines) ? poem.lines.join('\n') : poem.lines || poem.text || '',
                    tags: [keyword, 'poetry']
                })).filter(poem => poem.content && poem.content.length > 0);
                
                results.push(...processedPoems);
                if (results.length >= 10) break;
            }
        } catch (error) {
            console.warn(`Poetry API error for ${url}:`, error);
            updateApiStatus('poetry', 'offline');
            continue;
        }
    }
    
    return results;
}

async function fetchQuotes(keyword) {
    const results = [];
    
    // Try Quotable API first
    try {
        updateApiStatus('quotable', 'checking');
        const quotableUrl = `${APIS.quotable.base}/quotes?tags=${encodeURIComponent(keyword)}&limit=10`;
        const response = await fetchWithTimeout(quotableUrl);
        
        if (response.ok) {
            const data = await response.json();
            updateApiStatus('quotable', 'online');
            
            if (data.results && Array.isArray(data.results)) {
                const quotableQuotes = data.results.map(quote => ({
                    type: 'quote',
                    content: quote.content,
                    author: quote.author,
                    tags: quote.tags || [keyword]
                }));
                results.push(...quotableQuotes);
            }
        }
    } catch (error) {
        console.warn('Quotable API error:', error);
        updateApiStatus('quotable', 'offline');
    }
    
    // Try ZenQuotes API as fallback
    if (results.length < 5) {
        try {
            updateApiStatus('zenquotes', 'checking');
            const zenUrl = `${APIS.zenquotes.base}/quotes`;
            const response = await fetchWithTimeout(zenUrl);
            
            if (response.ok) {
                const data = await response.json();
                updateApiStatus('zenquotes', 'online');
                
                if (Array.isArray(data)) {
                    // Filter quotes that contain the keyword
                    const filteredQuotes = data.filter(quote => {
                        const content = (quote.q || quote.content || '').toLowerCase();
                        return content.includes(keyword.toLowerCase());
                    }).slice(0, 10 - results.length);
                    
                    const zenQuotes = filteredQuotes.map(quote => ({
                        type: 'quote',
                        content: quote.q || quote.content || quote.text,
                        author: quote.a || quote.author || 'Unknown',
                        tags: [keyword, 'wisdom']
                    }));
                    results.push(...zenQuotes);
                }
            }
        } catch (error) {
            console.warn('ZenQuotes API error:', error);
            updateApiStatus('zenquotes', 'offline');
        }
    }
    
    // Fallback: Create inspirational quotes related to the keyword
    if (results.length === 0) {
        const fallbackQuotes = [
            {
                type: 'quote',
                content: `The beauty of ${keyword} lies not in what we see, but in what we feel.`,
                author: 'Anonymous',
                tags: [keyword, 'inspiration']
            },
            {
                type: 'quote',
                content: `In every moment of ${keyword}, we find a piece of ourselves.`,
                author: 'Unknown Sage',
                tags: [keyword, 'wisdom']
            },
            {
                type: 'quote',
                content: `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} is the language the heart speaks when words fail.`,
                author: 'Modern Poet',
                tags: [keyword, 'heart']
            }
        ];
        results.push(...fallbackQuotes);
    }
    
    return results;
}

async function performSearch(searchType, keyword) {
    if (!keyword || keyword.trim() === '') {
        showError('Please enter a keyword to search.');
        return;
    }
    
    // Cancel any ongoing request
    if (currentRequest) {
        currentRequest.abort();
    }
    
    const controller = new AbortController();
    currentRequest = controller;
    
    currentKeyword = keyword.trim();
    currentSearchType = searchType;
    displayedResults = 0;
    
    showLoading(true);
    hideError();
    
    try {
        let results = [];
        
        const loadingMessages = [
            'Searching for beautiful content...',
            'Exploring literary databases...',
            'Finding perfect matches...',
            'Curating results for you...'
        ];
        
        let messageIndex = 0;
        const messageInterval = setInterval(() => {
            if (loadingText) {
                loadingText.textContent = loadingMessages[messageIndex];
                messageIndex = (messageIndex + 1) % loadingMessages.length;
            }
        }, 1500);
        
        // Update background
        updateDynamicBackground(currentKeyword);
        
        // Fetch content based on search type
        if (searchType === 'poems' || searchType === 'both') {
            const poems = await fetchPoetry(currentKeyword);
            results.push(...poems);
        }
        
        if (searchType === 'quotes' || searchType === 'both') {
            const quotes = await fetchQuotes(currentKeyword);
            results.push(...quotes);
        }
        
        clearInterval(messageInterval);
        
        // Filter results if exact match is required
        if (exactMatch.checked) {
            results = results.filter(item => {
                const content = (item.content || '').toLowerCase();
                const title = (item.title || '').toLowerCase();
                const keywordLower = currentKeyword.toLowerCase();
                return content.includes(keywordLower) || title.includes(keywordLower);
            });
        }
        
        // Shuffle results for variety
        results = shuffleArray(results);
        
        currentResults = results;
        searchCount++;
        
        if (totalSearches) {
            totalSearches.textContent = `${searchCount} searches performed`;
        }
        
        showLoading(false);
        
        if (results.length === 0) {
            showError(`No ${searchType} found for "${currentKeyword}". Try a different keyword or disable exact match.`);
        } else {
            displayResults();
        }
        
    } catch (error) {
        showLoading(false);
        if (error.name !== 'AbortError') {
            console.error('Search error:', error);
            showError('Network error. Please check your internet connection and try again.');
        }
    } finally {
        currentRequest = null;
    }
}

function displayResults() {
    if (currentResults.length === 0) return;
    
    const typeMap = {
        'poems': 'Poems',
        'quotes': 'Quotes',
        'both': 'Poems & Quotes'
    };
    
    resultsTitle.textContent = `${typeMap[currentSearchType]} for "${currentKeyword}"`;
    resultsCount.textContent = `${currentResults.length} results found`;
    
    // Show initial batch of results
    displayedResults = 0;
    resultsContent.innerHTML = '';
    loadMoreResults();
    
    resultsContainer.classList.remove('hidden');
    resultsContainer.classList.add('fade-in');
}

function loadMoreResults() {
    const endIndex = Math.min(displayedResults + RESULTS_PER_PAGE, currentResults.length);
    const resultsToShow = currentResults.slice(displayedResults, endIndex);
    
    resultsToShow.forEach((item, index) => {
        const resultElement = createResultElement(item, displayedResults + index);
        resultsContent.appendChild(resultElement);
        
        // Add staggered animation
        setTimeout(() => {
            resultElement.classList.add('slide-in');
        }, index * 100);
    });
    
    displayedResults = endIndex;
    
    // Show/hide load more button
    if (displayedResults >= currentResults.length) {
        loadMoreBtn.classList.add('hidden');
    } else {
        loadMoreBtn.classList.remove('hidden');
    }
}

function createResultElement(item, index) {
    const resultDiv = document.createElement('div');
    resultDiv.className = 'result-item';
    
    const title = item.title || (item.type === 'quote' ? 'Quote' : 'Poem');
    const author = item.author || 'Unknown';
    let content = item.content || '';
    
    // Highlight keywords in content
    content = highlightKeyword(content, currentKeyword);
    
    // Create tags
    const tagsHtml = item.tags ? item.tags.map(tag => 
        `<span class="tag">${tag}</span>`
    ).join('') : '';
    
    if (item.type === 'quote') {
        resultDiv.innerHTML = `
            <h3>${title}</h3>
            <p class="author">${author}</p>
            <div class="quote-content">${content}</div>
            <div class="tags">${tagsHtml}</div>
        `;
    } else {
        resultDiv.innerHTML = `
            <h3>${title}</h3>
            <p class="author">${author}</p>
            <div class="content">${content}</div>
            <div class="tags">${tagsHtml}</div>
        `;
    }
    
    return resultDiv;
}

function showLoading(show) {
    if (show) {
        loadingIndicator.classList.remove('hidden');
        resultsContainer.classList.add('hidden');
        hideError();
    } else {
        loadingIndicator.classList.add('hidden');
    }
}

function showError(message) {
    errorText.textContent = message;
    errorMessage.classList.remove('hidden');
    errorMessage.classList.add('fade-in');
    loadingIndicator.classList.add('hidden');
}

function hideError() {
    errorMessage.classList.add('hidden');
}

function clearResults() {
    currentResults = [];
    displayedResults = 0;
    resultsContainer.classList.add('hidden');
    resultsContent.innerHTML = '';
    hideError();
    
    // Reset background to default
    if (dynamicBg.checked) {
        dynamicBackground.style.backgroundImage = '';
    }
}

// Event Listeners
keywordInput.addEventListener('input', debounce((e) => {
    showSuggestions(e.target.value);
}, 300));

keywordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        inputSuggestions.style.display = 'none';
        performSearch('both', keywordInput.value);
    }
});

keywordInput.addEventListener('blur', () => {
    // Hide suggestions after a short delay to allow clicking
    setTimeout(() => {
        inputSuggestions.style.display = 'none';
    }, 200);
});

inputSuggestions.addEventListener('click', (e) => {
    if (e.target.classList.contains('suggestion-item')) {
        const keyword = e.target.dataset.keyword;
        keywordInput.value = keyword;
        inputSuggestions.style.display = 'none';
        performSearch('both', keyword);
    }
});

fetchPoemsBtn.addEventListener('click', () => {
    performSearch('poems', keywordInput.value);
});

fetchQuotesBtn.addEventListener('click', () => {
    performSearch('quotes', keywordInput.value);
});

fetchBothBtn.addEventListener('click', () => {
    performSearch('both', keywordInput.value);
});

clearResultsBtn.addEventListener('click', clearResults);

loadMoreBtn.addEventListener('click', loadMoreResults);

shuffleResultsBtn.addEventListener('click', () => {
    if (currentResults.length > 0) {
        currentResults = shuffleArray(currentResults);
        displayedResults = 0;
        resultsContent.innerHTML = '';
        loadMoreResults();
    }
});

retryBtn.addEventListener('click', () => {
    hideError();
    if (currentKeyword && currentSearchType) {
        performSearch(currentSearchType, currentKeyword);
    }
});

// Handle clicks outside suggestions
document.addEventListener('click', (e) => {
    if (!keywordInput.contains(e.target) && !inputSuggestions.contains(e.target)) {
        inputSuggestions.style.display = 'none';
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check API status on load
    checkApiStatus();
    
    // Set up periodic API status checks
    setInterval(checkApiStatus, 300000); // Check every 5 minutes
    
    // Focus on input field
    keywordInput.focus();
    
    // Add some sample searches for demonstration
    const sampleKeywords = ['love', 'nature', 'hope'];
    let currentSample = 0;
    
    // Cycle through placeholder text
    setInterval(() => {
        keywordInput.placeholder = `Enter a keyword (e.g., ${sampleKeywords[currentSample]}, dreams, peace...)`;
        currentSample = (currentSample + 1) % sampleKeywords.length;
    }, 3000);
});

// Handle network status
window.addEventListener('online', () => {
    console.log('Network connection restored');
    checkApiStatus();
});

window.addEventListener('offline', () => {
    console.log('Network connection lost');
    updateApiStatus('poetry', 'offline');
    updateApiStatus('quotable', 'offline');
    updateApiStatus('zenquotes', 'offline');
});

// Performance optimization
let ticking = false;
function updateScrollAnimation() {
    const scrollY = window.scrollY;
    const backgroundOpacity = Math.max(0.85 - scrollY * 0.0005, 0.3);
    
    document.querySelector('.background-overlay').style.background = 
        `rgba(255, 245, 240, ${backgroundOpacity})`;
    
    ticking = false;
}

window.addEventListener('scroll', () => {
    if (!ticking) {
        requestAnimationFrame(updateScrollAnimation);
        ticking = true;
    }
});

// Preload some popular search terms for better UX
const preloadSearchTerms = ['love', 'nature', 'hope'];
preloadSearchTerms.forEach(term => {
    const img = new Image();
    img.src = `${APIS.unsplash.base}/400x300/?${encodeURIComponent(term)}&blur=2`;
});