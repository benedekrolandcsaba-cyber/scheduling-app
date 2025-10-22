/**
 * Professional Dashboard Component
 * Displays current schedule status, metrics, and quick actions
 */

class SchedulingDashboard {
    constructor() {
        this.currentSession = null;
        this.metrics = {};
        this.refreshInterval = null;
    }

    async initialize() {
        await this.loadCurrentSession();
        await this.loadMetrics();
        this.renderDashboard();
        this.setupEventListeners();
        this.startAutoRefresh();
    }

    async loadCurrentSession() {
        try {
            const sessions = await window.apiClient.request('/planning-sessions?status=active');
            this.currentSession = sessions.length > 0 ? sessions[0] : null;
        } catch (error) {
            console.error('Failed to load current session:', error);
        }
    }

    async loadMetrics() {
        try {
            this.metrics = await window.apiClient.request('/dashboard/metrics');
        } catch (error) {
            console.error('Failed to load metrics:', error);
            this.metrics = {
                totalAppointments: 0,
                totalConflicts: 0,
                resolutionRate: 0,
                optimizationScore: 0
            };
        }
    }

    renderDashboard() {
        const dashboardHTML = `
            <div class="dashboard-container">
                <div class="dashboard-header">
                    <h2>📊 Scheduling Dashboard</h2>
                    <div class="dashboard-actions">
                        <button id="quick-plan-btn" class="dashboard-btn primary">⚡ Quick Plan (2 weeks)</button>
                        <button id="advanced-plan-btn" class="dashboard-btn secondary">🎯 Advanced Plan</button>
                        <button id="refresh-dashboard-btn" class="dashboard-btn">🔄 Refresh</button>
                    </div>
                </div>

                <div class="dashboard-grid">
                    <!-- Current Session Card -->
                    <div class="dashboard-card current-session">
                        <h3>📅 Current Planning Session</h3>
                        ${this.renderCurrentSession()}
                    </div>

                    <!-- Metrics Cards -->
                    <div class="dashboard-card metrics">
                        <h3>📈 Key Metrics</h3>
                        ${this.renderMetrics()}
                    </div>

                    <!-- Quick Actions Card -->
                    <div class="dashboard-card quick-actions">
                        <h3>⚡ Quick Actions</h3>
                        ${this.renderQuickActions()}
                    </div>

                    <!-- Recent Conflicts Card -->
                    <div class="dashboard-card conflicts">
                        <h3>⚠️ Recent Conflicts</h3>
                        ${this.renderRecentConflicts()}
                    </div>
                </div>

                <!-- Planning Range Selector -->
                <div class="planning-range-selector" style="display: none;">
                    <h3>📅 Custom Planning Range</h3>
                    <div class="range-inputs">
                        <div class="input-group">
                            <label>Start Date:</label>
                            <input type="date" id="planning-start-date" value="${this.getDefaultStartDate()}">
                        </div>
                        <div class="input-group">
                            <label>End Date:</label>
                            <input type="date" id="planning-end-date" value="${this.getDefaultEndDate()}">
                        </div>
                        <div class="input-group">
                            <label>Planning Type:</label>
                            <select id="planning-type">
                                <option value="quick">Quick Plan (Fast, Good Results)</option>
                                <option value="advanced">Advanced Plan (Slower, Optimal Results)</option>
                                <option value="custom">Custom Algorithm Settings</option>
                            </select>
                        </div>
                    </div>
                    <div class="range-actions">
                        <button id="start-planning-btn" class="dashboard-btn primary">🚀 Start Planning</button>
                        <button id="cancel-planning-btn" class="dashboard-btn">❌ Cancel</button>
                    </div>
                </div>

                <!-- Real-time Progress -->
                <div class="planning-progress" style="display: none;">
                    <h3>🔄 Planning in Progress...</h3>
                    <div class="progress-container">
                        <div class="progress-bar">
                            <div class="progress-fill" id="planning-progress-fill"></div>
                        </div>
                        <div class="progress-text" id="planning-progress-text">Initializing...</div>
                    </div>
                    <div class="algorithm-feedback" id="algorithm-feedback"></div>
                </div>
            </div>
        `;

        // Insert dashboard before existing content
        const container = document.querySelector('.container');
        const existingContent = container.innerHTML;
        container.innerHTML = dashboardHTML + existingContent;

        // Hide the old main-grid initially
        const mainGrid = document.querySelector('.main-grid');
        if (mainGrid) {
            mainGrid.style.display = 'none';
        }
    }

