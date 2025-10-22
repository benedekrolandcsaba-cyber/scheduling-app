import { getGroupConstraints, saveGroupConstraint, deleteGroupConstraint, getIndividualConstraints, saveIndividualConstraints } from './db.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { type } = req.query; // 'group' or 'individual'

    if (req.method === 'GET') {
      if (type === 'group') {
        const result = await getGroupConstraints();
        if (result.success) {
          // Transform to match frontend format
          const constraints = result.data.map(c => ({
            group: c.group_id,
            week: c.week,
            type: c.constraint_type,
            value: c.constraint_value
          }));
          return res.status(200).json(constraints);
        } else {
          return res.status(500).json({ error: result.error });
        }
      } else if (type === 'individual') {
        const result = await getIndividualConstraints();
        if (result.success) {
          // Transform to match frontend format
          const constraints = {};
          result.data.forEach(c => {
            if (!constraints[c.person_id]) {
              constraints[c.person_id] = [];
            }
            constraints[c.person_id].push({
              start: parseInt(c.start_time),
              end: parseInt(c.end_time)
            });
          });
          return res.status(200).json(constraints);
        } else {
          return res.status(500).json({ error: result.error });
        }
      }
    }

    if (req.method === 'POST') {
      if (type === 'group') {
        const constraints = req.body;
        
        if (!Array.isArray(constraints)) {
          return res.status(400).json({ error: 'Expected array of constraints' });
        }

        // Clear existing constraints and save new ones
        // Note: In a real app, you might want to be more selective about this
        for (const constraint of constraints) {
          const result = await saveGroupConstraint(constraint);
          if (!result.success) {
            return res.status(500).json({ error: result.error });
          }
        }

        return res.status(200).json({ success: true });
      } else if (type === 'individual') {
        const constraints = req.body; // Object with personId as keys
        
        // Save constraints for each person
        for (const [personId, personConstraints] of Object.entries(constraints)) {
          const result = await saveIndividualConstraints(personId, personConstraints);
          if (!result.success) {
            return res.status(500).json({ error: result.error });
          }
        }

        return res.status(200).json({ success: true });
      }
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (type === 'group' && id) {
        const result = await deleteGroupConstraint(parseInt(id));
        if (result.success) {
          return res.status(200).json({ success: true });
        } else {
          return res.status(500).json({ error: result.error });
        }
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}