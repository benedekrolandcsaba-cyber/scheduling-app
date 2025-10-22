import { getAppointments, saveAppointments } from './db.js';

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
      const result = await getAppointments();
      if (result.success) {
        // Transform to match frontend format
        const appointmentsMap = new Map();
        result.data.forEach(apt => {
          const slot = `${apt.slot_date}_${apt.slot_time.slice(0, 5)}`;
          appointmentsMap.set(apt.task_id, {
            slot: slot,
            room: apt.room,
            task: apt.task_id
          });
        });
        
        // Convert Map to array of entries for JSON serialization
        const appointmentsArray = Array.from(appointmentsMap.entries());
        return res.status(200).json(appointmentsArray);
      } else {
        return res.status(500).json({ error: result.error });
      }
    }

    if (req.method === 'POST') {
      const appointmentsData = req.body;
      
      if (!Array.isArray(appointmentsData)) {
        return res.status(400).json({ error: 'Expected array of appointments' });
      }

      // Convert array back to Map for processing
      const appointmentsMap = new Map(appointmentsData);
      
      const result = await saveAppointments(appointmentsMap);
      if (result.success) {
        return res.status(200).json({ success: true });
      } else {
        return res.status(500).json({ error: result.error });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}