/**
 * API Client for Neon Database Integration
 * Handles all communication between frontend and backend
 */

const API_BASE = '/api';

class APIClient {
    constructor() {
        this.isOnline = true;
        this.cache = new Map();
    }

    async request(endpoint, options = {}) {
        try {
            const response = await fetch(`${API_BASE}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API Request failed for ${endpoint}:`, error);
            
            // Fallback to localStorage if API fails
            if (endpoint.includes('GET') || options.method === 'GET' || !options.method) {
                return this.getFromLocalStorage(endpoint);
            }
            
            throw error;
        }
    }

    // Groups API
    async getGroups() {
        try {
            const groups = await this.request('/groups');
            return groups;
        } catch (error) {
            // Fallback to localStorage
            const saved = localStorage.getItem('scheduler_group_params');
            return saved ? JSON.parse(saved) : [];
        }
    }

    async saveGroups(groups) {
        try {
            await this.request('/groups', {
                method: 'POST',
                body: JSON.stringify(groups)
            });
            
            // Also save to localStorage as backup
            localStorage.setItem('scheduler_group_params', JSON.stringify(groups));
            return { success: true };
        } catch (error) {
            // Fallback to localStorage only
            localStorage.setItem('scheduler_group_params', JSON.stringify(groups));
            console.warn('Saved to localStorage only:', error.message);
            return { success: true, offline: true };
        }
    }

    // Constraints API
    async getGroupConstraints() {
        try {
            const constraints = await this.request('/constraints?type=group');
            return constraints;
        } catch (error) {
            const saved = localStorage.getItem('scheduler_group_constraints');
            return saved ? JSON.parse(saved) : [];
        }
    }

    async saveGroupConstraints(constraints) {
        try {
            await this.request('/constraints?type=group', {
                method: 'POST',
                body: JSON.stringify(constraints)
            });
            
            localStorage.setItem('scheduler_group_constraints', JSON.stringify(constraints));
            return { success: true };
        } catch (error) {
            localStorage.setItem('scheduler_group_constraints', JSON.stringify(constraints));
            console.warn('Saved to localStorage only:', error.message);
            return { success: true, offline: true };
        }
    }

    async getIndividualConstraints() {
        try {
            const constraints = await this.request('/constraints?type=individual');
            return constraints;
        } catch (error) {
            const saved = localStorage.getItem('scheduler_individual_constraints');
            return saved ? JSON.parse(saved) : {};
        }
    }

    async saveIndividualConstraints(constraints) {
        try {
            await this.request('/constraints?type=individual', {
                method: 'POST',
                body: JSON.stringify(constraints)
            });
            
            localStorage.setItem('scheduler_individual_constraints', JSON.stringify(constraints));
            return { success: true };
        } catch (error) {
            localStorage.setItem('scheduler_individual_constraints', JSON.stringify(constraints));
            console.warn('Saved to localStorage only:', error.message);
            return { success: true, offline: true };
        }
    }

    // Appointments API
    async getAppointments() {
        try {
            const appointments = await this.request('/appointments');
            return new Map(appointments);
        } catch (error) {
            const saved = localStorage.getItem('scheduler_last_solution');
            if (saved) {
                const solutionData = JSON.parse(saved);
                return new Map(solutionData.solution);
            }
            return new Map();
        }
    }

