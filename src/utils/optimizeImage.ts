/**
 * SPDX-FileCopyrightText: 2026 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { DataURL } from '@excalidraw/excalidraw/types/types'

export const IMAGE_OPTIMIZATION_MAX_DIMENSION = 2560
export const IMAGE_OPTIMIZATION_MIN_FILE_SIZE = 1024 * 1024
export const IMAGE_OPTIMIZATION_MIN_SAVINGS = 0.05
export const IMAGE_OPTIMIZATION_WEBP_QUALITY = 0.92

const OPTIMIZABLE_IMAGE_TYPES = new Set([
	'image/bmp',
	'image/jpeg',
	'image/png',
	'image/webp',
])

export type PreparedImage = {
	dataURL: DataURL
	height: number
	mimeType: string
	optimized: boolean
	width: number
}

export function calculateOptimizedDimensions(
	width: number,
	height: number,
	maxDimension = IMAGE_OPTIMIZATION_MAX_DIMENSION,
): { width: number, height: number } {
	const longestSide = Math.max(width, height)
	if (longestSide <= maxDimension) {
		return { width, height }
	}

	const scale = maxDimension / longestSide
	return {
		width: Math.max(1, Math.round(width * scale)),
		height: Math.max(1, Math.round(height * scale)),
	}
}

export function shouldOptimizeImage(
	mimeType: string,
	fileSize: number,
	width: number,
	height: number,
): boolean {
	return OPTIMIZABLE_IMAGE_TYPES.has(mimeType)
		&& (fileSize >= IMAGE_OPTIMIZATION_MIN_FILE_SIZE
			|| Math.max(width, height) > IMAGE_OPTIMIZATION_MAX_DIMENSION)
}

export function hasUsefulSizeReduction(originalSize: number, optimizedSize: number): boolean {
	return optimizedSize <= originalSize * (1 - IMAGE_OPTIMIZATION_MIN_SAVINGS)
}

function readBlobAsDataURL(blob: Blob): Promise<DataURL> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onerror = () => reject(reader.error)
		reader.onload = () => resolve(reader.result as DataURL)
		reader.readAsDataURL(blob)
	})
}

function loadImage(dataURL: DataURL): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image()
		image.onerror = () => reject(new Error('Unable to decode image'))
		image.onload = () => resolve(image)
		image.src = dataURL
	})
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
	return new Promise(resolve => {
		canvas.toBlob(resolve, 'image/webp', IMAGE_OPTIMIZATION_WEBP_QUALITY)
	})
}

/**
 * Prepare a newly inserted raster image for the whiteboard. Large images are
 * resized and encoded as high-quality WebP, while small, animated, vector, or
 * unsuccessfully encoded images keep their original bytes.
 */
export async function prepareImageForWhiteboard(file: File): Promise<PreparedImage> {
	const originalDataURL = await readBlobAsDataURL(file)
	const image = await loadImage(originalDataURL)
	const originalWidth = image.naturalWidth || image.width
	const originalHeight = image.naturalHeight || image.height

	const original: PreparedImage = {
		dataURL: originalDataURL,
		height: originalHeight,
		mimeType: file.type,
		optimized: false,
		width: originalWidth,
	}

	if (!shouldOptimizeImage(file.type, file.size, originalWidth, originalHeight)) {
		return original
	}

	try {
		const dimensions = calculateOptimizedDimensions(originalWidth, originalHeight)
		const canvas = document.createElement('canvas')
		canvas.width = dimensions.width
		canvas.height = dimensions.height
		const context = canvas.getContext('2d')
		if (!context) return original

		context.imageSmoothingEnabled = true
		context.imageSmoothingQuality = 'high'
		context.drawImage(image, 0, 0, dimensions.width, dimensions.height)

		const optimizedBlob = await canvasToBlob(canvas)
		if (!optimizedBlob || !hasUsefulSizeReduction(file.size, optimizedBlob.size)) {
			return original
		}

		return {
			dataURL: await readBlobAsDataURL(optimizedBlob),
			height: dimensions.height,
			mimeType: optimizedBlob.type || 'image/webp',
			optimized: true,
			width: dimensions.width,
		}
	} catch (error) {
		console.warn('[Whiteboard] Image optimization failed, using original image', error)
		return original
	}
}
