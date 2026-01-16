-- ============================================
-- FIX: Update sp_get_gantt_data to handle missing start_date by falling back to due_date
-- ============================================

CREATE OR ALTER PROCEDURE pms.sp_get_gantt_data
    @employee_id UNIQUEIDENTIFIER,
    @year INT = NULL,
    @customer_id UNIQUEIDENTIFIER = NULL,
    @manager_id UNIQUEIDENTIFIER = NULL,
    @owner_id UNIQUEIDENTIFIER = NULL,
    @status_id UNIQUEIDENTIFIER = NULL,
    @search NVARCHAR(255) = NULL,
    @milestone_ids NVARCHAR(MAX) = NULL -- Comma separated IDs
AS
BEGIN
    SET NOCOUNT ON;
    
    -- ============================================
    -- 1. Temp: Projects matching filters
    -- ============================================
    DECLARE @MyProjects TABLE (project_id UNIQUEIDENTIFIER);
    
    INSERT INTO @MyProjects (project_id)
    SELECT DISTINCT p.id
    FROM pms.projects p
    WHERE p.is_active = 1
      AND (@year IS NULL OR p.project_year = @year)
      AND (@customer_id IS NULL OR p.customer_id = @customer_id)
      AND (@manager_id IS NULL OR p.project_manager_id = @manager_id)
      AND (@owner_id IS NULL OR p.project_owner_id = @owner_id)
      AND (@status_id IS NULL OR p.status_id = @status_id)
      AND (@search IS NULL OR (p.name LIKE '%' + @search + '%' OR p.project_code LIKE '%' + @search + '%'))
      AND (
          @milestone_ids IS NULL 
          OR @milestone_ids = ''
          OR EXISTS (
              SELECT 1 
              FROM pms.project_milestones pm 
              WHERE pm.id = p.current_milestone_id 
                AND pm.milestone_config_id IN (SELECT value FROM STRING_SPLIT(@milestone_ids, ','))
          )
      );

    -- ============================================
    -- 2. CALCULATION: Bottom-Up Date Logic (Using Temp Tables)
    -- ============================================

    -- Output Tables
    CREATE TABLE #TaskCalculations (
        story_id UNIQUEIDENTIFIER, 
        min_start DATE, 
        max_end DATE, 
        task_count INT, 
        done_count INT
    );
    
    CREATE TABLE #StoryCalculations (
        story_id UNIQUEIDENTIFIER PRIMARY KEY,
        project_id UNIQUEIDENTIFIER,
        milestone_id UNIQUEIDENTIFIER,
        start_date DATE,
        end_date DATE,
        progress INT
    );

    CREATE TABLE #MilestoneCalculations (
        milestone_id UNIQUEIDENTIFIER PRIMARY KEY,
        project_id UNIQUEIDENTIFIER,
        min_start DATE,
        max_end DATE,
        avg_progress INT
    );

    CREATE TABLE #ProjectCalculations (
        project_id UNIQUEIDENTIFIER PRIMARY KEY,
        min_start DATE,
        max_end DATE
    );

    -- 2.1 Calculate Task Stats
    -- NOTE: Use COALESCE(start_date, due_date) to handle tasks with only due_date
    INSERT INTO #TaskCalculations
    SELECT 
        t.story_id,
        MIN(COALESCE(t.start_date, t.due_date)),
        MAX(COALESCE(t.due_date, t.start_date)),
        COUNT(*),
        SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END)
    FROM pms.tasks t
    WHERE t.is_active = 1
    GROUP BY t.story_id;

    -- 2.2 Calculate Story Dates
    INSERT INTO #StoryCalculations
    SELECT 
        s.id,
        s.project_id,
        s.milestone_id,
        -- Start: Use tasks min, else today
        COALESCE(tc.min_start, CAST(GETDATE() AS DATE)),
        -- End: Use tasks max, else start + 1 day
        COALESCE(tc.max_end, DATEADD(DAY, 1, COALESCE(tc.min_start, CAST(GETDATE() AS DATE)))),
        -- Progress
        COALESCE(CASE WHEN tc.task_count > 0 THEN (tc.done_count * 100 / tc.task_count) ELSE 0 END, 0)
    FROM pms.stories s
    LEFT JOIN #TaskCalculations tc ON s.id = tc.story_id
    WHERE s.is_active = 1;

    -- 2.3 Calculate Milestone Dates
    INSERT INTO #MilestoneCalculations
    SELECT 
        pm.id,
        pm.project_id,
        MIN(sc.start_date),
        MAX(sc.end_date),
        AVG(sc.progress)
    FROM pms.project_milestones pm
    LEFT JOIN #StoryCalculations sc ON pm.id = sc.milestone_id
    GROUP BY pm.id, pm.project_id;

    -- 2.4 Calculate Project Dates
    INSERT INTO #ProjectCalculations
    SELECT 
        p.id,
        COALESCE(MIN(mc.min_start), CAST(p.created_at AS DATE)),
        COALESCE(MAX(mc.max_end), DATEADD(MONTH, 3, CAST(p.created_at AS DATE)))
    FROM pms.projects p
    LEFT JOIN #MilestoneCalculations mc ON p.id = mc.project_id
    WHERE p.is_active = 1
    GROUP BY p.id, p.created_at;

    -- ============================================
    -- RESULT SET 1: PROJECTS
    -- ============================================
    SELECT
        'project_' + CAST(p.id AS NVARCHAR(50)) AS id,
        p.project_code + ': ' + p.name AS text,

        FORMAT(COALESCE(pc.min_start, CAST(p.created_at AS DATE)), 'yyyy-MM-dd') AS start_date,
        FORMAT(COALESCE(pc.max_end, DATEADD(MONTH, 3, CAST(p.created_at AS DATE))), 'yyyy-MM-dd') AS end_date,

        DATEDIFF(DAY, COALESCE(pc.min_start, CAST(p.created_at AS DATE)), COALESCE(pc.max_end, DATEADD(MONTH, 3, CAST(p.created_at AS DATE)))) AS duration,
        
        (SELECT AVG(progress) FROM #StoryCalculations sc WHERE sc.project_id = p.id) AS progress,
        
        '0' AS parent,
        'project' AS [type],
        'project' AS entity_type,
        CAST(p.id AS NVARCHAR(50)) AS entity_id,
        CAST(p.id AS NVARCHAR(50)) AS project_id,
        NULL AS milestone_id,
        NULL AS story_id,
        
        CASE 
            WHEN p.warranty_end_date IS NOT NULL AND pc.max_end > p.warranty_end_date THEN '#ef4444' 
            ELSE COALESCE(psc.color, '#4f46e5') 
        END AS color,
        
        NULL AS assignee_id,
        NULL AS assignee_name,
        1 AS [open],
        COALESCE(psc.code, 'active') AS status,
        
        (SELECT COUNT(*) FROM pms.project_milestones pm WHERE pm.project_id = p.id) AS milestone_count,
        (SELECT COUNT(*) FROM pms.stories s WHERE s.project_id = p.id AND s.is_active = 1) AS story_count,
        (SELECT COUNT(*) FROM pms.tasks t INNER JOIN pms.stories s ON t.story_id = s.id WHERE s.project_id = p.id AND t.is_active = 1) AS task_count,

        CASE WHEN p.warranty_end_date IS NOT NULL AND pc.max_end > p.warranty_end_date THEN 1 ELSE 0 END as is_over_warranty
        
    FROM pms.projects p
    INNER JOIN @MyProjects mp ON p.id = mp.project_id
    LEFT JOIN #ProjectCalculations pc ON p.id = pc.project_id
    LEFT JOIN pms.project_status_configs psc ON p.status_id = psc.id
    ORDER BY p.project_code;

    -- ============================================
    -- RESULT SET 2: MILESTONES
    -- ============================================
    SELECT 
        'milestone_' + CAST(pm.id AS NVARCHAR(50)) AS id,
        mc.code + ': ' + mc.name AS text,
        
        FORMAT(COALESCE(mc_calc.min_start, GETDATE()), 'yyyy-MM-dd') AS start_date,
        FORMAT(COALESCE(mc_calc.max_end, DATEADD(DAY, 1, GETDATE())), 'yyyy-MM-dd') AS end_date,
        
        DATEDIFF(DAY, COALESCE(mc_calc.min_start, GETDATE()), COALESCE(mc_calc.max_end, DATEADD(DAY, 1, GETDATE()))) AS duration,
        
        CASE pm.status 
            WHEN 'completed' THEN 100 
            WHEN 'in_progress' THEN 50 
            ELSE 0 
        END AS progress,
        
        'project_' + CAST(pm.project_id AS NVARCHAR(50)) AS parent,
        'milestone' AS [type],
        'milestone' AS entity_type,
        CAST(pm.id AS NVARCHAR(50)) AS entity_id,
        CAST(pm.project_id AS NVARCHAR(50)) AS project_id,
        CAST(pm.id AS NVARCHAR(50)) AS milestone_id,
        NULL AS story_id,
        COALESCE(mc.color, '#8b5cf6') AS color,
        NULL AS assignee_id,
        NULL AS assignee_name,
        1 AS [open],
        pm.status AS status,
        mc.sort_order,
        0 AS milestone_count,
        (SELECT COUNT(*) FROM pms.stories s WHERE s.milestone_id = pm.id AND s.is_active = 1) AS story_count,
        0 AS task_count
        
    FROM pms.project_milestones pm
    INNER JOIN pms.milestone_configs mc ON pm.milestone_config_id = mc.id
    INNER JOIN @MyProjects mp ON pm.project_id = mp.project_id
    LEFT JOIN #MilestoneCalculations mc_calc ON pm.id = mc_calc.milestone_id
    ORDER BY pm.project_id, mc.sort_order;

    -- ============================================
    -- RESULT SET 3: STORIES
    -- ============================================
    SELECT
        'story_' + CAST(s.id AS NVARCHAR(50)) AS id,
        s.story_code + ': ' + s.title AS text,

        FORMAT(COALESCE(sc.start_date, CAST(GETDATE() AS DATE)), 'yyyy-MM-dd') AS start_date,
        FORMAT(COALESCE(sc.end_date, DATEADD(DAY, 1, CAST(GETDATE() AS DATE))), 'yyyy-MM-dd') AS end_date,
        CASE
            WHEN sc.start_date IS NOT NULL AND sc.end_date IS NOT NULL
            THEN DATEDIFF(DAY, sc.start_date, sc.end_date)
            ELSE 0 
        END AS duration,

        COALESCE(sc.progress, 0) AS progress,
        
        CASE 
            WHEN s.milestone_id IS NOT NULL THEN 'milestone_' + CAST(s.milestone_id AS NVARCHAR(50))
            ELSE 'project_' + CAST(s.project_id AS NVARCHAR(50))
        END AS parent,
        
        'project' AS [type],
        'story' AS entity_type,
        CAST(s.id AS NVARCHAR(50)) AS entity_id,
        CAST(s.project_id AS NVARCHAR(50)) AS project_id,
        CAST(s.milestone_id AS NVARCHAR(50)) AS milestone_id,
        CAST(s.id AS NVARCHAR(50)) AS story_id,
        
        CASE s.status
            WHEN 'done' THEN '#22c55e'
            WHEN 'in_progress' THEN '#3b82f6'
            WHEN 'review' THEN '#8b5cf6'
            WHEN 'blocked' THEN '#ef4444'
            ELSE '#60a5fa'
        END AS color,
        
        NULL AS assignee_id,
        NULL AS assignee_name,
        1 AS [open],
        s.status AS status,
        0 AS sort_order,
        0, 0, 0
        
    FROM pms.stories s
    INNER JOIN @MyProjects mp ON s.project_id = mp.project_id
    LEFT JOIN #StoryCalculations sc ON s.id = sc.story_id
    WHERE s.is_active = 1
    ORDER BY s.project_id, s.milestone_id, s.story_code;

    -- ============================================
    -- RESULT SET 4: TASKS
    -- ============================================
    SELECT
        'task_' + CAST(t.id AS NVARCHAR(50)) AS id,
        t.task_code + ': ' + t.title AS text,

        -- Fallback: If start_date is NULL, use due_date. 
        -- This ensures tasks with only due_date (from Resource Planner) appear in Gantt.
        FORMAT(COALESCE(t.start_date, t.due_date), 'yyyy-MM-dd') AS start_date,
        FORMAT(t.due_date, 'yyyy-MM-dd') AS end_date,

        CASE
            WHEN COALESCE(t.start_date, t.due_date) IS NOT NULL AND t.due_date IS NOT NULL
            THEN DATEDIFF(DAY, COALESCE(t.start_date, t.due_date), t.due_date) + 1
            ELSE 0
        END AS duration,
        
        CASE t.status
            WHEN 'done' THEN 100
            WHEN 'review' THEN 80
            WHEN 'in_progress' THEN 50
            WHEN 'blocked' THEN 25
            ELSE 0
        END AS progress,
        
        'story_' + CAST(t.story_id AS NVARCHAR(50)) AS parent,
        'task' AS [type],
        'task' AS entity_type,
        CAST(t.id AS NVARCHAR(50)) AS entity_id,
        CAST(s.project_id AS NVARCHAR(50)) AS project_id,
        CAST(s.milestone_id AS NVARCHAR(50)) AS milestone_id,
        CAST(t.story_id AS NVARCHAR(50)) AS story_id,
        
        CASE 
            WHEN t.status NOT IN ('done', 'cancelled') AND t.due_date < CAST(GETDATE() AS DATE) THEN '#ef4444'
            WHEN t.status = 'done' THEN '#22c55e'
            WHEN t.status = 'in_progress' THEN '#f59e0b'
            WHEN t.status = 'review' THEN '#8b5cf6'
            WHEN t.status = 'blocked' THEN '#ef4444'
            WHEN t.task_type = 'bug' THEN '#f97316'
            ELSE '#60a5fa'
        END AS color,
        
        CAST(t.assignee_id AS NVARCHAR(50)) AS assignee_id,
        COALESCE(e.nickname, e.first_name_th) AS assignee_name,
        1 AS [open],
        t.status AS status,
        0, 0, 0, 0,
        t.estimated_hours,
        t.task_type
        
    FROM pms.tasks t
    INNER JOIN pms.stories s ON t.story_id = s.id
    INNER JOIN @MyProjects mp ON s.project_id = mp.project_id
    LEFT JOIN pms.employees e ON t.assignee_id = e.id
    WHERE t.is_active = 1 AND s.is_active = 1
    ORDER BY s.project_id, t.story_id, t.task_code;

    -- Cleanup
    DROP TABLE #TaskCalculations;
    DROP TABLE #StoryCalculations;
    DROP TABLE #MilestoneCalculations;
    DROP TABLE #ProjectCalculations;

END