    renderCurrentSession() {
        if (!this.currentSession) {
            return `
                <div class="no-session">
                    <p>No active planning session</p>
                    <button id="create-session-btn" class="dashboard-btn primary">Create New Session</button>
                </div>
            `;
        }

        return `
            <div class="session-info">
                <h4>${this.currentSession.name}</h4>
                <p><strong>Period:</strong> ${this.formatDate(this.currentSession.start_date)} - ${this.formatDate(this.currentSession.end_date)}</p>
                <p><strong>Appointments:</strong> ${this.currentSession.total_appointments}</p>
                <p><strong>Conflicts:</strong> ${this.currentSession.conflicts_count}</p>
                <p><strong>Score:</strong> ${this.currentSession.optimization_score}%</p>
                <div class="session-actions">
                    <button id="view-session-btn" class="dashboard-btn">👁️ View Details</button>
                    <button id="edit-session-btn" class="dashboard-btn">✏️ Edit</button>
                </div>
            </div>
        `;
    }

    renderMetrics() {
        return `
            <div class="metrics-grid">
                <div class="metric-item">
                    <div class="metric-value">${this.metrics.totalAppointments || 0}</div>
                    <div class="metric-label">Total Appointments</div>
                </div>
                <div class="metric-item">
                    <div class="metric-value">${this.metrics.totalConflicts || 0}</div>
                    <div class="metric-label">Active Conflicts</div>
                </div>
                <div class="metric-item">
                    <div class="metric-value">${(this.metrics.resolutionRate || 0).toFixed(1)}%</div>
                    <div class="metric-label">Resolution Rate</div>
                </div>
                <div class="metric-item">
                    <div class="metric-value">${(this.metrics.optimizationScore || 0).toFixed(1)}%</div>
                    <div class="metric-label">Optimization Score</div>
                </div>
            </div>
        `;
    }

    renderQuickActions() {
        return `
            <div class="quick-actions-list">
                <button class="action-btn" onclick="dashboard.showPlanningRange()">
                    📅 Custom Date Range Planning
                </button>
                <button class="action-btn" onclick="dashboard.resolveConflicts()">
                    🔧 Auto-Resolve Conflicts
                </button>
                <button class="action-btn" onclick="dashboard.optimizeSchedule()">
                    ⚡ Optimize Current Schedule
                </button>
                <button class="action-btn" onclick="dashboard.exportSchedule()">
                    📤 Export Schedule
                </button>
                <button class="action-btn" onclick="dashboard.showAdvancedSettings()">
                    ⚙️ Advanced Settings
                </button>
            </div>
        `;
    }

