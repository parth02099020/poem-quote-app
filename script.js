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
let imageLoadAttempts = new Map(); // Track image loading attempts

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
    const regex = new RegExp(`(${escapeRegExp(keyword)})`, 'gi');
    return text.replace(regex, '<span class="keyword-highlight">$1</span>');
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function updateApiStatus(apiName, status) {
    const statusElement = APIS[apiName]?.status;
    if (statusElement) {
        statusElement.className = `status-indicator ${status}`;
        const symbols = {
            'online': '●',
            'offline': '●',
            'checking': '●'
        };
        statusElement.textContent = symbols[status] || '●';
    }
}

// Enhanced Background Management with better error handling
function updateDynamicBackground(keyword) {
    if (!dynamicBg.checked || !keyword) return;
    
    const cacheKey = keyword.toLowerCase();
    const maxAttempts = 3;
    
    // Check if we've already tried too many times for this keyword
    if (imageLoadAttempts.get(cacheKey) >= maxAttempts) {
        console.log(`Max image load attempts reached for keyword: ${keyword}`);
        return;
    }
    
    const searchTerms = [
        keyword,
        `${keyword} abstract`,
        `${keyword} nature`,
        `${keyword} peaceful`,
        `${keyword} art`
    ];
    
    const randomTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
    const timestamp = Date.now(); // Add timestamp to prevent caching issues
    const imageUrl = `${APIS.unsplash.base}/1920x1080/?${encodeURIComponent(randomTerm)}&blur=2&t=${timestamp}`;
    
    // Preload the image with timeout and error handling
    const img = new Image();
    const timeoutId = setTimeout(() => {
        img.onload = null;
        img.onerror = null;
        console.log(`Image load timeout for: ${randomTerm}`);
    }, 8000); // 8 second timeout
    
    img.onload = () => {
        clearTimeout(timeoutId);
        try {
            dynamicBackground.style.backgroundImage = `linear-gradient(135deg, rgba(255, 245, 240, 0.8) 0%, rgba(255, 232, 214, 0.8) 100%), url('${imageUrl}')`;
            dynamicBackground.style.backgroundSize = 'cover';
            dynamicBackground.style.backgroundPosition = 'center';
            dynamicBackground.style.backgroundAttachment = 'fixed';
            console.log(`Background updated successfully for: ${keyword}`);
        } catch (error) {
            console.error('Error setting background:', error);
        }
    };
    
    img.onerror = () => {
        clearTimeout(timeoutId);
        const attempts = imageLoadAttempts.get(cacheKey) || 0;
        imageLoadAttempts.set(cacheKey, attempts + 1);
        console.log(`Image load error for: ${randomTerm}, attempt: ${attempts + 1}`);
        
        // Try with a simpler search term if this one fails
        if (attempts < maxAttempts - 1) {
            setTimeout(() => updateDynamicBackground(keyword), 1000);
        }
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

// Enhanced API Functions with better error handling
async function fetchWithTimeout(url, timeout = 12000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, { 
            signal: controller.signal,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'PeachPoetryApp/1.0'
            },
            mode: 'cors'
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Request timeout');
        }
        throw error;
    }
}

async function checkApiStatus() {
    const checks = [
        { name: 'poetry', url: `${APIS.poetry.base}/title/Love/1` },
        { name: 'quotable', url: `${APIS.quotable.base}/quotes?limit=1` },
        { name: 'zenquotes', url: `${APIS.zenquotes.base}/today` }
    ];
    
    for (const check of checks) {
        try {
            updateApiStatus(check.name, 'checking');
            const response = await fetchWithTimeout(check.url, 8000);
            updateApiStatus(check.name, response.ok ? 'online' : 'offline');
        } catch (error) {
            console.warn(`API status check failed for ${check.name}:`, error.message);
            updateApiStatus(check.name, 'offline');
        }
    }
}

