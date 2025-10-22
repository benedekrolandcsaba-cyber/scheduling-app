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
        const { endpoint } = req.query;

        if (req.method === 'GET') {
            if (endpoint === 'metrics') {
                // Get dashboard metrics
                const metrics = await getDashboardMetrics();
                return res.status(200).json(metrics);
            } else if (endpoint === 'conflicts') {
                // Get recent conflicts
                const conflicts = await getRecentConflicts();
                return res.status(200).json(conflicts);
            } else {
                // Get general dashboard data
                const dashboardData = await getDashboardData();
                return res.status(200).json(dashboardData);
            }
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('Dashboard API Error:', error);
        return res.status(500).json({ error: error.message });
    }
}

async function getDashboardMetrics() {
    try {
        // Get total appointments
        const appointmentsResult = await sql`
            SELECT COUNT(*) as total_appointments 
            FROM appointments 
            WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        `;
        
        // Get total conflicts
        const conflictsResult = await sql`
            SELECT COUNT(*) as total_conflicts 
            FROM appointments 
            WHERE has_conflict = true 
            AND created_at >= CURRENT_DATE - INTERVAL '30 days'
        `;
        
        // Get active planning sessions
        const sessionsResult = await sql`
            SELECT COUNT(*) as active_sessions,
                   AVG(optimization_score) as avg_optimization_score
            FROM planning_sessions 
            WHERE status = 'active'
        `;
        
        // Calculate resolution rate
        const totalConflicts = parseInt(conflictsResult[0].total_conflicts) || 0;
        const resolvedConflicts = await sql`
            SELECT COUNT(*) as resolved_conflicts 
            FROM conflict_resolutions 
            WHERE is_user_approved = true 
            AND created_at >= CURRENT_DATE - INTERVAL '30 days'
        `;
        
        const resolutionRate = totalConflicts > 0 
            ? (parseInt(resolvedConflicts[0].resolved_conflicts) / totalConflicts) * 100 
            : 100;

        return {
            totalAppointments: parseInt(appointmentsResult[0].total_appointments) || 0,
            totalConflicts: totalConflicts,
            resolutionRate: Math.round(resolutionRate * 10) / 10,
            optimizationScore: Math.round((parseFloat(sessionsResult[0].avg_optimization_score) || 0) * 10) / 10,
            activeSessions: parseInt(sessionsResult[0].active_sessions) || 0
        };
    } catch (error) {
        console.error('Error getting dashboard metrics:', error);
        return {
            totalAppointments: 0,
            totalConflicts: 0,
            resolutionRate: 0,
            optimizationScore: 0,
            activeSessions: 0
        };
    }
}

async function getRecentConflicts() {
    try {
        const conflicts = await sql`
            SELECT cr.*, ps.name as session_name
            FROM conflict_resolutions cr
            LEFT JOIN planning_sessions ps ON cr.planning_session_id = ps.id
            WHERE cr.created_at >= CURRENT_DATE - INTERVAL '7 days'
            ORDER BY cr.created_at DESC
            LIMIT 10
        `;
        
        return conflicts.map(conflict => ({
            id: conflict.id,
            type: conflict.conflict_type,
            severity: conflict.severity,
            isResolved: conflict.is_user_approved,
            sessionName: conflict.session_name,
            createdAt: conflict.created_at,
            originalSlot: {
                date: conflict.original_slot_date,
                time: conflict.original_slot_time,
                room: conflict.original_room
            },
            resolvedSlot: conflict.resolved_slot_date ? {
                date: conflict.resolved_slot_date,
                time: conflict.resolved_slot_time,
                room: conflict.resolved_room
            } : null
        }));
    } catch (error) {
        console.error('Error getting recent conflicts:', error);
        return [];
    }
}

async function getDashboardData() {
    try {
        const metrics = await getDashboardMetrics();
        const conflicts = await getRecentConflicts();
        
        // Get recent planning sessions
        const recentSessions = await sql`
            SELECT * FROM planning_sessions 
            ORDER BY created_at DESC 
            LIMIT 5
        `;
        
        // Get algorithm performance
        const algorithmStats = await sql`
            SELECT algorithm_name, parameters, performance_metrics
            FROM algorithm_settings 
            WHERE is_active = true
            ORDER BY algorithm_name
        `;
        
        return {
            metrics,
            conflicts,
            recentSessions,
            algorithmStats
        };
    } catch (error) {
        console.error('Error getting dashboard data:', error);
        return {
            metrics: await getDashboardMetrics(),
            conflicts: [],
            recentSessions: [],
            algorithmStats: []
        };
    }
}