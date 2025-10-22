# Professional CSP Scheduling Engine

Advanced scheduling application with constraint satisfaction problem (CSP) solving capabilities.

## Features

- **Multi-Group Scheduling**: Support for teachers, students, and staff with different scheduling frequencies
- **Constraint Management**: Group-level and individual availability constraints
- **Room Optimization**: Automatic 1-2 room allocation with conflict resolution
- **Mid-Month Rescheduling**: Lock past appointments while rescheduling future ones
- **Weekly Planning Control**: Select specific weeks for each group
- **Real-time Diagnostics**: Detailed constraint violation reports
- **Fast Performance**: Greedy algorithm with timeout protection (no freezing)

## Scheduling Frequencies

- **Weekly**: Every week scheduling
- **Bi-weekly**: Every 2 weeks (odd/even week patterns)
- **Monthly**: Once per month (flexible week selection)

## Constraint Types

- **Group Constraints**: Hard rules for entire groups (e.g., "Staff cannot work Fridays")
- **Individual Availability**: Custom time slots for each person
- **Duration Requirements**: 15-30 minute appointment lengths
- **Room Conflicts**: Automatic room assignment to prevent overlaps

## Usage

1. **Set Global Settings**: Choose planning period, rooms, and horizon
2. **Configure Groups**: Set count, frequency, and duration for each group
3. **Add Constraints**: Define group rules and individual availability
4. **Generate Schedule**: Click "Generate Plan" for automatic scheduling
5. **Review Results**: Check calendar and diagnostics for any issues

## Technology

- **Frontend**: Pure HTML/CSS/JavaScript with modern ES6+ features
- **Backend**: Node.js serverless functions (Vercel)
- **Database**: Neon PostgreSQL (serverless)
- **CSP Solver**: Client-side greedy algorithm with constraint satisfaction
- **Persistence**: Dual-layer (Database + LocalStorage fallback)
- **Deployment**: Vercel with automatic CI/CD

## Demo Data

Click "Load Demo Data" to see a complex scheduling scenario with:
- 35+ people across 6 groups
- Challenging constraint conflicts
- Real-world availability patterns
- Multi-room optimization

## Deployment

This is a static web application that can be deployed to any web server or CDN.

---

Built with modern web technologies for professional scheduling needs.
## Da
tabase Setup (Neon)

### 1. Create Neon Account
- Go to [neon.tech](https://neon.tech)
- Sign up for free account
- Create a new project

### 2. Get Database URL
- Copy the connection string from your Neon dashboard
- Format: `postgresql://username:password@hostname/database?sslmode=require`

### 3. Configure Vercel Environment Variables
- Go to your Vercel project dashboard
- Navigate to Settings → Environment Variables
- Add: `DATABASE_URL` with your Neon connection string

### 4. Database Schema
The application automatically creates these tables on first run:
- `groups` - Group configurations (teachers, students, etc.)
- `group_constraints` - Hard constraints for groups
- `individual_constraints` - Personal availability slots
- `appointments` - Scheduled appointments/meetings
- `settings` - Global application settings
- `weekly_schedule_settings` - Week-specific group settings

## API Endpoints

- `GET/POST /api/groups` - Manage group configurations
- `GET/POST /api/constraints` - Handle group and individual constraints
- `GET/POST /api/appointments` - Schedule management
- `GET/POST /api/settings` - Application settings

## Offline Support

The application works offline using localStorage as fallback:
- 🟢 **Online**: Data synced with Neon database
- 🟡 **Offline**: Uses local browser storage
- Automatic sync when connection restored

## Environment Variables

```bash
# Required for database functionality
DATABASE_URL=postgresql://user:pass@hostname/db?sslmode=require
```

## Local Development

```bash
# Install dependencies
npm install

# Start development server
vercel dev

# Or use Vercel CLI
npx vercel dev
```

Access at: `http://localhost:3000`