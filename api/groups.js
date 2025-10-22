import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

// Initialize database tables
async function initializeDatabase() {
  try {
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
    return { success: true };
  } catch (error) {
    console.error('Database initialization error:', error);
    return { success: false, error: error.message };
  }
}

async function getGroups() {
  try {
    const groups = await sql`SELECT * FROM groups ORDER BY id`;
    return { success: true, data: groups };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function saveGroup(group) {
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

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Initialize database on first request
    await initializeDatabase();

    if (req.method === 'GET') {
      const result = await getGroups();
      if (result.success) {
        return res.status(200).json(result.data);
      } else {
        return res.status(500).json({ error: result.error });
      }
    }

    if (req.method === 'POST') {
      const groups = req.body;
      
      if (!Array.isArray(groups)) {
        return res.status(400).json({ error: 'Expected array of groups' });
      }

      // Save all groups
      for (const group of groups) {
        const result = await saveGroup(group);
        if (!result.success) {
          return res.status(500).json({ error: result.error });
        }
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}