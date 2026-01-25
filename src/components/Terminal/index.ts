/**
 * Terminal Mode Components
 *
 * A production-ready, mobile-first terminal experience
 * inspired by Termux and competitive with Warp Terminal.
 */

export { default as TerminalMode } from "./TerminalMode.tsx";
export { default as TerminalViewport } from "./TerminalViewport.tsx";
export type { ITerminalViewportHandle } from "./TerminalViewport.tsx";
export { default as TerminalTopBar } from "./TerminalTopBar.tsx";
export { default as TerminalActionBar } from "./TerminalActionBar.tsx";
export { default as TerminalModeIndicator } from "./TerminalModeIndicator.tsx";
export { default as TerminalComposer } from "./TerminalComposer.tsx";
export { useTerminalGestures } from "./useTerminalGestures.ts";
export type { GestureDirection } from "./useTerminalGestures.ts";
export { useTerminalExecution } from "./useTerminalExecution.ts";
