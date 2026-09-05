import { useCallback, useRef, useState } from "react";

/** Safely get first touch from touch list */
function getFirstTouch(touches: React.TouchList): React.Touch | undefined {
	if (touches.length === 0) {
		return undefined;
	}
	return touches[0];
}

export type GestureDirection = "left" | "up" | "right" | null;

interface IGestureState {
	isActive: boolean;
	direction: GestureDirection;
	progress: number; // 0-1
}

interface IUseTerminalGesturesOptions {
	/** Called when swipe left is completed */
	onSwipeLeft?: () => void;
	/** Called when swipe up is completed */
	onSwipeUp?: () => void;
	/** Called when swipe right is completed */
	onSwipeRight?: () => void;
	/** Minimum distance to trigger swipe (px) */
	threshold?: number;
	/** Whether gestures are enabled */
	enabled?: boolean;
}

interface IUseTerminalGesturesResult {
	gestureState: IGestureState;
	handlers: {
		onTouchStart: (e: React.TouchEvent) => void;
		onTouchMove: (e: React.TouchEvent) => void;
		onTouchEnd: (e: React.TouchEvent) => void;
		onTouchCancel: () => void;
	};
}

/**
 * useTerminalGestures - Gesture layer for Terminal Mode
 *
 * Supports:
 * - Swipe Left: navigate back / previous context
 * - Swipe Up: reveal history / command list / expanded terminal
 * - Swipe Right: navigate forward / next context
 *
 * Gestures must never conflict with scrolling terminal output.
 * Only activates on horizontal swipes that exceed threshold.
 */
export function useTerminalGestures({
	onSwipeLeft,
	onSwipeUp,
	onSwipeRight,
	threshold = 80,
	enabled = true,
}: IUseTerminalGesturesOptions): IUseTerminalGesturesResult {
	const [gestureState, setGestureState] = useState<IGestureState>({
		isActive: false,
		direction: null,
		progress: 0,
	});

	const touchStartRef = useRef<{ x: number; y: number } | null>(null);
	const isScrollingRef = useRef(false);

	const handleTouchStart = useCallback(
		(e: React.TouchEvent) => {
			if (!enabled) {
				return;
			}

			const touch = getFirstTouch(e.touches);
			if (touch === undefined) {
				return;
			}

			touchStartRef.current = { x: touch.clientX, y: touch.clientY };
			isScrollingRef.current = false;
		},
		[enabled],
	);

	const handleTouchMove = useCallback(
		(e: React.TouchEvent) => {
			if (!enabled || touchStartRef.current === null) {
				return;
			}

			const touch = getFirstTouch(e.touches);
			if (touch === undefined) {
				return;
			}

			const deltaX = touch.clientX - touchStartRef.current.x;
			const deltaY = touch.clientY - touchStartRef.current.y;

			// Determine if this is a vertical scroll (ignore for gestures)
			if (!gestureState.isActive && !isScrollingRef.current) {
				// If vertical movement is greater, treat as scroll
				if (Math.abs(deltaY) > Math.abs(deltaX) + 10) {
					isScrollingRef.current = true;
					return;
				}
			}

			// If we determined this is a scroll, don't handle as gesture
			if (isScrollingRef.current) {
				return;
			}

			const absDeltaX = Math.abs(deltaX);
			const absDeltaY = Math.abs(deltaY);

			// Determine direction and progress
			let direction: GestureDirection = null;
			let progress = 0;

			if (absDeltaX > 20) {
				// Horizontal swipe
				direction = deltaX < 0 ? "left" : "right";
				progress = Math.min(absDeltaX / threshold, 1);
			} else if (deltaY < -20 && absDeltaY > absDeltaX) {
				// Upward swipe
				direction = "up";
				progress = Math.min(absDeltaY / threshold, 1);
			}

			if (direction) {
				setGestureState({
					isActive: true,
					direction,
					progress,
				});
			}
		},
		[enabled, threshold, gestureState.isActive],
	);

	const handleTouchEnd = useCallback(() => {
		if (!enabled || !gestureState.isActive) {
			touchStartRef.current = null;
			return;
		}

		// Check if swipe was completed (passed threshold)
		if (gestureState.progress >= 1) {
			switch (gestureState.direction) {
				case "left":
					onSwipeLeft?.();
					break;
				case "up":
					onSwipeUp?.();
					break;
				case "right":
					onSwipeRight?.();
					break;
			}
		}

		// Reset state
		setGestureState({
			isActive: false,
			direction: null,
			progress: 0,
		});
		touchStartRef.current = null;
		isScrollingRef.current = false;
	}, [enabled, gestureState, onSwipeLeft, onSwipeUp, onSwipeRight]);

	const handleTouchCancel = useCallback(() => {
		setGestureState({
			isActive: false,
			direction: null,
			progress: 0,
		});
		touchStartRef.current = null;
		isScrollingRef.current = false;
	}, []);

	return {
		gestureState,
		handlers: {
			onTouchStart: handleTouchStart,
			onTouchMove: handleTouchMove,
			onTouchEnd: handleTouchEnd,
			onTouchCancel: handleTouchCancel,
		},
	};
}