    async saveAppointments(appointmentsMap) {
        try {
            const appointmentsArray = Array.from(appointmentsMap.entries());
            await this.request('/appointments', {
                method: 'POST',
                body: JSON.stringify(appointmentsArray)
            });
            
            // Also save to localStorage
            const solutionData = {
                solution: appointmentsArray,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('scheduler_last_solution', JSON.stringify(solutionData));
            return { success: true };
        } catch (error) {
            // Fallback to localStorage
            const solutionData = {
                solution: Array.from(appointmentsMap.entries()),
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('scheduler_last_solution', JSON.stringify(solutionData));
            console.warn('Saved to localStorage only:', error.message);
            return { success: true, offline: true };
        }
    }

    // Settings API
    async getSettings() {
        try {
            const settings = await this.request('/settings');
            return settings;
        } catch (error) {
            // Fallback to localStorage
            const keys = [
                'scheduler_start_date',
                'scheduler_current_date',
                'scheduler_rooms',
                'scheduler_horizon_weeks',
                'scheduler_auto_extend',
                'scheduler_start_alignment',
                'scheduler_allow_past',
                'scheduler_skip_partial_week',
                'scheduler_min_working_days'
            ];
            
            const settings = {};
            keys.forEach(key => {
                const value = localStorage.getItem(key);
                if (value !== null) {
                    settings[key] = value;
                }
            });
            return settings;
        }
    }

    async saveSettings(settings) {
        try {
            await this.request('/settings', {
                method: 'POST',
                body: JSON.stringify(settings)
            });
            
            // Also save to localStorage
            Object.entries(settings).forEach(([key, value]) => {
                localStorage.setItem(key, value);
            });
            return { success: true };
        } catch (error) {
            // Fallback to localStorage
            Object.entries(settings).forEach(([key, value]) => {
                localStorage.setItem(key, value);
            });
            console.warn('Saved to localStorage only:', error.message);
            return { success: true, offline: true };
        }
    }

    async getWeeklyScheduleSettings() {
        try {
            const settings = await this.request('/settings?type=weekly');
            return settings;
        } catch (error) {
            const saved = localStorage.getItem('scheduler_weekly_settings');
            return saved ? JSON.parse(saved) : {};
        }
    }

    async saveWeeklyScheduleSettings(settings) {
        try {
            await this.request('/settings?type=weekly', {
                method: 'POST',
                body: JSON.stringify(settings)
            });
            
            localStorage.setItem('scheduler_weekly_settings', JSON.stringify(settings));
            return { success: true };
        } catch (error) {
            localStorage.setItem('scheduler_weekly_settings', JSON.stringify(settings));
            console.warn('Saved to localStorage only:', error.message);
            return { success: true, offline: true };
        }
    }

    // Planning Sessions API
    async getPlanningSession(id) {
        try {
            return await this.request(`/planning-sessions?id=${id}`);
        } catch (error) {
            console.error('Failed to get planning session:', error);
            return null;
        }
    }

    async getPlanningSessionsByStatus(status = 'active') {
        try {
            return await this.request(`/planning-sessions?status=${status}`);
        } catch (error) {
            console.error('Failed to get planning sessions:', error);
            return [];
        }
    }

    async createPlanningSession(sessionData) {
        try {
            return await this.request('/planning-sessions', {
                method: 'POST',
                body: JSON.stringify(sessionData)
            });
        } catch (error) {
            console.error('Failed to create planning session:', error);
            throw error;
        }
    }

    async updatePlanningSession(id, updates) {
        try {
            return await this.request(`/planning-sessions?id=${id}`, {
                method: 'PUT',
                body: JSON.stringify(updates)
            });
        } catch (error) {
            console.error('Failed to update planning session:', error);
            throw error;
        }
    }

    // Dashboard API
    async getDashboardMetrics() {
        try {
            return await this.request('/dashboard?endpoint=metrics');
        } catch (error) {
            console.error('Failed to get dashboard metrics:', error);
            return {
                totalAppointments: 0,
                totalConflicts: 0,
                resolutionRate: 0,
                optimizationScore: 0
            };
        }
    }

    async getDashboardConflicts() {
        try {
            return await this.request('/dashboard?endpoint=conflicts');
        } catch (error) {
            console.error('Failed to get dashboard conflicts:', error);
            return [];
        }
    }

    // Advanced Scheduling API
    async executeAdvancedScheduling(config) {
        try {
            return await this.request('/advanced-scheduling', {
                method: 'POST',
                body: JSON.stringify(config)
            });
        } catch (error) {
            console.error('Failed to execute advanced scheduling:', error);
            throw error;
        }
    }

    // Utility method for localStorage fallback
    getFromLocalStorage(endpoint) {
        const keyMap = {
            '/groups': 'scheduler_group_params',
            '/constraints?type=group': 'scheduler_group_constraints',
            '/constraints?type=individual': 'scheduler_individual_constraints',
            '/appointments': 'scheduler_last_solution',
            '/settings': null, // Multiple keys
            '/settings?type=weekly': 'scheduler_weekly_settings'
        };

        const key = keyMap[endpoint];
        if (key) {
            const saved = localStorage.getItem(key);
            return saved ? JSON.parse(saved) : (endpoint.includes('constraints') ? [] : {});
        }
        return null;
    }

    // Connection status
    async checkConnection() {
        try {
            await this.request('/groups');
            this.isOnline = true;
            return true;
        } catch (error) {
            this.isOnline = false;
            return false;
        }
    }

    getConnectionStatus() {
        return this.isOnline;
    }
}

// Create global API client instance
window.apiClient = new APIClient();

// Export for module usage
export default APIClient;