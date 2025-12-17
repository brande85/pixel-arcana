// Structure allows for easy addition of reversed meanings later

// Helper function to get all cards as a flat array
function getAllCards() {
    const allCards = [...tarotDeck.majorArcana];
    
    Object.values(tarotDeck.minorArcana).forEach(suit => {
        allCards.push(...suit);
    });
    
    return allCards;
}

// Helper function to get a random card
function getRandomCard() {
    const allCards = getAllCards();
    const randomIndex = Math.floor(Math.random() * allCards.length);
    return allCards[randomIndex];
}

// Helper function to get card data with reversal if applicable
function getCardData(card, isReversed = false) {
    if (isReversed && reversalData[card.name]) {
        // Merge base card info with reversal-specific data
        return {
            number: card.number,
            name: card.name,
            ...reversalData[card.name],
            reversed: true,
            suit: card.suit // Preserve suit if it exists
        };
    }
    return { ...card, reversed: false };
}

// Helper function to get multiple unique random cards
function getRandomCards(count) {
    const allCards = getAllCards();
    const shuffled = [...allCards].sort(() => Math.random() - 0.5);
    const selectedCards = shuffled.slice(0, count);
    
    // Check if reversals are enabled
    const reversalsEnabled = localStorage.getItem('reversalsEnabled') === 'true';
    
    // Apply reversals to each card if enabled
    return selectedCards.map(card => {
        const isReversed = reversalsEnabled && Math.random() < 0.5;
        return getCardData(card, isReversed);
    });
}
// Pixel Arcana - Main Application Logic

// LocalStorage keys
const STORAGE_KEYS = {
    DAILY_DRAWS: 'pixelArcana_dailyDraws',
    SPREADS: 'pixelArcana_spreads'
};

// Get today's date as a string (YYYY-MM-DD)
function getTodayString() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

// Get stored daily draws
function getDailyDraws() {
    const stored = localStorage.getItem(STORAGE_KEYS.DAILY_DRAWS);
    return stored ? JSON.parse(stored) : {};
}

// Journal Entry Functions
function saveJournalEntry(dateString, entry) {
    if (!entry || entry.trim() === '') return; // Don't save empty entries
    
    const journals = getJournalEntries();
    if (!journals[dateString]) {
        journals[dateString] = [];
    }
    
    // Add new entry with timestamp
    const timestamp = new Date().toLocaleString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
    });
    
    journals[dateString].push({
        text: entry.trim(),
        timestamp: timestamp,
        datetime: new Date().toISOString()
    });
    
    localStorage.setItem('pixelArcanaJournals', JSON.stringify(journals));
}

function getJournalEntries() {
    const journals = localStorage.getItem('pixelArcanaJournals');
    return journals ? JSON.parse(journals) : {};
}

function getJournalEntriesForDate(dateString) {
    const journals = getJournalEntries();
    const entries = journals[dateString];
    
    // Handle legacy format (single string) vs new format (array)
    if (!entries) {
        return [];
    }
    
    // If it's a string (old format), convert to new format
    if (typeof entries === 'string') {
        return entries.trim() ? [{
            text: entries,
            timestamp: 'Earlier',
            datetime: new Date().toISOString()
        }] : [];
    }
    
    // If it's already an array, return it
    if (Array.isArray(entries)) {
        return entries;
    }
    
    // Fallback
    return [];
}

// Save a daily draw - store only the card name and reversal status, not full data
function saveDailyDraw(dateString, card) {
    const draws = getDailyDraws();
    // Store only reference info, not the full card object
    draws[dateString] = {
        name: card.name,
        reversed: card.reversed || false
    };
    localStorage.setItem(STORAGE_KEYS.DAILY_DRAWS, JSON.stringify(draws));
}

// Check if a draw exists for today
function hasTodaysDraw() {
    const draws = getDailyDraws();
    return draws.hasOwnProperty(getTodayString());
}

// Get today's draw if it exists - reconstruct full card from stored reference
function getTodaysDraw() {
    const draws = getDailyDraws();
    const storedCard = draws[getTodayString()];
    
    if (!storedCard) return null;
    
    // Find the current version of this card in the deck
    const allCards = getAllCards();
    const baseCard = allCards.find(c => c.name === storedCard.name);
    
    if (!baseCard) return null;
    
    // Return with reversal status preserved
    return getCardData(baseCard, storedCard.reversed);
}

// Display a card in simplified format for spreads (clickable to open modal)
function displayCardSimplified(card, containerId, positionLabel = '') {
    const container = document.getElementById(containerId);
    
    if (!card || !card.game) {
        container.innerHTML = `<div class="card-display">Card not available</div>`;
        return;
    }
    
    // Process keywords and meaning
    let shortKeywords = '';
    if (card.keywords) {
        const keywordArray = card.keywords.split(' • ');
        shortKeywords = keywordArray.slice(0, 3).join(' • ');
    }
    
    // Get first sentence of meaning
    const meaning = card.gameDescription || card.meaning || '';
    const cleanMeaningForSummary = meaning.replace(/<spoiler>.*?<\/spoiler>/g, '[spoiler]').replace(/<span class="spoiler">.*?<\/span>/g, '[spoiler]');
    const summary = cleanMeaningForSummary.split('.')[0] + '.';
    
    container.innerHTML = `
        <div class="card-display spread-card-simplified" onclick="openCardModal(${JSON.stringify(card).replace(/"/g, '&quot;')}, '${positionLabel}')">
            ${positionLabel ? `<div class="spread-position">${positionLabel}</div>` : ''}
            ${card.reversed ? `<div class="reversed-indicator">⟲ Reversed</div>` : ''}
            <div class="card-header">
                <img 
                    src="assets/card-images/${card.name.toLowerCase().replace(/ /g, '-').replace(/'/g, '')}${card.reversed ? '-reversed' : ''}.png" 
                    alt="${card.name}${card.reversed ? ' (Reversed)' : ''}" 
                    class="custom-card-image"
                    onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
                    onload="this.style.display='block'; this.nextElementSibling.style.display='none';"
                >
                <div class="card-text-fallback">
                    <div class="card-name">${card.name}</div>
                    <div class="card-game">🎮 ${card.game} 🎮</div>
                </div>
            </div>
            ${shortKeywords ? `<div class="card-keywords-short">${shortKeywords}</div>` : ''}
            <div class="card-summary">${summary}</div>
            <div class="click-for-more">Click for full details ▼</div>
        </div>
    `;
}

// Display a card
function displayCard(card, containerId, additionalInfo = '') {
    const container = document.getElementById(containerId);
    
    // If card is incomplete, try to find it in the deck by name
    if (!card || !card.game || (!card.meaning && !card.upright)) {
        // Try to find the card in the full deck
        if (card && card.name) {
            const allCards = getAllCards();
            const fullCard = allCards.find(c => c.name === card.name);
            if (fullCard) {
                card = fullCard;
            } else {
                container.innerHTML = `
                    <div class="card-display">
                        <div class="card-name">Card data not yet available</div>
                        <div class="info-text">This card is still being populated with its video game assignment and meaning. Check back soon!</div>
                    </div>
                `;
                return;
            }
        } else {
            container.innerHTML = `
                <div class="card-display">
                    <div class="card-name">Card data not yet available</div>
                    <div class="info-text">This card is still being populated with its video game assignment and meaning. Check back soon!</div>
                </div>
            `;
            return;
        }
    }
    
    // Support both old (upright) and new (separate fields) data structures
    let gameDescription, meaning, reflections, otherExamples;
    
    if (card.gameDescription) {
        // New structure - ensure clean formatting and process spoilers
        gameDescription = processSpoilerTags(card.gameDescription.trim());
        meaning = processSpoilerTags(card.meaning.trim());
        reflections = processSpoilerTags(card.reflections.trim());
        // Process other examples with boxart integration
        otherExamples = card.otherExamples ? processOtherExamples(card.otherExamples.trim()) : '';
    } else {
        // Old structure - parse the upright content
        const sections = card.upright.split('\n\n');
        gameDescription = processSpoilerTags((sections[0] || '').trim());
        meaning = processSpoilerTags((sections[1] || '').trim());
        const reflectionsText = (sections.slice(2).join('\n\n') || '').trim();
        reflections = processSpoilerTags(reflectionsText.replace('Reflections:', '').trim());
        otherExamples = '';
    }
    
    // Create a short summary from the meaning (first sentence) - remove spoiler tags from summary
    const cleanMeaningForSummary = meaning.replace(/<span class="spoiler">.*?<\/span>/g, '[spoiler]');
    const summary = cleanMeaningForSummary.split('.')[0] + '.';
    
    // Process keywords if they exist
    let shortKeywords = '';
    let fullKeywords = '';
    if (card.keywords) {
        const keywordArray = card.keywords.split(' • ');
        shortKeywords = keywordArray.slice(0, 3).join(' • ');
        fullKeywords = card.keywords;
    }
    
    // Try to get game data from database first, fall back to card data
    let gameData = null;
    if (typeof getGameData !== 'undefined' && card.game) {
        gameData = getGameData(card.game);
    }
    
    // Build media section for game description if assets exist
    let boxartMedia = '';
    let gifMedia = '';
    
    // Check database first, then card data
    const boxartUrl = (gameData && gameData.boxart) || card.boxart || '';
    if (boxartUrl && boxartUrl !== '') {
        boxartMedia = `<div class="game-media" onclick="openGameDeepDive('${card.game.replace(/'/g, "\\'")}'); event.stopPropagation();" style="cursor: pointer;">
            <img src="${boxartUrl}" alt="${card.game} box art" class="box-art">
        </div>`;
    }
    
    // Check database for screenshot too
    const gameplayGifUrl = (gameData && gameData.screenshot) || card.screenshot || '';
    if (gameplayGifUrl && gameplayGifUrl !== '') {
        gifMedia = `<div class="game-media"><img src="${gameplayGifUrl}" alt="${card.game} gameplay" class="gameplay-gif"></div>`;
    }
    
    // Build game stats table - use database data if available, otherwise use card data
    // Handle both array format (new) and string format (old) for backward compatibility
    const developer = (gameData && gameData.developers) || card.developer;
    
    // Publishers: handle array or string
    let publishers = (gameData && gameData.publishers) || (gameData && gameData.publisher) || card.publishers || card.publisher;
    if (Array.isArray(publishers)) {
        publishers = publishers.join(', ');
    }
    
    // Platforms: handle array or string
    let platforms = (gameData && gameData.platforms) || (gameData && gameData.platform) || card.platforms || card.platform;
    if (Array.isArray(platforms)) {
        platforms = platforms.join(', ');
    }
    
    // Genres: handle array or string
    let genres = (gameData && gameData.genres) || card.genres;
    if (Array.isArray(genres)) {
        genres = genres.join(', ');
    }
    
    const releaseYear = (gameData && gameData.releaseYear) || card.releaseYear;
    const funFact = (gameData && gameData.funFact) || card.funFact;
    
    let gameStats = '';
    if (developer || publishers || platforms || genres || releaseYear || funFact) {
        gameStats = '<div class="game-stats"><div class="game-stats-grid">';
        
        if (developer) {
            gameStats += `<div class="stat-label">Developer:</div><div class="stat-value">${developer}</div>`;
        }
        if (publishers) {
            gameStats += `<div class="stat-label">Publisher:</div><div class="stat-value">${publishers}</div>`;
        }
        if (platforms) {
            gameStats += `<div class="stat-label">Platform:</div><div class="stat-value">${platforms}</div>`;
        }
        if (genres) {
            gameStats += `<div class="stat-label">Genre:</div><div class="stat-value">${genres}</div>`;
        }
        if (releaseYear) {
            gameStats += `<div class="stat-label">First Released:</div><div class="stat-value">${releaseYear}</div>`;
        }
        
        gameStats += '</div>';
        
        if (funFact) {
            gameStats += `<div class="fun-fact"><strong>Fun Fact:</strong> ${funFact}</div>`;
        }
        
        // Add game summary if available
        const gameSummary = (gameData && gameData.summary);
        if (gameSummary) {
            gameStats += `<div class="game-summary-divider"></div>`;
            gameStats += `<div class="game-summary">${gameSummary}</div>`;
        }
        
        gameStats += '</div>';
    }
    
    container.innerHTML = `
        <div class="card-display">
            ${additionalInfo ? `<div class="spread-position">${additionalInfo}</div>` : ''}
            ${card.reversed ? `<div class="reversed-indicator">⟲ Reversed</div>` : ''}
            <div class="card-header">
                <img 
                    src="assets/card-images/${card.name.toLowerCase().replace(/ /g, '-').replace(/'/g, '')}${card.reversed ? '-reversed' : ''}.png" 
                    alt="${card.name}${card.reversed ? ' (Reversed)' : ''}" 
                    class="custom-card-image"
                    onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
                    onload="this.style.display='block'; this.nextElementSibling.style.display='none';"
                >
                <div class="card-text-fallback">
                    <div class="card-name">${card.name}</div>
                    <div class="card-game" onclick="openGameDeepDive('${card.game.replace(/'/g, "\\'")}'); event.stopPropagation();" style="cursor: pointer; transition: color 0.2s;" onmouseover="this.style.color='#ff0080'" onmouseout="this.style.color='#00ff41'">🎮 ${card.game} 🎮</div>
                </div>
            </div>
            ${shortKeywords ? `<div class="card-keywords-short">${shortKeywords}</div>` : ''}
            <div class="card-summary">${summary}</div>
            
            <div class="expandable-sections">
                <button class="expand-btn" onclick="toggleSection('game-${containerId}')">
                    <span class="expand-icon">▶</span> Learn About the Game
                </button>
                <div id="game-${containerId}" class="expandable-content">
                    ${boxartMedia}
                    ${gameDescription}
                    ${gifMedia}
                    ${gameStats}
                </div>
                
                <button class="expand-btn" onclick="toggleSection('meaning-${containerId}')">
                    <span class="expand-icon">▶</span> Extended Meaning
                </button>
                <div id="meaning-${containerId}" class="expandable-content">
                    <div class="rws-card-container">
                        <img 
                            src="assets/rider-waite-smith/${card.name.toLowerCase().replace(/ /g, '-').replace(/'/g, '')}.jpg" 
                            alt="${card.name} - Rider-Waite-Smith" 
                            class="rws-card-image${card.reversed ? ' reversed' : ''}"
                            onerror="this.style.display='none';"
                        >
                    </div>
                    ${meaning}
                    ${fullKeywords ? `<div class="card-keywords-full"><strong>Keywords:</strong> ${fullKeywords}</div>` : ''}
                    ${reflections ? `<div class="card-reflections">${reflections}</div>` : ''}
                </div>
                
                <button class="expand-btn" onclick="toggleSection('reflect-${containerId}')">
                    <span class="expand-icon">▶</span> Other Game Examples
                </button>
                <div id="reflect-${containerId}" class="expandable-content">${otherExamples}</div>
            </div>
        </div>
    `;
}