    renderRecentConflicts() {
        // This would be populated from the conflict_resolutions table
        return `
            <div class="conflicts-list">
                <div class="conflict-item">
                    <span class="conflict-type">Room Conflict</span>
                    <span class="conflict-time">Today 14:00</span>
                    <button class="resolve-btn">Resolve</button>
                </div>
                <div class="no-conflicts" style="display: none;">
                    <p>✅ No active conflicts</p>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Quick Plan button
        document.getElementById('quick-plan-btn')?.addEventListener('click', () => {
            this.startQuickPlan();
        });

        // Advanced Plan button
        document.getElementById('advanced-plan-btn')?.addEventListener('click', () => {
            this.showPlanningRange();
        });

        // Refresh button
        document.getElementById('refresh-dashboard-btn')?.addEventListener('click', () => {
            this.refresh();
        });

        // Planning range buttons
        document.getElementById('start-planning-btn')?.addEventListener('click', () => {
            this.startCustomPlanning();
        });

        document.getElementById('cancel-planning-btn')?.addEventListener('click', () => {
            this.hidePlanningRange();
        });

        // Create session button
        document.getElementById('create-session-btn')?.addEventListener('click', () => {
            this.createNewSession();
        });
    }

    async startQuickPlan() {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 14); // 2 weeks

        await this.executePlanning({
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            algorithm: 'min_conflict', // Fast algorithm for quick planning
            type: 'quick'
        });
    }

    showPlanningRange() {
        document.querySelector('.planning-range-selector').style.display = 'block';
        document.querySelector('.main-grid').style.display = 'none';
    }

    hidePlanningRange() {
        document.querySelector('.planning-range-selector').style.display = 'none';
        document.querySelector('.main-grid').style.display = 'grid';
    }

    async startCustomPlanning() {
        const startDate = document.getElementById('planning-start-date').value;
        const endDate = document.getElementById('planning-end-date').value;
        const planningType = document.getElementById('planning-type').value;

        if (!startDate || !endDate) {
            alert('Please select both start and end dates');
            return;
        }

        const algorithmMap = {
            'quick': 'min_conflict',
            'advanced': 'csp_backtrack',
            'custom': 'simulated_annealing'
        };

        await this.executePlanning({
            startDate,
            endDate,
            algorithm: algorithmMap[planningType],
            type: planningType
        });
    }

    async executePlanning(config) {
        this.showPlanningProgress();
        
        try {
            // Create new planning session
            const session = await window.apiClient.request('/planning-sessions', {
                method: 'POST',
                body: JSON.stringify({
                    name: `${config.type.charAt(0).toUpperCase() + config.type.slice(1)} Plan - ${config.startDate}`,
                    start_date: config.startDate,
                    end_date: config.endDate,
                    planning_type: config.type,
                    algorithm_used: config.algorithm
                })
            });

            // Execute the planning algorithm
            const result = await this.runAdvancedScheduling(config, session.id);
            
            this.hidePlanningProgress();
            this.hidePlanningRange();
            
            if (result.success) {
                await this.refresh();
                this.showPlanningResults(result);
            } else {
                this.showPlanningError(result.error);
            }

        } catch (error) {
            this.hidePlanningProgress();
            this.showPlanningError(error.message);
        }
    }

    async runAdvancedScheduling(config, sessionId) {
        // This will be implemented with the advanced algorithms
        // For now, return a mock result
        return {
            success: true,
            appointments: [],
            conflicts: [],
            optimizationScore: 85.5
        };
    }

    showPlanningProgress() {
        document.querySelector('.planning-progress').style.display = 'block';
        // Simulate progress updates
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += Math.random() * 10;
            if (progress >= 100) {
                progress = 100;
                clearInterval(progressInterval);
            }
            
            document.getElementById('planning-progress-fill').style.width = `${progress}%`;
            document.getElementById('planning-progress-text').textContent = 
                progress < 30 ? 'Analyzing constraints...' :
                progress < 60 ? 'Generating solutions...' :
                progress < 90 ? 'Optimizing schedule...' :
                'Finalizing results...';
        }, 200);
    }

    hidePlanningProgress() {
        document.querySelector('.planning-progress').style.display = 'none';
    }

    showPlanningResults(result) {
        alert(`Planning completed successfully!\nAppointments: ${result.appointments.length}\nOptimization Score: ${result.optimizationScore}%`);
    }

    showPlanningError(error) {
        alert(`Planning failed: ${error}`);
    }

    async refresh() {
        await this.loadCurrentSession();
        await this.loadMetrics();
        // Re-render specific sections instead of full dashboard
        document.querySelector('.current-session').innerHTML = 
            '<h3>📅 Current Planning Session</h3>' + this.renderCurrentSession();
        document.querySelector('.metrics').innerHTML = 
            '<h3>📈 Key Metrics</h3>' + this.renderMetrics();
    }

    startAutoRefresh() {
        this.refreshInterval = setInterval(() => {
            this.refresh();
        }, 30000); // Refresh every 30 seconds
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }

    // Utility methods
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString();
    }

    getDefaultStartDate() {
        return new Date().toISOString().split('T')[0];
    }

    getDefaultEndDate() {
        const date = new Date();
        date.setDate(date.getDate() + 14);
        return date.toISOString().split('T')[0];
    }

    // Placeholder methods for future implementation
    async resolveConflicts() {
        alert('Auto-conflict resolution will be implemented');
    }

    async optimizeSchedule() {
        alert('Schedule optimization will be implemented');
    }

    async exportSchedule() {
        alert('Schedule export will be implemented');
    }

    showAdvancedSettings() {
        document.querySelector('.main-grid').style.display = 'grid';
    }

    async createNewSession() {
        this.showPlanningRange();
    }
}

// Global dashboard instance
window.dashboard = new SchedulingDashboard();