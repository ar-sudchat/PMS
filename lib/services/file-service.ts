'use server'

import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { getFileStorageConfig } from '@/lib/actions/config-actions'
import { getCurrentUser } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'

// ============================================
// TYPES
// ============================================

export interface FileInfo {
    id: string
    originalName: string
    storedName: string
    path: string
    fullPath: string
    size: number
    mimeType: string
    extension: string
    createdAt: Date
}

export interface UploadResult {
    success: boolean
    file?: FileInfo
    error?: string
}

export interface DeleteResult {
    success: boolean
    error?: string
}

export interface ReadResult {
    success: boolean
    data?: Buffer
    mimeType?: string
    error?: string
}

export interface FileExistsResult {
    success: boolean
    exists: boolean
    error?: string
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Expand tilde (~) to home directory path
 */
function expandPath(inputPath: string): string {
    if (inputPath.startsWith('~/')) {
        return path.join(os.homedir(), inputPath.slice(2))
    }
    if (inputPath === '~') {
        return os.homedir()
    }
    return inputPath
}

/**
 * Get current active storage path from config
 */
async function getStoragePath(): Promise<string> {
    const configResult = await getFileStorageConfig()
    if (!configResult.success) {
        throw new Error('ไม่สามารถดึงค่า config ได้')
    }
    // Expand tilde (~) to home directory
    return expandPath(configResult.data.currentPath)
}

/**
 * Get MIME type from file extension
 */
function getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase()
    const mimeTypes: Record<string, string> = {
        // Images
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.bmp': 'image/bmp',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        // Documents
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.ppt': 'application/vnd.ms-powerpoint',
        '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        // Text
        '.txt': 'text/plain',
        '.csv': 'text/csv',
        '.json': 'application/json',
        '.xml': 'application/xml',
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        // Archives
        '.zip': 'application/zip',
        '.rar': 'application/x-rar-compressed',
        '.7z': 'application/x-7z-compressed',
        '.tar': 'application/x-tar',
        '.gz': 'application/gzip',
        // Media
        '.mp3': 'audio/mpeg',
        '.mp4': 'video/mp4',
        '.avi': 'video/x-msvideo',
        '.mov': 'video/quicktime',
        '.webm': 'video/webm',
    }
    return mimeTypes[ext] || 'application/octet-stream'
}

/**
 * Ensure directory exists
 */
async function ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
        await fs.access(dirPath)
    } catch {
        await fs.mkdir(dirPath, { recursive: true })
    }
}

/**
 * Generate unique filename
 */
function generateStoredName(originalName: string): string {
    const ext = path.extname(originalName)
    const timestamp = Date.now()
    const uuid = uuidv4().substring(0, 8)
    return `${timestamp}_${uuid}${ext}`
}

// ============================================
// MAIN FILE SERVICE FUNCTIONS
// ============================================

/**
 * Upload a file to storage
 * @param fileData - File content as Buffer or base64 string
 * @param originalName - Original filename
 * @param subFolder - Optional subfolder (e.g., 'projects', 'backups', 'documents')
 */