// Toggle expandable sections
function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    const button = section.previousElementSibling;
    const icon = button.querySelector('.expand-icon');
    
    if (section.classList.contains('expanded')) {
        section.classList.remove('expanded');
        icon.textContent = '▶';
    } else {
        section.classList.add('expanded');
        icon.textContent = '▼';
    }
}

// Spoiler System
function initializeSpoilers() {
    // Add click handlers to all spoiler elements
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('spoiler') && !e.target.classList.contains('revealed')) {
            e.target.classList.add('revealed');
            e.stopPropagation();
        }
    });
}

// Process spoiler tags in text
function processSpoilerTags(text) {
    if (!text) return text;
    // Replace <spoiler> tags with styled spans
    return text.replace(/<spoiler>(.*?)<\/spoiler>/g, '<span class="spoiler">$1</span>');
}

// Process other examples with boxart
function processOtherExamples(otherExamplesText) {
    if (!otherExamplesText) return '';
    
    // Split by bullet points
    const examples = otherExamplesText.split('•').filter(ex => ex.trim());
    
    let html = '';
    examples.forEach(example => {
        // Extract game title from <strong> tags
        const titleMatch = example.match(/<strong>(.*?)<\/strong>/);
        if (!titleMatch) {
            // If no title found, just display as-is
            html += `<div class="other-example-item"><div class="other-example-content">${example.trim()}</div></div>`;
            return;
        }
        
        const gameTitle = titleMatch[1];
        const content = example.trim();
        
        // Make the game title clickable
        const clickableContent = content.replace(
            /<strong>(.*?)<\/strong>/,
            `<strong class="clickable-game-title" onclick="openGameDeepDive('${gameTitle.replace(/'/g, "\\'")}'); event.stopPropagation();" style="cursor: pointer; transition: color 0.2s;" onmouseover="this.style.color='#ff0080'" onmouseout="this.style.color='#00ff41'">$1</strong>`
        );
        
        // Try to get game data from database
        let boxartHtml = '';
        if (typeof getGameData !== 'undefined') {
            const gameData = getGameData(gameTitle);
            if (gameData && gameData.boxart) {
                boxartHtml = `
                    <div class="other-example-boxart" onclick="openGameDeepDive('${gameTitle.replace(/'/g, "\\'")}'); event.stopPropagation();" style="cursor: pointer;">
                        <img src="${gameData.boxart}" alt="${gameTitle} box art" onerror="this.parentElement.style.display='none'">
                    </div>
                `;
            }
        }
        
        html += `
            <div class="other-example-item">
                ${boxartHtml}
                <div class="other-example-content">• ${clickableContent}</div>
            </div>
        `;
    });
    
    return html;
}

// Draw daily card
function drawDailyCard() {
    const container = document.getElementById('dailyCardContainer');
    const buttonContainer = document.querySelector('.draw-button-container');
    
    // Check if already drawn today
    if (hasTodaysDraw()) {
        const todaysCard = getTodaysDraw();
        buttonContainer.style.display = 'none';
        container.innerHTML = '<h3 style="text-align: center; color: #ff0080; margin: 20px 0; font-size: 0.8rem;">Today\'s Card</h3>';
        displayCard(todaysCard, 'dailyCardContainer');
        addDailyJournalSection(getTodayString());
        return;
    }
    
    // Draw a new card
    const baseCard = getRandomCard();
    
    // Check if reversals are enabled
    const reversalsEnabled = localStorage.getItem('reversalsEnabled') === 'true';
    const isReversed = reversalsEnabled && Math.random() < 0.5;
    
    // Get the card data (with reversal if applicable)
    const card = getCardData(baseCard, isReversed);
    
    saveDailyDraw(getTodayString(), card);
    
    // Hide the button and show header
    buttonContainer.style.display = 'none';
    container.innerHTML = '<h3 style="text-align: center; color: #ff0080; margin-bottom: 20px; font-size: 0.8rem;">Today\'s Card</h3>';
    displayCard(card, 'dailyCardContainer');
    addDailyJournalSection(getTodayString());
}

