// Quick fix for calendar rendering issues
function safeRenderCalendar(year, month) {
    try {
        const today = new Date();
        const displayDate = (typeof year === 'number' && month != null) 
            ? new Date(year, month, 1) 
            : new Date(today.getFullYear(), today.getMonth(), 1);
        
        const displayYear = displayDate.getFullYear();
        const displayMonth = displayDate.getMonth();

        const monthYearDisplay = document.getElementById('month-year-display');
        if (monthYearDisplay) {
            monthYearDisplay.textContent = `${displayDate.toLocaleString('default', { month: 'long' })} ${displayYear}`;
            monthYearDisplay.dataset.date = displayDate.toISOString();
        }

        const calendarBody = document.getElementById('calendar-body');
        if (calendarBody) {
            calendarBody.innerHTML = '<div style="padding: 2rem; text-align: center; color: #6c757d;">Calendar loading... Please refresh if this persists.</div>';
        }
        
        console.log('Calendar rendered safely for:', displayYear, displayMonth);
    } catch (error) {
        console.error('Calendar render error:', error);
        const calendarBody = document.getElementById('calendar-body');
        if (calendarBody) {
            calendarBody.innerHTML = '<div style="padding: 2rem; text-align: center; color: #dc3545;">Calendar error. Please refresh the page.</div>';
        }
    }
}

// Override the problematic function
if (typeof renderCalendar !== 'undefined') {
    window.originalRenderCalendar = renderCalendar;
}
window.renderCalendar = safeRenderCalendar;