-- Professional CSP Scheduling Engine - Neon Database Setup
-- This script creates all necessary tables for the scheduling application

-- Enable UUID extension (if needed)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Groups table - stores group configurations (teachers, students, staff)
CREATE TABLE IF NOT EXISTS groups (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    count INTEGER NOT NULL DEFAULT 1,
    duration INTEGER NOT NULL DEFAULT 15,
    measurements INTEGER NOT NULL DEFAULT 1,
    frequency VARCHAR(20) NOT NULL DEFAULT 'monthly',
    pattern VARCHAR(20) NOT NULL DEFAULT 'any',
    preferred_day VARCHAR(10) DEFAULT 'any',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Group constraints table - hard rules for groups
CREATE TABLE IF NOT EXISTS group_constraints (
    id SERIAL PRIMARY KEY,
    group_id VARCHAR(50) REFERENCES groups(id) ON DELETE CASCADE,
    week VARCHAR(10) NOT NULL,
    constraint_type VARCHAR(20) NOT NULL,
    constraint_value INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Individual constraints table - personal availability slots
CREATE TABLE IF NOT EXISTS individual_constraints (
    id SERIAL PRIMARY KEY,
    person_id VARCHAR(100) NOT NULL,
    start_time BIGINT NOT NULL,
    end_time BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Appointments/Schedule table - scheduled meetings
CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    task_id VARCHAR(100) NOT NULL,
    person_id VARCHAR(100) NOT NULL,
    group_id VARCHAR(50) REFERENCES groups(id) ON DELETE CASCADE,
    slot_date DATE NOT NULL,
    slot_time TIME NOT NULL,
    room INTEGER NOT NULL,
    duration INTEGER NOT NULL DEFAULT 15,
    is_locked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(slot_date, slot_time, room)
);

-- 5. Settings table - global application configuration
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Weekly schedule settings - week-specific group settings
CREATE TABLE IF NOT EXISTS weekly_schedule_settings (
    id SERIAL PRIMARY KEY,
    group_id VARCHAR(50) REFERENCES groups(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, week_number)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_group_constraints_group_id ON group_constraints(group_id);
CREATE INDEX IF NOT EXISTS idx_individual_constraints_person_id ON individual_constraints(person_id);
CREATE INDEX IF NOT EXISTS idx_appointments_group_id ON appointments(group_id);
CREATE INDEX IF NOT EXISTS idx_appointments_slot_date ON appointments(slot_date);
CREATE INDEX IF NOT EXISTS idx_appointments_person_id ON appointments(person_id);
CREATE INDEX IF NOT EXISTS idx_weekly_schedule_group_id ON weekly_schedule_settings(group_id);
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- Insert default groups (optional - can be done via API)
INSERT INTO groups (id, name, count, duration, measurements, frequency, pattern, preferred_day) 
VALUES 
    ('teacher', 'Teachers', 5, 30, 1, 'weekly', 'any', 'any'),
    ('india', 'India Students', 4, 15, 1, 'every_2_weeks', 'any', 'any'),
    ('y2023', 'Y2023 Students', 10, 15, 1, 'every_2_weeks', 'odd', 'any'),
    ('y2022', 'Y2022 Students', 12, 15, 1, 'every_2_weeks', 'even', 'any'),
    ('y2021', 'Y2021 Students', 8, 15, 1, 'monthly', 'any', 'any'),
    ('staff', 'Staff', 6, 15, 1, 'monthly', 'any', 'any')
ON CONFLICT (id) DO NOTHING;

-- Insert default settings
INSERT INTO settings (key, value) 
VALUES 
    ('scheduler_start_date', '2025-10-20'),
    ('scheduler_rooms', 'auto'),
    ('scheduler_horizon_weeks', '5'),
    ('scheduler_auto_extend', 'false'),
    ('scheduler_start_alignment', 'as_is'),
    ('scheduler_allow_past', 'false'),
    ('scheduler_skip_partial_week', 'false'),
    ('scheduler_min_working_days', '3')
ON CONFLICT (key) DO NOTHING;

-- Verify tables were created
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name IN ('groups', 'group_constraints', 'individual_constraints', 'appointments', 'settings', 'weekly_schedule_settings')
ORDER BY table_name, ordinal_position;