// Add journal section for daily draw
function addDailyJournalSection(dateString) {
    const container = document.getElementById('dailyCardContainer');
    
    if (!container) {
        console.error('dailyCardContainer not found');
        return;
    }
    
    // Check if journal section already exists
    const existingJournal = container.querySelector('.journal-section');
    if (existingJournal) {
        console.log('Journal section already exists');
        return;
    }
    
    const journals = getJournalEntries();
    const todayJournals = journals[dateString] || [];
    
    const formattedDate = new Date(dateString).toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
    
    // Build previous entries HTML
    let previousEntriesHTML = '';
    if (todayJournals.length > 0) {
        previousEntriesHTML = '<div class="previous-entries"><h4>Previous Entries:</h4>';
        todayJournals.forEach(entry => {
            previousEntriesHTML += `
                <div class="journal-entry-box">
                    <div class="journal-entry-timestamp">${entry.timestamp}</div>
                    <div class="journal-entry-text">${entry.text}</div>
                </div>
            `;
        });
        previousEntriesHTML += '</div>';
    }
    
    let journalHTML = `
        <div class="journal-section">
            <h3>✏️ Journal Entry ✏️</h3>
            <div class="journal-date">${formattedDate}</div>
            ${previousEntriesHTML}
            <div class="new-entry-label">Add New Entry:</div>
            <textarea 
                class="journal-textarea" 
                id="dailyJournalInput"
                placeholder="Reflect on this card's message and how it relates to your day..."
            ></textarea>
            <button class="save-journal-btn" onclick="saveDailyJournal('${dateString}')">Save Journal Entry</button>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', journalHTML);
    console.log('Journal section added to daily draw');
}

// Save journal entry from daily draw
function saveDailyJournal(dateString) {
    const textarea = document.getElementById('dailyJournalInput');
    const entry = textarea.value;
    
    if (!entry || entry.trim() === '') {
        alert('Please write something before saving!');
        return;
    }
    
    saveJournalEntry(dateString, entry);
    
    // Clear the textarea
    textarea.value = '';
    
    // Refresh the journal section
    const journalSection = document.querySelector('.journal-section');
    if (journalSection) {
        journalSection.remove();
    }
    addDailyJournalSection(dateString);
}

// Draw 3-card spread
// Spread configurations
const SPREAD_CONFIGS = {
    'one-question': {
        name: 'One Question',
        description: 'Draw a single card for guidance on a specific question',
        positions: ['Answer'],
        count: 1
    },
    'past-present-future': {
        name: 'Past • Present • Future',
        description: 'Understand where you\'ve been, where you are, and where you\'re heading',
        positions: ['Past', 'Present', 'Future'],
        count: 3
    },
    'stop-start-continue': {
        name: 'Stop • Start • Continue',
        description: 'What should you stop doing, start doing, and keep doing?',
        positions: ['Stop', 'Start', 'Continue'],
        count: 3
    },
    'mind-body-spirit': {
        name: 'Mind • Body • Spirit',
        description: 'Check in with your mental, physical, and spiritual well-being',
        positions: ['Mind', 'Body', 'Spirit'],
        count: 3
    },
    'celtic-cross': {
        name: 'Celtic Cross',
        description: 'A comprehensive 10-card spread for deep insight',
        positions: [
            'Present Situation',
            'Challenge/Obstacle',
            'Distant Past/Foundation',
            'Recent Past',
            'Best Outcome',
            'Near Future',
            'Your Approach',
            'External Influences',
            'Hopes & Fears',
            'Final Outcome'
        ],
        count: 10
    }
};

// Update spread info text based on selection
function updateSpreadInfo() {
    const select = document.getElementById('spreadType');
    const infoText = document.getElementById('spreadInfoText');
    const config = SPREAD_CONFIGS[select.value];
    
    if (config) {
        infoText.textContent = `✨ ${config.description} ✨`;
    }
}

// Main draw spread function
function drawSpread() {
    const select = document.getElementById('spreadType');
    const spreadType = select.value;
    const config = SPREAD_CONFIGS[spreadType];
    
    if (!config) return;
    
    const container = document.getElementById('spreadContainer');
    const cards = getRandomCards(config.count);
    
    container.innerHTML = '';
    
    // Use simplified display for all spreads - click to open modal
    container.className = 'spread-container';
    cards.forEach((card, index) => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'spread-card';
        cardDiv.id = `spread-card-${index}`;
        container.appendChild(cardDiv);
        
        displayCardSimplified(card, `spread-card-${index}`, config.positions[index]);
    });
}

// Legacy function for backwards compatibility
function drawThreeCardSpread() {
    document.getElementById('spreadType').value = 'past-present-future';
    updateSpreadInfo();
    drawSpread();
}

// Show different views
function showView(viewName) {
    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.nav-buttons button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected view
    document.getElementById(viewName).classList.add('active');
    
    // Add active class to clicked button
    const buttonMap = {
        'daily': 'dailyBtn',
        'spread': 'spreadBtn',
        'calendar': 'calendarBtn',
        'gallery': 'galleryBtn',
        'gameIndex': 'gameIndexBtn',
        'settings': 'settingsBtn'
    };
    document.getElementById(buttonMap[viewName]).classList.add('active');
    
    // Special handling for calendar view
    if (viewName === 'calendar') {
        renderCalendar();
    }
    
    // Special handling for gallery view
    if (viewName === 'gallery') {
        renderGallery('all');
    }
    
    // Special handling for game index view
    if (viewName === 'gameIndex') {
        renderGameIndex();
    }
    
    // Special handling for settings view
    if (viewName === 'settings') {
        loadSettings();
    }
}

// Calendar state
let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth();

// Change calendar month
function changeMonth(delta) {
    calendarMonth += delta;
    
    if (calendarMonth > 11) {
        calendarMonth = 0;
        calendarYear++;
    } else if (calendarMonth < 0) {
        calendarMonth = 11;
        calendarYear--;
    }
    
    renderCalendar();
}

// Calculate suit distribution for current month view
function calculateMonthStats() {
    const draws = getDailyDraws();
    const stats = {
        major: 0,
        wands: 0,
        cups: 0,
        swords: 0,
        pentacles: 0,
        total: 0
    };
    
    // Filter draws for current month/year
    Object.keys(draws).forEach(dateString => {
        const date = new Date(dateString + 'T00:00:00');
        if (date.getMonth() === calendarMonth && date.getFullYear() === calendarYear) {
            const cardName = draws[dateString].name;
            stats.total++;
            
            // Check if it's in major arcana
            if (tarotDeck.majorArcana.some(c => c.name === cardName)) {
                stats.major++;
            }
            // Check each minor arcana suit
            else if (tarotDeck.minorArcana.wands.some(c => c.name === cardName)) {
                stats.wands++;
            }
            else if (tarotDeck.minorArcana.cups.some(c => c.name === cardName)) {
                stats.cups++;
            }
            else if (tarotDeck.minorArcana.swords.some(c => c.name === cardName)) {
                stats.swords++;
            }
            else if (tarotDeck.minorArcana.pentacles.some(c => c.name === cardName)) {
                stats.pentacles++;
            }
        }
    });
    
    return stats;
}

// Render stats display
function renderCalendarStats() {
    const container = document.getElementById('calendarStats');
    const stats = calculateMonthStats();
    
    if (stats.total === 0) {
        container.innerHTML = '<div class="no-draws-message">No draws recorded for this month yet</div>';
        return;
    }
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    
    let html = `
        <h3>📊 ${monthNames[calendarMonth]} ${calendarYear} Statistics 📊</h3>
        <div class="stats-grid">
    `;
    
    // Create stat rows for each category
    const categories = [
        { key: 'major', label: 'Major Arcana', class: 'major' },
        { key: 'wands', label: 'Wands', class: 'wands' },
        { key: 'cups', label: 'Cups', class: 'cups' },
        { key: 'swords', label: 'Swords', class: 'swords' },
        { key: 'pentacles', label: 'Pentacles', class: 'pentacles' }
    ];
    
    categories.forEach(category => {
        const count = stats[category.key];
        const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
        
        html += `
            <div class="stat-row">
                <div class="stat-label">
                    <span class="stat-name">${category.label}</span>
                    <span class="stat-count">${count} / ${stats.total}</span>
                </div>
                <div class="stat-bar-container">
                    <div class="stat-bar ${category.class}" style="width: ${percentage}%"></div>
                    <span class="stat-percentage">${percentage}%</span>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Render calendar
function renderCalendar() {
    const container = document.getElementById('calendarGrid');
    const monthDisplay = document.getElementById('currentMonth');
    const draws = getDailyDraws();
    
    // Use calendar state instead of today
    const today = new Date();
    const currentMonth = calendarMonth;
    const currentYear = calendarYear;
    
    // Get first day of month and total days
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    // Month name
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    
    // Update the month display in the header
    if (monthDisplay) {
        monthDisplay.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    }
    
    let html = `<div class="calendar">`;
    
    // Day headers
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayNames.forEach(day => {
        html += `<div class="calendar-header">${day}</div>`;
    });
    
    // Empty cells before first day
    for (let i = 0; i < startingDayOfWeek; i++) {
        html += '<div class="calendar-day" style="opacity: 0.3;"></div>';
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hasDraw = draws.hasOwnProperty(dateString);
        // Check if this day is actually today (same date, month, and year)
        const isToday = day === today.getDate() && 
                       currentMonth === today.getMonth() && 
                       currentYear === today.getFullYear();
        
        let classes = 'calendar-day';
        if (hasDraw) classes += ' has-draw';
        if (isToday) classes += ' today';
        
        let cardInfo = '';
        if (hasDraw) {
            const card = draws[dateString];
            cardInfo = `<div class="day-card">${card.name}</div>`;
        }
        
        html += `
            <div class="${classes}" onclick="showDayDetails('${dateString}')">
                <div class="day-number">${day}</div>
                ${cardInfo}
            </div>
        `;
    }
    
    html += '</div>';
    container.innerHTML = html;
    
    // Render stats for the current month
    renderCalendarStats();
}

// Show details for a specific day
function showDayDetails(dateString) {
    const draws = getDailyDraws();
    const storedCard = draws[dateString];
    
    if (!storedCard) {
        alert('No card drawn for this day.');
        return;
    }
    
    // Reconstruct the full card from the stored reference
    const allCards = getAllCards();
    const baseCard = allCards.find(c => c.name === storedCard.name);
    
    if (!baseCard) {
        alert('Card data not available.');
        return;
    }
    
    // Get the card with reversal status preserved
    const card = getCardData(baseCard, storedCard.reversed);
    
    const date = new Date(dateString + 'T00:00:00');
    const formattedDate = date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    // Open the modal with the card and journal
    openCardModalWithJournal(card, dateString, formattedDate);
}

// Open card modal with journal section
function openCardModalWithJournal(card, dateString, formattedDate) {
    const modal = document.getElementById('cardModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    modalTitle.textContent = card.name;
    
    // Display the card
    modalBody.innerHTML = '';
    const tempContainer = document.createElement('div');
    tempContainer.id = 'modal-card-display';
    modalBody.appendChild(tempContainer);
    
    displayCard(card, 'modal-card-display');
    
    // Add journal section
    const previousEntries = getJournalEntriesForDate(dateString);
    const journalSection = document.createElement('div');
    journalSection.className = 'journal-section';
    
    let previousEntriesHTML = '';
    if (previousEntries.length > 0) {
        previousEntriesHTML = '<div class="previous-entries"><h4>Previous Entries</h4>';
        previousEntries.forEach((entry, index) => {
            previousEntriesHTML += `
                <div class="journal-entry-box">
                    <div class="journal-entry-timestamp">${entry.timestamp}</div>
                    <div class="journal-entry-text">${entry.text}</div>
                </div>
            `;
        });
        previousEntriesHTML += '</div>';
    }
    
    journalSection.innerHTML = `
        <h3>✏️ Journal Entry ✏️</h3>
        <div class="journal-date">${formattedDate}</div>
        ${previousEntriesHTML}
        <div class="new-entry-label">Add New Entry:</div>
        <textarea 
            class="journal-textarea" 
            id="journalTextarea"
            placeholder="Reflect on this card's message and how it relates to your day..."
        ></textarea>
        <button class="save-journal-btn" onclick="saveJournal('${dateString}')">Save Journal Entry</button>
    `;
    modalBody.appendChild(journalSection);
    
    modal.style.display = 'block';
}

// Save journal entry
function saveJournal(dateString) {
    const textarea = document.getElementById('journalTextarea');
    const entry = textarea.value;
    
    if (!entry || entry.trim() === '') {
        alert('Please write something before saving!');
        return;
    }
    
    saveJournalEntry(dateString, entry);
    
    // Clear the textarea
    textarea.value = '';
    
    // Show confirmation
    const btn = document.querySelector('.save-journal-btn');
    const originalText = btn.textContent;
    btn.textContent = '✓ Saved!';
    btn.style.background = '#00ff41';
    btn.style.color = '#0f0f1e';
    
    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
        btn.style.color = '';
        
        // Reload the modal to show the new entry
        const modal = document.getElementById('cardModal');
        const draws = getDailyDraws();
        const card = draws[dateString];
        const date = new Date(dateString + 'T00:00:00');
        const formattedDate = date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        openCardModalWithJournal(card, dateString, formattedDate);
    }, 1500);
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded fired');
    
    // Check if there's already a draw for today and display it
    if (hasTodaysDraw()) {
        console.log('Has today\'s draw - loading card');
        
        const container = document.getElementById('dailyCardContainer');
        const buttonContainer = document.querySelector('.draw-button-container');
        const todaysCard = getTodaysDraw();
        
        console.log('Container found:', container);
        console.log('Today\'s card:', todaysCard);
        
        // Hide the draw button
        if (buttonContainer) {
            buttonContainer.style.display = 'none';
            console.log('Draw button hidden');
        }
        
        // Display card first (this will set container.innerHTML)
        displayCard(todaysCard, 'dailyCardContainer');
        console.log('Card displayed');
        
        // Then prepend the header
        const header = '<h3 style="text-align: center; color: #ff0080; margin: 20px 0; font-size: 0.8rem;">Today\'s Card</h3>';
        container.insertAdjacentHTML('afterbegin', header);
        console.log('Header added');
        
        // Add journal section at the end
        console.log('About to call addDailyJournalSection with date:', getTodayString());
        addDailyJournalSection(getTodayString());
        console.log('Finished calling addDailyJournalSection');
    } else {
        console.log('No draw for today yet');
    }
});

