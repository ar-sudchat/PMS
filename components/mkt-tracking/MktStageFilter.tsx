'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { MKT_STAGES, MktStageCode } from '@/lib/constants/mkt-stages'
import { MktStageSummary } from '@/lib/actions/mkt-tracking-actions'

interface MktStageFilterProps {
    selectedStage: MktStageCode | 'ALL'
    onStageChange: (stage: MktStageCode | 'ALL') => void
    summary: MktStageSummary[]
}

const stageColors: Record<string, string> = {
    NEW: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
    CONTACT: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
    ESTIMATING: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
    QUOTED: 'bg-green-100 text-green-800 hover:bg-green-200',
    PRICE_SENT: 'bg-teal-100 text-teal-800 hover:bg-teal-200',
    ALL: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
}

const selectedColors: Record<string, string> = {
    NEW: 'bg-blue-500 text-white',
    CONTACT: 'bg-purple-500 text-white',
    ESTIMATING: 'bg-yellow-500 text-white',
    QUOTED: 'bg-green-500 text-white',
    PRICE_SENT: 'bg-teal-500 text-white',
    ALL: 'bg-gray-700 text-white',
}

export function MktStageFilter({ selectedStage, onStageChange, summary }: MktStageFilterProps) {
    const totalCount = summary.reduce((sum, s) => sum + s.project_count, 0)
    const totalValue = summary.reduce((sum, s) => sum + s.total_value, 0)

    const getStageCount = (code: string) => {
        const stage = summary.find(s => s.mkt_stage === code)
        return stage?.project_count || 0
    }

    const formatValue = (value: number) => {
        if (value >= 1000000) {
            return `${(value / 1000000).toFixed(1)}M`
        } else if (value >= 1000) {
            return `${(value / 1000).toFixed(0)}K`
        }
        return value.toLocaleString()
    }

    return (
        <div className="flex flex-wrap gap-2 mb-4">
            <button
                onClick={() => onStageChange('ALL')}
                className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2',
                    selectedStage === 'ALL' ? selectedColors.ALL : stageColors.ALL
                )}
            >
                <span>ทั้งหมด</span>
                <Badge variant="secondary" className="ml-1">{totalCount}</Badge>
            </button>

            {MKT_STAGES.map(stage => (
                <button
                    key={stage.code}
                    onClick={() => onStageChange(stage.code)}
                    className={cn(
                        'px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2',
                        selectedStage === stage.code
                            ? selectedColors[stage.code]
                            : stageColors[stage.code]
                    )}
                >
                    <span>{stage.label}</span>
                    <Badge variant="secondary" className="ml-1">{getStageCount(stage.code)}</Badge>
                </button>
            ))}

            <div className="ml-auto flex items-center text-sm text-muted-foreground">
                <span>มูลค่ารวม: </span>
                <span className="font-semibold ml-1 text-foreground">
                    {formatValue(totalValue)} บาท
                </span>
            </div>
        </div>
    )
}
