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

- Pure HTML/CSS/JavaScript (no dependencies)
- Client-side CSP solver with greedy algorithm
- LocalStorage persistence
- Responsive design

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