// Gallery Functions
let currentFilter = 'all';

function filterGallery(filter) {
    currentFilter = filter;
    
    // Update button states
    document.querySelectorAll('.gallery-filters button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`filter-${filter}`).classList.add('active');
    
    // Render gallery with filter
    renderGallery(filter);
}

// Gallery search function
function searchGallery(searchTerm) {
    window.gallerySearchTerm = searchTerm.toLowerCase().trim();
    const currentFilter = document.querySelector('.gallery-filters button.active')?.id.replace('filter-', '') || 'all';
    renderGallery(currentFilter);
}

function renderGallery(filter) {
    const container = document.getElementById('galleryGrid');
    const orientation = window.galleryOrientation || 'upright'; // Default to upright
    const searchTerm = window.gallerySearchTerm || '';
    let cardsToShow = [];

    if (filter === 'all') {
        cardsToShow = getAllCards();
    } else if (filter === 'major') {
        cardsToShow = tarotDeck.majorArcana || [];
     } else if (filter === 'wands') {
        cardsToShow = (tarotDeck.minorArcana?.wands) || [];
    } else if (filter === 'cups') {
        cardsToShow = (tarotDeck.minorArcana?.cups) || [];
    } else if (filter === 'swords') {
        cardsToShow = (tarotDeck.minorArcana?.swords) || [];
    } else if (filter === 'pentacles') {
        cardsToShow = (tarotDeck.minorArcana?.pentacles) || [];
    }
    
    // Apply search filter
    if (searchTerm) {
        cardsToShow = cardsToShow.filter(card => {
            const cardName = card.name.toLowerCase();
            const gameName = card.game.toLowerCase();
            const keywords = (card.keywords || '').toLowerCase();
            return cardName.includes(searchTerm) || 
                   gameName.includes(searchTerm) || 
                   keywords.includes(searchTerm);
        });
    }

    container.innerHTML = '';
    
    // Show message if no results
    if (cardsToShow.length === 0) {
        container.innerHTML = '<div class="info-text">No cards found matching your search.</div>';
        return;
    }

    // Handle orientation filtering
    if (orientation === 'upright') {
        // Show upright cards only
        cardsToShow.forEach((card) => {
            const cardDiv = createGalleryCard(card, false);
            container.appendChild(cardDiv);
        });
    } else if (orientation === 'reversed') {
        // Show reversed cards only (if they exist)
        cardsToShow.forEach((card) => {
            if (reversalData[card.name]) {
                const reversedCard = getCardData(card, true);
                const cardDiv = createGalleryCard(reversedCard, true);
                container.appendChild(cardDiv);
            }
        });
    } else if (orientation === 'both') {
        // Show both upright and reversed
        cardsToShow.forEach((card) => {
            // Upright version
            const uprightDiv = createGalleryCard(card, false);
            container.appendChild(uprightDiv);
            
            // Reversed version if it exists
            if (reversalData[card.name]) {
                const reversedCard = getCardData(card, true);
                const reversedDiv = createGalleryCard(reversedCard, true);
                container.appendChild(reversedDiv);
            }
        });
    }
}

function createGalleryCard(card, isReversed) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'gallery-card';
    cardDiv.onclick = () => openCardModal(card);

    const slug = card.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const imagePath = `assets/card-images/${slug}${isReversed ? '-reversed' : ''}.png`;

    cardDiv.innerHTML = `
        <img
            src="${imagePath}"
            alt="${card.name}${isReversed ? ' (Reversed)' : ''}"
            class="gallery-card-image"
            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
            onload="this.style.display='block'; this.nextElementSibling.style.display='none';"
        >
        <div class="gallery-card-text">
            <div class="gallery-card-name">${card.name}</div>
            <div class="gallery-card-game">🎮 ${card.game} 🎮</div>
        </div>
    `;
    
    return cardDiv;
}

