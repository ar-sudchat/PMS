// lib/utils/health-calculator.ts
// Health calculation utilities for PM Dashboard

/**
 * Calculate overall health using geometric mean
 * Formula: (Time × Resource × Docs)^(1/3)
 * 
 * Geometric mean ensures that a low score in any dimension
 * significantly impacts the overall health
 */
export function calculateOverallHealth(
    time?: number | null,
    resource?: number | null,
    docs?: number | null
): number {
    // Filter out null/undefined values
    const validScores = [time, resource, docs].filter((s): s is number =>
        s != null && s >= 0
    )

    if (validScores.length === 0) return 0

    // Calculate geometric mean
    const product = validScores.reduce((a, b) => a * b, 1)
    const health = Math.pow(product, 1 / validScores.length)

    return Math.round(health)
}

/**
 * Get health status category
 */
export function getHealthStatus(health: number): 'on-track' | 'at-risk' | 'critical' {
    if (health >= 80) return 'on-track'
    if (health >= 60) return 'at-risk'
    return 'critical'
}

/**
 * Get health color for UI display
 */
export function getHealthColor(health: number): string {
    if (health >= 80) return 'text-green-600'
    if (health >= 60) return 'text-yellow-600'
    return 'text-red-600'
}

/**
 * Get health background color for badges
 */
export function getHealthBgColor(health: number): string {
    if (health >= 80) return 'bg-green-100 text-green-700'
    if (health >= 60) return 'bg-yellow-100 text-yellow-700'
    return 'bg-red-100 text-red-700'
}

/**
 * Get health emoji indicator
 */
export function getHealthEmoji(health: number): string {
    if (health >= 80) return '🟢'
    if (health >= 60) return '🟡'
    return '🔴'
}

/**
 * Format percentage display
 */
export function formatHealthPercent(value: number | null | undefined): string {
    if (value == null) return '-'
    return `${Math.round(value)}%`
}

/**
 * Calculate health from OEE-style scores
 */
export interface HealthScores {
    time: number | null
    resource: number | null
    docs: number | null
}

export interface HealthResult extends HealthScores {
    overall: number
    status: 'on-track' | 'at-risk' | 'critical'
    color: string
    bgColor: string
    emoji: string
}

export function calculateHealth(scores: HealthScores): HealthResult {
    const overall = calculateOverallHealth(scores.time, scores.resource, scores.docs)

    return {
        ...scores,
        overall,
        status: getHealthStatus(overall),
        color: getHealthColor(overall),
        bgColor: getHealthBgColor(overall),
        emoji: getHealthEmoji(overall)
    }
}
