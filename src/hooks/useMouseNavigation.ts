import { useEffect, useRef } from 'react'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types'

/**
 * Desktop navigation tailored for a document-style whiteboard:
 * wheel pans, Ctrl+wheel retains Excalidraw zoom, and right-drag pans.
 *
 * @param excalidrawAPI active Excalidraw instance
 */
export function useMouseNavigation(excalidrawAPI: ExcalidrawImperativeAPI | null) {
	const dragging = useRef<{ x: number, y: number } | null>(null)

	useEffect(() => {
		if (!excalidrawAPI) return
		const container = document.querySelector<HTMLElement>('.excalidraw-wrapper')
		if (!container) return

		const pan = (deltaX: number, deltaY: number) => {
			const state = excalidrawAPI.getAppState()
			const zoom = state.zoom?.value || 1
			excalidrawAPI.updateScene({
				appState: {
					scrollX: state.scrollX - deltaX / zoom,
					scrollY: state.scrollY - deltaY / zoom,
				},
			})
		}

		const onWheel = (event: WheelEvent) => {
			if (event.ctrlKey || event.metaKey) return
			event.preventDefault()
			event.stopImmediatePropagation()
			pan(event.deltaX, event.deltaY)
		}
		const onPointerDown = (event: PointerEvent) => {
			if (event.button !== 2) return
			event.preventDefault()
			event.stopImmediatePropagation()
			dragging.current = { x: event.clientX, y: event.clientY }
		}
		const onPointerMove = (event: PointerEvent) => {
			if (!dragging.current) return
			const previous = dragging.current
			dragging.current = { x: event.clientX, y: event.clientY }
			event.preventDefault()
			event.stopImmediatePropagation()
			pan(event.clientX - previous.x, event.clientY - previous.y)
		}
		const stopRightDrag = (event: PointerEvent) => {
			if (!dragging.current) return
			event.preventDefault()
			event.stopImmediatePropagation()
			dragging.current = null
		}
		const preventContextMenu = (event: MouseEvent) => event.preventDefault()

		container.addEventListener('wheel', onWheel, { capture: true, passive: false })
		container.addEventListener('pointerdown', onPointerDown, true)
		window.addEventListener('pointermove', onPointerMove, true)
		window.addEventListener('pointerup', stopRightDrag, true)
		container.addEventListener('contextmenu', preventContextMenu, true)
		return () => {
			container.removeEventListener('wheel', onWheel, true)
			container.removeEventListener('pointerdown', onPointerDown, true)
			window.removeEventListener('pointermove', onPointerMove, true)
			window.removeEventListener('pointerup', stopRightDrag, true)
			container.removeEventListener('contextmenu', preventContextMenu, true)
		}
	}, [excalidrawAPI])
}
