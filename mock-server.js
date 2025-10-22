import http from 'http';
import url from 'url';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock database
let mockDB = {
    groups: [
        { id: 'teacher', name: 'Teachers', count: 5, duration: 30, measurements: 1, frequency: 'weekly', pattern: 'any', preferred_day: 'any' },
        { id: 'student', name: 'Students', count: 10, duration: 15, measurements: 1, frequency: 'monthly', pattern: 'any', preferred_day: 'any' }
    ],
    groupConstraints: [],
    individualConstraints: {},
    appointments: [],
    settings: {
        'scheduler_start_date': '2025-10-20',
        'scheduler_rooms': 'auto',
        'scheduler_horizon_weeks': '5'
    },
    weeklySettings: {}
};

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // API Routes
    if (pathname.startsWith('/api/')) {
        handleAPI(req, res, pathname, parsedUrl.query);
        return;
    }

    // Static file serving
    serveStaticFile(req, res, pathname);
});

function handleAPI(req, res, pathname, query) {
    res.setHeader('Content-Type', 'application/json');
    
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    
    req.on('end', () => {
        try {
            const data = body ? JSON.parse(body) : null;
            
            if (pathname === '/api/groups') {
                if (req.method === 'GET') {
                    res.writeHead(200);
                    res.end(JSON.stringify(mockDB.groups));
                } else if (req.method === 'POST') {
                    mockDB.groups = data;
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true }));
                }
            } else if (pathname === '/api/constraints') {
                if (req.method === 'GET') {
                    if (query.type === 'group') {
                        res.writeHead(200);
                        res.end(JSON.stringify(mockDB.groupConstraints));
                    } else if (query.type === 'individual') {
                        res.writeHead(200);
                        res.end(JSON.stringify(mockDB.individualConstraints));
                    }
                } else if (req.method === 'POST') {
                    if (query.type === 'group') {
                        mockDB.groupConstraints = data;
                    } else if (query.type === 'individual') {
                        mockDB.individualConstraints = data;
                    }
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true }));
                }
            } else if (pathname === '/api/appointments') {
                if (req.method === 'GET') {
                    res.writeHead(200);
                    res.end(JSON.stringify(mockDB.appointments));
                } else if (req.method === 'POST') {
                    mockDB.appointments = data;
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true }));
                }
            } else if (pathname === '/api/settings') {
                if (req.method === 'GET') {
                    if (query.type === 'weekly') {
                        res.writeHead(200);
                        res.end(JSON.stringify(mockDB.weeklySettings));
                    } else {
                        res.writeHead(200);
                        res.end(JSON.stringify(mockDB.settings));
                    }
                } else if (req.method === 'POST') {
                    if (query.type === 'weekly') {
                        mockDB.weeklySettings = data;
                    } else {
                        Object.assign(mockDB.settings, data);
                    }
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true }));
                }
            } else {
                res.writeHead(404);
                res.end(JSON.stringify({ error: 'API endpoint not found' }));
            }
        } catch (error) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: error.message }));
        }
    });
}

function serveStaticFile(req, res, pathname) {
    if (pathname === '/') {
        pathname = '/index.html';
    }
    
    const filePath = path.join(__dirname, pathname.slice(1));
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('File not found');
            return;
        }
        
        const ext = path.extname(filePath);
        const contentType = {
            '.html': 'text/html',
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.json': 'application/json'
        }[ext] || 'text/plain';
        
        res.setHeader('Content-Type', contentType);
        res.writeHead(200);
        res.end(data);
    });
}

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`🚀 Mock server running at http://localhost:${PORT}`);
    console.log(`📊 API endpoints available at http://localhost:${PORT}/api/*`);
    console.log(`🧪 Test page: http://localhost:${PORT}/test.html`);
    console.log(`📱 Main app: http://localhost:${PORT}/`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down mock server...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});