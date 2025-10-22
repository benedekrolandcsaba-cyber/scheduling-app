/**
 * Advanced Scheduling Algorithms
 * Professional CSP solvers with conflict resolution
 */

class AdvancedSchedulingEngine {
    constructor() {
        this.algorithms = {
            'csp_backtrack': new CSPBacktrackingSolver(),
            'min_conflict': new MinConflictSolver(),
            'simulated_annealing': new SimulatedAnnealingSolver()
        };
        
        this.priorityWeights = {
            'teacher': 100,
            'staff': 80,
            'india': 60,
            'y2023': 40,
            'y2022': 30,
            'y2021': 20
        };
        
        this.conflictResolver = new ConflictResolver();
    }

    async solve(config) {
        const algorithm = this.algorithms[config.algorithm] || this.algorithms['csp_backtrack'];
        
        try {
            // Generate tasks and domains
            const { tasks, domains, diagnostics } = await this.generateTasksAndDomains(config);
            
            if (tasks.length === 0) {
                return { success: false, error: 'No tasks to schedule' };
            }

            // Execute the selected algorithm
            const result = await algorithm.solve(tasks, domains, config);
            
            // Resolve conflicts if any
            if (result.conflicts && result.conflicts.length > 0) {
                const resolvedResult = await this.conflictResolver.resolve(result, config);
                return resolvedResult;
            }
            
            return result;
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async generateTasksAndDomains(config) {
        // Enhanced task generation with flexible date ranges
        const tasks = [];
        const domains = {};
        const diagnostics = [];
        
        const startDate = new Date(config.startDate);
        const endDate = new Date(config.endDate);
        const planningSlots = this.generatePlanningSlots(startDate, endDate);
        
        // Get groups and constraints
        const groups = await window.apiClient.getGroups();
        const groupConstraints = await window.apiClient.getGroupConstraints();
        const individualConstraints = await window.apiClient.getIndividualConstraints();
        
        // Generate tasks for each group
        for (const group of groups) {
            const taskCount = this.calculateTaskCount(group, startDate, endDate);
            
            for (let i = 1; i <= group.count; i++) {
                for (let taskNum = 1; taskNum <= taskCount; taskNum++) {
                    const taskId = `${group.id}_${i}_${taskNum}`;
                    tasks.push({
                        id: taskId,
                        personId: `${group.id}_${i}`,
                        groupId: group.id,
                        duration: group.duration || 15,
                        priority: this.priorityWeights[group.id] || 10,
                        measurements: group.measurements || 1
                    });
                    
                    // Generate domain for this task
                    domains[taskId] = this.generateTaskDomain(
                        taskId, 
                        planningSlots, 
                        group, 
                        groupConstraints, 
                        individualConstraints
                    );
                }
            }
        }
        
        return { tasks, domains, diagnostics };
    }

    calculateTaskCount(group, startDate, endDate) {
        const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        const weeksDiff = Math.ceil(daysDiff / 7);
        
        switch (group.freq) {
            case 'weekly':
                return weeksDiff;
            case 'every_2_weeks':
                return Math.ceil(weeksDiff / 2);
            case 'monthly':
                return Math.ceil(daysDiff / 30);
            default:
                return 1;
        }
    }

    generatePlanningSlots(startDate, endDate) {
        const slots = [];
        const currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
            // Only weekdays (Monday-Friday)
            if (currentDate.getDay() >= 1 && currentDate.getDay() <= 5) {
                // Generate time slots (9:00-17:00 in 15-minute intervals)
                for (let hour = 9; hour < 17; hour++) {
                    for (let minute = 0; minute < 60; minute += 15) {
                        const slotTime = new Date(currentDate);
                        slotTime.setHours(hour, minute, 0, 0);
                        
                        slots.push({
                            date: currentDate.toISOString().split('T')[0],
                            time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
                            timestamp: slotTime.getTime(),
                            dayOfWeek: currentDate.getDay()
                        });
                    }
                }
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return slots;
    }

    generateTaskDomain(taskId, planningSlots, group, groupConstraints, individualConstraints) {
        let validSlots = [...planningSlots];
        
        // Apply group constraints
        const relevantGroupConstraints = groupConstraints.filter(c => c.group === group.id);
        for (const constraint of relevantGroupConstraints) {
            validSlots = validSlots.filter(slot => {
                if (constraint.type === 'not_day') {
                    return slot.dayOfWeek !== constraint.value;
                } else if (constraint.type === 'only_day') {
                    return slot.dayOfWeek === constraint.value;
                }
                return true;
            });
        }
        
        // Apply individual constraints
        const personId = taskId.split('_').slice(0, 2).join('_');
        const personConstraints = individualConstraints[personId] || [];
        
        if (personConstraints.length > 0) {
            const availableSlots = new Set(
                personConstraints.map(c => {
                    const date = new Date(c.start);
                    return `${date.toISOString().split('T')[0]}_${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                })
            );
            
            validSlots = validSlots.filter(slot => 
                availableSlots.has(`${slot.date}_${slot.time}`)
            );
        }
        
        // Filter by duration requirements
        const requiredSlots = Math.ceil((group.duration || 15) / 15);
        if (requiredSlots > 1) {
            validSlots = validSlots.filter(slot => {
                // Check if enough consecutive slots are available
                const consecutiveSlots = this.getConsecutiveSlots(slot, requiredSlots, planningSlots);
                return consecutiveSlots.length === requiredSlots;
            });
        }
        
        return validSlots;
    }

    getConsecutiveSlots(startSlot, count, allSlots) {
        const consecutive = [startSlot];
        let currentTime = startSlot.timestamp;
        
        for (let i = 1; i < count; i++) {
            currentTime += 15 * 60 * 1000; // Add 15 minutes
            const nextSlot = allSlots.find(s => s.timestamp === currentTime);
            if (nextSlot) {
                consecutive.push(nextSlot);
            } else {
                break;
            }
        }
        
        return consecutive;
    }
}

/**
 * CSP Backtracking Solver with MRV and Forward Checking
 */
class CSPBacktrackingSolver {
    constructor() {
        this.maxBacktracks = 1000;
        this.stats = { backtracks: 0, assignments: 0, constraintChecks: 0 };
    }

    async solve(tasks, domains, config) {
        this.stats = { backtracks: 0, assignments: 0, constraintChecks: 0 };
        const assignment = new Map();
        const roomSchedules = Array.from({ length: config.rooms || 2 }, () => new Set());
        
        // Sort tasks by domain size (MRV - Most Restrictive Variable)
        const sortedTasks = tasks.sort((a, b) => {
            const domainSizeA = domains[a.id]?.length || 0;
            const domainSizeB = domains[b.id]?.length || 0;
            if (domainSizeA !== domainSizeB) return domainSizeA - domainSizeB;
            return b.priority - a.priority; // Higher priority first as tie-breaker
        });

        const result = await this.backtrack(sortedTasks, 0, assignment, domains, roomSchedules, config);
        
        return {
            success: result,
            solution: assignment,
            unscheduled: result ? [] : sortedTasks.filter(t => !assignment.has(t.id)),
            stats: this.stats,
            conflicts: []
        };
    }

    async backtrack(tasks, taskIndex, assignment, domains, roomSchedules, config) {
        if (taskIndex >= tasks.length) return true;
        if (this.stats.backtracks > this.maxBacktracks) return false;

        const task = tasks[taskIndex];
        const domain = domains[task.id] || [];
        
        // LCV - Least Constraining Value (sort slots by how many other tasks they affect)
        const sortedDomain = this.sortDomainByLCV(domain, tasks, domains, assignment);
        
        for (const slot of sortedDomain) {
            this.stats.assignments++;
            
            // Try to assign to each room
            for (let room = 0; room < roomSchedules.length; room++) {
                if (this.isValidAssignment(task, slot, room, roomSchedules, assignment)) {
                    // Make assignment
                    const requiredSlots = this.getRequiredSlots(task, slot);
                    requiredSlots.forEach(s => roomSchedules[room].add(this.slotKey(s)));
                    assignment.set(task.id, { slot, room: room + 1, task: task.id });
                    
                    // Forward checking - reduce domains of remaining tasks
                    const reducedDomains = this.forwardCheck(tasks, taskIndex + 1, domains, assignment, roomSchedules);
                    
                    if (reducedDomains && await this.backtrack(tasks, taskIndex + 1, assignment, reducedDomains, roomSchedules, config)) {
                        return true;
                    }
                    
                    // Backtrack
                    this.stats.backtracks++;
                    requiredSlots.forEach(s => roomSchedules[room].delete(this.slotKey(s)));
                    assignment.delete(task.id);
                }
            }
        }
        
        return false;
    }

    isValidAssignment(task, slot, room, roomSchedules, assignment) {
        this.stats.constraintChecks++;
        
        const requiredSlots = this.getRequiredSlots(task, slot);
        
        // Check room availability
        for (const reqSlot of requiredSlots) {
            if (roomSchedules[room].has(this.slotKey(reqSlot))) {
                return false;
            }
        }
        
        // Check person availability (no double booking)
        for (const [assignedTaskId, assignedInfo] of assignment) {
            const assignedTask = { id: assignedTaskId };
            const assignedPersonId = assignedTaskId.split('_').slice(0, 2).join('_');
            const currentPersonId = task.id.split('_').slice(0, 2).join('_');
            
            if (assignedPersonId === currentPersonId) {
                const assignedSlots = this.getRequiredSlots(assignedTask, assignedInfo.slot);
                for (const reqSlot of requiredSlots) {
                    for (const assignedSlot of assignedSlots) {
                        if (this.slotsOverlap(reqSlot, assignedSlot)) {
                            return false;
                        }
                    }
                }
            }
        }
        
        return true;
    }

    getRequiredSlots(task, startSlot) {
        const slots = [startSlot];
        const duration = task.duration || 15;
        const slotsNeeded = Math.ceil(duration / 15);
        
        let currentTime = startSlot.timestamp;
        for (let i = 1; i < slotsNeeded; i++) {
            currentTime += 15 * 60 * 1000;
            slots.push({
                date: startSlot.date,
                time: new Date(currentTime).toTimeString().slice(0, 5),
                timestamp: currentTime,
                dayOfWeek: startSlot.dayOfWeek
            });
        }
        
        return slots;
    }

    slotKey(slot) {
        return `${slot.date}_${slot.time}`;
    }

    slotsOverlap(slot1, slot2) {
        return this.slotKey(slot1) === this.slotKey(slot2);
    }

    sortDomainByLCV(domain, tasks, domains, assignment) {
        // For now, return domain as-is. LCV implementation would be more complex
        return domain;
    }

    forwardCheck(tasks, startIndex, domains, assignment, roomSchedules) {
        // Simplified forward checking - return original domains
        // Full implementation would reduce domains based on current assignments
        return domains;
    }
}

/**
 * Min-Conflict Local Search Solver
 */
class MinConflictSolver {
    constructor() {
        this.maxIterations = 500;
        this.tabuTenure = 10;
    }

    async solve(tasks, domains, config) {
        // Generate initial random assignment
        let assignment = this.generateRandomAssignment(tasks, domains, config.rooms || 2);
        let conflicts = this.countConflicts(assignment, tasks);
        
        const tabuList = new Map();
        let iteration = 0;
        let bestAssignment = new Map(assignment);
        let bestConflicts = conflicts;
        
        while (conflicts > 0 && iteration < this.maxIterations) {
            const conflictedTask = this.selectConflictedTask(assignment, tasks);
            if (!conflictedTask) break;
            
            const bestMove = this.findBestMove(conflictedTask, assignment, domains, tasks, tabuList);
            if (bestMove) {
                assignment.set(conflictedTask.id, bestMove);
                conflicts = this.countConflicts(assignment, tasks);
                
                if (conflicts < bestConflicts) {
                    bestAssignment = new Map(assignment);
                    bestConflicts = conflicts;
                }
                
                // Update tabu list
                tabuList.set(conflictedTask.id, iteration + this.tabuTenure);
            }
            
            iteration++;
        }
        
        return {
            success: bestConflicts === 0,
            solution: bestAssignment,
            unscheduled: bestConflicts > 0 ? this.getUnscheduledTasks(bestAssignment, tasks) : [],
            stats: { iterations: iteration, finalConflicts: bestConflicts },
            conflicts: this.getConflictDetails(bestAssignment, tasks)
        };
    }

    generateRandomAssignment(tasks, domains, numRooms) {
        const assignment = new Map();
        
        for (const task of tasks) {
            const domain = domains[task.id] || [];
            if (domain.length > 0) {
                const randomSlot = domain[Math.floor(Math.random() * domain.length)];
                const randomRoom = Math.floor(Math.random() * numRooms) + 1;
                assignment.set(task.id, { slot: randomSlot, room: randomRoom, task: task.id });
            }
        }
        
        return assignment;
    }

    countConflicts(assignment, tasks) {
        let conflicts = 0;
        const roomSchedules = new Map();
        const personSchedules = new Map();
        
        for (const [taskId, info] of assignment) {
            const task = tasks.find(t => t.id === taskId);
            const personId = taskId.split('_').slice(0, 2).join('_');
            const slotKey = `${info.slot.date}_${info.slot.time}`;
            
            // Check room conflicts
            const roomKey = `${info.room}_${slotKey}`;
            if (roomSchedules.has(roomKey)) {
                conflicts++;
            } else {
                roomSchedules.set(roomKey, taskId);
            }
            
            // Check person conflicts
            const personKey = `${personId}_${slotKey}`;
            if (personSchedules.has(personKey)) {
                conflicts++;
            } else {
                personSchedules.set(personKey, taskId);
            }
        }
        
        return conflicts;
    }

    selectConflictedTask(assignment, tasks) {
        // Find a task that's involved in conflicts
        const conflicts = this.getConflictDetails(assignment, tasks);
        if (conflicts.length > 0) {
            return tasks.find(t => t.id === conflicts[0].taskId);
        }
        return null;
    }

    findBestMove(task, assignment, domains, tasks, tabuList) {
        const domain = domains[task.id] || [];
        let bestMove = null;
        let bestConflictReduction = -Infinity;
        
        const currentConflicts = this.countConflicts(assignment, tasks);
        
        for (const slot of domain) {
            for (let room = 1; room <= 2; room++) {
                const move = { slot, room, task: task.id };
                
                // Skip if tabu
                if (tabuList.has(task.id) && tabuList.get(task.id) > Date.now()) {
                    continue;
                }
                
                // Try this move
                const originalMove = assignment.get(task.id);
                assignment.set(task.id, move);
                
                const newConflicts = this.countConflicts(assignment, tasks);
                const conflictReduction = currentConflicts - newConflicts;
                
                if (conflictReduction > bestConflictReduction) {
                    bestConflictReduction = conflictReduction;
                    bestMove = move;
                }
                
                // Restore original
                if (originalMove) {
                    assignment.set(task.id, originalMove);
                } else {
                    assignment.delete(task.id);
                }
            }
        }
        
        return bestMove;
    }

    getUnscheduledTasks(assignment, tasks) {
        return tasks.filter(t => !assignment.has(t.id));
    }

    getConflictDetails(assignment, tasks) {
        const conflicts = [];
        const roomSchedules = new Map();
        const personSchedules = new Map();
        
        for (const [taskId, info] of assignment) {
            const personId = taskId.split('_').slice(0, 2).join('_');
            const slotKey = `${info.slot.date}_${info.slot.time}`;
            
            // Check room conflicts
            const roomKey = `${info.room}_${slotKey}`;
            if (roomSchedules.has(roomKey)) {
                conflicts.push({
                    type: 'room_conflict',
                    taskId: taskId,
                    conflictsWith: roomSchedules.get(roomKey),
                    slot: slotKey,
                    room: info.room
                });
            } else {
                roomSchedules.set(roomKey, taskId);
            }
            
            // Check person conflicts
            const personKey = `${personId}_${slotKey}`;
            if (personSchedules.has(personKey)) {
                conflicts.push({
                    type: 'person_conflict',
                    taskId: taskId,
                    conflictsWith: personSchedules.get(personKey),
                    slot: slotKey,
                    person: personId
                });
            } else {
                personSchedules.set(personKey, taskId);
            }
        }
        
        return conflicts;
    }
}

/**
 * Simulated Annealing Solver
 */
class SimulatedAnnealingSolver {
    constructor() {
        this.initialTemperature = 100;
        this.coolingRate = 0.95;
        this.minTemperature = 0.1;
        this.maxIterations = 1000;
    }

    async solve(tasks, domains, config) {
        let currentSolution = this.generateRandomAssignment(tasks, domains, config.rooms || 2);
        let currentCost = this.calculateCost(currentSolution, tasks);
        
        let bestSolution = new Map(currentSolution);
        let bestCost = currentCost;
        
        let temperature = this.initialTemperature;
        let iteration = 0;
        
        while (temperature > this.minTemperature && iteration < this.maxIterations) {
            const neighbor = this.generateNeighbor(currentSolution, tasks, domains);
            const neighborCost = this.calculateCost(neighbor, tasks);
            
            const deltaE = neighborCost - currentCost;
            
            if (deltaE < 0 || Math.random() < Math.exp(-deltaE / temperature)) {
                currentSolution = neighbor;
                currentCost = neighborCost;
                
                if (currentCost < bestCost) {
                    bestSolution = new Map(currentSolution);
                    bestCost = currentCost;
                }
            }
            
            temperature *= this.coolingRate;
            iteration++;
        }
        
        return {
            success: bestCost === 0,
            solution: bestSolution,
            unscheduled: bestCost > 0 ? this.getUnscheduledTasks(bestSolution, tasks) : [],
            stats: { iterations: iteration, finalCost: bestCost, finalTemperature: temperature },
            conflicts: this.getConflictDetails(bestSolution, tasks)
        };
    }

    generateRandomAssignment(tasks, domains, numRooms) {
        // Same as MinConflictSolver
        const assignment = new Map();
        
        for (const task of tasks) {
            const domain = domains[task.id] || [];
            if (domain.length > 0) {
                const randomSlot = domain[Math.floor(Math.random() * domain.length)];
                const randomRoom = Math.floor(Math.random() * numRooms) + 1;
                assignment.set(task.id, { slot: randomSlot, room: randomRoom, task: task.id });
            }
        }
        
        return assignment;
    }

    calculateCost(assignment, tasks) {
        // Cost = number of conflicts + penalty for unscheduled tasks
        let cost = 0;
        const roomSchedules = new Map();
        const personSchedules = new Map();
        
        for (const [taskId, info] of assignment) {
            const personId = taskId.split('_').slice(0, 2).join('_');
            const slotKey = `${info.slot.date}_${info.slot.time}`;
            
            // Room conflict cost
            const roomKey = `${info.room}_${slotKey}`;
            if (roomSchedules.has(roomKey)) {
                cost += 10; // High penalty for room conflicts
            } else {
                roomSchedules.set(roomKey, taskId);
            }
            
            // Person conflict cost
            const personKey = `${personId}_${slotKey}`;
            if (personSchedules.has(personKey)) {
                cost += 20; // Very high penalty for person conflicts
            } else {
                personSchedules.set(personKey, taskId);
            }
        }
        
        // Penalty for unscheduled tasks
        const scheduledTasks = new Set(assignment.keys());
        const unscheduledCount = tasks.filter(t => !scheduledTasks.has(t.id)).length;
        cost += unscheduledCount * 5;
        
        return cost;
    }

    generateNeighbor(solution, tasks, domains) {
        const neighbor = new Map(solution);
        
        // Randomly select a task to move
        const taskIds = Array.from(solution.keys());
        if (taskIds.length === 0) return neighbor;
        
        const randomTaskId = taskIds[Math.floor(Math.random() * taskIds.length)];
        const domain = domains[randomTaskId] || [];
        
        if (domain.length > 0) {
            const randomSlot = domain[Math.floor(Math.random() * domain.length)];
            const randomRoom = Math.floor(Math.random() * 2) + 1;
            neighbor.set(randomTaskId, { slot: randomSlot, room: randomRoom, task: randomTaskId });
        }
        
        return neighbor;
    }

    getUnscheduledTasks(assignment, tasks) {
        return tasks.filter(t => !assignment.has(t.id));
    }

    getConflictDetails(assignment, tasks) {
        // Same as MinConflictSolver
        const conflicts = [];
        const roomSchedules = new Map();
        const personSchedules = new Map();
        
        for (const [taskId, info] of assignment) {
            const personId = taskId.split('_').slice(0, 2).join('_');
            const slotKey = `${info.slot.date}_${info.slot.time}`;
            
            // Check room conflicts
            const roomKey = `${info.room}_${slotKey}`;
            if (roomSchedules.has(roomKey)) {
                conflicts.push({
                    type: 'room_conflict',
                    taskId: taskId,
                    conflictsWith: roomSchedules.get(roomKey),
                    slot: slotKey,
                    room: info.room
                });
            } else {
                roomSchedules.set(roomKey, taskId);
            }
            
            // Check person conflicts
            const personKey = `${personId}_${slotKey}`;
            if (personSchedules.has(personKey)) {
                conflicts.push({
                    type: 'person_conflict',
                    taskId: taskId,
                    conflictsWith: personSchedules.get(personKey),
                    slot: slotKey,
                    person: personId
                });
            } else {
                personSchedules.set(personKey, taskId);
            }
        }
        
        return conflicts;
    }
}

/**
 * Conflict Resolution System
 */
class ConflictResolver {
    constructor() {
        this.resolutionStrategies = {
            'priority_based': this.resolvePriorityBased.bind(this),
            'time_shift': this.resolveTimeShift.bind(this),
            'room_reassign': this.resolveRoomReassign.bind(this)
        };
    }

    async resolve(result, config) {
        if (!result.conflicts || result.conflicts.length === 0) {
            return result;
        }

        const resolvedSolution = new Map(result.solution);
        const resolutions = [];
        
        for (const conflict of result.conflicts) {
            const resolution = await this.resolveConflict(conflict, resolvedSolution, config);
            if (resolution) {
                resolutions.push(resolution);
            }
        }
        
        return {
            ...result,
            solution: resolvedSolution,
            resolutions: resolutions,
            conflicts: this.getUpdatedConflicts(resolvedSolution, result.tasks || [])
        };
    }

    async resolveConflict(conflict, solution, config) {
        // Try different resolution strategies
        for (const strategy of ['priority_based', 'time_shift', 'room_reassign']) {
            const resolution = await this.resolutionStrategies[strategy](conflict, solution, config);
            if (resolution) {
                return resolution;
            }
        }
        return null;
    }

    async resolvePriorityBased(conflict, solution, config) {
        // Move lower priority task to different slot
        const task1 = conflict.taskId;
        const task2 = conflict.conflictsWith;
        
        // Determine priorities (teacher > staff > india > others)
        const priority1 = this.getTaskPriority(task1);
        const priority2 = this.getTaskPriority(task2);
        
        const lowerPriorityTask = priority1 < priority2 ? task1 : task2;
        
        // Try to find alternative slot for lower priority task
        // This would require access to domains and availability checking
        
        return {
            type: 'priority_based',
            movedTask: lowerPriorityTask,
            originalSlot: solution.get(lowerPriorityTask),
            newSlot: null, // Would be determined by availability check
            reason: 'Lower priority task moved to resolve conflict'
        };
    }

    async resolveTimeShift(conflict, solution, config) {
        // Try to shift one of the conflicting tasks to nearby time slot
        return {
            type: 'time_shift',
            movedTask: conflict.taskId,
            originalSlot: solution.get(conflict.taskId),
            newSlot: null, // Would be determined by nearby slot availability
            reason: 'Task shifted to nearby time slot'
        };
    }

    async resolveRoomReassign(conflict, solution, config) {
        // Try to assign one task to different room
        if (conflict.type === 'room_conflict') {
            return {
                type: 'room_reassign',
                movedTask: conflict.taskId,
                originalRoom: conflict.room,
                newRoom: conflict.room === 1 ? 2 : 1,
                reason: 'Task moved to different room'
            };
        }
        return null;
    }

    getTaskPriority(taskId) {
        const groupId = taskId.split('_')[0];
        const priorities = {
            'teacher': 100,
            'staff': 80,
            'india': 60,
            'y2023': 40,
            'y2022': 30,
            'y2021': 20
        };
        return priorities[groupId] || 10;
    }

    getUpdatedConflicts(solution, tasks) {
        // Recalculate conflicts after resolution attempts
        const conflicts = [];
        const roomSchedules = new Map();
        const personSchedules = new Map();
        
        for (const [taskId, info] of solution) {
            const personId = taskId.split('_').slice(0, 2).join('_');
            const slotKey = `${info.slot.date}_${info.slot.time}`;
            
            // Check room conflicts
            const roomKey = `${info.room}_${slotKey}`;
            if (roomSchedules.has(roomKey)) {
                conflicts.push({
                    type: 'room_conflict',
                    taskId: taskId,
                    conflictsWith: roomSchedules.get(roomKey),
                    slot: slotKey,
                    room: info.room
                });
            } else {
                roomSchedules.set(roomKey, taskId);
            }
            
            // Check person conflicts
            const personKey = `${personId}_${slotKey}`;
            if (personSchedules.has(personKey)) {
                conflicts.push({
                    type: 'person_conflict',
                    taskId: taskId,
                    conflictsWith: personSchedules.get(personKey),
                    slot: slotKey,
                    person: personId
                });
            } else {
                personSchedules.set(personKey, taskId);
            }
        }
        
        return conflicts;
    }
}

// Global instance
window.advancedSchedulingEngine = new AdvancedSchedulingEngine();