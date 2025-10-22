-- Professional CSP Scheduling Engine - Database Extensions
-- Additional tables for advanced scheduling features

-- 1. Planning Sessions - Store different planning scenarios
CREATE TABLE IF NOT EXISTS planning_sessions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    planning_type VARCHAR(50) DEFAULT 'custom', -- 'quick', 'advanced', 'custom'
    algorithm_used VARCHAR(50) DEFAULT 'csp_backtrack',
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'active', 'archived'
    total_appointments INTEGER DEFAULT 0,
    conflicts_count INTEGER DEFAULT 0,
    optimization_score DECIMAL(5,2) DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) DEFAULT 'system'
);

-- 2. Conflict Resolutions - Track conflicts and their solutions
CREATE TABLE IF NOT EXISTS conflict_resolutions (
    id SERIAL PRIMARY KEY,
    planning_session_id INTEGER REFERENCES planning_sessions(id) ON DELETE CASCADE,
    conflict_type VARCHAR(50) NOT NULL, -- 'person_double_booking', 'room_conflict', 'constraint_violation'
    original_slot_date DATE,
    original_slot_time TIME,
    original_room INTEGER,
    resolved_slot_date DATE,
    resolved_slot_time TIME,
    resolved_room INTEGER,
    person_id VARCHAR(100),
    group_id VARCHAR(50),
    resolution_method VARCHAR(50), -- 'auto_reschedule', 'manual_override', 'priority_based'
    is_user_approved BOOLEAN DEFAULT FALSE,
    severity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Algorithm Settings - Store algorithm parameters and performance
CREATE TABLE IF NOT EXISTS algorithm_settings (
    id SERIAL PRIMARY KEY,
    algorithm_name VARCHAR(50) NOT NULL,
    parameters JSONB NOT NULL, -- Store algorithm-specific parameters
    performance_metrics JSONB, -- Store execution time, success rate, etc.
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Dashboard Metrics - Store dashboard statistics
CREATE TABLE IF NOT EXISTS dashboard_metrics (
    id SERIAL PRIMARY KEY,
    metric_date DATE NOT NULL,
    total_appointments INTEGER DEFAULT 0,
    total_conflicts INTEGER DEFAULT 0,
    resolution_rate DECIMAL(5,2) DEFAULT 0.0,
    avg_optimization_score DECIMAL(5,2) DEFAULT 0.0,
    active_planning_sessions INTEGER DEFAULT 0,
    most_used_algorithm VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(metric_date)
);

-- 5. Enhanced Appointments table - Add planning session reference and conflict tracking
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS planning_session_id INTEGER REFERENCES planning_sessions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS has_conflict BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS conflict_severity VARCHAR(20) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS is_auto_resolved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS priority_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS original_slot_date DATE,
ADD COLUMN IF NOT EXISTS original_slot_time TIME;

-- 6. Enhanced Settings table - Add new configuration options
INSERT INTO settings (key, value) VALUES 
    ('dashboard_default_view', 'monthly'),
    ('planning_default_algorithm', 'csp_backtrack'),
    ('conflict_resolution_mode', 'auto_with_approval'),
    ('max_algorithm_runtime_seconds', '30'),
    ('priority_weights', '{"teacher": 100, "staff": 80, "india": 60, "y2023": 40, "y2022": 30, "y2021": 20}'),
    ('auto_conflict_resolution', 'true'),
    ('show_optimization_details', 'true'),
    ('enable_real_time_feedback', 'true')
ON CONFLICT (key) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_planning_sessions_dates ON planning_sessions(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_planning_sessions_status ON planning_sessions(status);
CREATE INDEX IF NOT EXISTS idx_conflict_resolutions_session ON conflict_resolutions(planning_session_id);
CREATE INDEX IF NOT EXISTS idx_conflict_resolutions_type ON conflict_resolutions(conflict_type);
CREATE INDEX IF NOT EXISTS idx_appointments_planning_session ON appointments(planning_session_id);
CREATE INDEX IF NOT EXISTS idx_appointments_conflicts ON appointments(has_conflict);
CREATE INDEX IF NOT EXISTS idx_dashboard_metrics_date ON dashboard_metrics(metric_date);

-- Insert default algorithm settings
INSERT INTO algorithm_settings (algorithm_name, parameters, performance_metrics) VALUES 
    ('csp_backtrack', 
     '{"max_backtracks": 1000, "use_mrv": true, "use_lcv": true, "forward_checking": true}',
     '{"avg_runtime_ms": 0, "success_rate": 0.0, "total_runs": 0}'
    ),
    ('min_conflict', 
     '{"max_iterations": 500, "tabu_tenure": 10, "restart_threshold": 100}',
     '{"avg_runtime_ms": 0, "success_rate": 0.0, "total_runs": 0}'
    ),
    ('simulated_annealing', 
     '{"initial_temperature": 100, "cooling_rate": 0.95, "min_temperature": 0.1, "max_iterations": 1000}',
     '{"avg_runtime_ms": 0, "success_rate": 0.0, "total_runs": 0}'
    )
ON CONFLICT DO NOTHING;

-- Create a default planning session for existing data
INSERT INTO planning_sessions (name, description, start_date, end_date, status) 
VALUES ('Legacy Schedule', 'Migrated from previous system', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'active')
ON CONFLICT DO NOTHING;