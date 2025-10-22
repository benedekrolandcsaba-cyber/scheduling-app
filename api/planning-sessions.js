import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        if (req.method === 'GET') {
            const { status, limit = 10 } = req.query;
            
            let query = `
                SELECT * FROM planning_sessions 
                ${status ? 'WHERE status = $1' : ''}
                ORDER BY created_at DESC 
                LIMIT $${status ? '2' : '1'}
            `;
            
            const params = status ? [status, limit] : [limit];
            const sessions = await sql(query, params);
            
            return res.status(200).json(sessions);
        }

        if (req.method === 'POST') {
            const { name, description, start_date, end_date, planning_type, algorithm_used } = req.body;
            
            const result = await sql`
                INSERT INTO planning_sessions (name, description, start_date, end_date, planning_type, algorithm_used, status)
                VALUES (${name}, ${description || ''}, ${start_date}, ${end_date}, ${planning_type || 'custom'}, ${algorithm_used || 'csp_backtrack'}, 'active')
                RETURNING *
            `;
            
            return res.status(201).json(result[0]);
        }

        if (req.method === 'PUT') {
            const { id } = req.query;
            const updates = req.body;
            
            const setClause = Object.keys(updates)
                .map((key, index) => `${key} = $${index + 2}`)
                .join(', ');
            
            const values = [id, ...Object.values(updates)];
            
            const result = await sql(`
                UPDATE planning_sessions 
                SET ${setClause}, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 
                RETURNING *
            `, values);
            
            return res.status(200).json(result[0]);
        }

        if (req.method === 'DELETE') {
            const { id } = req.query;
            
            await sql`DELETE FROM planning_sessions WHERE id = ${id}`;
            
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Planning Sessions API Error:', error);
        return res.status(500).json({ error: error.message });
    }
}