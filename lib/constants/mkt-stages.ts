// MKT Stage definitions
export const MKT_STAGES = [
    { code: 'NEW', label: 'ใหม่', color: 'blue', order: 1 },
    { code: 'CONTACT', label: 'ติดต่อนัดวันประชุม', color: 'purple', order: 2 },
    { code: 'ESTIMATING', label: 'กำลังประเมิน', color: 'yellow', order: 3 },
    { code: 'QUOTED', label: 'เสนอราคาแล้ว', color: 'green', order: 4 },
] as const

export type MktStageCode = typeof MKT_STAGES[number]['code']