// Enhanced Poetry fetching with better content handling
async function fetchPoetry(keyword) {
    const results = [];
    const searchStrategies = [
        { type: 'title', url: `${APIS.poetry.base}/title/${encodeURIComponent(keyword)}` },
        { type: 'author', url: `${APIS.poetry.base}/author/${encodeURIComponent(keyword)}` },
        { type: 'lines', url: `${APIS.poetry.base}/lines/${encodeURIComponent(keyword)}` }
    ];
    
    for (const strategy of searchStrategies) {
        try {
            updateApiStatus('poetry', 'checking');
            console.log(`Trying poetry search: ${strategy.type} for "${keyword}"`);
            
            const response = await fetchWithTimeout(strategy.url);
            
            if (!response.ok) {
                if (response.status === 404) {
                    console.log(`No results found for ${strategy.type} search`);
                    continue;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            updateApiStatus('poetry', 'online');
            
            if (Array.isArray(data) && data.length > 0) {
                console.log(`Found ${data.length} poems via ${strategy.type} search`);
                
                const processedPoems = data.slice(0, 15).map(poem => {
                    // Handle different content formats
                    let content = '';
                    if (poem.lines) {
                        content = Array.isArray(poem.lines) ? poem.lines.join('\n') : poem.lines;
                    } else if (poem.text) {
                        content = poem.text;
                    } else if (poem.content) {
                        content = poem.content;
                    }
                    
                    // Ensure we have meaningful content
                    if (!content || content.trim().length < 10) {
                        return null;
                    }
                    
                    return {
                        type: 'poem',
                        title: poem.title || 'Untitled Poem',
                        author: poem.author || 'Anonymous',
                        content: content.trim(),
                        tags: [keyword, 'poetry', strategy.type],
                        searchType: strategy.type
                    };
                }).filter(poem => poem !== null);
                
                results.push(...processedPoems);
                console.log(`Processed ${processedPoems.length} valid poems`);
                
                if (results.length >= 12) break; // Stop when we have enough results
            }
        } catch (error) {
            console.warn(`Poetry API error for ${strategy.type}:`, error.message);
            updateApiStatus('poetry', 'offline');
            continue;
        }
    }
    
    // If no results found, create some fallback poems
    if (results.length === 0) {
        console.log('No poems found, creating fallback content');
        results.push(...createFallbackPoems(keyword));
    }
    
    return results;
}

function createFallbackPoems(keyword) {
    const templates = [
        {
            title: `Ode to ${keyword.charAt(0).toUpperCase() + keyword.slice(1)}`,
            content: `In moments quiet, ${keyword} speaks,\nA whisper soft that comfort seeks.\nThrough seasons changing, ever true,\n${keyword.charAt(0).toUpperCase() + keyword.slice(1)} remains, both old and new.\n\nIn every heart, a sacred space,\nWhere ${keyword} shows its gentle face.\nNo words can capture all it means,\nThis ${keyword} that flows through all our dreams.`
        },
        {
            title: `The Dance of ${keyword.charAt(0).toUpperCase() + keyword.slice(1)}`,
            content: `Like morning dew on petals bright,\n${keyword.charAt(0).toUpperCase() + keyword.slice(1)} dances in the light.\nA rhythm felt but rarely heard,\nMore precious than the sweetest word.\n\nIn quiet moments, it appears,\nTo calm our doubts and dry our tears.\nOh ${keyword}, you gentle friend,\nOn you our weary hearts depend.`
        }
    ];
    
    return templates.map((template, index) => ({
        type: 'poem',
        title: template.title,
        author: 'Inspired Creator',
        content: template.content,
        tags: [keyword, 'poetry', 'inspired'],
        searchType: 'fallback'
    }));
}

// Enhanced Quotes fetching with better fallbacks
async function fetchQuotes(keyword) {
    const results = [];
    
    // Try Quotable API first
    try {
        updateApiStatus('quotable', 'checking');
        console.log(`Searching quotes for: ${keyword}`);
        
        const quotableUrl = `${APIS.quotable.base}/quotes?tags=${encodeURIComponent(keyword)}&limit=15`;
        const response = await fetchWithTimeout(quotableUrl);
        
        if (response.ok) {
            const data = await response.json();
            updateApiStatus('quotable', 'online');
            
            if (data.results && Array.isArray(data.results) && data.results.length > 0) {
                console.log(`Found ${data.results.length} quotes from Quotable`);
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
        console.warn('Quotable API error:', error.message);
        updateApiStatus('quotable', 'offline');
    }
    
    // Try ZenQuotes API if we need more quotes
    if (results.length < 8) {
        try {
            updateApiStatus('zenquotes', 'checking');
            const zenUrl = `${APIS.zenquotes.base}/quotes`;
            const response = await fetchWithTimeout(zenUrl);
            
            if (response.ok) {
                const data = await response.json();
                updateApiStatus('zenquotes', 'online');
                
                if (Array.isArray(data) && data.length > 0) {
                    // Filter quotes that contain the keyword or are generally inspirational
                    const filteredQuotes = data.filter(quote => {
                        const content = (quote.q || quote.content || '').toLowerCase();
                        const author = (quote.a || quote.author || '').toLowerCase();
                        const keywordLower = keyword.toLowerCase();
                        
                        return content.includes(keywordLower) || 
                               author.includes(keywordLower) ||
                               content.length > 20; // Include meaningful quotes
                    }).slice(0, 12 - results.length);
                    
                    console.log(`Found ${filteredQuotes.length} quotes from ZenQuotes`);
                    
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
            console.warn('ZenQuotes API error:', error.message);
            updateApiStatus('zenquotes', 'offline');
        }
    }
    
    // Enhanced fallback quotes
    if (results.length === 0) {
        console.log('No quotes found, creating fallback quotes');
        results.push(...createIntelligentFallbackQuotes(keyword));
    }
    
    return results;
}

function createIntelligentFallbackQuotes(keyword) {
    const keywordLower = keyword.toLowerCase();
    const fallbackQuotes = [];
    
    // Context-aware quote generation
    const quoteTemplates = {
        love: [
            { content: "Love is not just a feeling, it's a choice we make every day.", author: "Modern Wisdom" },
            { content: "In the arithmetic of love, one plus one equals everything, and two minus one equals nothing.", author: "Contemporary Poet" }
        ],
        nature: [
            { content: "Nature does not hurry, yet everything is accomplished.", author: "Lao Tzu" },
            { content: "In every walk with nature, one receives far more than they seek.", author: "John Muir" }
        ],
        hope: [
            { content: "Hope is the thing with feathers that perches in the soul.", author: "Emily Dickinson" },
            { content: "Hope is being able to see that there is light despite all of the darkness.", author: "Desmond Tutu" }
        ],
        default: [
            { content: `The beauty of ${keyword} lies not in what we see, but in what we feel when we embrace it fully.`, author: "Modern Sage" },
            { content: `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} is the bridge between what was and what could be.`, author: "Contemporary Philosopher" },
            { content: `In the quiet moments, ${keyword} speaks the loudest truths to our hearts.`, author: "Inspired Thinker" },
            { content: `Every experience of ${keyword} is a small miracle waiting to be recognized.`, author: "Mindful Observer" }
        ]
    };
    
    // Select appropriate quotes based on keyword
    const selectedTemplates = quoteTemplates[keywordLower] || quoteTemplates.default;
    
    selectedTemplates.forEach(template => {
        fallbackQuotes.push({
            type: 'quote',
            content: template.content,
            author: template.author,
            tags: [keyword, 'inspiration', 'wisdom']
        });
    });
    
    return fallbackQuotes;
}

// Enhanced search function with better error handling
async function performSearch(searchType, keyword) {
    if (!keyword || keyword.trim() === '') {
        showError('Please enter a keyword to search.');
        return;
    }
    
    // Cancel any ongoing request
    if (currentRequest) {
        try {
            currentRequest.abort();
        } catch (e) {
            console.log('Previous request already completed');
        }
    }
    
    const controller = new AbortController();
    currentRequest = controller;
    
    currentKeyword = keyword.trim();
    currentSearchType = searchType;
    displayedResults = 0;
    
    showLoading(true);
    hideError();
    hideResults();
    
    try {
        let results = [];
        
        const loadingMessages = [
            'Searching literary databases...',
            'Finding perfect matches...',
            'Curating beautiful content...',
            'Almost ready...'
        ];
        
        let messageIndex = 0;
        const messageInterval = setInterval(() => {
            if (loadingText && !controller.signal.aborted) {
                loadingText.textContent = loadingMessages[messageIndex];
                messageIndex = (messageIndex + 1) % loadingMessages.length;
            }
        }, 2000);
        
        // Update background early
        updateDynamicBackground(currentKeyword);
        
        // Fetch content based on search type
        const promises = [];
        
        if (searchType === 'poems' || searchType === 'both') {
            promises.push(fetchPoetry(currentKeyword));
        }
        
        if (searchType === 'quotes' || searchType === 'both') {
            promises.push(fetchQuotes(currentKeyword));
        }
        
        const resultsArrays = await Promise.all(promises);
        results = resultsArrays.flat();
        
        clearInterval(messageInterval);
        
        // Enhanced exact match filtering
        if (exactMatch.checked) {
            results = results.filter(item => {
                const content = (item.content || '').toLowerCase();
                const title = (item.title || '').toLowerCase();
                const author = (item.author || '').toLowerCase();
                const keywordLower = currentKeyword.toLowerCase();
                
                return content.includes(keywordLower) || 
                       title.includes(keywordLower) || 
                       author.includes(keywordLower);
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
            showError(`No ${searchType === 'both' ? 'content' : searchType} found for "${currentKeyword}". Try a different keyword or disable exact match.`);
        } else {
            displayResults();
        }
        
    } catch (error) {
        clearInterval(messageInterval);
        showLoading(false);
        
        if (error.name !== 'AbortError') {
            console.error('Search error:', error);
            showError('Unable to complete search. Please check your connection and try again.');
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
    
    // Clear and show initial batch of results
    displayedResults = 0;
    resultsContent.innerHTML = '';
    loadMoreResults();
    
    showResults();
}

function loadMoreResults() {
    const endIndex = Math.min(displayedResults + RESULTS_PER_PAGE, currentResults.length);
    const resultsToShow = currentResults.slice(displayedResults, endIndex);
    
    if (resultsToShow.length === 0) {
        loadMoreBtn.classList.add('hidden');
        return;
    }
    
    resultsToShow.forEach((item, index) => {
        const resultElement = createResultElement(item, displayedResults + index);
        resultsContent.appendChild(resultElement);
        
        // Add staggered animation
        setTimeout(() => {
            if (resultElement && resultElement.parentNode) {
                resultElement.classList.add('slide-in');
            }
        }, index * 150);
    });
    
    displayedResults = endIndex;
    
    // Update load more button visibility
    if (displayedResults >= currentResults.length) {
        loadMoreBtn.classList.add('hidden');
    } else {
        loadMoreBtn.classList.remove('hidden');
    }
}

function createResultElement(item, index) {
    const resultDiv = document.createElement('div');
    resultDiv.className = 'result-item';
    
    const title = item.title || (item.type === 'quote' ? 'Inspirational Quote' : 'Untitled Poem');
    const author = item.author || 'Unknown';
    let content = item.content || '';
    
    // Sanitize content
    content = content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // Highlight keywords in content
    content = highlightKeyword(content, currentKeyword);
    
    // Create tags
    const tagsHtml = item.tags ? item.tags.slice(0, 4).map(tag => 
        `<span class="tag">${tag}</span>`
    ).join('') : '';
    
    if (item.type === 'quote') {
        resultDiv.innerHTML = `
            <h3>${title}</h3>
            <p class="author">— ${author}</p>
            <div class="quote-content">${content}</div>
            <div class="tags">${tagsHtml}</div>
        `;
    } else {
        resultDiv.innerHTML = `
            <h3>${title}</h3>
            <p class="author">by ${author}</p>
            <div class="content">${content}</div>
            <div class="tags">${tagsHtml}</div>
        `;
    }
    
    return resultDiv;
}

function showLoading(show) {
    if (show) {
        loadingIndicator.classList.remove('hidden');
        hideResults();
        hideError();
    } else {
        loadingIndicator.classList.add('hidden');
    }
}

function showResults() {
    resultsContainer.classList.remove('hidden');
    resultsContainer.classList.add('fade-in');
}

function hideResults() {
    resultsContainer.classList.add('hidden');
    resultsContainer.classList.remove('fade-in');
}

function showError(message) {
    errorText.textContent = message;
    errorMessage.classList.remove('hidden');
    errorMessage.classList.add('fade-in');
    hideResults();
    showLoading(false);
}

function hideError() {
    errorMessage.classList.add('hidden');
    errorMessage.classList.remove('fade-in');
}

function clearResults() {
    currentResults = [];
    displayedResults = 0;
    hideResults();
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

loadMoreBtn.addEventListener('click', () => {
    if (currentResults.length > displayedResults) {
        loadMoreResults();
    }
});

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

// Enhanced initialization
document.addEventListener('DOMContentLoaded', () => {
    console.log('Peach Poetry & Quotes App initialized');
    
    // Check API status on load
    checkApiStatus();
    
    // Set up periodic API status checks (every 10 minutes)
    setInterval(checkApiStatus, 600000);
    
    // Focus on input field
    if (keywordInput) {
        keywordInput.focus();
    }
    
    // Dynamic placeholder text
    const sampleKeywords = ['love', 'nature', 'hope', 'dreams', 'peace', 'joy'];
    let currentSample = 0;
    
    setInterval(() => {
        if (keywordInput && document.activeElement !== keywordInput) {
            keywordInput.placeholder = `Enter a keyword (e.g., ${sampleKeywords[currentSample]}, wisdom, beauty...)`;
            currentSample = (currentSample + 1) % sampleKeywords.length;
        }
    }, 4000);
});

// Network status handling
window.addEventListener('online', () => {
    console.log('Network connection restored');
    setTimeout(checkApiStatus, 1000);
});

window.addEventListener('offline', () => {
    console.log('Network connection lost');
    updateApiStatus('poetry', 'offline');
    updateApiStatus('quotable', 'offline');
    updateApiStatus('zenquotes', 'offline');
});

// Enhanced scroll animation
let ticking = false;
function updateScrollAnimation() {
    if (!ticking) return;
    
    const scrollY = window.scrollY;
    const backgroundOpacity = Math.max(0.85 - scrollY * 0.0003, 0.3);
    
    const overlay = document.querySelector('.background-overlay');
    if (overlay) {
        overlay.style.background = `rgba(255, 245, 240, ${backgroundOpacity})`;
    }
    
    ticking = false;
}

window.addEventListener('scroll', () => {
    if (!ticking) {
        requestAnimationFrame(updateScrollAnimation);
        ticking = true;
    }
}, { passive: true });

// Preload popular search images for better UX
const preloadSearchTerms = ['love', 'nature', 'hope', 'peace', 'dreams'];
let preloadedImages = new Set();

function preloadBackgroundImages() {
    preloadSearchTerms.forEach(term => {
        if (!preloadedImages.has(term)) {
            const img = new Image();
            img.onload = () => {
                preloadedImages.add(term);
                console.log(`Preloaded background for: ${term}`);
            };
            img.onerror = () => {
                console.warn(`Failed to preload background for: ${term}`);
            };
            img.src = `${APIS.unsplash.base}/400x300/?${encodeURIComponent(term)}&blur=2`;
        }
    });
}

// Enhanced error recovery
function handleCriticalError(error, context) {
    console.error(`Critical error in ${context}:`, error);
    
    // Reset UI state
    showLoading(false);
    currentRequest = null;
    
    // Show user-friendly error message
    const errorMessages = {
        'network': 'Network connection issue. Please check your internet and try again.',
        'api': 'Service temporarily unavailable. Please try again in a moment.',
        'timeout': 'Request timed out. Please try a different keyword or try again.',
        'parsing': 'Error processing results. Please try again.',
        'default': 'Something went wrong. Please refresh the page and try again.'
    };
    
    const message = errorMessages[context] || errorMessages.default;
    showError(message);
}

// Improved content validation
function validateContent(item) {
    if (!item || typeof item !== 'object') return false;
    
    const content = item.content || '';
    const title = item.title || '';
    
    // Check for meaningful content
    if (content.length < 10 && title.length < 3) return false;
    
    // Check for common invalid content patterns
    const invalidPatterns = [
        /^undefined$/i,
        /^null$/i,
        /^error/i,
        /^loading/i,
        /^\s*$/
    ];
    
    return !invalidPatterns.some(pattern => 
        pattern.test(content) || pattern.test(title)
    );
}

// Enhanced result deduplication
function deduplicateResults(results) {
    const seen = new Set();
    return results.filter(item => {
        if (!validateContent(item)) return false;
        
        // Create a unique key based on content and author
        const key = `${item.content?.substring(0, 50)}-${item.author}`.toLowerCase();
        
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

// Improved search performance tracking
let searchMetrics = {
    totalSearches: 0,
    successfulSearches: 0,
    averageResponseTime: 0,
    apiErrors: {
        poetry: 0,
        quotable: 0,
        zenquotes: 0
    }
};

function trackSearchMetric(success, responseTime, apiErrors = {}) {
    searchMetrics.totalSearches++;
    if (success) searchMetrics.successfulSearches++;
    
    // Update average response time
    searchMetrics.averageResponseTime = 
        (searchMetrics.averageResponseTime + responseTime) / 2;
    
    // Track API errors
    Object.keys(apiErrors).forEach(api => {
        if (apiErrors[api]) {
            searchMetrics.apiErrors[api]++;
        }
    });
    
    // Log metrics for debugging
    console.log('Search Metrics:', {
        successRate: `${Math.round((searchMetrics.successfulSearches / searchMetrics.totalSearches) * 100)}%`,
        avgResponseTime: `${Math.round(searchMetrics.averageResponseTime)}ms`,
        apiErrors: searchMetrics.apiErrors
    });
}

// Keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Don't trigger shortcuts when typing in input
        if (e.target === keywordInput) return;
        
        switch(e.key) {
            case 'Enter':
                if (currentResults.length === 0 && keywordInput.value.trim()) {
                    performSearch('both', keywordInput.value);
                }
                break;
            case 'Escape':
                if (currentRequest) {
                    currentRequest.abort();
                    showLoading(false);
                }
                break;
            case 'r':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    if (currentKeyword && currentSearchType) {
                        performSearch(currentSearchType, currentKeyword);
                    }
                }
                break;
            case 's':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    if (currentResults.length > 0) {
                        shuffleResultsBtn.click();
                    }
                }
                break;
        }
    });
}

// Accessibility improvements
function setupAccessibility() {
    // Add ARIA labels and roles
    if (loadingIndicator) {
        loadingIndicator.setAttribute('role', 'status');
        loadingIndicator.setAttribute('aria-live', 'polite');
    }
    
    if (errorMessage) {
        errorMessage.setAttribute('role', 'alert');
        errorMessage.setAttribute('aria-live', 'assertive');
    }
    
    if (resultsContainer) {
        resultsContainer.setAttribute('role', 'region');
        resultsContainer.setAttribute('aria-label', 'Search results');
    }
    
    // Add keyboard navigation for suggestions
    let selectedSuggestionIndex = -1;
    
    keywordInput.addEventListener('keydown', (e) => {
        const suggestions = inputSuggestions.querySelectorAll('.suggestion-item');
        
        if (suggestions.length === 0) return;
        
        switch(e.key) {
            case 'ArrowDown':
                e.preventDefault();
                selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, suggestions.length - 1);
                updateSuggestionSelection(suggestions);
                break;
            case 'ArrowUp':
                e.preventDefault();
                selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
                updateSuggestionSelection(suggestions);
                break;
            case 'Enter':
                if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
                    e.preventDefault();
                    const keyword = suggestions[selectedSuggestionIndex].dataset.keyword;
                    keywordInput.value = keyword;
                    inputSuggestions.style.display = 'none';
                    performSearch('both', keyword);
                }
                break;
            case 'Escape':
                inputSuggestions.style.display = 'none';
                selectedSuggestionIndex = -1;
                break;
        }
    });
    
    function updateSuggestionSelection(suggestions) {
        suggestions.forEach((suggestion, index) => {
            if (index === selectedSuggestionIndex) {
                suggestion.classList.add('selected');
                suggestion.setAttribute('aria-selected', 'true');
            } else {
                suggestion.classList.remove('selected');
                suggestion.setAttribute('aria-selected', 'false');
            }
        });
    }
}

// Enhanced initialization with better error handling
function initializeApp() {
    try {
        console.log('Initializing Peach Poetry & Quotes App...');
        
        // Verify essential DOM elements exist
        const essentialElements = [
            keywordInput, fetchPoemsBtn, fetchQuotesBtn, fetchBothBtn,
            resultsContainer, loadingIndicator, errorMessage
        ];
        
        const missingElements = essentialElements.filter(el => !el);
        
        if (missingElements.length > 0) {
            console.error('Missing essential DOM elements:', missingElements.length);
            return;
        }
        
        // Initialize features
        setupKeyboardShortcuts();
        setupAccessibility();
        preloadBackgroundImages();
        
        // Check API status
        checkApiStatus();
        
        // Set up periodic API status checks (every 10 minutes)
        setInterval(checkApiStatus, 600000);
        
        // Focus on input field
        keywordInput.focus();
        
        // Dynamic placeholder text
        const sampleKeywords = ['love', 'nature', 'hope', 'dreams', 'peace', 'joy', 'wisdom', 'beauty'];
        let currentSample = 0;
        
        const placeholderInterval = setInterval(() => {
            if (keywordInput && document.activeElement !== keywordInput) {
                keywordInput.placeholder = `Enter a keyword (e.g., ${sampleKeywords[currentSample]}, inspiration, courage...)`;
                currentSample = (currentSample + 1) % sampleKeywords.length;
            }
        }, 4000);
        
        // Store interval ID for cleanup if needed
        window.placeholderInterval = placeholderInterval;
        
        console.log('App initialized successfully');
        
    } catch (error) {
        console.error('Failed to initialize app:', error);
        handleCriticalError(error, 'initialization');
    }
}

// Enhanced cleanup function
function cleanup() {
    // Cancel any ongoing requests
    if (currentRequest) {
        try {
            currentRequest.abort();
        } catch (e) {
            console.log('Request already completed');
        }
    }
    
    // Clear intervals
    if (window.placeholderInterval) {
        clearInterval(window.placeholderInterval);
    }
    
    // Reset state
    currentResults = [];
    displayedResults = 0;
    currentKeyword = '';
    currentSearchType = '';
    
    console.log('App cleanup completed');
}

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Page is hidden, pause non-essential operations
        if (currentRequest && !currentRequest.signal.aborted) {
            console.log('Page hidden, maintaining current request');
        }
    } else {
        // Page is visible again, resume operations
        console.log('Page visible again');
        
        // Refresh API status if it's been more than 5 minutes
        const now = Date.now();
        if (!window.lastApiCheck || (now - window.lastApiCheck) > 300000) {
            checkApiStatus();
            window.lastApiCheck = now;
        }
    }
});

// Handle before page unload
window.addEventListener('beforeunload', () => {
    cleanup();
});

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);

// Fallback initialization for immediate script execution
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOM already loaded
    initializeApp();
}
