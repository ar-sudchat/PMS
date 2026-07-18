/**
 * Effective "Plan MD" (planned man-days) for a project milestone.
 *
 * Policy: an explicitly-entered planned_mandays wins. Otherwise — for projects that
 * don't have Plan MD filled in completely — Plan MD is derived as
 *   project budget (sold_mandays) × MDC weight%,
 * where the MDC weight is the milestone's own weight_mdc when set, otherwise the
 * config default (milestone_configs.default_weight_mdc), otherwise the standard
 * fallback by milestone name (Mapping 30 / System Test 30 / UAT 20 / Go-Live 10 /
 * Close Go-Live 10 / everything else incl. Marketing 0). This is the SAME weight the
 * man-day-control KPI scores against, so Plan MD and the KPI stay consistent.
 *
 * Read-derived (not stored) so it auto-updates when the budget or weights change and
 * never overwrites a manually-entered plan. Mirrors pms.vw_milestone_plan_md
 * (scripts/89_default_milestone_weight_plan_md.sql) — keep the two in sync.
 *
 * Returns a SQL scalar expression. Use it in a CROSS APPLY so the value is computed
 * once and referenced by alias:
 *   CROSS APPLY (SELECT ${effectivePlanMdSql(...)} AS eff_plan) ep
 *
 * @param budgetExpr SQL expr for the project budget (e.g. 'p.sold_mandays' or '@budget')
 * @param pm         alias of pms.project_milestones
 * @param mc         alias of pms.milestone_configs (for weight_mdc default + name)
 */
export function effectivePlanMdSql(budgetExpr: string, pm = 'pm', mc = 'mc'): string {
    return `CAST(
        CASE WHEN ISNULL(${pm}.planned_mandays, 0) > 0 THEN ${pm}.planned_mandays
             ELSE ISNULL(${budgetExpr}, 0) *
                  COALESCE(NULLIF(${pm}.weight_mdc, 0), ${mc}.default_weight_mdc,
                      CASE ${mc}.name
                          WHEN 'Mapping Data' THEN 30
                          WHEN 'System Test' THEN 30
                          WHEN 'User Acceptance Test' THEN 20
                          WHEN 'Go-Live' THEN 10
                          WHEN 'Close Go-Live' THEN 10
                          ELSE 0
                      END) / 100.0
        END
    AS DECIMAL(10,2))`
}
