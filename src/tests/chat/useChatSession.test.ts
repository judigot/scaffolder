import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
	IChatAdapter,
	IChatAdapterCallbacks,
	IChatError,
	IChatMessage,
	IChatSessionConfig,
} from "@/lib/chat/types.ts";
import { useChatSession } from "@/lib/chat/useChatSession.ts";

// Mock adapter for testing
function createMockAdapter(): IChatAdapter & {
	mockSend: ReturnType<typeof vi.fn>;
	mockStop: ReturnType<typeof vi.fn>;
	mockDispose: ReturnType<typeof vi.fn>;
	lastCallbacks: IChatAdapterCallbacks | null;
} {
	let lastCallbacks: IChatAdapterCallbacks | null = null;

	const mockSend = vi.fn(
		(
			_content: string,
			_config: IChatSessionConfig,
			callbacks: IChatAdapterCallbacks,
		) => {
			lastCallbacks = callbacks;
		},
	);

	const mockStop = vi.fn();
	const mockDispose = vi.fn();

	return {
		send: mockSend,
		stop: mockStop,
		dispose: mockDispose,
		mockSend,
		mockStop,
		mockDispose,
		get lastCallbacks() {
			return lastCallbacks;
		},
	};
}

describe("useChatSession", () => {
	let mockAdapter: ReturnType<typeof createMockAdapter>;

	beforeEach(() => {
		mockAdapter = createMockAdapter();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("should initialize with empty messages and idle status", () => {
		const { result } = renderHook(() =>
			useChatSession({
				endpoint: "/api/chat",
				adapterFactory: () => mockAdapter,
			}),
		);

		expect(result.current.messages).toEqual([]);
		expect(result.current.status).toBe("idle");
		expect(result.current.isLoading).toBe(false);
		expect(result.current.error).toBeNull();
		expect(result.current.sessionId).toBeNull();
	});

	it("should add user message and call adapter.send when sending", () => {
		const { result } = renderHook(() =>
			useChatSession({
				endpoint: "/api/chat",
				adapterFactory: () => mockAdapter,
			}),
		);

		act(() => {
			result.current.send("Hello world");
		});

		expect(result.current.messages.length).toBe(1);
		expect(result.current.messages[0]?.role).toBe("user");
		expect(result.current.messages[0]?.content).toBe("Hello world");
		expect(result.current.status).toBe("loading");
		expect(mockAdapter.mockSend).toHaveBeenCalledTimes(1);
	});

	it("should not send empty messages", () => {
		const { result } = renderHook(() =>
			useChatSession({
				endpoint: "/api/chat",
				adapterFactory: () => mockAdapter,
			}),
		);

		act(() => {
			result.current.send("   ");
		});

		expect(result.current.messages.length).toBe(0);
		expect(mockAdapter.mockSend).not.toHaveBeenCalled();
	});

	it("should update status to streaming when onMessageStart is called", () => {
		const { result } = renderHook(() =>
			useChatSession({
				endpoint: "/api/chat",
				adapterFactory: () => mockAdapter,
			}),
		);

		act(() => {
			result.current.send("Hello");
		});

		act(() => {
			mockAdapter.lastCallbacks?.onMessageStart("msg-123");
		});

		expect(result.current.status).toBe("streaming");
		expect(result.current.messages.length).toBe(2);
		expect(result.current.messages[1]?.role).toBe("assistant");
		expect(result.current.messages[1]?.content).toBe("");
	});

	it("should update assistant message content when streaming", () => {
		const { result } = renderHook(() =>
			useChatSession({
				endpoint: "/api/chat",
				adapterFactory: () => mockAdapter,
			}),
		);

		act(() => {
			result.current.send("Hello");
		});

		act(() => {
			mockAdapter.lastCallbacks?.onMessageStart("msg-123");
		});

		act(() => {
			mockAdapter.lastCallbacks?.onStreamingText("Hello", "msg-123");
		});

		act(() => {
			mockAdapter.lastCallbacks?.onStreamingText("Hello there!", "msg-123");
		});

		expect(result.current.messages[1]?.content).toBe("Hello there!");
	});

	it("should complete message and return to idle status", () => {
		const { result } = renderHook(() =>
			useChatSession({
				endpoint: "/api/chat",
				adapterFactory: () => mockAdapter,
			}),
		);

		act(() => {
			result.current.send("Hello");
		});

		act(() => {
			mockAdapter.lastCallbacks?.onMessageStart("msg-123");
		});

		const completeMessage: IChatMessage = {
			id: "msg-123",
			role: "assistant",
			content: "Hello! How can I help?",
			createdAt: new Date(),
		};

		act(() => {
			mockAdapter.lastCallbacks?.onMessageComplete(completeMessage);
		});

		expect(result.current.status).toBe("idle");
		expect(result.current.messages[1]?.content).toBe("Hello! How can I help?");
	});

	it("should handle errors", () => {
		const { result } = renderHook(() =>
			useChatSession({
				endpoint: "/api/chat",
				adapterFactory: () => mockAdapter,
			}),
		);

		act(() => {
			result.current.send("Hello");
		});

		const errorObj: IChatError = { message: "Network error" };

		act(() => {
			mockAdapter.lastCallbacks?.onError(errorObj);
		});

		expect(result.current.status).toBe("error");
		expect(result.current.error?.message).toBe("Network error");
	});

	it("should stop generation when stop is called", () => {
		const { result } = renderHook(() =>
			useChatSession({
				endpoint: "/api/chat",
				adapterFactory: () => mockAdapter,
			}),
		);

		act(() => {
			result.current.send("Hello");
		});

		act(() => {
			result.current.stop();
		});

		expect(mockAdapter.mockStop).toHaveBeenCalledTimes(1);
		expect(result.current.status).toBe("idle");
	});

	it("should clear messages when clear is called", () => {
		const { result } = renderHook(() =>
			useChatSession({
				endpoint: "/api/chat",
				adapterFactory: () => mockAdapter,
			}),
		);

		act(() => {
			result.current.send("Hello");
		});

		const completeMessage: IChatMessage = {
			id: "msg-123",
			role: "assistant",
			content: "Hi!",
			createdAt: new Date(),
		};

		act(() => {
			mockAdapter.lastCallbacks?.onMessageStart("msg-123");
			mockAdapter.lastCallbacks?.onMessageComplete(completeMessage);
		});

		expect(result.current.messages.length).toBe(2);

		act(() => {
			result.current.clear();
		});

		expect(result.current.messages.length).toBe(0);
		expect(result.current.status).toBe("idle");
		expect(result.current.error).toBeNull();
	});

	it("should update sessionId when adapter provides one", () => {
		const { result } = renderHook(() =>
			useChatSession({
				endpoint: "/api/chat",
				adapterFactory: () => mockAdapter,
			}),
		);

		act(() => {
			result.current.send("Hello");
		});

		act(() => {
			mockAdapter.lastCallbacks?.onSessionId("session-abc-123");
		});

		expect(result.current.sessionId).toBe("session-abc-123");
	});

	it("should dispose adapter on unmount", () => {
		const { unmount } = renderHook(() =>
			useChatSession({
				endpoint: "/api/chat",
				adapterFactory: () => mockAdapter,
			}),
		);

		unmount();

		expect(mockAdapter.mockDispose).toHaveBeenCalledTimes(1);
	});

	it("should pass directory config to adapter", () => {
		const { result } = renderHook(() =>
			useChatSession({
				endpoint: "/api/chat",
				adapterFactory: () => mockAdapter,
				directory: "/path/to/project",
			}),
		);

		act(() => {
			result.current.send("Hello");
		});

		expect(mockAdapter.mockSend).toHaveBeenCalledWith(
			"Hello",
			expect.objectContaining({
				endpoint: "/api/chat",
				directory: "/path/to/project",
			}),
			expect.any(Object),
		);
	});
});
