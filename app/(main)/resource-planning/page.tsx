'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Users } from 'lucide-react'
import { getResourcePlanningData, ResourcePlanningData } from '@/lib/actions/resource-planning-actions'
import { getProjectFilterOptions } from '@/lib/actions/project-actions'
import { ResourcePlanningBoard } from '@/components/resource-planning/ResourcePlanningBoard'

export interface FilterOptions {
    customers: { id: string; code: string; name: string }[]
    managers: { id: string; name: string; name_th: string }[]
    owners: { id: string; name: string; name_th: string; position_code: string }[]
    years: number[]
    statuses: { id: string; code: string; name: string; name_th?: string; color: string }[]
    milestones: { id: string; code: string; name: string; name_th?: string; color: string }[]
}

export default function ResourcePlanningPage() {
    const [data, setData] = useState<ResourcePlanningData | null>(null)
    const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    const loadData = useCallback(async () => {
        setIsLoading(true)
        setErrorMsg(null)
        try {
            const [dataResult, filterResult] = await Promise.all([
                getResourcePlanningData(),
                getProjectFilterOptions(),
            ])

            if (dataResult.success && dataResult.data) {
                setData(dataResult.data)
            } else {
                setErrorMsg(dataResult.error || 'Unknown error')
                console.error('Resource planning error:', dataResult.error)
            }

            if (filterResult.success && filterResult.data) {
                setFilterOptions(filterResult.data as FilterOptions)
            }
        } catch (error) {
            console.error('Failed to load resource planning data:', error)
            setErrorMsg(String(error))
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        loadData()
    }, [loadData])

    if (isLoading) {
        return (
            <div className="container mx-auto py-4">
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </div>
        )
    }

    if (!data) {
        return (
            <div className="container mx-auto py-4">
                <div className="text-center py-16 text-muted-foreground">
                    <Users className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p>ไม่สามารถโหลดข้อมูลได้</p>
                    {errorMsg && <p className="text-xs text-red-500 mt-2">{errorMsg}</p>}
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-4 space-y-4">
            <ResourcePlanningBoard data={data} filterOptions={filterOptions} onRefresh={loadData} />
        </div>
    )
}