export async function uploadFile(
    fileData: Buffer | string,
    originalName: string,
    subFolder?: string
): Promise<UploadResult> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized' }
        }

        const storagePath = await getStoragePath()
        const storedName = generateStoredName(originalName)
        const relativePath = subFolder ? path.join(subFolder, storedName) : storedName
        const fullPath = path.join(storagePath, relativePath)
        const dirPath = path.dirname(fullPath)

        // Ensure directory exists
        await ensureDirectoryExists(dirPath)

        // Convert base64 to Buffer if needed
        const buffer = typeof fileData === 'string'
            ? Buffer.from(fileData, 'base64')
            : fileData

        // Write file
        await fs.writeFile(fullPath, buffer)

        // Get file stats
        const stats = await fs.stat(fullPath)

        const fileInfo: FileInfo = {
            id: uuidv4(),
            originalName,
            storedName,
            path: relativePath,
            fullPath,
            size: stats.size,
            mimeType: getMimeType(originalName),
            extension: path.extname(originalName).toLowerCase(),
            createdAt: new Date()
        }

        return { success: true, file: fileInfo }

    } catch (error: any) {
        console.error('uploadFile error:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Read a file from storage
 * @param filePath - Relative path to file (from storage root)
 */
export async function readFile(filePath: string): Promise<ReadResult> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized' }
        }

        const storagePath = await getStoragePath()
        const fullPath = path.join(storagePath, filePath)

        // Check if file exists
        try {
            await fs.access(fullPath)
        } catch {
            return { success: false, error: 'ไม่พบไฟล์' }
        }

        // Read file
        const data = await fs.readFile(fullPath)
        const mimeType = getMimeType(filePath)

        return { success: true, data, mimeType }

    } catch (error: any) {
        console.error('readFile error:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Delete a file from storage
 * @param filePath - Relative path to file (from storage root)
 */
export async function deleteFile(filePath: string): Promise<DeleteResult> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized' }
        }

        const storagePath = await getStoragePath()
        const fullPath = path.join(storagePath, filePath)

        // Check if file exists
        try {
            await fs.access(fullPath)
        } catch {
            return { success: false, error: 'ไม่พบไฟล์' }
        }

        // Delete file
        await fs.unlink(fullPath)

        return { success: true }

    } catch (error: any) {
        console.error('deleteFile error:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Check if file exists
 * @param filePath - Relative path to file (from storage root)
 */
export async function fileExists(filePath: string): Promise<FileExistsResult> {
    try {
        const storagePath = await getStoragePath()
        const fullPath = path.join(storagePath, filePath)

        try {
            await fs.access(fullPath)
            return { success: true, exists: true }
        } catch {
            return { success: true, exists: false }
        }

    } catch (error: any) {
        console.error('fileExists error:', error)
        return { success: false, exists: false, error: error.message }
    }
}

/**
 * Get file info without reading content
 * @param filePath - Relative path to file (from storage root)
 */
export async function getFileInfo(filePath: string): Promise<{
    success: boolean
    info?: {
        name: string
        size: number
        mimeType: string
        extension: string
        modifiedAt: Date
    }
    error?: string
}> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized' }
        }

        const storagePath = await getStoragePath()
        const fullPath = path.join(storagePath, filePath)

        // Check if file exists
        try {
            await fs.access(fullPath)
        } catch {
            return { success: false, error: 'ไม่พบไฟล์' }
        }

        const stats = await fs.stat(fullPath)
        const name = path.basename(filePath)

        return {
            success: true,
            info: {
                name,
                size: stats.size,
                mimeType: getMimeType(filePath),
                extension: path.extname(filePath).toLowerCase(),
                modifiedAt: stats.mtime
            }
        }

    } catch (error: any) {
        console.error('getFileInfo error:', error)
        return { success: false, error: error.message }
    }
}

/**
 * List files in a directory
 * @param subFolder - Subfolder path (from storage root)
 */
