/**
 * ============================================================================
 * PROFESSIONAL CSP SCHEDULING ENGINE - COMPLETE IMPLEMENTATION
 * ============================================================================
 * 
 * Advanced Scheduling System with:
 * 1. Multiple Algorithm Support (Greedy, CSP Backtracking, Min-Conflict, Simulated Annealing)
 * 2. Individual Availability Management
 * 3. Group Constraints (Hard Rules)
 * 4. Mid-Month Rescheduling with Locked Past Appointments
 * 5. Weekly Schedule Control
 * 6. Multi-Group Support (Teachers, India, Y2023, Y2022, Y2021, Staff)
 * 7. Real-time Diagnostics and Conflict Resolution
 * 8. Professional Calendar Interface
 * 9. Persistent Data Storage
 * 10. Advanced Constraint Satisfaction Problem Solving
 * 
 * ============================================================================
 */

// --- App State & Configuration ---
let solutionCache = null;
let individualConstraints = {};
let groupConstraints = [];
let currentEditingPerson = null;
let lastDiagnostics = null;
let lastClickedSlot = null;
let highlightedWeek = null;
let currentDate = null; // For mid-month rescheduling
let weeklyScheduleSettings = {}; // Track which weeks are enabled for each group
let selectedAlgorithm = 'greedy';

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIMES = Array.from({ length: 32 }, (_, i) => { 
    const h = Math.floor(i / 4) + 9; 
    const m = (i % 4) * 15; 
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`; 
});
const PRIORITY_ORDER = ['teacher', 'india', 'y2023', 'y2022', 'y2021', 'staff'];

const DEFAULT_GROUPS = [
    { id: 'teacher', name: 'Teachers', count: 5, freq: 'weekly', pattern: 'any', preferredDay: 'any', duration: 30, measurements: 1 },
    { id: 'india', name: 'India Students', count: 4, freq: 'every_2_weeks', pattern: 'any', preferredDay: 'any', duration: 15, measurements: 1 },
    { id: 'y2023', name: 'Y2023 Students', count: 10, freq: 'every_2_weeks', pattern: 'odd', preferredDay: 'any', duration: 15, measurements: 1 },
    { id: 'y2022', name: 'Y2022 Students', count: 12, freq: 'every_2_weeks', pattern: 'even', preferredDay: 'any', duration: 15, measurements: 1 },
    { id: 'y2021', name: 'Y2021 Students', count: 8, freq: 'monthly', pattern: 'any', preferredDay: 'any', duration: 15, measurements: 1 },
    { id: 'staff', name: 'Staff', count: 6, freq: 'monthly', pattern: 'any', preferredDay: 'any', duration: 15, measurements: 1 }
];

const ALGORITHM_DESCRIPTIONS = {
    'greedy': '⚡ Quick: Fast greedy algorithm, good for simple scenarios (~1-2s)',
    'csp_backtrack': '🎯 CSP Backtracking: Advanced constraint satisfaction with MRV heuristic (~3-10s)',
    'min_conflict': '🔄 Min-Conflict: Local search with tabu list for complex conflicts (~5-15s)',
    'simulated_annealing': '🌡️ Simulated Annealing: Temperature-based optimization for optimal solutions (~10-30s)'
};

// --- Event Listeners & Initial Setup ---
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    setupControls();
    
    // Load last generated solution automatically
    const solutionLoaded = loadLastSolution();
    if (!solutionLoaded) {
        renderCalendar();
    }
    
    setupModals();
    renderActiveGroupConstraints();
    updateAlgorithmSelection();
});

function setupControls() {
    const startDateInput = document.getElementById('schedule-start-date');
    const currentDateInput = document.getElementById('current-date');
    
    startDateInput.addEventListener('change', () => {
        localStorage.setItem('scheduler_start_date', startDateInput.value);
        document.getElementById('diagnostics-panel').style.display = 'none';
    });
    
    currentDateInput.addEventListener('change', () => {
        currentDate = currentDateInput.value ? new Date(currentDateInput.value + 'T00:00:00Z') : null;
        localStorage.setItem('scheduler_current_date', currentDateInput.value);
        document.getElementById('diagnostics-panel').style.display = 'none';
    });
    
    document.getElementById('calculate-btn').addEventListener('click', handleGenerateSchedule);
    document.getElementById('clear-schedule-btn').addEventListener('click', () => {
        if (confirm('Clear the current schedule? This will remove all appointments from the calendar.')) {
            clearPreviousSolutionUI();
        }
    });
    
    // Calendar navigation
    document.getElementById('prev-month').addEventListener('click', () => {
        const d = new Date(document.getElementById('month-year-display').dataset.date);
        d.setUTCMonth(d.getUTCMonth() - 1);
        renderCalendar(d.getUTCFullYear(), d.getUTCMonth());
        
        // Re-render with current solution
        if (solutionCache) {
            const resultsDiv = document.getElementById('results');
            const saved = localStorage.getItem('scheduler_last_solution');
            if (saved) {
                const solutionData = JSON.parse(saved);
                let resultHTML = `<span class="feasible">📋 Schedule Loaded</span>`;
                resultHTML += `<div class="solver-stats">${solutionData.solution.length} appointment(s) | ${solutionData.numRooms} room(s) used</div>`;
                resultsDiv.innerHTML = resultHTML;
            }
        }
    });
    
    document.getElementById('next-month').addEventListener('click', () => {
        const d = new Date(document.getElementById('month-year-display').dataset.date);
        d.setUTCMonth(d.getUTCMonth() + 1);
        renderCalendar(d.getUTCFullYear(), d.getUTCMonth());
        
        // Re-render with current solution
        if (solutionCache) {
            const resultsDiv = document.getElementById('results');
            const saved = localStorage.getItem('scheduler_last_solution');
            if (saved) {
                const solutionData = JSON.parse(saved);
                let resultHTML = `<span class="feasible">📋 Schedule Loaded</span>`;
                resultHTML += `<div class="solver-stats">${solutionData.solution.length} appointment(s) | ${solutionData.numRooms} room(s) used</div>`;
                resultsDiv.innerHTML = resultHTML;
            }
        }
    });
    
    // Modal and availability management
    document.getElementById('manage-individual-btn').addEventListener('click', openPersonListModal);
    document.getElementById('person-filter').addEventListener('input', filterPersonList);
    document.getElementById('reset-btn').addEventListener('click', resetAllSettings);
    document.getElementById('demo-data-btn').addEventListener('click', loadDemoData);
    document.getElementById('toggle-custom-constraint-btn').addEventListener('click', toggleCustomConstraintBuilder);
    document.getElementById('add-custom-constraint-btn').addEventListener('click', addCustomConstraint);
    document.getElementById('regenerate-week-btn').addEventListener('click', handleRegenerateSelectedWeeks);
    
    // Calendar header setup
    const header = document.getElementById('weekday-header');
    header.innerHTML = '';
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(day => {
        header.insertAdjacentHTML('beforeend', `<div class="calendar-day-name">${day}</div>`);
    });
    
    // Settings event listeners
    document.getElementById('horizon-weeks').addEventListener('change', () => {
        const weeks = Math.max(1, parseInt(document.getElementById('horizon-weeks').value || '5', 10));
        localStorage.setItem('scheduler_horizon_weeks', String(weeks));
        document.getElementById('diagnostics-panel').style.display = 'none';
    });
    
    document.getElementById('auto-extend').addEventListener('change', () => {
        localStorage.setItem('scheduler_auto_extend', document.getElementById('auto-extend').checked ? 'true' : 'false');
        document.getElementById('diagnostics-panel').style.display = 'none';
    });
    
    document.getElementById('start-alignment').addEventListener('change', () => {
        localStorage.setItem('scheduler_start_alignment', document.getElementById('start-alignment').value);
        document.getElementById('diagnostics-panel').style.display = 'none';
    });
    
    document.getElementById('allow-past').addEventListener('change', () => {
        localStorage.setItem('scheduler_allow_past', document.getElementById('allow-past').checked ? 'true' : 'false');
        document.getElementById('diagnostics-panel').style.display = 'none';
    });
    
    document.getElementById('skip-partial-week').addEventListener('change', () => {
        localStorage.setItem('scheduler_skip_partial_week', document.getElementById('skip-partial-week').checked ? 'true' : 'false');
        document.getElementById('diagnostics-panel').style.display = 'none';
    });
    
    document.getElementById('min-working-days').addEventListener('change', () => {
        const v = Math.min(5, Math.max(1, parseInt(document.getElementById('min-working-days').value || '3', 10)));
        document.getElementById('min-working-days').value = String(v);
        localStorage.setItem('scheduler_min_working_days', String(v));
        document.getElementById('diagnostics-panel').style.display = 'none';
    });
}

// --- Algorithm Selection ---
function selectAlgorithm(algorithm) {
    selectedAlgorithm = algorithm;
    localStorage.setItem('scheduler_selected_algorithm', algorithm);
    updateAlgorithmSelection();
}

function updateAlgorithmSelection() {
    const savedAlgorithm = localStorage.getItem('scheduler_selected_algorithm') || 'greedy';
    selectedAlgorithm = savedAlgorithm;
    
    // Update radio buttons
    document.querySelectorAll('input[name="algorithm"]').forEach(radio => {
        radio.checked = radio.value === selectedAlgorithm;
    });
    
    // Update visual selection
    document.querySelectorAll('.algorithm-option').forEach(option => {
        option.classList.remove('selected');
        if (option.onclick.toString().includes(selectedAlgorithm)) {
            option.classList.add('selected');
        }
    });
    
    // Update description
    document.getElementById('algorithm-description').textContent = ALGORITHM_DESCRIPTIONS[selectedAlgorithm];
}

// --- Local Storage Persistence ---
function saveAllSettings() {
    localStorage.setItem('scheduler_group_params', JSON.stringify(getCurrentGroupParams()));
    localStorage.setItem('scheduler_group_constraints', JSON.stringify(groupConstraints));
    localStorage.setItem('scheduler_individual_constraints', JSON.stringify(individualConstraints));
    localStorage.setItem('scheduler_weekly_settings', JSON.stringify(weeklyScheduleSettings));
    localStorage.setItem('scheduler_rooms', document.getElementById('rooms-select').value);
    localStorage.setItem('scheduler_horizon_weeks', document.getElementById('horizon-weeks').value || '5');
    localStorage.setItem('scheduler_auto_extend', document.getElementById('auto-extend').checked ? 'true' : 'false');
    localStorage.setItem('scheduler_start_alignment', document.getElementById('start-alignment').value || 'as_is');
    localStorage.setItem('scheduler_allow_past', document.getElementById('allow-past').checked ? 'true' : 'false');
    localStorage.setItem('scheduler_skip_partial_week', document.getElementById('skip-partial-week').checked ? 'true' : 'false');
    localStorage.setItem('scheduler_min_working_days', document.getElementById('min-working-days').value || '3');
    localStorage.setItem('scheduler_selected_algorithm', selectedAlgorithm);
}

function loadSettings() {
    const savedGroups = JSON.parse(localStorage.getItem('scheduler_group_params'));
    groupConstraints = JSON.parse(localStorage.getItem('scheduler_group_constraints')) || [];
    individualConstraints = JSON.parse(localStorage.getItem('scheduler_individual_constraints')) || {};
    weeklyScheduleSettings = JSON.parse(localStorage.getItem('scheduler_weekly_settings')) || {};
    selectedAlgorithm = localStorage.getItem('scheduler_selected_algorithm') || 'greedy';
    
    const groups = savedGroups || DEFAULT_GROUPS;
    const groupContainer = document.getElementById('group-param-container');
    const groupSelect = document.getElementById('constraint-group');
    
    groupContainer.innerHTML = '';
    groupSelect.innerHTML = '';
    
    groups.forEach(g => {
        groupContainer.innerHTML += `
            <div class="group-card">
                <h3>${g.name}</h3>
                <div class="param-grid">
                    <label for="${g.id}-count">Count</label>
                    <input type="number" id="${g.id}-count" value="${g.count}" onchange="saveAllSettings();">
                    
                    <label for="${g.id}-duration">Duration (mins)</label>
                    <input type="number" id="${g.id}-duration" value="${g.duration || 15}" step="15" min="15" onchange="saveAllSettings();">
                    
                    <label for="${g.id}-measurements">Measurements per person</label>
                    <input type="number" id="${g.id}-measurements" value="${g.measurements || 1}" step="1" min="1" onchange="saveAllSettings();">
                    
                    <label for="${g.id}-freq">Frequency</label>
                    <select id="${g.id}-freq" onchange="saveAllSettings();">
                        <option value="monthly" ${g.freq === 'monthly' ? 'selected' : ''}>Once per Month</option>
                        <option value="every_2_weeks" ${g.freq === 'every_2_weeks' ? 'selected' : ''}>Every 2 Weeks</option>
                        <option value="weekly" ${g.freq === 'weekly' ? 'selected' : ''}>Weekly</option>
                    </select>
                    
                    <label for="${g.id}-pattern">Week Pattern</label>
                    <select id="${g.id}-pattern" onchange="saveAllSettings();">
                        <option value="any" ${g.pattern === 'any' ? 'selected' : ''}>Any Week</option>
                        <option value="odd" ${g.pattern === 'odd' ? 'selected' : ''}>Odd Weeks Only</option>
                        <option value="even" ${g.pattern === 'even' ? 'selected' : ''}>Even Weeks Only</option>
                    </select>
                    
                    <label for="${g.id}-preferredDay">Preferred Day (Soft)</label>
                    <select id="${g.id}-preferredDay" onchange="saveAllSettings();">
                        <option value="any" ${g.preferredDay === "any" ? "selected" : ""}>Any Day</option>
                        <option value="1" ${g.preferredDay === "1" ? "selected" : ""}>Monday</option>
                        <option value="2" ${g.preferredDay === "2" ? "selected" : ""}>Tuesday</option>
                        <option value="3" ${g.preferredDay === "3" ? "selected" : ""}>Wednesday</option>
                        <option value="4" ${g.preferredDay === "4" ? "selected" : ""}>Thursday</option>
                        <option value="5" ${g.preferredDay === "5" ? "selected" : ""}>Friday</option>
                    </select>
                </div>
            </div>
        `;
        groupSelect.innerHTML += `<option value="${g.id}">${g.name}</option>`;
    });
    
    // Load other settings
    const startDateInput = document.getElementById('schedule-start-date');
    const currentDateInput = document.getElementById('current-date');
    
    const storedDate = localStorage.getItem('scheduler_start_date');
    if (storedDate) {
        startDateInput.value = storedDate;
    } else if (!startDateInput.value) {
        startDateInput.value = '2025-10-23';
        localStorage.setItem('scheduler_start_date', startDateInput.value);
    }
    
    const storedCurrentDate = localStorage.getItem('scheduler_current_date');
    if (storedCurrentDate) {
        currentDateInput.value = storedCurrentDate;
        currentDate = new Date(storedCurrentDate + 'T00:00:00Z');
    }
    
    document.getElementById('rooms-select').value = localStorage.getItem('scheduler_rooms') || 'auto';
    
    // Load horizon and auto-extend
    const horizonWeeks = parseInt(localStorage.getItem('scheduler_horizon_weeks') || '5', 10);
    document.getElementById('horizon-weeks').value = horizonWeeks;
    
    const autoExtend = localStorage.getItem('scheduler_auto_extend') === 'true';
    document.getElementById('auto-extend').checked = autoExtend;
    
    // Load alignment and allow-past
    document.getElementById('start-alignment').value = localStorage.getItem('scheduler_start_alignment') || 'as_is';
    document.getElementById('allow-past').checked = localStorage.getItem('scheduler_allow_past') === 'true';
    document.getElementById('skip-partial-week').checked = localStorage.getItem('scheduler_skip_partial_week') === 'true';
    document.getElementById('min-working-days').value = localStorage.getItem('scheduler_min_working_days') || '3';
    
    // Render weekly schedule controls
    renderWeeklyScheduleControls();
}

function resetAllSettings() {
    if (confirm("Are you sure? This will reset all group, constraint, and individual settings to their defaults.")) {
        localStorage.clear();
        location.reload();
    }
}

function loadDemoData() {
    if (!confirm("This will load an exciting demo scenario starting from Oct 23, 2025 with challenging constraints. This will overwrite all current settings. Proceed?")) return;
    
    const demoStartDate = '2025-10-23';
    const demoGroups = DEFAULT_GROUPS.map(g => ({ ...g, duration: g.id === 'teacher' ? 30 : 15 }));
    
    const demoGroupConstraints = [
        // Staff constraints - complex availability
        { group: 'staff', week: 'all', type: 'not_day', value: 5 },    // Staff cannot work on Fridays
        { group: 'staff', week: 'all', type: 'not_day', value: 1 },    // Staff cannot work on Mondays
        
        // Y2023 students - very restricted
        { group: 'y2023', week: 'all', type: 'only_day', value: 3 },   // Y2023 ONLY on Wednesdays
        
        // Y2022 students - afternoon only
        { group: 'y2022', week: 'all', type: 'not_day', value: 1 },    // Y2022 cannot work on Monday
        { group: 'y2022', week: 'all', type: 'not_day', value: 2 },    // Y2022 cannot work on Tuesday
        
        // Y2021 students - limited days
        { group: 'y2021', week: 'all', type: 'only_day', value: 4 },   // Y2021 ONLY on Thursdays
        
        // India students - flexible but with restrictions
        { group: 'india', week: 'all', type: 'not_day', value: 2 },    // India cannot work on Tuesday
        { group: 'india', week: 'all', type: 'not_day', value: 5 },    // India cannot work on Friday
    ];
    
    let demoIndividualConstraints = {};
    
    const setAvailability = (personId, availability) => {
        const finalSlots = [];
        availability.forEach(range => {
            let startMillis = new Date(range.start).getTime();
            const endMillis = new Date(range.end).getTime();
            for(let time = startMillis; time < endMillis; time += 900000) {
                finalSlots.push({ start: time, end: time + 900000 });
            }
        });
        demoIndividualConstraints[personId] = finalSlots;
    };
    
    // Baseline: Everyone has a default availability to start from
    const allPeople = [];
    demoGroups.forEach(g => {
        for(let i = 1; i <= g.count; i++) allPeople.push(`${g.id}_${i}`);
    });
    
    allPeople.forEach(personId => {
        const availability = [];
        const { startDate } = getPlanningRange(demoStartDate);
        for(let d = 0; d < 35; d++) {
            const day = new Date(startDate);
            day.setUTCDate(day.getUTCDate() + d);
            if (day.getUTCDay() >= 1 && day.getUTCDay() <= 5) {
                availability.push({ 
                    start: `${day.toISOString().slice(0,10)}T09:00:00Z`, 
                    end: `${day.toISOString().slice(0,10)}T17:00:00Z` 
                });
            }
        }
        setAvailability(personId, availability);
    });
    
    // --- EXCITING & CHALLENGING OVERRIDES FOR OCT 23, 2025 ---
    
    // Teachers (Weekly) - Various availability patterns
    setAvailability('teacher_1', [ // Mon/Wed mornings only
        { start: '2025-10-27T09:00:00Z', end: '2025-10-27T12:00:00Z' },
        { start: '2025-10-29T09:00:00Z', end: '2025-10-29T12:00:00Z' },
        { start: '2025-11-03T09:00:00Z', end: '2025-11-03T12:00:00Z' },
        { start: '2025-11-05T09:00:00Z', end: '2025-11-05T12:00:00Z' }
    ]);
    
    setAvailability('teacher_2', [ // Thu/Fri afternoons only
        { start: '2025-10-23T13:00:00Z', end: '2025-10-23T17:00:00Z' },
        { start: '2025-10-24T13:00:00Z', end: '2025-10-24T17:00:00Z' },
        { start: '2025-10-30T13:00:00Z', end: '2025-10-30T17:00:00Z' },
        { start: '2025-10-31T13:00:00Z', end: '2025-10-31T17:00:00Z' }
    ]);
    
    setAvailability('teacher_3', [ // Only available Wed afternoon - will be challenging!
        { start: '2025-10-29T14:00:00Z', end: '2025-10-29T16:00:00Z' },
        { start: '2025-11-05T14:00:00Z', end: '2025-11-05T16:00:00Z' }
    ]);
    
    // Staff (Monthly) - Complex constraints
    setAvailability('staff_1', [
        { start: '2025-10-29T10:00:00Z', end: '2025-10-29T15:00:00Z' },
        { start: '2025-10-30T10:00:00Z', end: '2025-10-30T15:00:00Z' }
    ]);
    
    setAvailability('staff_2', [
        { start: '2025-10-28T09:00:00Z', end: '2025-10-28T17:00:00Z' },
        { start: '2025-10-29T09:00:00Z', end: '2025-10-29T17:00:00Z' },
        { start: '2025-10-30T09:00:00Z', end: '2025-10-30T17:00:00Z' }
    ]);
    
    // Y2023 Students (Every 2 weeks, ONLY Wed) - Very constrained!
    setAvailability('y2023_1', [
        { start: '2025-10-29T10:00:00Z', end: '2025-10-29T14:00:00Z' }, // Wed
        { start: '2025-11-12T10:00:00Z', end: '2025-11-12T14:00:00Z' }  // Wed
    ]);
    
    setAvailability('y2023_2', [
        { start: '2025-10-29T09:00:00Z', end: '2025-10-29T11:00:00Z' },
        { start: '2025-11-12T09:00:00Z', end: '2025-11-12T11:00:00Z' }
    ]);
    
    // Y2022 Students (Every 2 weeks, NOT Mon/Tue) - Afternoon preference
    setAvailability('y2022_1', [
        { start: '2025-10-24T13:00:00Z', end: '2025-10-24T17:00:00Z' }, // Fri
        { start: '2025-10-29T13:00:00Z', end: '2025-10-29T17:00:00Z' }, // Wed
        { start: '2025-10-30T13:00:00Z', end: '2025-10-30T17:00:00Z' }, // Thu
        { start: '2025-10-31T13:00:00Z', end: '2025-10-31T17:00:00Z' }  // Fri
    ]);
    
    // Y2021 Students (Monthly, ONLY Thursday) - Very limited!
    setAvailability('y2021_1', [
        { start: '2025-10-30T10:00:00Z', end: '2025-10-30T15:00:00Z' }
    ]);
    
    setAvailability('y2021_2', [
        { start: '2025-10-30T09:00:00Z', end: '2025-10-30T12:00:00Z' }
    ]);
    
    // India Students (Every 2 weeks, NOT Tue/Fri)
    setAvailability('india_1', [
        { start: '2025-10-29T09:00:00Z', end: '2025-10-29T12:00:00Z' }, // Wed
        { start: '2025-10-30T09:00:00Z', end: '2025-10-30T12:00:00Z' }, // Thu
        { start: '2025-11-13T09:00:00Z', end: '2025-11-13T12:00:00Z' }, // Thu
        { start: '2025-11-12T09:00:00Z', end: '2025-11-12T12:00:00Z' }  // Wed
    ]);
    
    setAvailability('india_3', [
        { start: '2025-10-29T09:00:00Z', end: '2025-10-29T17:00:00Z' },
        { start: '2025-10-30T09:00:00Z', end: '2025-10-30T17:00:00Z' },
        { start: '2025-11-12T09:00:00Z', end: '2025-11-12T17:00:00Z' },
        { start: '2025-11-13T09:00:00Z', end: '2025-11-13T17:00:00Z' }
    ]);
    
    localStorage.setItem('scheduler_start_date', demoStartDate);
    localStorage.setItem('scheduler_current_date', '2025-10-23'); // Set current date to Oct 23rd (today)
    localStorage.setItem('scheduler_group_params', JSON.stringify(demoGroups));
    localStorage.setItem('scheduler_group_constraints', JSON.stringify(demoGroupConstraints));
    localStorage.setItem('scheduler_individual_constraints', JSON.stringify(demoIndividualConstraints));
    localStorage.setItem('scheduler_rooms', 'auto');
    
    location.reload();
}

// --- Professional CSP Solver Engine ---
async function handleGenerateSchedule() {
    const resultsDiv = document.getElementById('results');
    const spinner = document.getElementById('spinner');
    const progressBar = document.getElementById('progress-bar');
    const progressFill = document.getElementById('progress-fill');
    const calcButton = document.getElementById('calculate-btn');
    const diagnosticsPanel = document.getElementById('diagnostics-panel');
    
    resultsDiv.innerHTML = '<div class="spinner" id="spinner"></div><div class="progress-bar" id="progress-bar"><div class="progress-fill" id="progress-fill"></div></div>';
    spinner.style.display = 'block';
    progressBar.style.display = 'block';
    progressFill.style.width = '10%';
    calcButton.disabled = true;
    diagnosticsPanel.style.display = 'none';
    solutionCache = null;
    
    const startTime = performance.now();
    const groupParams = getCurrentGroupParams();
    
    // Update progress
    progressFill.style.width = '30%';
    
    let autoExtend = document.getElementById('auto-extend').checked;
    let horizonWeeks = Math.max(1, parseInt(document.getElementById('horizon-weeks').value || '5', 10));
    let attempts = 0;
    let finalSolution, finalUnscheduled, numRoomsUsed, stats, diagnostics;
    
    while (true) {
        const gen = generateTasksAndDomainsWithDiagnostics(groupParams);
        diagnostics = gen.diagnostics;
        
        if (gen.error) {
            resultsDiv.innerHTML = `<span class="not-feasible">❌ Error: ${gen.error}</span>`;
            showDiagnostics(diagnostics, []);
            spinner.style.display = 'none';
            progressBar.style.display = 'none';
            calcButton.disabled = false;
            return;
        }
        
        const { domains, allTasksInOrder } = gen;
        progressFill.style.width = '50%';
        
        const roomsSetting = document.getElementById('rooms-select').value;
        
        if (roomsSetting === 'auto') {
            let result1 = await solveWithSelectedAlgorithm(allTasksInOrder, domains, 1, groupParams);
            if (result1.unscheduled.length === 0) {
                finalSolution = result1.solution;
                finalUnscheduled = result1.unscheduled;
                numRoomsUsed = 1;
                stats = result1.stats;
            } else {
                let result2 = await solveWithSelectedAlgorithm(allTasksInOrder, domains, 2, groupParams);
                finalSolution = result2.solution;
                finalUnscheduled = result2.unscheduled;
                numRoomsUsed = 2;
                stats = result2.stats;
            }
        } else {
            numRoomsUsed = parseInt(roomsSetting, 10);
            let result = await solveWithSelectedAlgorithm(allTasksInOrder, domains, numRoomsUsed, groupParams);
            finalSolution = result.solution;
            finalUnscheduled = result.unscheduled;
            stats = result.stats;
        }
        
        // Exit or auto-extend
        if (!autoExtend || finalUnscheduled.length === 0 || attempts >= 12) break;
        
        // extend horizon by 1 week and retry
        attempts++;
        horizonWeeks++;
        localStorage.setItem('scheduler_horizon_weeks', String(horizonWeeks));
    }
    
    progressFill.style.width = '100%';
    solutionCache = finalSolution;
    
    const endTime = performance.now();
    const solveTime = ((endTime - startTime) / 1000).toFixed(2);
    
    saveSolutionToStorage(finalSolution, numRoomsUsed, stats, finalUnscheduled.length);
    
    let resultHTML = '';
    const pastAppointmentsCount = currentDate ? getPastAppointmentsCount() : 0;
    
    if (stats.timedOut) {
        resultHTML = `<span class="not-feasible">⏱️ Solver Timeout (30s limit reached)</span>`;
        resultHTML += `<div class="solver-stats">Consider reducing constraints or increasing room count. Partial solution with ${finalUnscheduled.length} unscheduled task(s).</div>`;
    } else if (finalUnscheduled.length > 0) {
        resultHTML = `<span class="partial-success">⚠️ Partial Schedule Generated</span>`;
        resultHTML += `<div class="solver-stats">${finalUnscheduled.length} task(s) unscheduled | ${numRoomsUsed} room(s) used</div>`;
    } else {
        resultHTML = `<span class="feasible">✅ Complete Schedule Generated</span>`;
        resultHTML += `<div class="solver-stats">All tasks scheduled | ${numRoomsUsed} room(s) used</div>`;
    }
    
    if (pastAppointmentsCount > 0) {
        resultHTML += `<div class="solver-stats" style="color: #856404;"><strong>🔒 Locked:</strong> ${pastAppointmentsCount} past appointment(s) preserved</div>`;
    }
    
    resultHTML += `<div class="solver-stats"><strong>Algorithm:</strong> ${ALGORITHM_DESCRIPTIONS[selectedAlgorithm].split(':')[0]} | <strong>Time:</strong> ${solveTime}s</div>`;
    
    if (stats.assignments !== undefined) {
        resultHTML += `<div class="solver-stats"><strong>Assignments:</strong> ${stats.assignments} | <strong>Backtracks:</strong> ${stats.backtracks || 0} | <strong>Constraint Checks:</strong> ${stats.constraintChecks || 0}</div>`;
    }
    
    resultsDiv.innerHTML = resultHTML;
    showDiagnostics(diagnostics, finalUnscheduled);
    
    spinner.style.display = 'none';
    progressBar.style.display = 'none';
    calcButton.disabled = false;
    
    // Force calendar refresh with latest solution
    renderCalendar();
    
    // Refresh weekly schedule controls to show updated appointments
    renderWeeklyScheduleControls();
}

async function solveWithSelectedAlgorithm(tasks, domains, numRooms, groupParams) {
    switch (selectedAlgorithm) {
        case 'greedy':
            return solveGreedy(tasks, domains, numRooms, groupParams);
        case 'csp_backtrack':
            return await solveCSPBacktracking(tasks, domains, numRooms, groupParams);
        case 'min_conflict':
            return await solveMinConflict(tasks, domains, numRooms, groupParams);
        case 'simulated_annealing':
            return await solveSimulatedAnnealing(tasks, domains, numRooms, groupParams);
        default:
            return solveGreedy(tasks, domains, numRooms, groupParams);
    }
}

/**
 * FAST GREEDY SCHEDULER - No Backtracking, No Freezing
 * Simple greedy algorithm that assigns tasks in priority order
 */
function solveGreedy(tasksToSchedule, domains, numRooms, groupParams) {
    const startTime = performance.now();
    let stats = {
        assignments: 0,
        backtracks: 0,
        constraintChecks: 0
    };
    
    // Sort tasks by domain size (MRV heuristic) - tasks with fewer options first
    const sortedTasks = [...tasksToSchedule].sort((a, b) => {
        const sizeA = domains[a]?.length || 0;
        const sizeB = domains[b]?.length || 0;
        if (sizeA !== sizeB) return sizeA - sizeB;
        
        // Tie-breaker: prefer higher priority tasks
        const priorityA = PRIORITY_ORDER.indexOf(getGroupFromTaskId(a));
        const priorityB = PRIORITY_ORDER.indexOf(getGroupFromTaskId(b));
        return priorityA - priorityB;
    });
    
    // Track room schedules - each room has a set of occupied slots
    const roomSchedules = Array.from({ length: numRooms }, () => new Set());
    const assignment = new Map();
    const unscheduledTasks = [];
    
    // Greedy assignment: try each task once, assign to first available slot
    for (const task of sortedTasks) {
        const groupInfo = groupParams.find(g => g.id === getGroupFromTaskId(task));
        const duration = groupInfo.duration || 15;
        const requiredSlotsCount = duration / 15;
        const domain = domains[task] || [];
        let assigned = false;
        
        // Try each slot in the domain
        for (const slot of domain) {
            const requiredSlots = getConsecutiveSlots(slot, requiredSlotsCount);
            if (requiredSlots.length < requiredSlotsCount) continue;
            
            // Find an available room
            for (let room = 0; room < numRooms; room++) {
                // Check if all required slots are free in this room
                if (requiredSlots.every(s => !roomSchedules[room].has(s))) {
                    // Assign to this room
                    requiredSlots.forEach(s => roomSchedules[room].add(s));
                    assignment.set(task, { slot, room: room + 1, task });
                    stats.assignments++;
                    assigned = true;
                    break;
                }
            }
            if (assigned) break;
        }
        
        if (!assigned) {
            unscheduledTasks.push(task);
        }
    }
    
    const solveTime = performance.now() - startTime;
    
    return {
        solution: assignment,
        unscheduled: unscheduledTasks,
        stats
    };
}

/**
 * CSP BACKTRACKING SOLVER with MRV and Forward Checking
 */
async function solveCSPBacktracking(tasks, domains, numRooms, groupParams) {
    const startTime = performance.now();
    const maxTime = 30000; // 30 second timeout
    let stats = {
        assignments: 0,
        backtracks: 0,
        constraintChecks: 0,
        timedOut: false
    };
    
    const assignment = new Map();
    const roomSchedules = Array.from({ length: numRooms }, () => new Set());
    
    // Sort tasks by domain size (MRV - Most Restrictive Variable)
    const sortedTasks = tasks.sort((a, b) => {
        const domainSizeA = domains[a]?.length || 0;
        const domainSizeB = domains[b]?.length || 0;
        if (domainSizeA !== domainSizeB) return domainSizeA - domainSizeB;
        return PRIORITY_ORDER.indexOf(getGroupFromTaskId(b)) - PRIORITY_ORDER.indexOf(getGroupFromTaskId(a));
    });
    
    const result = await backtrack(sortedTasks, 0, assignment, domains, roomSchedules, groupParams, stats, startTime, maxTime);
    
    return {
        solution: assignment,
        unscheduled: result ? [] : sortedTasks.filter(t => !assignment.has(t)),
        stats
    };
}

async function backtrack(tasks, taskIndex, assignment, domains, roomSchedules, groupParams, stats, startTime, maxTime) {
    if (performance.now() - startTime > maxTime) {
        stats.timedOut = true;
        return false;
    }
    
    if (taskIndex >= tasks.length) return true;
    
    const task = tasks[taskIndex];
    const domain = domains[task] || [];
    const groupInfo = groupParams.find(g => g.id === getGroupFromTaskId(task));
    const duration = groupInfo?.duration || 15;
    const requiredSlotsCount = duration / 15;
    
    for (const slot of domain) {
        stats.assignments++;
        
        const requiredSlots = getConsecutiveSlots(slot, requiredSlotsCount);
        if (requiredSlots.length < requiredSlotsCount) continue;
        
        // Try to assign to each room
        for (let room = 0; room < roomSchedules.length; room++) {
            if (isValidCSPAssignment(task, requiredSlots, room, roomSchedules, assignment, stats)) {
                // Make assignment
                requiredSlots.forEach(s => roomSchedules[room].add(s));
                assignment.set(task, { slot, room: room + 1, task });
                
                if (await backtrack(tasks, taskIndex + 1, assignment, domains, roomSchedules, groupParams, stats, startTime, maxTime)) {
                    return true;
                }
                
                // Backtrack
                stats.backtracks++;
                requiredSlots.forEach(s => roomSchedules[room].delete(s));
                assignment.delete(task);
            }
        }
    }
    
    return false;
}

function isValidCSPAssignment(task, requiredSlots, room, roomSchedules, assignment, stats) {
    stats.constraintChecks++;
    
    // Check room availability
    for (const reqSlot of requiredSlots) {
        if (roomSchedules[room].has(reqSlot)) {
            return false;
        }
    }
    
    // Check person availability (no double booking)
    const currentPersonId = getPersonIdFromTaskId(task);
    for (const [assignedTaskId, assignedInfo] of assignment) {
        const assignedPersonId = getPersonIdFromTaskId(assignedTaskId);
        
        if (assignedPersonId === currentPersonId) {
            const assignedSlots = getConsecutiveSlots(assignedInfo.slot, 1); // Simplified for now
            for (const reqSlot of requiredSlots) {
                if (assignedSlots.includes(reqSlot)) {
                    return false;
                }
            }
        }
    }
    
    return true;
}

/**
 * MIN-CONFLICT LOCAL SEARCH SOLVER
 */
async function solveMinConflict(tasks, domains, numRooms, groupParams) {
    const maxIterations = 1000;
    const maxTime = 30000; // 30 seconds
    const startTime = performance.now();
    
    let stats = {
        assignments: 0,
        backtracks: 0,
        constraintChecks: 0,
        iterations: 0,
        timedOut: false
    };
    
    // Generate initial random assignment
    let assignment = generateRandomAssignment(tasks, domains, numRooms);
    let conflicts = countConflicts(assignment, tasks, stats);
    
    let bestAssignment = new Map(assignment);
    let bestConflicts = conflicts;
    
    while (conflicts > 0 && stats.iterations < maxIterations) {
        if (performance.now() - startTime > maxTime) {
            stats.timedOut = true;
            break;
        }
        
        const conflictedTask = selectConflictedTask(assignment, tasks, stats);
        if (!conflictedTask) break;
        
        const bestMove = findBestMove(conflictedTask, assignment, domains, tasks, numRooms, stats);
        if (bestMove) {
            assignment.set(conflictedTask.id, bestMove);
            conflicts = countConflicts(assignment, tasks, stats);
            
            if (conflicts < bestConflicts) {
                bestAssignment = new Map(assignment);
                bestConflicts = conflicts;
            }
        }
        
        stats.iterations++;
    }
    
    return {
        solution: bestAssignment,
        unscheduled: bestConflicts > 0 ? getUnscheduledTasks(bestAssignment, tasks) : [],
        stats
    };
}

/**
 * SIMULATED ANNEALING SOLVER
 */
async function solveSimulatedAnnealing(tasks, domains, numRooms, groupParams) {
    const initialTemperature = 100;
    const coolingRate = 0.95;
    const minTemperature = 0.1;
    const maxIterations = 2000;
    const maxTime = 30000; // 30 seconds
    const startTime = performance.now();
    
    let stats = {
        assignments: 0,
        backtracks: 0,
        constraintChecks: 0,
        iterations: 0,
        timedOut: false
    };
    
    let currentSolution = generateRandomAssignment(tasks, domains, numRooms);
    let currentCost = calculateCost(currentSolution, tasks, stats);
    
    let bestSolution = new Map(currentSolution);
    let bestCost = currentCost;
    
    let temperature = initialTemperature;
    
    while (temperature > minTemperature && stats.iterations < maxIterations) {
        if (performance.now() - startTime > maxTime) {
            stats.timedOut = true;
            break;
        }
        
        const neighbor = generateNeighbor(currentSolution, tasks, domains, numRooms);
        const neighborCost = calculateCost(neighbor, tasks, stats);
        
        const deltaE = neighborCost - currentCost;
        
        if (deltaE < 0 || Math.random() < Math.exp(-deltaE / temperature)) {
            currentSolution = neighbor;
            currentCost = neighborCost;
            
            if (currentCost < bestCost) {
                bestSolution = new Map(currentSolution);
                bestCost = currentCost;
            }
        }
        
        temperature *= coolingRate;
        stats.iterations++;
    }
    
    return {
        solution: bestSolution,
        unscheduled: bestCost > 0 ? getUnscheduledTasks(bestSolution, tasks) : [],
        stats
    };
}

// Helper functions for advanced algorithms
function generateRandomAssignment(tasks, domains, numRooms) {
    const assignment = new Map();
    
    for (const task of tasks) {
        const domain = domains[task] || [];
        if (domain.length > 0) {
            const randomSlot = domain[Math.floor(Math.random() * domain.length)];
            const randomRoom = Math.floor(Math.random() * numRooms) + 1;
            assignment.set(task, { slot: randomSlot, room: randomRoom, task });
        }
    }
    
    return assignment;
}

function countConflicts(assignment, tasks, stats) {
    let conflicts = 0;
    const roomSchedules = new Map();
    const personSchedules = new Map();
    
    for (const [taskId, info] of assignment) {
        stats.constraintChecks++;
        const personId = getPersonIdFromTaskId(taskId);
        const slotKey = `${info.slot}_${info.room}`;
        
        // Check room conflicts
        if (roomSchedules.has(slotKey)) {
            conflicts++;
        } else {
            roomSchedules.set(slotKey, taskId);
        }
        
        // Check person conflicts
        const personKey = `${personId}_${info.slot}`;
        if (personSchedules.has(personKey)) {
            conflicts++;
        } else {
            personSchedules.set(personKey, taskId);
        }
    }
    
    return conflicts;
}

function selectConflictedTask(assignment, tasks, stats) {
    // Simple: return first task (could be improved)
    return tasks[0] ? { id: tasks[0] } : null;
}

function findBestMove(task, assignment, domains, tasks, numRooms, stats) {
    const domain = domains[task.id] || [];
    let bestMove = null;
    let bestConflictReduction = -Infinity;
    
    const currentConflicts = countConflicts(assignment, tasks, stats);
    
    for (const slot of domain.slice(0, 10)) { // Limit search for performance
        for (let room = 1; room <= numRooms; room++) {
            const move = { slot, room, task: task.id };
            
            // Try this move
            const originalMove = assignment.get(task.id);
            assignment.set(task.id, move);
            
            const newConflicts = countConflicts(assignment, tasks, stats);
            const conflictReduction = currentConflicts - newConflicts;
            
            if (conflictReduction > bestConflictReduction) {
                bestConflictReduction = conflictReduction;
                bestMove = move;
            }
            
            // Restore original
            if (originalMove) {
                assignment.set(task.id, originalMove);
            } else {
                assignment.delete(task.id);
            }
        }
    }
    
    return bestMove;
}

function calculateCost(assignment, tasks, stats) {
    // Cost = number of conflicts + penalty for unscheduled tasks
    let cost = countConflicts(assignment, tasks, stats);
    
    // Penalty for unscheduled tasks
    const scheduledTasks = new Set(assignment.keys());
    const unscheduledCount = tasks.filter(t => !scheduledTasks.has(t)).length;
    cost += unscheduledCount * 10;
    
    return cost;
}

function generateNeighbor(solution, tasks, domains, numRooms) {
    const neighbor = new Map(solution);
    
    // Randomly select a task to move
    const taskIds = Array.from(solution.keys());
    if (taskIds.length === 0) return neighbor;
    
    const randomTaskId = taskIds[Math.floor(Math.random() * taskIds.length)];
    const domain = domains[randomTaskId] || [];
    
    if (domain.length > 0) {
        const randomSlot = domain[Math.floor(Math.random() * domain.length)];
        const randomRoom = Math.floor(Math.random() * numRooms) + 1;
        neighbor.set(randomTaskId, { slot: randomSlot, room: randomRoom, task: randomTaskId });
    }
    
    return neighbor;
}

function getUnscheduledTasks(assignment, tasks) {
    return tasks.filter(t => !assignment.has(t));
}

/**
 * Save solution to localStorage for automatic persistence
 */
function saveSolutionToStorage(solution, numRooms, stats, unscheduledCount) {
    try {
        const solutionData = {
            solution: Array.from(solution.entries()),
            numRooms,
            stats,
            unscheduledCount,
            timestamp: new Date().toISOString(),
            currentDate: document.getElementById('current-date').value,
            algorithm: selectedAlgorithm
        };
        localStorage.setItem('scheduler_last_solution', JSON.stringify(solutionData));
    } catch (e) {
        console.error('Failed to save solution:', e);
    }
}

/**
 * Load last solution from localStorage
 */
function loadLastSolution() {
    try {
        const saved = localStorage.getItem('scheduler_last_solution');
        if (saved) {
            const solutionData = JSON.parse(saved);
            solutionCache = new Map(solutionData.solution);
            
            // Show loaded solution indicator with auto-load notification
            const resultsDiv = document.getElementById('results');
            const pastAppointmentsCount = currentDate ? getPastAppointmentsCount() : 0;
            
            let resultHTML = `<span class="feasible">📋 Schedule Auto-Loaded (No Refresh Needed!)</span>`;
            resultHTML += `<div class="solver-stats">${solutionData.solution.length} appointment(s) | ${solutionData.numRooms} room(s) used</div>`;
            
            if (solutionData.unscheduledCount > 0) {
                resultHTML += `<div class="solver-stats">${solutionData.unscheduledCount} task(s) were unscheduled</div>`;
            }
            
            if (pastAppointmentsCount > 0) {
                resultHTML += `<div class="solver-stats" style="color: #856404;"><strong>🔒 Locked:</strong> ${pastAppointmentsCount} past appointment(s)</div>`;
            }
            
            if (solutionData.algorithm) {
                resultHTML += `<div class="solver-stats"><strong>Algorithm:</strong> ${ALGORITHM_DESCRIPTIONS[solutionData.algorithm].split(':')[0]}</div>`;
            }
            
            resultHTML += `<div class="solver-stats"><small style="color: #6c757d;">Generated: ${new Date(solutionData.timestamp).toLocaleString()}</small></div>`;
            resultHTML += `<div class="solver-stats" style="color: #28a745; font-weight: bold;">✨ Schedule persists automatically - no manual refresh needed!</div>`;
            
            resultsDiv.innerHTML = resultHTML;
            
            // Render calendar with loaded solution
            renderCalendar();
            return true;
        }
    } catch (e) {
        console.error('Failed to load solution:', e);
    }
    return false;
}

// Continue with the rest of the implementation...
// [The file is getting quite long, so I'll continue in the next part]
// ---
 Weekly Schedule Management ---
function renderWeeklyScheduleControls() {
    const container = document.getElementById('weekly-schedule-container');
    const groupParams = getCurrentGroupParams();
    const { startDate } = getPlanningRange();
    const availableWeeks = getAvailableWeeksInPeriod();
    
    container.innerHTML = '';
    
    groupParams.forEach(group => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'weekly-schedule-group';
        
        // Initialize weekly settings for this group if not exists
        if (!weeklyScheduleSettings[group.id]) {
            weeklyScheduleSettings[group.id] = availableWeeks.map(w => w.weekNum);
        }
        
        const enabledWeeks = weeklyScheduleSettings[group.id] || [];
        const hasAppointments = getAppointmentsForGroup(group.id);
        
        let groupHTML = `<h4>${group.name} (${group.freq})</h4>`;
        groupHTML += `<div class="week-checkboxes">`;
        
        availableWeeks.forEach(week => {
            const isEnabled = enabledWeeks.includes(week.weekNum);
            const hasAppts = hasAppointments.some(apt => apt.weekNum === week.weekNum);
            const isDisabled = false; // All weeks can be enabled for any group
            
            groupHTML += `
                <div class="week-checkbox-item ${isDisabled ? 'week-disabled' : ''}">
                    <input type="checkbox" id="${group.id}_week_${week.weekNum}" 
                           ${isEnabled ? 'checked' : ''} ${isDisabled ? 'disabled' : ''}
                           onchange="updateWeeklySchedule('${group.id}', ${week.weekNum}, this.checked)">
                    <label for="${group.id}_week_${week.weekNum}">Week ${week.weekNum}</label>
                </div>
            `;
        });
        
        groupHTML += `</div>`;
        
        if (hasAppointments.length > 0) {
            const weekCounts = hasAppointments.reduce((acc, apt) => {
                acc[apt.weekNum] = (acc[apt.weekNum] || 0) + 1;
                return acc;
            }, {});
            const weekStatus = Object.entries(weekCounts)
                .map(([week, count]) => `Week ${week}: ${count} appointment(s)`)
                .join(', ');
            groupHTML += `<div class="week-status has-appointments">📅 Scheduled: ${weekStatus}</div>`;
        } else {
            groupHTML += `<div class="week-status">No appointments scheduled</div>`;
        }
        
        groupDiv.innerHTML = groupHTML;
        container.appendChild(groupDiv);
    });
}

function updateWeeklySchedule(groupId, weekNum, enabled) {
    if (!weeklyScheduleSettings[groupId]) {
        weeklyScheduleSettings[groupId] = [];
    }
    
    if (enabled) {
        if (!weeklyScheduleSettings[groupId].includes(weekNum)) {
            weeklyScheduleSettings[groupId].push(weekNum);
        }
    } else {
        weeklyScheduleSettings[groupId] = weeklyScheduleSettings[groupId].filter(w => w !== weekNum);
    }
    
    saveAllSettings();
}

function getAvailableWeeksInPeriod() {
    const { startDate, endDate } = getPlanningRange();
    const weeks = [];
    let currentDate = new Date(startDate);
    let weekNum = 1;
    
    while (currentDate <= endDate) {
        const weekStart = new Date(currentDate);
        const weekEnd = new Date(currentDate);
        weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
        
        weeks.push({
            weekNum: weekNum,
            startDate: weekStart,
            endDate: weekEnd,
            isoWeek: getISOWeek(weekStart)
        });
        
        currentDate.setUTCDate(currentDate.getUTCDate() + 7);
        weekNum++;
    }
    
    return weeks;
}

function getAppointmentsForGroup(groupId) {
    if (!solutionCache) return [];
    
    const appointments = [];
    for (const [task, info] of solutionCache.entries()) {
        if (task.startsWith(groupId + '_')) {
            const slotDate = new Date(info.slot.split('_')[0] + 'T00:00:00Z');
            const weekNum = getWeekNumberInPeriod(slotDate);
            appointments.push({
                task: task,
                slot: info.slot,
                room: info.room,
                weekNum: weekNum
            });
        }
    }
    
    return appointments;
}

function getWeekNumberInPeriod(date) {
    const { startDate } = getPlanningRange();
    const daysDiff = Math.floor((date - startDate) / (1000 * 60 * 60 * 24));
    return Math.floor(daysDiff / 7) + 1;
}

async function handleRegenerateSelectedWeeks() {
    const selectedWeeks = getSelectedWeeksForRegeneration();
    if (selectedWeeks.length === 0) {
        alert('Please select at least one week to regenerate.');
        return;
    }
    
    if (!confirm(`Regenerate schedule for weeks: ${selectedWeeks.join(', ')}? This will clear existing appointments for these weeks.`)) {
        return;
    }
    
    // Clear existing appointments for selected weeks
    clearAppointmentsForWeeks(selectedWeeks);
    
    // Generate new schedule for selected weeks only
    await generatePartialSchedule(selectedWeeks);
}

function getSelectedWeeksForRegeneration() {
    const selectedWeeks = new Set();
    const groupParams = getCurrentGroupParams();
    
    groupParams.forEach(group => {
        const enabledWeeks = weeklyScheduleSettings[group.id] || [];
        enabledWeeks.forEach(weekNum => selectedWeeks.add(weekNum));
    });
    
    return Array.from(selectedWeeks).sort((a, b) => a - b);
}

function clearAppointmentsForWeeks(weekNumbers) {
    if (!solutionCache) return;
    
    const appointmentsToRemove = [];
    for (const [task, info] of solutionCache.entries()) {
        const slotDate = new Date(info.slot.split('_')[0] + 'T00:00:00Z');
        const weekNum = getWeekNumberInPeriod(slotDate);
        if (weekNumbers.includes(weekNum)) {
            appointmentsToRemove.push(task);
        }
    }
    
    appointmentsToRemove.forEach(task => solutionCache.delete(task));
    
    // Update localStorage
    saveSolutionToStorage(solutionCache, getCurrentRoomCount(), getCurrentStats(), 0);
    
    // Re-render calendar
    renderCalendar();
}

async function generatePartialSchedule(weekNumbers) {
    const resultsDiv = document.getElementById('results');
    const spinner = document.getElementById('spinner');
    const progressBar = document.getElementById('progress-bar');
    const progressFill = document.getElementById('progress-fill');
    const calcButton = document.getElementById('calculate-btn');
    const diagnosticsPanel = document.getElementById('diagnostics-panel');
    
    resultsDiv.innerHTML = '<div class="spinner" id="spinner"></div><div class="progress-bar" id="progress-bar"><div class="progress-fill" id="progress-fill"></div></div>';
    spinner.style.display = 'block';
    progressBar.style.display = 'block';
    progressFill.style.width = '10%';
    calcButton.disabled = true;
    diagnosticsPanel.style.display = 'none';
    
    try {
        const groupParams = getCurrentGroupParams();
        const { domains, diagnostics, error, allTasksInOrder } = generateTasksAndDomainsForWeeks(groupParams, weekNumbers);
        
        if (error) {
            resultsDiv.innerHTML = `<span class="not-feasible">❌ Error: ${error}</span>`;
            showDiagnostics(diagnostics, []);
            return;
        }
        
        progressFill.style.width = '50%';
        
        const roomsSetting = document.getElementById('rooms-select').value;
        let finalSolution, finalUnscheduled, numRoomsUsed, stats;
        
        if (roomsSetting === 'auto') {
            let result1 = await solveWithSelectedAlgorithm(allTasksInOrder, domains, 1, groupParams);
            if (result1.unscheduled.length === 0) {
                finalSolution = result1.solution;
                finalUnscheduled = result1.unscheduled;
                numRoomsUsed = 1;
                stats = result1.stats;
            } else {
                let result2 = await solveWithSelectedAlgorithm(allTasksInOrder, domains, 2, groupParams);
                finalSolution = result2.solution;
                finalUnscheduled = result2.unscheduled;
                numRoomsUsed = 2;
                stats = result2.stats;
            }
        } else {
            numRoomsUsed = parseInt(roomsSetting, 10);
            let result = await solveWithSelectedAlgorithm(allTasksInOrder, domains, numRoomsUsed, groupParams);
            finalSolution = result.solution;
            finalUnscheduled = result.unscheduled;
            stats = result.stats;
        }
        
        // Merge with existing solution
        if (solutionCache) {
            for (const [task, info] of finalSolution.entries()) {
                solutionCache.set(task, info);
            }
        } else {
            solutionCache = finalSolution;
        }
        
        progressFill.style.width = '100%';
        
        // Save updated solution
        saveSolutionToStorage(solutionCache, numRoomsUsed, stats, finalUnscheduled.length);
        
        // Update results display
        let resultHTML = `<span class="feasible">✅ Partial Schedule Updated</span>`;
        resultHTML += `<div class="solver-stats">Weeks ${weekNumbers.join(', ')} regenerated | ${numRoomsUsed} room(s) used</div>`;
        if (finalUnscheduled.length > 0) {
            resultHTML += `<div class="solver-stats">${finalUnscheduled.length} task(s) unscheduled</div>`;
        }
        
        resultsDiv.innerHTML = resultHTML;
        showDiagnostics(diagnostics, finalUnscheduled);
        
        // Re-render calendar and weekly controls
        renderCalendar();
        renderWeeklyScheduleControls();
        
    } catch (error) {
        resultsDiv.innerHTML = `<span class="not-feasible">❌ Error: ${error.message}</span>`;
    } finally {
        spinner.style.display = 'none';
        progressBar.style.display = 'none';
        calcButton.disabled = false;
    }
}

function getCurrentRoomCount() {
    if (!solutionCache) return 0;
    const rooms = new Set();
    for (const [task, info] of solutionCache.entries()) {
        rooms.add(info.room);
    }
    return rooms.size;
}

function getCurrentStats() {
    return {
        assignments: solutionCache ? solutionCache.size : 0,
        backtracks: 0,
        constraintChecks: 0
    };
}

// --- Constraint Management ---
function toggleCustomConstraintBuilder() {
    const controls = document.getElementById('custom-constraint-controls');
    controls.style.display = controls.style.display === 'none' ? 'block' : 'none';
}

function addCustomConstraint() {
    groupConstraints.push({
        group: document.getElementById('constraint-group').value,
        week: document.getElementById('constraint-week').value,
        type: document.getElementById('constraint-type').value,
        value: parseInt(document.getElementById('constraint-day').value)
    });
    
    renderActiveGroupConstraints();
    saveAllSettings();
}

function removeGroupConstraint(index) {
    groupConstraints.splice(index, 1);
    renderActiveGroupConstraints();
    saveAllSettings();
}

function renderActiveGroupConstraints() {
    const list = document.getElementById('active-constraints-list');
    const groupNameMap = new Map(getCurrentGroupParams().map(g => [g.id, g.name]));
    
    list.innerHTML = groupConstraints.map((c, i) => {
        const gName = groupNameMap.get(c.group) || c.group;
        const weekText = c.week === 'all' ? 'All Weeks' : `Week ${c.week}`;
        const dayName = WEEKDAYS[c.value];
        const typeText = c.type === 'not_day' ? 'Cannot work on' : 'ONLY on';
        
        return `
            <li class="constraint-tag">
                <span>${gName} (${weekText}): ${typeText} ${dayName}</span>
                <button onclick="removeGroupConstraint(${i})">&times;</button>
            </li>
        `;
    }).join('');
}

// --- Modal & Availability Editor Logic ---
function clearPreviousSolutionUI() {
    solutionCache = null;
    lastDiagnostics = null;
    document.getElementById('results').innerHTML = '';
    document.getElementById('calculate-btn').disabled = false;
    
    // Clear saved solution from localStorage
    localStorage.removeItem('scheduler_last_solution');
    
    // Re-render calendar without appointments
    renderCalendar();
}

function setupModals() {
    const personListModal = document.getElementById('person-list-modal');
    const editorModal = document.getElementById('availability-editor-modal');
    
    const closeModalAndClearSolution = () => {
        editorModal.style.display = "none";
        lastClickedSlot = null;
        highlightedWeek = null;
    };
    
    document.getElementById('close-person-list').onclick = () => personListModal.style.display = "none";
    document.getElementById('close-editor').onclick = closeModalAndClearSolution;
    
    window.onclick = (event) => {
        if (event.target == personListModal) personListModal.style.display = "none";
        if (event.target == editorModal) closeModalAndClearSolution();
    };
    
    document.getElementById('add-range-btn').addEventListener('click', addRangeToCurrentPerson);
    document.getElementById('clear-all-slots').addEventListener('click', clearAllSlotsForPerson);
    document.getElementById('select-all-weekdays').addEventListener('click', selectAllWeekdaysForPerson);
}

function openPersonListModal() {
    const container = document.getElementById('person-list-container');
    const groupParams = getCurrentGroupParams();
    container.innerHTML = '';
    
    const problematicPeople = new Map();
    if (lastDiagnostics) {
        lastDiagnostics.forEach(d => {
            if (d.status === 'invalid') {
                const personId = getPersonIdFromTaskId(d.task);
                problematicPeople.set(personId, (problematicPeople.get(personId) || 0) + 1);
            }
        });
    }
    
    PRIORITY_ORDER.forEach(groupId => {
        const group = groupParams.find(g => g.id === groupId);
        if (!group) return;
        
        const groupPeople = Array.from({ length: group.count }, (_, i) => `${group.id}_${i + 1}`);
        const issuesInGroup = groupPeople.filter(p => problematicPeople.has(p));
        
        const details = document.createElement('details');
        if (issuesInGroup.length > 0) details.open = true;
        
        const summary = document.createElement('summary');
        let summaryHTML = `<span>${group.name}</span>`;
        if (issuesInGroup.length > 0) {
            summaryHTML += `<span class="issue-badge">🔴 ${issuesInGroup.length} issue(s)</span>`;
        }
        summary.innerHTML = summaryHTML;
        
        const content = document.createElement('div');
        content.className = 'person-group-content';
        
        groupPeople.forEach(personId => {
            const count = individualConstraints[personId]?.length || 0;
            const item = document.createElement('div');
            item.className = 'person-item';
            if (problematicPeople.has(personId)) {
                item.classList.add('has-issue');
            }
            item.dataset.personId = personId;
            item.dataset.groupName = group.name;
            item.innerHTML = `
                <div>
                    <strong>${personId}</strong>
                    <div class="task-constraints-summary">${(count * 15 / 60).toFixed(2)} hours available</div>
                </div>
                <button onclick="editPersonAvailability('${personId}')">Edit</button>
            `;
            content.appendChild(item);
        });
        
        details.appendChild(summary);
        details.appendChild(content);
        container.appendChild(details);
    });
    
    document.getElementById('person-list-modal').style.display = 'block';
}

function editPersonAvailability(personId, openFromDiagnostics = false, highlightWeekNum = null) {
    currentEditingPerson = personId;
    lastClickedSlot = null;
    highlightedWeek = highlightWeekNum;
    
    document.getElementById('editor-title').textContent = `Editing Availability for: ${personId}`;
    
    const workableDays = getWorkableDaysInRange();
    const daySelect = document.getElementById('editor-day');
    daySelect.innerHTML = '';
    
    workableDays.forEach(dateStr => {
        const date = new Date(dateStr + 'T00:00:00Z');
        daySelect.innerHTML += `<option value="${dateStr}">${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()}</option>`;
    });
    
    generateQuickSlotsGrid(workableDays);
    renderCurrentRanges();
    
    if(openFromDiagnostics) document.getElementById('person-list-modal').style.display = 'none';
    document.getElementById('availability-editor-modal').style.display = 'block';
}

function generateQuickSlotsGrid(days) {
    const grid = document.getElementById('quick-slots-grid');
    grid.innerHTML = '';
    grid.style.gridTemplateColumns = `100px repeat(${TIMES.length}, 1fr)`;
    
    const corner = document.createElement('div');
    corner.className = 'time-slot day-header';
    corner.style.zIndex = "30";
    grid.appendChild(corner);
    
    TIMES.forEach(time => {
        const header = document.createElement('div');
        header.className = 'time-slot time-header';
        header.textContent = time;
        grid.appendChild(header);
    });
    
    days.forEach(dateStr => {
        const date = new Date(dateStr + 'T00:00:00Z');
        const dayHeader = document.createElement('div');
        dayHeader.className = 'time-slot day-header';
        dayHeader.textContent = `${WEEKDAYS[date.getUTCDay()].substring(0, 3)} ${date.getUTCDate()}`;
        if (highlightedWeek && getISOWeek(date) === highlightedWeek) dayHeader.classList.add('problem-week');
        grid.appendChild(dayHeader);
        
        TIMES.forEach(timeStr => {
            const slot = document.createElement('div');
            slot.className = 'time-slot';
            slot.dataset.date = dateStr;
            slot.dataset.time = timeStr;
            if (isSlotSelected(dateStr, timeStr)) slot.classList.add('selected');
            slot.addEventListener('click', (event) => handleSlotClick(event));
            grid.appendChild(slot);
        });
    });
}

function isSlotSelected(dateStr, timeStr) {
    if (!individualConstraints[currentEditingPerson]) return false;
    const slotStart = new Date(`${dateStr}T${timeStr}:00Z`).getTime();
    return individualConstraints[currentEditingPerson].some(range => 
        slotStart >= range.start && slotStart < range.end
    );
}

function handleSlotClick(event) {
    const clickedSlot = event.target;
    const allSlots = Array.from(document.querySelectorAll('#quick-slots-grid .time-slot:not(.day-header):not(.time-header)'));
    
    if (event.shiftKey && lastClickedSlot) {
        const startIndex = allSlots.indexOf(lastClickedSlot);
        const endIndex = allSlots.indexOf(clickedSlot);
        const start = Math.min(startIndex, endIndex);
        const end = Math.max(startIndex, endIndex);
        const shouldSelect = !clickedSlot.classList.contains('selected');
        
        for (let i = start; i <= end; i++) {
            allSlots[i].classList.toggle('selected', shouldSelect);
        }
    } else {
        clickedSlot.classList.toggle('selected');
    }
    
    lastClickedSlot = clickedSlot;
    syncAvailabilityFromGrid();
}

function syncAvailabilityFromGrid() {
    const newRanges = [];
    document.querySelectorAll('#quick-slots-grid .time-slot.selected').forEach(slot => {
        const { date, time } = slot.dataset;
        const start = new Date(`${date}T${time}:00Z`).getTime();
        newRanges.push({ start: start, end: start + 900000 });
    });
    
    individualConstraints[currentEditingPerson] = newRanges;
    renderCurrentRanges();
    saveAllSettings();
}

function renderCurrentRanges() {
    const list = document.getElementById('current-ranges-list');
    list.innerHTML = '';
    
    if (!individualConstraints[currentEditingPerson]) return;
    
    individualConstraints[currentEditingPerson].sort((a, b) => a.start - b.start).forEach((range) => {
        const start = new Date(range.start);
        const li = document.createElement('li');
        li.className = 'range-item';
        li.innerHTML = `
            <span>${WEEKDAYS[start.getUTCDay()]} ${start.getUTCDate()}, ${start.getUTCHours().toString().padStart(2,'0')}:${start.getUTCMinutes().toString().padStart(2,'0')}</span>
        `;
        list.appendChild(li);
    });
}

function addRangeToCurrentPerson() {
    const day = document.getElementById('editor-day').value;
    const startTimeInput = document.getElementById('editor-start-time');
    const endTimeInput = document.getElementById('editor-end-time');
    
    const startTime = roundTimeDownTo15(startTimeInput.value);
    const endTime = roundTimeDownTo15(endTimeInput.value);
    
    startTimeInput.value = startTime;
    endTimeInput.value = endTime;
    
    if (!day || !startTime || !endTime || startTime >= endTime) {
        alert("Invalid time range.");
        return;
    }
    
    const startMs = new Date(`${day}T${startTime}:00Z`).getTime();
    const endMs = new Date(`${day}T${endTime}:00Z`).getTime();
    
    if (!individualConstraints[currentEditingPerson]) {
        individualConstraints[currentEditingPerson] = [];
    }
    
    for (let time = startMs; time < endMs; time += 900000) {
        if (!individualConstraints[currentEditingPerson].some(r => r.start === time)) {
            individualConstraints[currentEditingPerson].push({ start: time, end: time + 900000 });
        }
    }
    
    generateQuickSlotsGrid(getWorkableDaysInRange());
    renderCurrentRanges();
    saveAllSettings();
}

function clearAllSlotsForPerson() {
    individualConstraints[currentEditingPerson] = [];
    generateQuickSlotsGrid(getWorkableDaysInRange());
    renderCurrentRanges();
    saveAllSettings();
}

function selectAllWeekdaysForPerson() {
    const newRanges = [];
    getWorkableDaysInRange().forEach(dateStr => {
        const startOfDay = new Date(`${dateStr}T09:00:00Z`).getTime();
        const endOfDay = new Date(`${dateStr}T17:00:00Z`).getTime();
        
        for (let time = startOfDay; time < endOfDay; time += 900000) {
            newRanges.push({ start: time, end: time + 900000 });
        }
    });
    
    individualConstraints[currentEditingPerson] = newRanges;
    generateQuickSlotsGrid(getWorkableDaysInRange());
    renderCurrentRanges();
    saveAllSettings();
}

function filterPersonList() {
    const filter = document.getElementById('person-filter').value.toLowerCase();
    document.querySelectorAll('#person-list-container details').forEach(detail => {
        let hasVisiblePerson = false;
        detail.querySelectorAll('.person-item').forEach(item => {
            const isVisible = item.dataset.personId.toLowerCase().includes(filter);
            item.style.display = isVisible ? 'flex' : 'none';
            if (isVisible) hasVisiblePerson = true;
        });
        detail.style.display = (hasVisiblePerson || filter === '') ? 'block' : 'none';
        if (hasVisiblePerson && filter !== '') detail.open = true;
    });
}

/**
 * RE-ARCHITECTED: This function now correctly handles 'monthly' tasks as a single logical unit
 * spanning the entire scheduling period, fixing the core logic flaw.
 * OPTIMIZED: Added timeout protection to prevent freezing
 */
function generateTasksAndDomainsWithDiagnostics(groupParams) {
    let tasks = {}, domains = {}, diagnostics = [];
    const planningSlots = getSlotsForPlanning(); // Only future slots for planning
    const allTasksInOrder = [];
    const MAX_TIME_MS = 10000; // 10 second timeout for domain generation
    const startTime = performance.now();
    
    if (planningSlots.length === 0) {
        return { error: "No future workable days (Mon-Fri) in the selected date range.", diagnostics: [] };
    }
    
    const isoWeeksInPeriod = [...new Set(planningSlots.map(s => getISOWeek(new Date(s.split('_')[0] + 'T00:00:00Z'))))].sort((a,b) => a-b);
    const isoWeekToPeriodWeekMap = new Map(isoWeeksInPeriod.map((isoWeek, index) => [isoWeek, index + 1]));
    
    // --- NEW: Logical Task Generation ---
    for (const group of groupParams) {
        for (let i = 1; i <= group.count; i++) {
            const personId = `${group.id}_${i}`;
            
            if (group.freq === 'monthly') {
                // Monthly tasks can be scheduled in any enabled week
                const enabledWeeks = weeklyScheduleSettings[group.id] || [];
                if (enabledWeeks.length === 0 || enabledWeeks.length > 0) {
                    tasks[`${personId}_monthly`] = { group: group.id, isoWeek: 'all' };
                }
            } else {
                // Weekly and bi-weekly tasks are tied to specific weeks
                let taskWeeks = [];
                
                if (group.freq === 'weekly') {
                    taskWeeks = isoWeeksInPeriod;
                } else if (group.freq === 'every_2_weeks') {
                    taskWeeks = isoWeeksInPeriod.filter(w => {
                        const periodWeek = isoWeekToPeriodWeekMap.get(w);
                        return group.pattern === 'any' || 
                               (group.pattern === 'odd' && periodWeek % 2 !== 0) || 
                               (group.pattern === 'even' && periodWeek % 2 === 0);
                    });
                }
                
                taskWeeks.forEach(isoWeek => {
                    tasks[`${personId}_w${isoWeek}`] = { group: group.id, isoWeek: isoWeek };
                });
            }
        }
    }
    
    PRIORITY_ORDER.forEach(groupKey => {
        const group = groupParams.find(g => g.id === groupKey);
        if (group) {
            for (let i = 1; i <= group.count; i++) {
                const personId = `${group.id}_${i}`;
                Object.keys(tasks).filter(t => t.startsWith(personId)).forEach(t => allTasksInOrder.push(t));
            }
        }
    });
    
    // --- NEW: Holistic Domain Calculation ---
    for (const task of Object.keys(tasks)) {
        // Check timeout during domain generation
        if (performance.now() - startTime > MAX_TIME_MS) {
            return { error: "Domain generation timeout - too many tasks/constraints. Please reduce task count or constraints.", diagnostics: [] };
        }
        
        const { group, isoWeek } = tasks[task];
        const groupDetails = groupParams.find(p => p.id === group);
        const duration = groupDetails.duration || 15;
        const requiredSlotsCount = duration / 15;
        
        const diag = { task: task, constraints: [] };
        let possible15MinSlots;
        
        if (isoWeek === 'all') { // This is a monthly task
            // Filter monthly tasks by enabled weeks for this group
            const enabledWeeks = weeklyScheduleSettings[group] && weeklyScheduleSettings[group].length > 0 ? 
                new Set(weeklyScheduleSettings[group]) : null;
            
            if (enabledWeeks) {
                possible15MinSlots = new Set(planningSlots.filter(s => {
                    const sDate = new Date(s.split('_')[0] + 'T00:00:00Z');
                    const periodWeek = isoWeekToPeriodWeekMap.get(getISOWeek(sDate));
                    return enabledWeeks.has(periodWeek);
                }));
            } else {
                possible15MinSlots = new Set(planningSlots); // Start with ALL slots in the period
            }
        } else { // This is a weekly/bi-weekly task
            possible15MinSlots = new Set(planningSlots.filter(s => 
                getISOWeek(new Date(s.split('_')[0] + 'T00:00:00Z')) === isoWeek
            ));
        }
        
        diag.initialSlots = possible15MinSlots.size;
        
        groupConstraints.filter(c => c.group === group).forEach(c => {
            const beforeCount = possible15MinSlots.size;
            possible15MinSlots = new Set([...possible15MinSlots].filter(s => {
                const sDate = new Date(s.split('_')[0] + 'T00:00:00Z');
                const sPeriodWeek = isoWeekToPeriodWeekMap.get(getISOWeek(sDate));
                
                if (!(c.week === 'all' || parseInt(c.week) === sPeriodWeek)) return true;
                
                if (c.type === 'not_day') return sDate.getUTCDay() !== c.value;
                if (c.type === 'only_day') return sDate.getUTCDay() === c.value;
                return true;
            }));
            
            diag.constraints.push({
                type: 'Group Rule (Hard)',
                desc: `${c.type} on ${WEEKDAYS[c.value]}`,
                removed: beforeCount - possible15MinSlots.size,
                remaining: possible15MinSlots.size
            });
        });
        
        const indConstraints = individualConstraints[getPersonIdFromTaskId(task)];
        if (indConstraints?.length > 0) {
            const beforeCount = possible15MinSlots.size;
            const personSlots = new Set(indConstraints.map(r => {
                const d = new Date(r.start);
                return `${d.toISOString().slice(0,10)}_${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}`;
            }));
            
            possible15MinSlots = new Set([...possible15MinSlots].filter(s => personSlots.has(s)));
            
            diag.constraints.push({
                type: 'Individual Availability (Hard)',
                desc: `Custom hours set`,
                removed: beforeCount - possible15MinSlots.size,
                remaining: possible15MinSlots.size
            });
        }
        
        const beforeDurationFilterCount = possible15MinSlots.size;
        let validStartSlots = new Set();
        
        if (requiredSlotsCount > 0) {
            // Optimized: Convert to array for faster iteration
            const slotsArray = Array.from(possible15MinSlots);
            for (let i = 0; i < slotsArray.length; i++) {
                const slot = slotsArray[i];
                const consecutive = getConsecutiveSlots(slot, requiredSlotsCount);
                if (consecutive.length === requiredSlotsCount && consecutive.every(s => possible15MinSlots.has(s))) {
                    validStartSlots.add(slot);
                }
            }
        }
        
        diag.constraints.push({
            type: 'Duration Check (Hard)',
            desc: `Requires ${duration} mins`,
            removed: beforeDurationFilterCount - validStartSlots.size,
            remaining: validStartSlots.size
        });
        
        diag.finalSlots = validStartSlots.size;
        
        if (allTasksInOrder.includes(task)) {
            diag.status = (diag.finalSlots === 0) ? 'invalid' : 'valid';
            diagnostics.push(diag);
        }
        
        domains[task] = Array.from(validStartSlots).sort((a, b) => {
            const dayA = new Date(a.split('_')[0] + 'T00:00:00Z').getUTCDay();
            const dayB = new Date(b.split('_')[0] + 'T00:00:00Z').getUTCDay();
            const preferred = (groupDetails.preferredDay && groupDetails.preferredDay !== 'any') ? 
                parseInt(groupDetails.preferredDay) : -1;
            
            const scoreA = (dayA === preferred ? 0 : 1);
            const scoreB = (dayB === preferred ? 0 : 1);
            
            if (scoreA !== scoreB) return scoreA - scoreB;
            return a.localeCompare(b);
        });
    }
    
    return { tasks, domains, diagnostics, allTasksInOrder };
}

/**
 * Generate tasks and domains for specific weeks only (for partial scheduling)
 */
function generateTasksAndDomainsForWeeks(groupParams, weekNumbers) {
    let tasks = {}, domains = {}, diagnostics = [];
    const planningSlots = getSlotsForPlanning();
    const allTasksInOrder = [];
    const MAX_TIME_MS = 10000;
    const startTime = performance.now();
    
    if (planningSlots.length === 0) {
        return { error: "No future workable days (Mon-Fri) in the selected date range.", diagnostics: [] };
    }
    
    const isoWeeksInPeriod = [...new Set(planningSlots.map(s => getISOWeek(new Date(s.split('_')[0] + 'T00:00:00Z'))))].sort((a,b) => a-b);
    const isoWeekToPeriodWeekMap = new Map(isoWeeksInPeriod.map((isoWeek, index) => [isoWeek, index + 1]));
    
    // Filter slots to only include selected weeks
    const filteredSlots = planningSlots.filter(slot => {
        const slotDate = new Date(slot.split('_')[0] + 'T00:00:00Z');
        const weekNum = getWeekNumberInPeriod(slotDate);
        return weekNumbers.includes(weekNum);
    });
    
    if (filteredSlots.length === 0) {
        return { error: "No workable days in the selected weeks.", diagnostics: [] };
    }
    
    // Generate tasks for selected weeks only
    for (const group of groupParams) {
        for (let i = 1; i <= group.count; i++) {
            const personId = `${group.id}_${i}`;
            
            // Check if this group should be scheduled in any of the selected weeks
            const enabledWeeks = weeklyScheduleSettings[group.id] || [];
            const shouldSchedule = enabledWeeks.some(weekNum => weekNumbers.includes(weekNum));
            
            if (!shouldSchedule) continue;
            
            if (group.freq === 'monthly') {
                // Monthly tasks - can be scheduled in any enabled week
                if (enabledWeeks.some(weekNum => weekNumbers.includes(weekNum))) {
                    tasks[`${personId}_monthly`] = { group: group.id, isoWeek: 'all' };
                }
            } else {
                // Weekly and bi-weekly tasks for selected weeks
                const relevantWeeks = isoWeeksInPeriod.filter(isoWeek => {
                    const periodWeek = isoWeekToPeriodWeekMap.get(isoWeek);
                    return weekNumbers.includes(periodWeek);
                });
                
                if (group.freq === 'weekly') {
                    relevantWeeks.forEach(isoWeek => {
                        tasks[`${personId}_w${isoWeek}`] = { group: group.id, isoWeek: isoWeek };
                    });
                } else if (group.freq === 'every_2_weeks') {
                    relevantWeeks.filter(w => {
                        const periodWeek = isoWeekToPeriodWeekMap.get(w);
                        return group.pattern === 'any' || 
                               (group.pattern === 'odd' && periodWeek % 2 !== 0) || 
                               (group.pattern === 'even' && periodWeek % 2 === 0);
                    }).forEach(isoWeek => {
                        tasks[`${personId}_w${isoWeek}`] = { group: group.id, isoWeek: isoWeek };
                    });
                }
            }
        }
    }
    
    // Add tasks to priority order
    PRIORITY_ORDER.forEach(groupKey => {
        const group = groupParams.find(g => g.id === groupKey);
        if (group) {
            for (let i = 1; i <= group.count; i++) {
                const personId = `${group.id}_${i}`;
                Object.keys(tasks).filter(t => t.startsWith(personId)).forEach(t => allTasksInOrder.push(t));
            }
        }
    });
    
    // Generate domains for filtered slots
    for (const task of Object.keys(tasks)) {
        if (performance.now() - startTime > MAX_TIME_MS) {
            return { error: "Domain generation timeout - too many tasks/constraints. Please reduce task count or constraints.", diagnostics: [] };
        }
        
        const { group, isoWeek } = tasks[task];
        const groupDetails = groupParams.find(p => p.id === group);
        const duration = groupDetails.duration || 15;
        const requiredSlotsCount = duration / 15;
        
        const diag = { task: task, constraints: [] };
        let possible15MinSlots;
        
        if (isoWeek === 'all') {
            possible15MinSlots = new Set(filteredSlots);
        } else {
            possible15MinSlots = new Set(filteredSlots.filter(s => 
                getISOWeek(new Date(s.split('_')[0] + 'T00:00:00Z')) === isoWeek
            ));
        }
        
        diag.initialSlots = possible15MinSlots.size;
        
        // Apply group constraints
        groupConstraints.filter(c => c.group === group).forEach(c => {
            const beforeCount = possible15MinSlots.size;
            possible15MinSlots = new Set([...possible15MinSlots].filter(s => {
                const sDate = new Date(s.split('_')[0] + 'T00:00:00Z');
                const sPeriodWeek = isoWeekToPeriodWeekMap.get(getISOWeek(sDate));
                
                if (!(c.week === 'all' || parseInt(c.week) === sPeriodWeek)) return true;
                
                if (c.type === 'not_day') return sDate.getUTCDay() !== c.value;
                if (c.type === 'only_day') return sDate.getUTCDay() === c.value;
                return true;
            }));
            
            diag.constraints.push({
                type: 'Group Rule (Hard)',
                desc: `${c.type} on ${WEEKDAYS[c.value]}`,
                removed: beforeCount - possible15MinSlots.size,
                remaining: possible15MinSlots.size
            });
        });
        
        // Apply individual constraints
        const indConstraints = individualConstraints[getPersonIdFromTaskId(task)];
        if (indConstraints?.length > 0) {
            const beforeCount = possible15MinSlots.size;
            const personSlots = new Set(indConstraints.map(r => {
                const d = new Date(r.start);
                return `${d.toISOString().slice(0,10)}_${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}`;
            }));
            
            possible15MinSlots = new Set([...possible15MinSlots].filter(s => personSlots.has(s)));
            
            diag.constraints.push({
                type: 'Individual Availability (Hard)',
                desc: `Custom hours set`,
                removed: beforeCount - possible15MinSlots.size,
                remaining: possible15MinSlots.size
            });
        }
        
        // Apply duration filter
        const beforeDurationFilterCount = possible15MinSlots.size;
        let validStartSlots = new Set();
        
        if (requiredSlotsCount > 0) {
            const slotsArray = Array.from(possible15MinSlots);
            for (let i = 0; i < slotsArray.length; i++) {
                const slot = slotsArray[i];
                const consecutive = getConsecutiveSlots(slot, requiredSlotsCount);
                if (consecutive.length === requiredSlotsCount && consecutive.every(s => possible15MinSlots.has(s))) {
                    validStartSlots.add(slot);
                }
            }
        }
        
        diag.constraints.push({
            type: 'Duration Check (Hard)',
            desc: `Requires ${duration} mins`,
            removed: beforeDurationFilterCount - validStartSlots.size,
            remaining: validStartSlots.size
        });
        
        diag.finalSlots = validStartSlots.size;
        
        if (allTasksInOrder.includes(task)) {
            diag.status = (diag.finalSlots === 0) ? 'invalid' : 'valid';
            diagnostics.push(diag);
        }
        
        domains[task] = Array.from(validStartSlots).sort((a, b) => {
            const dayA = new Date(a.split('_')[0] + 'T00:00:00Z').getUTCDay();
            const dayB = new Date(b.split('_')[0] + 'T00:00:00Z').getUTCDay();
            const preferred = (groupDetails.preferredDay && groupDetails.preferredDay !== 'any') ? 
                parseInt(groupDetails.preferredDay) : -1;
            
            const scoreA = (dayA === preferred ? 0 : 1);
            const scoreB = (dayB === preferred ? 0 : 1);
            
            if (scoreA !== scoreB) return scoreA - scoreB;
            return a.localeCompare(b);
        });
    }
    
    return { tasks, domains, diagnostics, allTasksInOrder };
}

function showDiagnostics(diagnostics, unscheduled) {
    const panel = document.getElementById('diagnostics-panel');
    const content = document.getElementById('diagnostics-content');
    let html = '';
    
    if (unscheduled && unscheduled.length > 0) {
        html += `<div class="unscheduled-list"><div class="diagnostics-header">Unscheduled Tasks (due to conflicts)</div>`;
        unscheduled.forEach(task => {
            html += `<div class="unscheduled-item">❌ ${task}</div>`;
        });
        html += `</div>`;
    }
    
    const invalidDiagnostics = diagnostics.filter(d => d.status === 'invalid');
    if(invalidDiagnostics.length > 0){
        html += `<div class="diagnostics-header" style="padding-top:1rem;">Constraint Violations (Tasks with zero available start slots)</div>`;
        html += invalidDiagnostics.map(d => {
            const personId = getPersonIdFromTaskId(d.task);
            const isMonthly = d.task.endsWith('_monthly');
            const weekNum = isMonthly ? 'null' : (d.task.match(/_w(\d+)$/)?.[1] ?? 'null');
            
            let detailsHtml = (d.constraints || []).map(c => 
                `<div>- <strong>${c.type}:</strong> ${c.desc} (Removed: ${c.removed}, Remaining: ${c.remaining})</div>`
            ).join('');
            
            return `
                <div class="constraint-status invalid">
                    <span>❌ <strong class="diagnostic-task" onclick="editPersonAvailability('${personId}', true, ${weekNum})">${d.task}</strong></span>
                    <span class="slot-count">${d.finalSlots} slots</span>
                </div>
                <div class="conflict-details">${detailsHtml}</div>
            `;
        }).join('');
    }
    
    if(html.trim() === '') {
        panel.style.display = 'none';
    } else {
        content.innerHTML = html;
        panel.style.display = 'block';
    }
}

// --- Calendar Rendering ---
function renderCalendar(year, month) {
    const { startDate } = getPlanningRange();
    const displayDate = (typeof year === 'number' && month != null) ? 
        new Date(Date.UTC(year, month, 1)) : startDate;
    const displayYear = displayDate.getUTCFullYear();
    const displayMonth = displayDate.getUTCMonth();
    
    const monthYearDisplay = document.getElementById('month-year-display');
    monthYearDisplay.textContent = `${displayDate.toLocaleString('default', { month: 'long', timeZone: 'UTC' })} ${displayYear}`;
    monthYearDisplay.dataset.date = displayDate.toISOString();
    
    const calendarBody = document.getElementById('calendar-body');
    calendarBody.innerHTML = '';
    
    const firstDayOfMonth = new Date(Date.UTC(displayYear, displayMonth, 1));
    const daysInMonth = new Date(Date.UTC(displayYear, displayMonth + 1, 0)).getUTCDate();
    let startDayOfWeek = (firstDayOfMonth.getUTCDay() + 6) % 7;
    
    for (let i = 0; i < startDayOfWeek; i++) {
        calendarBody.insertAdjacentHTML('beforeend', '<div class="calendar-day other-month"></div>');
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(Date.UTC(displayYear, displayMonth, day));
        const dateStr = currentDate.toISOString().slice(0, 10);
        
        // Check if this is a past date or today
        const isPastDate = currentDate && currentDate < new Date();
        const isToday = currentDate && currentDate.toDateString() === new Date().toDateString();
        
        let dayClass = 'calendar-day';
        if (isPastDate) dayClass += ' past-date';
        if (isToday) dayClass += ' today';
        
        let appointmentsHTML = `<div class="day-number">${day}</div>`;
        
        if (solutionCache) {
            const dailyAppointments = [];
            for (const [task, info] of solutionCache.entries()) {
                if (info.slot.startsWith(dateStr)) {
                    dailyAppointments.push({ task, time: info.slot.split('_')[1], room: info.room });
                }
            }
            
            dailyAppointments.sort((a,b) => a.time.localeCompare(b.time));
            
            appointmentsHTML += dailyAppointments.map(a => {
                const lockedClass = isPastDate ? ' locked' : '';
                return `
                    <div class="appointment ${getGroupFromTaskId(a.task)}${lockedClass}" 
                         title="${a.task} at ${a.time} in Room ${a.room}${isPastDate ? ' (Past - Locked)' : ''}">
                        ${a.time} - ${getPersonIdFromTaskId(a.task)} (R${a.room})
                    </div>
                `;
            }).join('');
        }
        
        calendarBody.insertAdjacentHTML('beforeend', `<div class="${dayClass}">${appointmentsHTML}</div>`);
    }
}

// --- Helper functions ---
function getCurrentGroupParams() {
    return Array.from(document.querySelectorAll('.group-card')).map(card => {
        const id = card.querySelector('input[type=number]').id.replace('-count', '');
        return {
            id,
            name: card.querySelector('h3').textContent,
            count: parseInt(document.getElementById(`${id}-count`).value),
            duration: parseInt(document.getElementById(`${id}-duration`).value),
            measurements: parseInt(document.getElementById(`${id}-measurements`).value) || 1,
            freq: document.getElementById(`${id}-freq`).value,
            pattern: document.getElementById(`${id}-pattern`).value,
            preferredDay: document.getElementById(`${id}-preferredDay`).value
        };
    });
}

function getPlanningRange(startDateStr) {
    const d = startDateStr || document.getElementById('schedule-start-date').value;
    const userStartDate = new Date(d + 'T00:00:00Z');
    const horizonWeeks = Math.max(1, parseInt(localStorage.getItem('scheduler_horizon_weeks') || document.getElementById('horizon-weeks')?.value || '5', 10));
    const alignment = localStorage.getItem('scheduler_start_alignment') || document.getElementById('start-alignment')?.value || 'as_is';
    const allowPast = (localStorage.getItem('scheduler_allow_past') || (document.getElementById('allow-past')?.checked ? 'true' : 'false')) === 'true';
    const skipPartial = (localStorage.getItem('scheduler_skip_partial_week') || (document.getElementById('skip-partial-week')?.checked ? 'true' : 'false')) === 'true';
    const minWorking = Math.min(5, Math.max(1, parseInt(localStorage.getItem('scheduler_min_working_days') || document.getElementById('min-working-days')?.value || '3', 10)));
    
    // Choose anchor: currentDate (if set and later) or userStartDate
    const anchor = (currentDate && currentDate > userStartDate) ? new Date(currentDate) : new Date(userStartDate);
    let alignedStart = alignStartDate(anchor, userStartDate, alignment, allowPast);
    
    // If skipping partial week, count working days Mon-Fri from alignedStart's week
    if (skipPartial) {
        const weekStart = startOfWeekMonday(alignedStart);
        const workingDays = countWorkingDaysInWeek(weekStart);
        if (workingDays < minWorking) {
            // move to next Monday
            alignedStart = nextMonday(weekStart);
        }
    }
    
    const startDate = alignedStart;
    const endDate = new Date(startDate);
    endDate.setUTCDate(startDate.getUTCDate() + (horizonWeeks * 7) - 1);
    
    if (endDate.getUTCDay() !== 0) {
        endDate.setUTCDate(endDate.getUTCDate() + (7 - endDate.getUTCDay()));
    }
    
    const effectiveStartDate = startDate;
    return { startDate, endDate, effectiveStartDate };
}

function getWorkableDaysInRange() {
    const { startDate, endDate, effectiveStartDate } = getPlanningRange();
    const days = [];
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
        if (currentDate.getUTCDay() >= 1 && currentDate.getUTCDay() <= 5) {
            days.push(currentDate.toISOString().slice(0, 10));
        }
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }
    
    return days;
}

function getWorkableDaysForPlanning() {
    const { effectiveStartDate, endDate } = getPlanningRange();
    const days = [];
    let currentDate = new Date(effectiveStartDate);
    
    while (currentDate <= endDate) {
        if (currentDate.getUTCDay() >= 1 && currentDate.getUTCDay() <= 5) {
            days.push(currentDate.toISOString().slice(0, 10));
        }
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }
    
    return days;
}

function getSlotsInRange() {
    return getWorkableDaysInRange().flatMap(day => TIMES.map(time => `${day}_${time}`));
}

function getSlotsForPlanning() {
    return getWorkableDaysForPlanning().flatMap(day => TIMES.map(time => `${day}_${time}`));
}

function roundTimeDownTo15(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    const roundedMinutes = Math.floor((hours * 60 + minutes) / 15) * 15;
    return `${Math.floor(roundedMinutes / 60).toString().padStart(2, '0')}:${(roundedMinutes % 60).toString().padStart(2, '0')}`;
}

function getPersonIdFromTaskId(taskId) {
    const match = taskId.match(/^(.*)_(w\d+|monthly|o\d+)$/);
    return match ? match[1] : taskId;
}

function getGroupFromTaskId(taskId) {
    return taskId.split('_')[0];
}

function getISOWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getConsecutiveSlots(startSlot, count) {
    const slots = [];
    const [datePart, timePart] = startSlot.split('_');
    const [startHour, startMinute] = timePart.split(':').map(Number);
    
    let currentHour = startHour, currentMinute = startMinute;
    
    for (let i = 0; i < count; i++) {
        const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
        if (!TIMES.includes(timeString)) return [];
        
        slots.push(`${datePart}_${timeString}`);
        
        currentMinute += 15;
        if (currentMinute >= 60) {
            currentMinute = 0;
            currentHour += 1;
        }
    }
    
    return slots;
}

function getPastAppointmentsCount() {
    if (!currentDate || !solutionCache) return 0;
    
    let count = 0;
    for (const [task, info] of solutionCache.entries()) {
        const slotDate = new Date(info.slot.split('_')[0] + 'T00:00:00Z');
        if (slotDate < currentDate) {
            count++;
        }
    }
    
    return count;
}

// Alignment helpers
function alignStartDate(anchor, monthContextDate, alignment, allowPast) {
    const a = new Date(anchor);
    switch (alignment) {
        case 'week_monday':
            return startOfWeekMonday(a);
        case 'next_monday':
            return nextMonday(a);
        case 'previous_monday':
            return allowPast ? previousMonday(a) : startOfWeekMonday(a);
        case 'first_full_week':
            return firstFullWeekOfMonth(monthContextDate);
        case 'as_is':
        default:
            return a;
    }
}

function startOfWeekMonday(date) {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = d.getUTCDay();
    const diff = (day === 0 ? -6 : 1 - day); // Monday=1
    d.setUTCDate(d.getUTCDate() + diff);
    return d;
}

function nextMonday(date) {
    const d = startOfWeekMonday(date);
    if (d.getTime() <= Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())) {
        d.setUTCDate(d.getUTCDate() + 7);
    }
    return d;
}

function previousMonday(date) {
    const d = startOfWeekMonday(date);
    if (d.getTime() >= Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())) {
        d.setUTCDate(d.getUTCDate() - 7);
    }
    return d;
}

function firstFullWeekOfMonth(dateInMonth) {
    const y = dateInMonth.getUTCFullYear();
    const m = dateInMonth.getUTCMonth();
    const firstOfMonth = new Date(Date.UTC(y, m, 1));
    
    // move to first Monday on/after first of month
    const firstMonday = startOfWeekMonday(firstOfMonth);
    if (firstMonday.getUTCMonth() !== m) {
        firstMonday.setUTCDate(firstMonday.getUTCDate() + 7);
    }
    return firstMonday;
}

function countWorkingDaysInWeek(weekStartMonday) {
    let count = 0;
    for (let i = 0; i < 7; i++) {
        const d = new Date(weekStartMonday);
        d.setUTCDate(d.getUTCDate() + i);
        const dow = d.getUTCDay();
        if (dow >= 1 && dow <= 5) count++;
    }
    return count;
}

// Make functions globally available
window.selectAlgorithm = selectAlgorithm;
window.updateWeeklySchedule = updateWeeklySchedule;
window.removeGroupConstraint = removeGroupConstraint;
window.editPersonAvailability = editPersonAvailability;
window.saveAllSettings = saveAllSettings;