function setGalleryOrientation(orientation) {
    window.galleryOrientation = orientation;
    
    // Update button states
    document.querySelectorAll('.orientation-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`orientation-${orientation}`).classList.add('active');
    
    // Re-render with current filter
    const currentFilter = document.querySelector('.gallery-filters button.active')?.id.replace('filter-', '') || 'all';
    renderGallery(currentFilter);
}

function openCardModal(card) {
    const modal = document.getElementById('cardModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    modalTitle.textContent = card.name;
    
    // Use the same displayCard function but in a modal context
    modalBody.innerHTML = '';
    const tempContainer = document.createElement('div');
    tempContainer.id = 'modal-card-display';
    modalBody.appendChild(tempContainer);
    
    displayCard(card, 'modal-card-display');
    
    modal.style.display = 'block';
}

function closeModal() {
    const modal = document.getElementById('cardModal');
    modal.style.display = 'none';
}

// Game Deep Dive Modal
function openGameDeepDive(gameName) {
    const modal = document.getElementById('cardModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    modalTitle.textContent = gameName;
    
    // Gather all appearances of this game across the deck
    const appearances = findGameAppearances(gameName);
    
    // Get game data from database
    let gameData = null;
    if (typeof getGameData !== 'undefined') {
        gameData = getGameData(gameName);
    }
    
    // Build the deep dive content
    let html = '<div class="game-deep-dive">';
    
    // Game header with media
    if (gameData) {
        html += '<div class="game-deep-dive-header">';
        
        // Media section with boxart and screenshot
        html += '<div class="game-deep-dive-media-section">';
        if (gameData.boxart) {
            html += `<div class="game-deep-dive-media">
                <img src="${gameData.boxart}" alt="${gameName}" class="game-deep-dive-boxart">
            </div>`;
        }
        
        // Show screenshot if available
        if (gameData.screenshot) {
            html += `<div class="game-deep-dive-media">
                <img src="${gameData.screenshot}" alt="${gameName} gameplay" class="game-deep-dive-screenshot">
            </div>`;
        }
        html += '</div>'; // Close media section
        
        if (gameData.summary) {
            html += `<div class="game-deep-dive-summary">${gameData.summary}</div>`;
        }
        
        // Game stats grid - more comprehensive now
        html += '<div class="game-deep-dive-stats">';
        
        // Release info
        if (gameData.releaseDate || gameData.releaseYear) {
            const displayDate = gameData.releaseDate 
                ? new Date(gameData.releaseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                : gameData.releaseYear;
            html += `<div><strong>Released:</strong> ${displayDate}</div>`;
        }
        
        // Developer(s)
        if (gameData.developers && gameData.developers.length > 0) {
            html += `<div><strong>Developer:</strong> ${gameData.developers.join(', ')}</div>`;
        }
        
        // Publisher(s)
        if (gameData.publishers && gameData.publishers.length > 0) {
            html += `<div><strong>Publisher:</strong> ${gameData.publishers.join(', ')}</div>`;
        }
        
        // Platforms
        if (gameData.originalPlatform) {
            const platformDisplay = Array.isArray(gameData.originalPlatform) 
                ? gameData.originalPlatform.join(', ') 
                : gameData.originalPlatform;
            html += `<div><strong>Original Platform:</strong> ${platformDisplay}</div>`;
        }
        
        if (gameData.platforms && gameData.platforms.length > 0 && 
            JSON.stringify(gameData.platforms) !== JSON.stringify(gameData.originalPlatform)) {
            html += `<div><strong>Available On:</strong> ${gameData.platforms.join(', ')}</div>`;
        }
        
        // Series
        if (gameData.series) html += `<div><strong>Series:</strong> ${gameData.series}</div>`;
        
        // Genre(s)
        if (gameData.genres && gameData.genres.length > 0) {
            html += `<div><strong>Genre:</strong> ${Array.isArray(gameData.genres) ? gameData.genres.join(', ') : gameData.genres}</div>`;
        }
        
        // Players
        if (gameData.players) {
            html += `<div><strong>Players:</strong> ${gameData.players}</div>`;
        }
        
        // Game length
        if (gameData.gameLength) {
            html += `<div><strong>Length:</strong> ${gameData.gameLength}</div>`;
        }
        
        // ESRB rating
        if (gameData.esrb) {
            const esrbLower = gameData.esrb.toLowerCase();
            html += `<div class="esrb-rating-display">
                <strong>ESRB:</strong> 
                <img src="assets/icons/esrb_${esrbLower}.png" alt="${gameData.esrb}" class="esrb-icon" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">
                <span class="esrb-text" style="display: none;">${gameData.esrb}</span>
            </div>`;
        }
        
        // Metacritic score
        if (gameData.metacritic) {
            const scoreColor = gameData.metacritic >= 75 ? '#00ff41' : gameData.metacritic >= 50 ? '#ffd700' : '#ff0080';
            html += `<div><strong>Metacritic:</strong> <span style="color: ${scoreColor}">${gameData.metacritic}</span></div>`;
        }
        
        html += '</div>'; // Close stats
        
        // Themes section
        if (gameData.themes && gameData.themes.length > 0) {
            html += '<div class="game-deep-dive-themes">';
            html += '<div class="themes-label">Themes:</div>';
            html += '<div class="themes-tags">';
            gameData.themes.forEach(theme => {
                const definition = themeDefinitions && themeDefinitions[theme] ? themeDefinitions[theme].definition : '';
                html += `<span class="theme-tag" 
                    data-definition="${definition.replace(/"/g, '&quot;')}"
                    data-theme="${theme.replace(/'/g, "\\'")}">${theme}</span>`;
            });
            html += '</div></div>';
        }
        
        // Where to Play section
        if (gameData.links && Object.keys(gameData.links).length > 0) {
            html += '<div class="game-deep-dive-links">';
            html += '<div class="links-label">🎮 Where to Play:</div>';
            html += '<div class="store-links">';
            
            const linkConfig = {
                steam: { label: 'Steam', icon: 'steam.svg' },
                epicGames: { label: 'Epic Games', icon: 'epic.svg' },
                gog: { label: 'GOG', icon: 'gog.svg' },
                xbox: { label: 'Xbox', icon: 'xbox.svg' },
                playstation: { label: 'PlayStation', icon: 'playstation.svg' },
                switch: { label: 'Nintendo Switch', icon: 'nintendo.svg' },
                googlePlay: { label: 'Google Play', icon: 'googlePlay.svg' },
                apple: { label: 'App Store', icon: 'apple.svg' },
                website: { label: 'Official Site', icon: null }
            };
            
            Object.entries(gameData.links).forEach(([platform, url]) => {
                if (url) {
                    const config = linkConfig[platform] || { label: platform, icon: null };
                    const iconHtml = config.icon 
                        ? `<img src="assets/icons/${config.icon}" alt="${config.label}" class="store-icon">`
                        : '';
                    html += `<a href="${url}" target="_blank" class="store-link" rel="noopener noreferrer">
                        ${iconHtml}
                        <span>${config.label}</span>
                    </a>`;
                }
            });
            
            html += '</div></div>';
        }
        
        html += '</div>'; // Close header
    }
    
    // Appearances in the deck
    html += '<div class="game-deep-dive-section">';
    html += '<h3>📇 Appears in the Deck As:</h3>';
    
    if (appearances.main.length > 0) {
        html += '<div class="game-appearances-main">';
        appearances.main.forEach(app => {
            const orientationLabel = app.reversed ? ' (Reversed)' : ' (Upright)';
            html += `
                <div class="game-appearance-item main-appearance">
                    <div class="appearance-card-name" onclick="openCardFromGame('${app.cardName}', ${app.reversed})">
                        <strong>${app.cardName}${orientationLabel}</strong> - Main Card
                    </div>
                    <div class="appearance-explanation">${app.explanation}</div>
                </div>
            `;
        });
        html += '</div>';
    }
    
    if (appearances.other.length > 0) {
        html += '<div class="game-appearances-other">';
        html += '<h4>Also Appears In:</h4>';
        appearances.other.forEach(app => {
            const orientationLabel = app.reversed ? ' (Reversed)' : ' (Upright)';
            html += `
                <div class="game-appearance-item">
                    <div class="appearance-card-name" onclick="openCardFromGame('${app.cardName}', ${app.reversed})">
                        ${app.cardName}${orientationLabel}
                    </div>
                    <div class="appearance-explanation">${app.explanation}</div>
                </div>
            `;
        });
        html += '</div>';
    }
    
    if (appearances.main.length === 0 && appearances.other.length === 0) {
        html += '<div class="no-appearances">This game does not appear in the current deck.</div>';
    }
    
    html += '</div>'; // Close appearances section
    
    // Related games (games that share cards with this one)
    const relatedGames = findRelatedGames(gameName, appearances);
    if (relatedGames.length > 0) {
        html += '<div class="game-deep-dive-section">';
        html += '<h3>🎮 Related Games (Share Cards):</h3>';
        html += '<div class="related-games-grid">';
        
        relatedGames.slice(0, 6).forEach(related => {
            html += `
                <div class="related-game-item" onclick="openGameDeepDive('${related.game}')">
                    <div class="related-game-name">${related.game}</div>
                    <div class="related-game-shared">${related.sharedCards.length} shared card${related.sharedCards.length > 1 ? 's' : ''}</div>
                </div>
            `;
        });
        
        html += '</div></div>';
    }
    
    // Games in the same series
    if (gameData && gameData.series) {
        const seriesGames = findGamesInSeries(gameData.series, gameName);
        if (seriesGames.length > 0) {
            html += '<div class="game-deep-dive-section">';
            html += `<h3>📚 Other ${gameData.series} Games in Deck:</h3>`;
            html += '<div class="series-games-list">';
            
            seriesGames.forEach(seriesGame => {
                html += `
                    <div class="series-game-item" onclick="openGameDeepDive('${seriesGame}')">
                        ${seriesGame}
                    </div>
                `;
            });
            
            html += '</div></div>';
        }
    }
    
    // Your draw history with this game
    const drawHistory = findGameInDrawHistory(gameName);
    if (drawHistory.length > 0) {
        html += '<div class="game-deep-dive-section">';
        html += '<h3>🗓️ Your Draw History:</h3>';
        html += `<div class="draw-history-note">You've drawn cards featuring this game ${drawHistory.length} time${drawHistory.length > 1 ? 's' : ''}:</div>`;
        html += '<div class="draw-history-list">';
        
        drawHistory.forEach(draw => {
            const date = new Date(draw.date + 'T00:00:00');
            const formattedDate = date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
            });
            html += `
                <div class="draw-history-item" onclick="showDayDetails('${draw.date}')">
                    <span class="draw-date">${formattedDate}</span> - ${draw.cardName}${draw.reversed ? ' (Reversed)' : ''}
                </div>
            `;
        });
        
        html += '</div></div>';
    }
    
    html += '</div>'; // Close game-deep-dive
    
    modalBody.innerHTML = html;
    modal.style.display = 'block';
}

// Filter games by theme tag
function filterGamesByTheme(themeName) {
    // Close the game modal
    closeModal();
    
    // Switch to Game Index view
    showView('gameIndex');
    
    // Clear other filters
    document.getElementById('decadeFilter').value = 'all';
    document.getElementById('genreFilter').value = 'all';
    const themeFilterElement = document.getElementById('themeFilter');
    if (themeFilterElement) {
        themeFilterElement.value = 'all';
    }
    document.getElementById('platformFilter').value = 'all';
    
    // Clear search
    document.getElementById('gameIndexSearch').value = '';
    window.gameIndexSearchTerm = '';
    
    // Set theme filter (using the global var instead of dropdown)
    window.gameIndexThemeFilter = themeName;
    
    // Render filtered results
    renderGameIndex();
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Clear theme filter
function clearThemeFilter() {
    window.gameIndexThemeFilter = null;
    renderGameIndex();
}

// Helper: Find all appearances of a game in the deck
function findGameAppearances(gameName) {
    const appearances = {
        main: [],
        other: []
    };
    
    const allCards = getAllCards();
    
    // Check upright cards
    allCards.forEach(card => {
        // Check if it's the main game
        if (card.game === gameName) {
            appearances.main.push({
                cardName: card.name,
                reversed: false,
                explanation: card.gameDescription || ''
            });
        }
        
        // Check otherExamples
        if (card.otherExamples) {
            const gameMatches = card.otherExamples.match(/<strong>([^<]+)<\/strong>/g);
            if (gameMatches) {
                gameMatches.forEach(match => {
                    const extractedGame = match.replace(/<\/?strong>/g, '').trim();
                    if (extractedGame === gameName) {
                        // Extract the explanation for this game
                        const regex = new RegExp(`<strong>${gameName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<\\/strong>:[^•]*?(?=•|$)`, 's');
                        const explanationMatch = card.otherExamples.match(regex);
                        let explanation = '';
                        if (explanationMatch) {
                            explanation = explanationMatch[0]
                                .replace(/<strong>.*?<\/strong>:\s*/, '')
                                .replace(/\n\n$/, '')
                                .trim();
                        }
                        
                        appearances.other.push({
                            cardName: card.name,
                            reversed: false,
                            explanation: explanation
                        });
                    }
                });
            }
        }
    });
    
    // Check reversed cards
    if (typeof reversalData !== 'undefined') {
        Object.keys(reversalData).forEach(cardName => {
            const reversal = reversalData[cardName];
            
            // Check if it's the main game for reversal
            if (reversal.game === gameName) {
                appearances.main.push({
                    cardName: cardName,
                    reversed: true,
                    explanation: reversal.gameDescription || ''
                });
            }
            
            // Check reversed otherExamples
            if (reversal.otherExamples) {
                const gameMatches = reversal.otherExamples.match(/<strong>([^<]+)<\/strong>/g);
                if (gameMatches) {
                    gameMatches.forEach(match => {
                        const extractedGame = match.replace(/<\/?strong>/g, '').trim();
                        if (extractedGame === gameName) {
                            const regex = new RegExp(`<strong>${gameName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<\\/strong>:[^•]*?(?=•|$)`, 's');
                            const explanationMatch = reversal.otherExamples.match(regex);
                            let explanation = '';
                            if (explanationMatch) {
                                explanation = explanationMatch[0]
                                    .replace(/<strong>.*?<\/strong>:\s*/, '')
                                    .replace(/\n\n$/, '')
                                    .trim();
                            }
                            
                            appearances.other.push({
                                cardName: cardName,
                                reversed: true,
                                explanation: explanation
                            });
                        }
                    });
                }
            }
        });
    }
    
    return appearances;
}

// Helper: Find related games (share cards with this game)
function findRelatedGames(gameName, appearances) {
    const relatedGamesMap = {};
    
    // Get all card names this game appears in
    const cardNames = [
        ...appearances.main.map(a => a.cardName),
        ...appearances.other.map(a => a.cardName)
    ];
    
    // For each card, find other games that also appear in it
    cardNames.forEach(cardName => {
        const allCards = getAllCards();
        const card = allCards.find(c => c.name === cardName);
        
        if (card) {
            // Add main game if different
            if (card.game && card.game !== gameName) {
                if (!relatedGamesMap[card.game]) {
                    relatedGamesMap[card.game] = { game: card.game, sharedCards: [] };
                }
                if (!relatedGamesMap[card.game].sharedCards.includes(cardName)) {
                    relatedGamesMap[card.game].sharedCards.push(cardName);
                }
            }
            
            // Add games from otherExamples
            if (card.otherExamples) {
                const gameMatches = card.otherExamples.match(/<strong>([^<]+)<\/strong>/g);
                if (gameMatches) {
                    gameMatches.forEach(match => {
                        const extractedGame = match.replace(/<\/?strong>/g, '').trim();
                        if (extractedGame !== gameName) {
                            if (!relatedGamesMap[extractedGame]) {
                                relatedGamesMap[extractedGame] = { game: extractedGame, sharedCards: [] };
                            }
                            if (!relatedGamesMap[extractedGame].sharedCards.includes(cardName)) {
                                relatedGamesMap[extractedGame].sharedCards.push(cardName);
                            }
                        }
                    });
                }
            }
        }
    });
    
    // Convert to array and sort by number of shared cards
    return Object.values(relatedGamesMap).sort((a, b) => b.sharedCards.length - a.sharedCards.length);
}

// Helper: Find other games in the same series
function findGamesInSeries(seriesName, excludeGame) {
    const seriesGames = [];
    
    if (typeof gamesDatabase === 'undefined') return seriesGames;
    
    Object.keys(gamesDatabase).forEach(gameName => {
        const gameData = gamesDatabase[gameName];
        if (gameData.series === seriesName && gameName !== excludeGame) {
            seriesGames.push(gameName);
        }
    });
    
    return seriesGames.sort();
}

// Helper: Find this game in user's draw history
function findGameInDrawHistory(gameName) {
    const draws = getDailyDraws();
    const history = [];
    
    Object.keys(draws).forEach(dateString => {
        const draw = draws[dateString];
        const allCards = getAllCards();
        const card = allCards.find(c => c.name === draw.name);
        
        if (card) {
            // Check if main game matches
            if (card.game === gameName) {
                history.push({
                    date: dateString,
                    cardName: card.name,
                    reversed: draw.reversed || false
                });
            }
            // Check if in otherExamples
            else if (card.otherExamples && card.otherExamples.includes(`<strong>${gameName}</strong>`)) {
                history.push({
                    date: dateString,
                    cardName: card.name,
                    reversed: draw.reversed || false
                });
            }
        }
    });
    
    // Sort by date (most recent first)
    return history.sort((a, b) => b.date.localeCompare(a.date));
}

// Helper: Open a card modal from game deep dive
function openCardFromGame(cardName, isReversed) {
    const allCards = getAllCards();
    const card = allCards.find(c => c.name === cardName);
    
    if (card) {
        const cardData = getCardData(card, isReversed);
        openCardModal(cardData);
    }
}

// Close modal when clicking outside of it
window.onclick = function(event) {
    const modal = document.getElementById('cardModal');
    if (event.target === modal) {
        closeModal();
    }
}

// Game Index Functions
// Game index search function
function searchGameIndex(searchTerm) {
    window.gameIndexSearchTerm = searchTerm.toLowerCase().trim();
    renderGameIndex();
}

function renderGameIndex() {
    const container = document.getElementById('gameIndexList');
    const searchTerm = window.gameIndexSearchTerm || '';
    const filters = window.gameIndexFilters || {};
    const gameIndex = {};
    const allCards = getAllCards();
    
    // Build index from all cards (upright)
    allCards.forEach(card => {
        // Add main game
        if (card.game) {
            const gameName = card.game;
            if (!gameIndex[gameName]) {
                // Try to get game data from database
                let gameData = null;
                if (typeof getGameData !== 'undefined') {
                    gameData = getGameData(gameName);
                    if (!gameData) {
                        console.warn('No game data found for:', gameName);
                    } else if (!gameData.releaseYear) {
                        console.warn('Game data missing releaseYear for:', gameName);
                    }
                }
                
                gameIndex[gameName] = {
                    mainCards: [],  // Cards where this is the main game
                    otherCards: [],  // Cards where this is in otherExamples
                    boxart: gameData?.boxart || card.boxart || '',
                    releaseYear: gameData?.releaseYear || null,
                    genres: gameData?.genres || [],
                    platform: gameData?.originalPlatform || '',
                    platformCategories: getPlatformCategory(gameData?.originalPlatform) || []
                };
            }
            gameIndex[gameName].mainCards.push(card.name);
        }
        
        // Parse other examples for additional games
        if (card.otherExamples) {
            const gameMatches = card.otherExamples.match(/<strong>([^<]+)<\/strong>/g);
            if (gameMatches) {
                gameMatches.forEach(match => {
                    const gameName = match.replace(/<\/?strong>/g, '').trim();
                    if (!gameIndex[gameName]) {
                        let gameData = null;
                        if (typeof getGameData !== 'undefined') {
                            gameData = getGameData(gameName);
                        }
                        
                        gameIndex[gameName] = {
                            mainCards: [],
                            otherCards: [],
                            boxart: gameData?.boxart || '',
                            releaseYear: gameData?.releaseYear || null,
                            genres: gameData?.genres || [],
                            platform: gameData?.originalPlatform || '',
                            platformCategories: getPlatformCategory(gameData?.originalPlatform) || ''
                        };
                    }
                    if (!gameIndex[gameName].mainCards.includes(card.name) && 
                        !gameIndex[gameName].otherCards.includes(card.name)) {
                        gameIndex[gameName].otherCards.push(card.name);
                    }
                });
            }
        }
    });
    
    // Add games from reversal data
    Object.keys(reversalData).forEach(cardName => {
        const reversal = reversalData[cardName];
        
        if (reversal.game) {
            const gameName = reversal.game;
            if (!gameIndex[gameName]) {
                let gameData = null;
                if (typeof getGameData !== 'undefined') {
                    gameData = getGameData(gameName);
                }
                
                gameIndex[gameName] = {
                    mainCards: [],
                    otherCards: [],
                    boxart: gameData?.boxart || reversal.boxart || '',
                    releaseYear: gameData?.releaseYear || null,
                    genres: gameData?.genres || [],
                    platform: gameData?.originalPlatform || '',
                    platformCategories: getPlatformCategory(gameData?.originalPlatform) || ''
                };
            }
            const reversedCardName = `${cardName} (Reversed)`;
            if (!gameIndex[gameName].mainCards.includes(reversedCardName)) {
                gameIndex[gameName].mainCards.push(reversedCardName);
            }
        }
        
        if (reversal.otherExamples) {
            const gameMatches = reversal.otherExamples.match(/<strong>([^<]+)<\/strong>/g);
            if (gameMatches) {
                gameMatches.forEach(match => {
                    const gameName = match.replace(/<\/?strong>/g, '').trim();
                    if (!gameIndex[gameName]) {
                        let gameData = null;
                        if (typeof getGameData !== 'undefined') {
                            gameData = getGameData(gameName);
                        }
                        
                        gameIndex[gameName] = {
                            mainCards: [],
                            otherCards: [],
                            boxart: gameData?.boxart || '',
                            releaseYear: gameData?.releaseYear || null,
                            genres: gameData?.genres || [],
                            platform: gameData?.originalPlatform || '',
                            platformCategories: getPlatformCategory(gameData?.originalPlatform) || ''
                        };
                    }
                    const reversedCardName = `${cardName} (Reversed)`;
                    if (!gameIndex[gameName].mainCards.includes(reversedCardName) &&
                        !gameIndex[gameName].otherCards.includes(reversedCardName)) {
                        gameIndex[gameName].otherCards.push(reversedCardName);
                    }
                });
            }
        }
    });
    
    // Sort games alphabetically using sortTitle
    let sortedGames = Object.keys(gameIndex).sort((a, b) => {
        const gameDataA = gameIndex[a];
        const gameDataB = gameIndex[b];
        const sortA = getSortTitle(a, typeof getGameData !== 'undefined' ? getGameData(a) : null);
        const sortB = getSortTitle(b, typeof getGameData !== 'undefined' ? getGameData(b) : null);
        return sortA.localeCompare(sortB);
    });
    
    // Debug: Count games with release years by decade
    const decadeCounts = {};
    sortedGames.forEach(game => {
        const year = gameIndex[game].releaseYear;
        if (year) {
            const decade = Math.floor(year / 10) * 10;
            decadeCounts[decade] = (decadeCounts[decade] || 0) + 1;
        }
    });
    console.log('Games by decade:', decadeCounts);
    console.log('Total games in index:', sortedGames.length);
    console.log('Games with release year:', sortedGames.filter(g => gameIndex[g].releaseYear).length);
    
    // Apply search filter
    if (searchTerm) {
        sortedGames = sortedGames.filter(game => 
            game.toLowerCase().includes(searchTerm)
        );
    }
    
    // Apply theme filter (from clicking theme tags)
    if (window.gameIndexThemeFilter) {
        sortedGames = sortedGames.filter(game => {
            const fullGameData = typeof getGameData !== 'undefined' ? getGameData(game) : null;
            return fullGameData && fullGameData.themes && fullGameData.themes.includes(window.gameIndexThemeFilter);
        });
    }
    
    // Apply filters
    if (filters.decade && filters.decade !== 'all') {
        sortedGames = sortedGames.filter(game => {
            const year = gameIndex[game].releaseYear;
            if (!year) return false;
            const startYear = parseInt(filters.decade);
            return year >= startYear && year < startYear + 10;
        });
    }
    
    if (filters.genre && filters.genre !== 'all') {
        sortedGames = sortedGames.filter(game => {
            return gameIndex[game].genres.includes(filters.genre);
        });
    }
    
    if (filters.theme && filters.theme !== 'all') {
        sortedGames = sortedGames.filter(game => {
            const fullGameData = typeof getGameData !== 'undefined' ? getGameData(game) : null;
            return fullGameData && fullGameData.themes && fullGameData.themes.includes(filters.theme);
        });
    }
    
    if (filters.platform && filters.platform !== 'all') {
        sortedGames = sortedGames.filter(game => {
            const categories = gameIndex[game].platformCategories || [];
            return categories.includes(filters.platform);
        });
    }
    
    // Show message if no results
    if (sortedGames.length === 0) {
        container.innerHTML = '<div class="info-text">No games found matching your criteria.</div>';
        return;
    }
    
    // Group by first letter (using sort title)
    const groupedGames = {};
    sortedGames.forEach(game => {
        const gameData = typeof getGameData !== 'undefined' ? getGameData(game) : null;
        const sortTitle = getSortTitle(game, gameData);
        const firstLetter = sortTitle.charAt(0).toUpperCase();
        if (!groupedGames[firstLetter]) {
            groupedGames[firstLetter] = [];
        }
        groupedGames[firstLetter].push(game);
    });
    
    // Build HTML with letter headers
    let html = '';
    
    // Show theme filter indicator if active
    if (window.gameIndexThemeFilter) {
        html += `
            <div class="theme-filter-indicator">
                <span class="filter-label">Filtering by theme: <strong>${window.gameIndexThemeFilter}</strong></span>
                <button class="clear-theme-filter-btn" onclick="clearThemeFilter()">✕ Clear Theme Filter</button>
            </div>
        `;
    }
    
    const letters = Object.keys(groupedGames).sort();
    
    letters.forEach(letter => {
        html += `<div class="letter-header" id="letter-${letter}">${letter}</div>`;
        
        groupedGames[letter].forEach(game => {
            const gameData = gameIndex[game];
            const mainCards = gameData.mainCards || [];
            const otherCards = gameData.otherCards || [];
            const totalCards = mainCards.length + otherCards.length;
            const boxart = gameData.boxart;
            const cardCount = totalCards === 1 ? '1 card' : `${totalCards} cards`;
            
            // Get full game data from database for summary, screenshot, etc.
            const fullGameData = typeof getGameData !== 'undefined' ? getGameData(game) : null;
            const hasSummary = fullGameData && fullGameData.summary;
            
            // Combine cards with main cards first (bold) then other cards (normal)
            const allCardsList = [
                ...mainCards.map(cardName => ({ name: cardName, isMain: true })),
                ...otherCards.map(cardName => ({ name: cardName, isMain: false }))
            ];
            
            // Create unique ID for this game entry
            const gameId = game.replace(/[^a-zA-Z0-9]/g, '-');
            
            html += `
                <div class="game-entry" id="game-${gameId}">
                    ${boxart ? `
                        <div class="game-boxart" onclick="openGameDeepDive('${game.replace(/'/g, "\\'")}');" style="cursor: pointer;">
                            <img src="${boxart}" alt="${game} box art" onerror="this.parentElement.style.display='none'">
                        </div>
                    ` : ''}
                    <div class="game-entry-content">
                        <div class="game-entry-header">
                            <div class="game-title" onclick="openGameDeepDive('${game.replace(/'/g, "\\'")}'); event.stopPropagation();" style="cursor: pointer;">${game}</div>
                            <div class="card-count">${cardCount}</div>
                        </div>
                        <div class="card-list">
                            ${allCardsList.map((item, index) => {
                                const cardName = item.name;
                                const isMain = item.isMain;
                                const bullet = index < allCardsList.length - 1 ? ' <span class="bullet-separator">•</span> ' : '';
                                const className = isMain ? 'card-list-item card-main-entry' : 'card-list-item';
                                return `<span class="${className}" onclick="openCardFromIndex('${cardName.replace(/'/g, "\\'")}')">${cardName}</span>${bullet}`;
                            }).join('')}
                        </div>
                        
                        ${hasSummary ? `
                        <div class="game-details" id="details-${gameId}" style="display: none;">
                            <div class="game-details-content">
                                <div class="game-images">
                                    ${boxart ? `
                                        <div class="game-details-boxart">
                                            <img src="${boxart}" alt="${game} box art" onerror="this.style.display='none'">
                                        </div>
                                    ` : ''}
                                    ${fullGameData.screenshot ? `
                                        <div class="game-screenshot">
                                            <img src="${fullGameData.screenshot}" alt="${game} screenshot" onerror="this.style.display='none'">
                                        </div>
                                    ` : ''}
                                </div>
                                <div class="game-info-row">
                                    ${fullGameData.releaseYear ? `<span class="game-year">${fullGameData.releaseYear}</span>` : ''}
                                    ${fullGameData.originalPlatform ? `<span class="game-platforms">${Array.isArray(fullGameData.originalPlatform) ? fullGameData.originalPlatform.join(', ') : fullGameData.originalPlatform}</span>` : ''}
                                </div>
                                <div class="game-summary-text">
                                    ${fullGameData.summary}
                                </div>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });
    });
    
    container.innerHTML = html || '<p style="text-align: center; color: #00ff41;">No games found yet!</p>';
}

// Open card modal from game index
function openCardFromIndex(cardName) {
    // Check if this is a reversed card
    const isReversed = cardName.includes('(Reversed)');
    const baseName = isReversed ? cardName.replace(' (Reversed)', '') : cardName;
    
    // Find the base card
    const baseCard = getAllCards().find(c => c.name === baseName);
    
    if (baseCard) {
        if (isReversed) {
            // Get the reversed card data
            const reversedCard = getCardData(baseCard, true);
            openCardModal(reversedCard);
        } else {
            openCardModal(baseCard);
        }
    }
}

// Toggle game details in game index
function toggleGameDetails(gameId) {
    const detailsElement = document.getElementById(`details-${gameId}`);
    if (!detailsElement) return;
    
    const isCurrentlyVisible = detailsElement.style.display !== 'none';
    
    if (isCurrentlyVisible) {
        detailsElement.style.display = 'none';
    } else {
        detailsElement.style.display = 'block';
    }
}

// Initialize filter dropdowns with unique values
function initializeGameIndexFilters() {
    const genreFilter = document.getElementById('genreFilter');
    const platformFilter = document.getElementById('platformFilter');
    const themeFilter = document.getElementById('themeFilter');
    
    // Check if gamesDatabase is available
    if (typeof gamesDatabase === 'undefined') {
        console.error('gamesDatabase is not defined');
        return;
    }
    
    // Check if all filter elements exist
    if (!genreFilter || !platformFilter) {
        console.error('Required filter elements not found');
        return;
    }
    
    // Get unique genres, platform categories, and themes from database
    const genres = new Set();
    const platformCategories = new Set();
    const themes = new Set();
    
    try {
        Object.values(gamesDatabase).forEach(game => {
            if (game.genres) {
                game.genres.forEach(genre => genres.add(genre));
            }
            if (game.themes) {
                game.themes.forEach(theme => themes.add(theme));
            }
            if (game.originalPlatform) {
                // Use getPlatformCategory if available, otherwise use raw platform
                let categories;
                if (typeof getPlatformCategory !== 'undefined') {
                    categories = getPlatformCategory(game.originalPlatform);
                } else {
                    // Fallback: just use the platform as-is
                    categories = [game.originalPlatform];
                }
                // Add each platform category to the set
                if (Array.isArray(categories)) {
                    categories.forEach(category => {
                        if (category) {
                            platformCategories.add(category);
                        }
                    });
                } else {
                    console.warn('getPlatformCategory did not return an array for:', game.originalPlatform, 'Got:', categories);
                }
            }
        });
        console.log('Platform categories found:', [...platformCategories]);
    } catch (error) {
        console.error('Error initializing filters:', error);
    }
    
    // Populate genre filter with categories
    const genreCategories = {
        'Action & Combat': [
            '3D Platformer', 'Action', 'Action-Adventure', 'Beat \'em up', 'Fighting', 
            'First-Person Shooter', 'Fixed Shooter', 'Hack and Slash',  'Multidirectional Shooter', 
            'Platformer', 'Rail Shooter', 'Run and Gun', 'Scrolling Shooter', 'Shoot \'em Up', 'Shooter', 
            'Third-Person Shooter', 'Top-Down Shooter', 'Twin-Stick Shooter'
        ],
        'RPG & Adventure': [
            'Action Role-Playing', 'Adventure', 'Exploration', 'Graphic Adventure', 'Interactive Fiction', 
            'JRPG', 'Point-and-Click', 'Role-Playing', 'Tactical Role-Playing', 'Visual Novel',
            'Walking Simulator'
        ],
        'Strategy & Simulation': [
            '4X', 'City-Building', 'Deck-Building', 'Grand Strategy', 'Life Simulation', 'Management',
            'Real-Time Strategy', 'Simulation', 'Strategy', 'Time Management', 'Tower Defense',
            'Turn-Based Strategy',, 'Turn-Based Tactics' 
        ],
        'Puzzle & Party': [
            'Escape Room', 'Party', 'Puzzle', 'Puzzle-Platformer', 'Rhythm', 'Social Deduction', 'Trivia'
        ]
    };
    
    const sortedGenres = [...genres].sort();
    const categorizedGenres = new Set();
    const uncategorizedGenres = [];
    
    // Add categorized genres first
    Object.keys(genreCategories).forEach(category => {
        const categoryGenres = sortedGenres.filter(genre => 
            genreCategories[category].some(catGenre => 
                genre.toLowerCase().includes(catGenre.toLowerCase()) || 
                catGenre.toLowerCase().includes(genre.toLowerCase())
            )
        );
        
        if (categoryGenres.length > 0) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = category;
            
            categoryGenres.forEach(genre => {
                categorizedGenres.add(genre);
                const option = document.createElement('option');
                option.value = genre;
                option.textContent = genre;
                optgroup.appendChild(option);
            });
            
            genreFilter.appendChild(optgroup);
        }
    });
    
    // Add uncategorized genres
    sortedGenres.forEach(genre => {
        if (!categorizedGenres.has(genre)) {
            uncategorizedGenres.push(genre);
        }
    });
    
    if (uncategorizedGenres.length > 0) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = 'Other';
        
        uncategorizedGenres.forEach(genre => {
            const option = document.createElement('option');
            option.value = genre;
            option.textContent = genre;
            optgroup.appendChild(option);
        });
        
        genreFilter.appendChild(optgroup);
    }
    
    // Populate platform filter with categories
    const platformGroupings = {
        'Classic Computers': ['Apple II', 'Commodore 64', 'Atari ST', 'Amiga', 'DOS', 'ZX Spectrum', 'Amstrad CPC', 'MSX', 'MS-DOS', 'Macintosh', 'PDP-10'],
        'Microsoft Consoles': ['Xbox', 'Xbox 360', 'Xbox One', 'Xbox Series X/S'],
        'Nintendo Consoles': ['NES', 'Super Nintendo', 'Nintendo 64', 'GameCube', 'Wii', 'Wii U', 'Nintendo Switch', 'Nintendo Switch 2', 'Game Boy', 'Game Boy Color', 'Game Boy Advance', 'Nintendo DS', 'Nintendo 3DS', 'Virtual Boy'],
        'PC & Mobile': ['Windows', 'macOS', 'Linux', 'iOS', 'Android', 'PC'],
        'Retro Consoles': ['Atari 2600', 'Atari 5200', 'Atari 7800', 'Atari Jaguar', 'ColecoVision', 'Intellivision', 'Sega Master System', 'Sega Genesis', 'Sega CD', 'Sega Saturn', 'Dreamcast', 'TurboGrafx-16', 'Neo Geo', 'Neo Geo Pocket', 'WonderSwan'],
        'Sony Consoles': ['PlayStation', 'PlayStation 2', 'PlayStation 3', 'PlayStation 4', 'PlayStation 5', 'PlayStation Portable', 'PlayStation Vita'],
    };
    
    const platformArray = [...platformCategories].sort();
    const categorizedPlatforms = new Set();
    const uncategorizedPlatforms = [];
    
    // Add categorized platforms
    Object.keys(platformGroupings).forEach(category => {
        const categoryPlatforms = platformArray.filter(platform => 
            platformGroupings[category].includes(platform)
        );
        
        if (categoryPlatforms.length > 0) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = category;
            
            categoryPlatforms.sort().forEach(platform => {
                categorizedPlatforms.add(platform);
                const option = document.createElement('option');
                option.value = platform;
                option.textContent = platform;
                optgroup.appendChild(option);
            });
            
            platformFilter.appendChild(optgroup);
        }
    });
    
    // Add uncategorized platforms
    platformArray.forEach(platform => {
        if (!categorizedPlatforms.has(platform)) {
            uncategorizedPlatforms.push(platform);
        }
    });
    
    if (uncategorizedPlatforms.length > 0) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = 'Other';
        
        uncategorizedPlatforms.sort().forEach(platform => {
            const option = document.createElement('option');
            option.value = platform;
            option.textContent = platform;
            optgroup.appendChild(option);
        });
        
        platformFilter.appendChild(optgroup);
    }
    
    // Populate theme filter with categories
    if (themeFilter) {
        const themeCategories = {
            'Atmosphere & Tone': [
                'Cozy Vibes', 'Dark Fantasy', 'Distinctive Art Style',' Epic Fantasy', 'Hopeless Atmosphere',
                'Lighthearted Adventure','Meditative Journey', 'Melancholic Tone', 'Minimalist Presentation',
                'Neo-Noir Tone', 'Power Fantasy', 'Slice-of-Life Atmosphere', 'Surreal Atmosphere', 'Whimsical World'
            ],
            'Characters': [
                'Animal Protagonists', 'Child Protagonist', 'Criminal Protagonist', 'Detective/Investigator Protagonist',
                'Large Character Roster', 'Multiple Protagonists', 'Pirate Protagonist', 'Robot/AI Protagonist', 
                'Scientist/Engineer Protagonist', 'Shape-Shifting Protagonist', 'Witch Protagonist', 'Worker Protagonist'
            ],
            'Conflict Types': [
                'Alien Invasion', 'Ancient Threats', 'Cartoon Villainy', 'Demonic Threat', 'Family Conflict',
                'Galaxy Conflict', 'Heroic Conflict', 'Light vs Darkness', 'Military Conflict', 'Supernatural Threat',
                'World in Peril'
            ],
            'Exploration & Discovery': [
                'Exploration Focus', 'Ocean Exploration', 'Open World', 'Peaceful Exploration', 'Space Exploration'
            ],
            'Gameplay-Themed Tags': [
                'Alchemy System', 'Base Building', 'Boss Challenges', 'Competition Games', 'Cooking',
                'Cooperative Single-Player', 'Crafting & Creativity', 'Daily Life Challenges', 'Dungeon Crawling',
                'Elemental Powers', 'Environmental Puzzles', 'Farming Life', 'Investigation & Deduction', 'Job System',
                'Logic Puzzles', 'Permanent Consequences', 'Personal Expression', 'Player-Directed Progression',
                'Procedural Environments', 'Psychic Abilities', 'Push Your Luck', 'Resource Management',
                'Settlement Management', 'Stealth Approaches', 'Strategic Planning', 'Stylish Combat', 'Survival',
                'Synergy Chasing', 'Time Management Pressure'
            ],
            'Horror': [
                'Body Horror', 'Cosmic Horror', 'Cute-Horror Contrast', 'Gothic Horror', 'Psychological Horror',
                'Sci-Fi Horror', 'Survival Horror'
            ],
            'Humor': [
                'Character-Driven Humor', 'Colorful Chaos', 'Comedic Tone', 'Dark Humor', 'Physical Comedy'
            ],
            'Motifs & Imagery': [
                'Crystal Motifs', 'Mask Imagery', 'Music-Centric', 'Souls & Spirits'
            ],
            'Mythology & Religion': [
                'Divine Intervention', 'Greek Mythology', 'Japanese Mythology', 'Nature Celebration', 'Norse Mythology',
                'Reincarnation Ideas', 'Religious Imagery'
            ],
            'Narrative & Story Themes': [
                'Amnesia', 'Betrayal & Loyalty', 'Chosen Destiny', 'Coming of Age', 'Consequences of Violence',
                'Educational Themes', 'Hope in Despair', 'Language & Communication',
                'Life Journey', "Memory & Identity", 'Mortality Themes', 'Mystery', 'Prophecy Themes', 'Sacrifice',
                'Small-Town Stories', 'Tragic Fate'
            ],
            'Narrative Techniques': [
                'Anthology Structure', 'Branching Paths', 'Emergent Storytelling', 'Environmental Storytelling',
                'Interconnected World', 'Metafiction', 'Minimalist Storytelling', 'Nonlinear Narrative',
                'Perspective Shifts', 'Twists & Revelations', 'Voice Narration', 'Wordless Narrative'
            ],
            'Philosophical & Moral': [
                'Body Augmentation', 'Fate vs Free Will', 'Philosophical Themes', 'Moral Choices'
            ],
            'Psychologicasl & Emotional': [
                'Emotional Healing', 'Emotional Journey', 'Grief & Loss', 'Inner Voices', 'Introspection',
                'Isolation', 'Mental Health Themes', 'Perseverance Themes', 'Psychological Pressure'
            ],
            'Quest Types': [
                'Escape Quest', 'Fantasy Quest', 'Journey Across Regions', 'Mythic Journey', 'Redemption Journey',
                'Rescue Quest', 'Treasure Recovery'
            ],
            'Social & Relationships': [
                'Adult Relationships', 'Community Bonds', 'Companionship', 'Doomed Romance', 'Family Legacy',
                'Found Family', 'Friendship Bonds', 'Human Connection', 'Leadership', 'LGBTQ+ Themes', 
                'Parent-Child Themes', 'Revenge & Justice', 'Rivalry & Respect', 'Romantic Focus', 'Sibling Bonds',
                'Social Deception', 'Teen Drama'
            ],
            'Societal & Political': [
                'Corporate Control', 'Criminal Underbelly', 'Dystopia', 'Hidden Conspiracies', 'Plague & Disease',
                'Political Intrigue', 'Rebellion', 'Technological Oppression', 'Urban Decay'
            ],
            'Time & Reality': [
                'Multiple Timelines', 'Parallel Worlds', 'Reality Distortion', 'Recurring Cycle', 'Seasonal Cycles',
                'Time Loop Elements', 'Time Manipulation', 'Time Travel'
            ],
            'World Settings': [
                'Alien Planet', 'Cyberpunk Setting', 'High School Setting', 'Historical Settings', 'Island Setting',
                'Near-Future Setting', 'Post-Apocalyptic World', 'Retro-Futurism', 'Sci-Fi Setting', 'Tropical Setting',
                'Underground Setting', 'Underwater Setting'
            ],
            'World States & Conditions': [
                'Ancient Civilizations', 'Ancient Ruins', 'Dying World', 'Environmental Crisis', 'Environmental Renewal',
                'Fallen Kingdoms', 'Rebuilding Civilization'
            ],
            'Special Categories': [
                'Licensed Property'
            ]
        };
        
        const sortedThemes = [...themes].sort();
        const categorizedThemes = new Set();
        const uncategorizedThemes = [];
        
        // Add categorized themes
        Object.keys(themeCategories).forEach(category => {
            const categoryThemes = sortedThemes.filter(theme => 
                themeCategories[category].includes(theme)
            );
            
            if (categoryThemes.length > 0) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = category;
                
                categoryThemes.forEach(theme => {
                    categorizedThemes.add(theme);
                    const option = document.createElement('option');
                    option.value = theme;
                    option.textContent = theme;
                    optgroup.appendChild(option);
                });
                
                themeFilter.appendChild(optgroup);
            }
        });
        
        // Add uncategorized themes
        sortedThemes.forEach(theme => {
            if (!categorizedThemes.has(theme)) {
                uncategorizedThemes.push(theme);
            }
        });
        
        if (uncategorizedThemes.length > 0) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = 'Other';
            
            uncategorizedThemes.forEach(theme => {
                const option = document.createElement('option');
                option.value = theme;
                option.textContent = theme;
                optgroup.appendChild(option);
            });
            
            themeFilter.appendChild(optgroup);
        }
    }
}

// Apply filters to game index
function applyGameIndexFilters() {
    const decadeFilter = document.getElementById('decadeFilter').value;
    const genreFilter = document.getElementById('genreFilter').value;
    const themeFilterElement = document.getElementById('themeFilter');
    const themeFilter = themeFilterElement ? themeFilterElement.value : 'all';
    const platformFilter = document.getElementById('platformFilter').value;
    
    window.gameIndexFilters = {
        decade: decadeFilter,
        genre: genreFilter,
        theme: themeFilter,
        platform: platformFilter
    };
    
    renderGameIndex();
}

// Clear all filters
function clearGameIndexFilters() {
    document.getElementById('decadeFilter').value = 'all';
    document.getElementById('genreFilter').value = 'all';
    const themeFilterElement = document.getElementById('themeFilter');
    if (themeFilterElement) {
        themeFilterElement.value = 'all';
    }
    document.getElementById('platformFilter').value = 'all';
    window.gameIndexFilters = null;
    window.gameIndexThemeFilter = null;
    renderGameIndex();
}

// Scroll to letter section
function scrollToLetter(letter) {
    const element = document.getElementById(`letter-${letter}`);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Toggle platform info popup
function togglePlatformInfo(event) {
    event.stopPropagation();
    const popup = document.getElementById('platformInfoPopup');
    if (popup) {
        popup.style.display = popup.style.display === 'none' ? 'block' : 'none';
    }
}

// Close popup when clicking outside
document.addEventListener('click', function(event) {
    const popup = document.getElementById('platformInfoPopup');
    const button = event.target.closest('.info-button');
    
    if (popup && !button && popup.style.display === 'block') {
        popup.style.display = 'none';
    }
});

// Alias for compatibility
function displayCardInModal(card) {
    openCardModal(card);
}


// Settings Functions
function loadSettings() {
    const reversalsEnabled = localStorage.getItem('reversalsEnabled') === 'true';
    document.getElementById('reversalsToggle').checked = reversalsEnabled;
}

function toggleReversals() {
    const isEnabled = document.getElementById('reversalsToggle').checked;
    localStorage.setItem('reversalsEnabled', isEnabled);
    
    // Show a confirmation message
    const settingInfo = document.querySelector('.setting-info p');
    if (isEnabled) {
        settingInfo.innerHTML = '<strong>Reversals enabled!</strong> Note: Reversed meanings are coming soon. Currently only upright meanings are available.';
        settingInfo.style.color = '#ff0080';
    } else {
        settingInfo.innerHTML = '<strong>Note:</strong> Reversals feature coming soon! Currently showing upright meanings only.';
        settingInfo.style.color = '#00ff41';
    }
}

function confirmReset() {
    const confirmed = confirm(
        '⚠️ WARNING ⚠️\n\n' +
        'This will permanently delete:\n' +
        '• All daily card draws\n' +
        '• All journal entries\n' +
        '• All settings\n\n' +
        'This action CANNOT be undone.\n\n' +
        'Are you sure you want to reset all data?'
    );
    
    if (confirmed) {
        resetAllData();
    }
}

function resetAllData() {
    // Clear all localStorage using constants and known keys
    localStorage.removeItem(STORAGE_KEYS.DAILY_DRAWS);
    localStorage.removeItem(STORAGE_KEYS.SPREADS);
    localStorage.removeItem('pixelArcanaJournals');
    localStorage.removeItem('reversalsEnabled');
    
    // Also clear any other potential Pixel Arcana keys
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('pixelArcana') || key.startsWith('tarot'))) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Show success message
    alert('✓ All data has been reset!\n\nThe page will now reload.');
    
    // Force a hard reload to clear any cache
    window.location.href = window.location.href.split('?')[0] + '?t=' + Date.now();
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    // Initialize spoiler system
    initializeSpoilers();
    
    // Initialize game index filters
    initializeGameIndexFilters();
    
    // Initialize back to top button functionality
    initializeBackToTop();
});

// Back to Top Button Functionality
function initializeBackToTop() {
    const backToTopBtn = document.getElementById('backToTopBtn');
    
    // Show/hide button based on scroll position (only in game index view)
    window.addEventListener('scroll', function() {
        const gameIndexView = document.getElementById('gameIndex');
        if (gameIndexView && gameIndexView.classList.contains('active')) {
            if (window.pageYOffset > 300) {
                backToTopBtn.style.display = 'block';
            } else {
                backToTopBtn.style.display = 'none';
            }
        } else {
            backToTopBtn.style.display = 'none';
        }
    });
}

function scrollToGameIndexTop() {
    const gameIndexTop = document.getElementById('gameIndexTop');
    if (gameIndexTop) {
        gameIndexTop.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        // Fallback to top of page
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}