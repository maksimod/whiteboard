import { describe, expect, it } from 'vitest'
import {
	calculateOptimizedDimensions,
	hasUsefulSizeReduction,
	shouldOptimizeImage,
} from '../../src/utils/optimizeImage.ts'

describe('whiteboard image optimization', () => {
	it('keeps the aspect ratio while capping the longest side', () => {
		expect(calculateOptimizedDimensions(6000, 4000)).toEqual({
			width: 2560,
			height: 1707,
		})
		expect(calculateOptimizedDimensions(1200, 800)).toEqual({
			width: 1200,
			height: 800,
		})
	})

	it('optimizes supported large raster images only', () => {
		expect(shouldOptimizeImage('image/png', 2 * 1024 * 1024, 1600, 900)).toBe(true)
		expect(shouldOptimizeImage('image/jpeg', 100_000, 5000, 3000)).toBe(true)
		expect(shouldOptimizeImage('image/png', 100_000, 800, 600)).toBe(false)
		expect(shouldOptimizeImage('image/gif', 3 * 1024 * 1024, 4000, 3000)).toBe(false)
		expect(shouldOptimizeImage('image/svg+xml', 2 * 1024 * 1024, 4000, 3000)).toBe(false)
	})

	it('uses an optimized payload only when it saves at least five percent', () => {
		expect(hasUsefulSizeReduction(1_000_000, 950_000)).toBe(true)
		expect(hasUsefulSizeReduction(1_000_000, 960_000)).toBe(false)
	})
})
