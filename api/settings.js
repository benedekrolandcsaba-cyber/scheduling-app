import { getSetting, saveSetting, getWeeklyScheduleSettings, saveWeeklyScheduleSetting } from './db.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { type, key } = req.query;

    if (req.method === 'GET') {
      if (type === 'weekly') {
        const result = await getWeeklyScheduleSettings();
        if (result.success) {
          // Transform to match frontend format
          const settings = {};
          result.data.forEach(s => {
            if (!settings[s.group_id]) {
              settings[s.group_id] = [];
            }
            if (s.enabled) {
              settings[s.group_id].push(s.week_number);
            }
          });
          return res.status(200).json(settings);
        } else {
          return res.status(500).json({ error: result.error });
        }
      } else if (key) {
        const result = await getSetting(key);
        if (result.success) {
          return res.status(200).json({ value: result.data });
        } else {
          return res.status(500).json({ error: result.error });
        }
      } else {
        // Get all common settings
        const commonSettings = [
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
        for (const settingKey of commonSettings) {
          const result = await getSetting(settingKey);
          if (result.success && result.data !== null) {
            settings[settingKey] = result.data;
          }
        }
        
        return res.status(200).json(settings);
      }
    }

    if (req.method === 'POST') {
      if (type === 'weekly') {
        const weeklySettings = req.body;
        
        // Save weekly schedule settings
        for (const [groupId, weeks] of Object.entries(weeklySettings)) {
          // First, disable all weeks for this group
          // Then enable only the specified weeks
          for (let weekNum = 1; weekNum <= 10; weekNum++) {
            const enabled = weeks.includes(weekNum);
            const result = await saveWeeklyScheduleSetting(groupId, weekNum, enabled);
            if (!result.success) {
              return res.status(500).json({ error: result.error });
            }
          }
        }
        
        return res.status(200).json({ success: true });
      } else {
        const settings = req.body;
        
        // Save individual settings
        for (const [settingKey, value] of Object.entries(settings)) {
          const result = await saveSetting(settingKey, value);
          if (!result.success) {
            return res.status(500).json({ error: result.error });
          }
        }
        
        return res.status(200).json({ success: true });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}