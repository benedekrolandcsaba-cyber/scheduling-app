import { getGroups, saveGroup, initializeDatabase } from './db.js';

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