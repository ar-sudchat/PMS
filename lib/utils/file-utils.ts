/**
 * Pure file utilities (no I/O, no auth) — safe to import in client components.
 * Server-side file operations live in `lib/services/file-service.ts`.
 */

const SIZE_UNITS = ['Bytes', 'KB', 'MB', 'GB', 'TB']

export function formatFileSize(bytes: number): string {
    if (!bytes || bytes <= 0) return '0 Bytes'
    const k = 1024
    const i = Math.min(SIZE_UNITS.length - 1, Math.floor(Math.log(bytes) / Math.log(k)))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + SIZE_UNITS[i]
}

export function getExtension(filename: string): string {
    const i = filename.lastIndexOf('.')
    return i >= 0 ? filename.slice(i).toLowerCase() : ''
}

export function isAllowedExtension(filename: string, allowedExtensions: string[]): boolean {
    return allowedExtensions.includes(getExtension(filename))
}

export function isAllowedSize(size: number, maxSizeInMB: number): boolean {
    return size <= maxSizeInMB * 1024 * 1024
}

/**
 * Encode a stored relative path for use in `/api/files/{path}` URLs.
 * Encodes each segment separately so slashes between segments are preserved.
 */
export function encodeFilePath(filePath: string): string {
    return filePath.split('/').map(encodeURIComponent).join('/')
}
