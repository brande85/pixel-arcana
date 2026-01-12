// Moon Phases Calculator
// Returns moon phase for a given date

function getMoonPhase(date) {
    // Calculate moon phase using astronomical algorithm
    let year = date.getFullYear();
    let month = date.getMonth() + 1;
    const day = date.getDate();
    
    let c, e, jd, b;
    
    if (month < 3) {
        year--;
        month += 12;
    }
    
    ++month;
    c = 365.25 * year;
    e = 30.6 * month;
    jd = c + e + day - 694039.09; // Julian date relative to Jan 1, 2000
    jd /= 29.5305882; // Divide by moon cycle
    b = parseInt(jd);
    jd -= b; // Decimal part
    b = Math.round(jd * 8); // Scale fraction from 0-8
    
    if (b >= 8) b = 0; // 0 and 8 are the same phase
    
    // Return phase object
    const phases = [
        { name: 'New Moon', emoji: '🌑', index: 0 },
        { name: 'Waxing Crescent', emoji: '🌒', index: 1 },
        { name: 'First Quarter', emoji: '🌓', index: 2 },
        { name: 'Waxing Gibbous', emoji: '🌔', index: 3 },
        { name: 'Full Moon', emoji: '🌕', index: 4 },
        { name: 'Waning Gibbous', emoji: '🌖', index: 5 },
        { name: 'Last Quarter', emoji: '🌗', index: 6 },
        { name: 'Waning Crescent', emoji: '🌘', index: 7 }
    ];
    
    return phases[b];
}

function getMoonPhaseDisplay(date) {
    const phase = getMoonPhase(date);
    return `${phase.emoji} ${phase.name}`;
}

function getMoonPhaseEmoji(date) {
    const phase = getMoonPhase(date);
    return phase.emoji;
}

function isMoonPhasesEnabled() {
    return localStorage.getItem('moonPhasesEnabled') === 'true';
}

function toggleMoonPhases() {
    const currentState = isMoonPhasesEnabled();
    localStorage.setItem('moonPhasesEnabled', (!currentState).toString());
    return !currentState;
}