export async function listFiles(subFolder?: string): Promise<{
    success: boolean
    files?: Array<{
        name: string
        path: string
        size: number
        mimeType: string
        isDirectory: boolean
        modifiedAt: Date
    }>
    error?: string
}> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized' }
        }

        const storagePath = await getStoragePath()
        const targetPath = subFolder ? path.join(storagePath, subFolder) : storagePath

        // Check if directory exists
        try {
            await fs.access(targetPath)
        } catch {
            return { success: true, files: [] }
        }

        const entries = await fs.readdir(targetPath, { withFileTypes: true })

        const files = await Promise.all(
            entries.map(async (entry) => {
                const entryPath = path.join(targetPath, entry.name)
                const stats = await fs.stat(entryPath)
                const relativePath = subFolder ? path.join(subFolder, entry.name) : entry.name

                return {
                    name: entry.name,
                    path: relativePath,
                    size: stats.size,
                    mimeType: entry.isDirectory() ? 'directory' : getMimeType(entry.name),
                    isDirectory: entry.isDirectory(),
                    modifiedAt: stats.mtime
                }
            })
        )

        return { success: true, files }

    } catch (error: any) {
        console.error('listFiles error:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Copy file within storage
 * @param sourcePath - Source relative path
 * @param destPath - Destination relative path
 */
export async function copyFile(sourcePath: string, destPath: string): Promise<{
    success: boolean
    error?: string
}> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized' }
        }

        const storagePath = await getStoragePath()
        const sourceFullPath = path.join(storagePath, sourcePath)
        const destFullPath = path.join(storagePath, destPath)

        // Check if source exists
        try {
            await fs.access(sourceFullPath)
        } catch {
            return { success: false, error: 'ไม่พบไฟล์ต้นทาง' }
        }

        // Ensure destination directory exists
        await ensureDirectoryExists(path.dirname(destFullPath))

        // Copy file
        await fs.copyFile(sourceFullPath, destFullPath)

        return { success: true }

    } catch (error: any) {
        console.error('copyFile error:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Move/rename file within storage
 * @param sourcePath - Source relative path
 * @param destPath - Destination relative path
 */
export async function moveFile(sourcePath: string, destPath: string): Promise<{
    success: boolean
    error?: string
}> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized' }
        }

        const storagePath = await getStoragePath()
        const sourceFullPath = path.join(storagePath, sourcePath)
        const destFullPath = path.join(storagePath, destPath)

        // Check if source exists
        try {
            await fs.access(sourceFullPath)
        } catch {
            return { success: false, error: 'ไม่พบไฟล์ต้นทาง' }
        }

        // Ensure destination directory exists
        await ensureDirectoryExists(path.dirname(destFullPath))

        // Move file
        await fs.rename(sourceFullPath, destFullPath)

        return { success: true }

    } catch (error: any) {
        console.error('moveFile error:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Create a directory
 * @param dirPath - Directory path (from storage root)
 */
export async function createDirectory(dirPath: string): Promise<{
    success: boolean
    error?: string
}> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized' }
        }

        const storagePath = await getStoragePath()
        const fullPath = path.join(storagePath, dirPath)

        await fs.mkdir(fullPath, { recursive: true })

        return { success: true }

    } catch (error: any) {
        console.error('createDirectory error:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Delete a directory (must be empty)
 * @param dirPath - Directory path (from storage root)
 * @param recursive - Delete recursively (including contents)
 */
export async function deleteDirectory(dirPath: string, recursive: boolean = false): Promise<{
    success: boolean
    error?: string
}> {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Unauthorized' }
        }

        const storagePath = await getStoragePath()
        const fullPath = path.join(storagePath, dirPath)

        // Check if directory exists
        try {
            await fs.access(fullPath)
        } catch {
            return { success: false, error: 'ไม่พบโฟลเดอร์' }
        }

        if (recursive) {
            await fs.rm(fullPath, { recursive: true })
        } else {
            await fs.rmdir(fullPath)
        }

        return { success: true }

    } catch (error: any) {
        console.error('deleteDirectory error:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Get file as base64 for preview/download
 * @param filePath - Relative path to file (from storage root)
 */
export async function getFileAsBase64(filePath: string): Promise<{
    success: boolean
    base64?: string
    mimeType?: string
    error?: string
}> {
    try {
        const result = await readFile(filePath)
        if (!result.success || !result.data) {
            return { success: false, error: result.error || 'ไม่สามารถอ่านไฟล์ได้' }
        }

        const base64 = result.data.toString('base64')
        return { success: true, base64, mimeType: result.mimeType }

    } catch (error: any) {
        console.error('getFileAsBase64 error:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Get file URL for viewing (returns data URL)
 * @param filePath - Relative path to file (from storage root)
 */
export async function getFileDataUrl(filePath: string): Promise<{
    success: boolean
    dataUrl?: string
    error?: string
}> {
    try {
        const result = await getFileAsBase64(filePath)
        if (!result.success || !result.base64) {
            return { success: false, error: result.error || 'ไม่สามารถอ่านไฟล์ได้' }
        }

        const dataUrl = `data:${result.mimeType};base64,${result.base64}`
        return { success: true, dataUrl }

    } catch (error: any) {
        console.error('getFileDataUrl error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format file size to human readable
 */
export async function formatFileSize(bytes: number): Promise<string> {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Validate file extension
 */
export async function isAllowedExtension(filename: string, allowedExtensions: string[]): Promise<boolean> {
    const ext = path.extname(filename).toLowerCase()
    return allowedExtensions.includes(ext)
}

/**
 * Validate file size
 */
export async function isAllowedSize(size: number, maxSizeInMB: number): Promise<boolean> {
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024
    return size <= maxSizeInBytes
}
