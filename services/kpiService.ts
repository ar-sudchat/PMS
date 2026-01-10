import { Project, ProjectMilestone } from "@/types/project";
import { TimesheetEntry } from "@/types/timesheet";

// --- Time to Delivery ---
// Formula: Weighted average of milestone on-time performance
export function calculateTimeToDelivery(project: Project): number {
    let totalWeightedScore = 0;
    let totalWeight = 0;

    project.milestones?.forEach(milestone => {
        // Only calculate for completed milestones or passed deadlines
        // For simplicity, we use status 'completed'
        if ((milestone as any).status === 'completed') {
            const ratio = ((milestone as any).time_delivery_ratio || 0) / 100;
            // Score: 100% if on time, 0% if late
            const score = (milestone as any).is_on_time ? 100 : 0;

            totalWeightedScore += ratio * score;
            totalWeight += ratio * 100; // Normalizing to weight base
        }
    });

    return totalWeight > 0 ? (totalWeightedScore / totalWeight) * 100 : 0;
}

// --- Man-day Control ---
// Formula: Weighted average of milestone budget adherence
export function calculateMandayControl(project: Project): number {
    let totalWeightedScore = 0;
    let totalWeight = 0;

    project.milestones?.forEach(milestone => {
        if ((milestone as any).status === 'completed') {
            const ratio = ((milestone as any).manday_control_ratio || 0) / 100;
            // Score: 100% if within budget, 0% if over budget
            // Advanced: Could be proportional, but pass/fail is standard CMMI base
            const isWithinBudget = (milestone.actual_mandays || 0) <= milestone.planned_mandays;
            const score = isWithinBudget ? 100 : 0;

            totalWeightedScore += ratio * score;
            totalWeight += ratio * 100;
        }
    });

    return totalWeight > 0 ? (totalWeightedScore / totalWeight) * 100 : 0;
}

// --- Defect Ratio ---
// Formula: (Mandays for Defect Fixes / Total Mandays) * 100
// Target: <= 15% (Success), > 15% (Fail)
export function calculateDefectRatio(project: Project, timesheets: TimesheetEntry[]): number {
    const projectEntries = timesheets.filter(t => t.project_id === project.id);

    if (projectEntries.length === 0) return 0;

    const totalMandays = projectEntries.reduce((sum, t) => sum + t.mandays, 0);
    const defectMandays = projectEntries
        .filter(t => t.is_defect_fix || t.work_type === 'defect_fix')
        .reduce((sum, t) => sum + t.mandays, 0);

    if (totalMandays === 0) return 0;

    return (defectMandays / totalMandays) * 100;
}

// --- Post Go-Live Rework ---
// Formula: (Mandays after Go-Live / Total Mandays) * 100
// Target: <= 8%
export function calculatePostGoLiveRework(project: Project, timesheets: TimesheetEntry[]): number {
    const projectEntries = timesheets.filter(t => t.project_id === project.id);

    if (projectEntries.length === 0) return 0;

    const totalMandays = projectEntries.reduce((sum, t) => sum + t.mandays, 0);
    const reworkMandays = projectEntries
        .filter(t => t.is_post_golive || t.work_type === 'post_golive')
        .reduce((sum, t) => sum + t.mandays, 0);

    if (totalMandays === 0) return 0;

    return (reworkMandays / totalMandays) * 100;
}

export interface KPIResult {
    timeToDelivery: { score: number; status: 'pass' | 'fail' };
    mandayControl: { score: number; status: 'pass' | 'fail' };
    defectRatio: { score: number; status: 'pass' | 'fail' };
    postGoLiveRework: { score: number; status: 'pass' | 'fail' };
    overallStatus: 'pass' | 'fail' | 'warning';
}

export function calculateProjectKPI(project: Project, timesheets: TimesheetEntry[]): KPIResult {
    const timeScore = calculateTimeToDelivery(project);
    const mandayScore = calculateMandayControl(project);
    const defectScore = calculateDefectRatio(project, timesheets);
    const reworkScore = calculatePostGoLiveRework(project, timesheets);

    // Targets
    const timeTarget = 80; // >= 80%
    const mandayTarget = 85; // >= 85%
    const defectTarget = 15; // <= 15%
    const reworkTarget = 8; // <= 8%

    const isTimePass = timeScore >= timeTarget;
    const isMandayPass = mandayScore >= mandayTarget;
    const isDefectPass = defectScore <= defectTarget;
    const isReworkPass = reworkScore <= reworkTarget;

    const passCount = [isTimePass, isMandayPass, isDefectPass, isReworkPass].filter(Boolean).length;

    let overallStatus: 'pass' | 'fail' | 'warning' = 'fail';
    if (passCount === 4) overallStatus = 'pass';
    else if (passCount >= 2) overallStatus = 'warning';

    return {
        timeToDelivery: { score: timeScore, status: isTimePass ? 'pass' : 'fail' },
        mandayControl: { score: mandayScore, status: isMandayPass ? 'pass' : 'fail' },
        defectRatio: { score: defectScore, status: isDefectPass ? 'pass' : 'fail' },
        postGoLiveRework: { score: reworkScore, status: isReworkPass ? 'pass' : 'fail' },
        overallStatus
    };
}
