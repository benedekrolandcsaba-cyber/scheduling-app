import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

// Database schema initialization
export async function initializeDatabase() {
  try {
    // Groups table
    await sql`
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
      )
    `;

    // Group constraints table
    await sql`
      CREATE TABLE IF NOT EXISTS group_constraints (
        id SERIAL PRIMARY KEY,
        group_id VARCHAR(50) REFERENCES groups(id) ON DELETE CASCADE,
        week VARCHAR(10) NOT NULL,
        constraint_type VARCHAR(20) NOT NULL,
        constraint_value INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Individual constraints table
    await sql`
      CREATE TABLE IF NOT EXISTS individual_constraints (
        id SERIAL PRIMARY KEY,
        person_id VARCHAR(100) NOT NULL,
        start_time BIGINT NOT NULL,
        end_time BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Appointments/Schedule table
    await sql`
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
      )
    `;

    // Settings table for global configuration
    await sql`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) UNIQUE NOT NULL,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Weekly schedule settings
    await sql`
      CREATE TABLE IF NOT EXISTS weekly_schedule_settings (
        id SERIAL PRIMARY KEY,
        group_id VARCHAR(50) REFERENCES groups(id) ON DELETE CASCADE,
        week_number INTEGER NOT NULL,
        enabled BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(group_id, week_number)
      )
    `;

    console.log('Database initialized successfully');
    return { success: true };
  } catch (error) {
    console.error('Database initialization error:', error);
    return { success: false, error: error.message };
  }
}

// Groups CRUD operations
export async function getGroups() {
  try {
    const groups = await sql`SELECT * FROM groups ORDER BY id`;
    return { success: true, data: groups };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function saveGroup(group) {
  try {
    await sql`
      INSERT INTO groups (id, name, count, duration, measurements, frequency, pattern, preferred_day, updated_at)
      VALUES (${group.id}, ${group.name}, ${group.count}, ${group.duration}, ${group.measurements}, ${group.freq}, ${group.pattern}, ${group.preferredDay}, CURRENT_TIMESTAMP)
      ON CONFLICT (id) 
      DO UPDATE SET 
        name = EXCLUDED.name,
        count = EXCLUDED.count,
        duration = EXCLUDED.duration,
        measurements = EXCLUDED.measurements,
        frequency = EXCLUDED.frequency,
        pattern = EXCLUDED.pattern,
        preferred_day = EXCLUDED.preferred_day,
        updated_at = CURRENT_TIMESTAMP
    `;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Group constraints CRUD
export async function getGroupConstraints() {
  try {
    const constraints = await sql`SELECT * FROM group_constraints ORDER BY id`;
    return { success: true, data: constraints };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function saveGroupConstraint(constraint) {
  try {
    await sql`
      INSERT INTO group_constraints (group_id, week, constraint_type, constraint_value)
      VALUES (${constraint.group}, ${constraint.week}, ${constraint.type}, ${constraint.value})
    `;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function deleteGroupConstraint(id) {
  try {
    await sql`DELETE FROM group_constraints WHERE id = ${id}`;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Individual constraints CRUD
export async function getIndividualConstraints() {
  try {
    const constraints = await sql`SELECT * FROM individual_constraints ORDER BY person_id, start_time`;
    return { success: true, data: constraints };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function saveIndividualConstraints(personId, constraints) {
  try {
    // Delete existing constraints for this person
    await sql`DELETE FROM individual_constraints WHERE person_id = ${personId}`;
    
    // Insert new constraints
    if (constraints && constraints.length > 0) {
      for (const constraint of constraints) {
        await sql`
          INSERT INTO individual_constraints (person_id, start_time, end_time)
          VALUES (${personId}, ${constraint.start}, ${constraint.end})
        `;
      }
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Appointments CRUD
export async function getAppointments() {
  try {
    const appointments = await sql`
      SELECT a.*, g.name as group_name 
      FROM appointments a 
      LEFT JOIN groups g ON a.group_id = g.id 
      ORDER BY a.slot_date, a.slot_time
    `;
    return { success: true, data: appointments };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function saveAppointments(appointments) {
  try {
    // Clear existing non-locked appointments
    await sql`DELETE FROM appointments WHERE is_locked = FALSE`;
    
    // Insert new appointments
    for (const [taskId, info] of appointments) {
      const [dateStr, timeStr] = info.slot.split('_');
      const personId = taskId.match(/^(.*)_(w\d+|monthly|o\d+)$/)?.[1] || taskId;
      const groupId = taskId.split('_')[0];
      
      await sql`
        INSERT INTO appointments (task_id, person_id, group_id, slot_date, slot_time, room, duration)
        VALUES (${taskId}, ${personId}, ${groupId}, ${dateStr}, ${timeStr}, ${info.room}, 15)
        ON CONFLICT (slot_date, slot_time, room) DO NOTHING
      `;
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Settings CRUD
export async function getSetting(key) {
  try {
    const result = await sql`SELECT value FROM settings WHERE key = ${key}`;
    return { success: true, data: result[0]?.value || null };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function saveSetting(key, value) {
  try {
    await sql`
      INSERT INTO settings (key, value, updated_at)
      VALUES (${key}, ${value}, CURRENT_TIMESTAMP)
      ON CONFLICT (key) 
      DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
    `;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Weekly schedule settings
export async function getWeeklyScheduleSettings() {
  try {
    const settings = await sql`SELECT * FROM weekly_schedule_settings ORDER BY group_id, week_number`;
    return { success: true, data: settings };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function saveWeeklyScheduleSetting(groupId, weekNumber, enabled) {
  try {
    await sql`
      INSERT INTO weekly_schedule_settings (group_id, week_number, enabled)
      VALUES (${groupId}, ${weekNumber}, ${enabled})
      ON CONFLICT (group_id, week_number)
      DO UPDATE SET enabled = EXCLUDED.enabled
    `;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}