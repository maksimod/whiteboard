import { useEffect, useRef } from 'react'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types'

/**
 * Desktop navigation tailored for a document-style whiteboard:
 * wheel zooms, Ctrl+wheel retains Excalidraw zoom, and right-drag pans.
 *
 * @param excalidrawAPI active Excalidraw instance
 */
export function useMouseNavigation(excalidrawAPI: ExcalidrawImperativeAPI | null) {
	const dragging = useRef<{ x: number, y: number } | null>(null)
	const suppressNextContextMenu = useRef(false)

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

			// Re-use Excalidraw's own Ctrl+wheel path. Besides scaling, it adjusts
			// scrollX/scrollY around clientX/clientY, keeping the point under the
			// cursor stable instead of zooming from the upper-left corner.
			event.target?.dispatchEvent(new WheelEvent('wheel', {
				bubbles: true,
				cancelable: true,
				clientX: event.clientX,
				clientY: event.clientY,
				deltaX: event.deltaX,
				deltaY: event.deltaY,
				deltaZ: event.deltaZ,
				deltaMode: event.deltaMode,
				ctrlKey: true,
			}))
		}
		const onPointerDown = (event: PointerEvent) => {
			if (event.button !== 2) return
			event.preventDefault()
			event.stopImmediatePropagation()
			suppressNextContextMenu.current = false
			dragging.current = { x: event.clientX, y: event.clientY }
		}
		const onPointerMove = (event: PointerEvent) => {
			if (!dragging.current) return
			const previous = dragging.current
			dragging.current = { x: event.clientX, y: event.clientY }
			if (event.clientX !== previous.x || event.clientY !== previous.y) {
				suppressNextContextMenu.current = true
			}
			event.preventDefault()
			event.stopImmediatePropagation()
			pan(previous.x - event.clientX, previous.y - event.clientY)
		}
		const stopRightDrag = (event: PointerEvent) => {
			if (!dragging.current) return
			event.preventDefault()
			event.stopImmediatePropagation()
			dragging.current = null
		}
		const preventContextMenu = (event: MouseEvent) => {
			if (!suppressNextContextMenu.current) return
			event.preventDefault()
			event.stopImmediatePropagation()
			suppressNextContextMenu.current = false
		}

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
