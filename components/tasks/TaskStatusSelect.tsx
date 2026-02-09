'use client'

import { useState } from 'react'
import { TASK_STATUSES, NOT_AS_PLANNED_REASONS, CANCELLED_REASONS, getTaskStatusConfig } from '@/lib/constants/task-status'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface TaskStatusSelectProps {
  value: string
  onChange: (status: string, reason?: string) => void
  disabled?: boolean
  excludeStatuses?: string[]
  fullWidth?: boolean
  showCancelOption?: boolean
}

export function TaskStatusSelect({
  value,
  onChange,
  disabled = false,
  excludeStatuses = ['cancelled'],
  fullWidth = false,
  showCancelOption = false
}: TaskStatusSelectProps) {
  const [showReasonModal, setShowReasonModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [selectedReason, setSelectedReason] = useState('')
  const [customReason, setCustomReason] = useState('')

  // If showCancelOption is true, remove 'cancelled' from excludeStatuses
  const effectiveExcludeStatuses = showCancelOption
    ? excludeStatuses.filter(s => s !== 'cancelled')
    : excludeStatuses

  const filteredStatuses = TASK_STATUSES.filter(s => !effectiveExcludeStatuses.includes(s.value))
  const currentConfig = getTaskStatusConfig(value)

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === 'done_not_planned') {
      setShowReasonModal(true)
    } else if (newStatus === 'cancelled') {
      setShowCancelModal(true)
    } else {
      onChange(newStatus)
    }
  }

  const handleReasonSubmit = () => {
    const reason = selectedReason === 'other' ? customReason : selectedReason
    onChange('done_not_planned', reason)
    setShowReasonModal(false)
    setSelectedReason('')
    setCustomReason('')
  }

  const handleCancelSubmit = () => {
    const reason = selectedReason === 'other' ? customReason : selectedReason
    onChange('cancelled', reason)
    setShowCancelModal(false)
    setSelectedReason('')
    setCustomReason('')
  }

  const handleReasonCancel = () => {
    setShowReasonModal(false)
    setShowCancelModal(false)
    setSelectedReason('')
    setCustomReason('')
  }

  return (
    <>
      <Select value={value} onValueChange={handleStatusChange} disabled={disabled}>
        <SelectTrigger className={fullWidth ? "w-full" : "w-[200px]"}>
          <SelectValue>
            {currentConfig && (
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: currentConfig.color }}
                />
                <span>{currentConfig.label}</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {filteredStatuses.map(status => (
            <SelectItem key={status.value} value={status.value}>
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: status.color }}
                />
                <span>{status.label}</span>
                {status.value === 'done_not_planned' && (
                  <span className="text-xs text-orange-500 ml-1">(KPI -)</span>
                )}
                {status.value === 'done' && (
                  <span className="text-xs text-green-500 ml-1">(KPI +)</span>
                )}
                {status.value === 'cancelled' && (
                  <span className="text-xs text-gray-500 ml-1">(ไม่นับ KPI)</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Reason Modal for "Done (Not as Planned)" */}
      <Dialog open={showReasonModal} onOpenChange={setShowReasonModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>เหตุผลที่เสร็จไม่ตามแผน</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>เลือกเหตุผล</Label>
              <div className="grid gap-2">
                {NOT_AS_PLANNED_REASONS.map(reason => (
                  <label
                    key={reason.value}
                    className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                      selectedReason === reason.value
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={reason.value}
                      checked={selectedReason === reason.value}
                      onChange={(e) => setSelectedReason(e.target.value)}
                      className="text-orange-500"
                    />
                    <span>{reason.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {selectedReason === 'other' && (
              <div className="space-y-2">
                <Label>ระบุเหตุผล</Label>
                <Textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="กรุณาระบุเหตุผล..."
                  rows={3}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleReasonCancel}>
              ยกเลิก
            </Button>
            <Button
              onClick={handleReasonSubmit}
              disabled={!selectedReason || (selectedReason === 'other' && !customReason)}
              className="bg-orange-500 hover:bg-orange-600"
            >
              ยืนยัน
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reason Modal for "Cancelled" */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>เหตุผลที่ยกเลิก Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-600">
              <strong>หมายเหตุ:</strong> Task ที่ถูกยกเลิกจะไม่ถูกนับใน KPI
            </div>
            <div className="space-y-2">
              <Label>เลือกเหตุผล</Label>
              <div className="grid gap-2">
                {CANCELLED_REASONS.map(reason => (
                  <label
                    key={reason.value}
                    className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                      selectedReason === reason.value
                        ? 'border-gray-500 bg-gray-50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cancelReason"
                      value={reason.value}
                      checked={selectedReason === reason.value}
                      onChange={(e) => setSelectedReason(e.target.value)}
                      className="text-gray-500"
                    />
                    <span>{reason.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {selectedReason === 'other' && (
              <div className="space-y-2">
                <Label>ระบุเหตุผล</Label>
                <Textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="กรุณาระบุเหตุผล..."
                  rows={3}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleReasonCancel}>
              ไม่ยกเลิก
            </Button>
            <Button
              onClick={handleCancelSubmit}
              disabled={!selectedReason || (selectedReason === 'other' && !customReason)}
              variant="danger"
            >
              ยืนยันยกเลิก Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
