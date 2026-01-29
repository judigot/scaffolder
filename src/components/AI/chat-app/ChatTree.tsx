import { useMemo, useState } from "react";
import type { IChat, ISprint } from "@/components/AI/chat-app/types.ts";
import Badge from "@/components/AI/chat-app/ui/Badge.tsx";

interface IChatTreeProps {
	sprints: ISprint[];
	regularChats: IChat[];
	activeSprintId: string | null;
	activeChatId: string | null;
	activeChatScope: "sprint" | "regular";
	onSelectSprint: (sprintId: string) => void;
	onSelectChat: (chatId: string) => void;
	onSelectRegularChat: (chatId: string) => void;
	onNewChat: () => void;
}

function formatRelativeTime(date: Date): string {
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMs / 3600000);
	const diffDays = Math.floor(diffMs / 86400000);

	if (diffMins < 1) {
		return "Now";
	}
	if (diffMins < 60) {
		return `${String(diffMins)}m`;
	}
	if (diffHours < 24) {
		return `${String(diffHours)}h`;
	}
	if (diffDays < 7) {
		return `${String(diffDays)}d`;
	}
	return date.toLocaleDateString();
}

export default function ChatTree({
	sprints,
	regularChats,
	activeSprintId: _activeSprintId,
	activeChatId,
	activeChatScope,
	onSelectSprint,
	onSelectChat,
	onSelectRegularChat,
	onNewChat,
}: IChatTreeProps) {
	const [isRegularOpen, setIsRegularOpen] = useState(true);
	const [openSprints, setOpenSprints] = useState<Record<string, boolean>>({});

	const sprintOpenState = useMemo(() => {
		if (Object.keys(openSprints).length > 0) {
			return openSprints;
		}
		return Object.fromEntries(sprints.map((sprint) => [sprint.id, true]));
	}, [openSprints, sprints]);

	const toggleSprint = (sprintId: string) => {
		setOpenSprints((prev) => ({
			...prev,
			[sprintId]: !sprintOpenState[sprintId],
		}));
	};

	const renderChatRow = (
		chat: IChat,
		scope: "sprint" | "regular",
		onSelect: () => void,
	) => {
		const messagesLength = chat.messages.length;
		const lastMessage =
			messagesLength > 0 ? chat.messages[messagesLength - 1] : null;
		const isActive = activeChatId === chat.id && activeChatScope === scope;
		return (
			<button
				key={chat.id}
				type="button"
				className={`w-full text-left px-3 py-2 rounded-xl border ${
					isActive
						? "border-primary-600/40 bg-primary-900/30 text-fg"
						: "border-transparent bg-secondary text-fg-muted hover:bg-secondary-hover hover:text-fg"
				}`}
				onClick={onSelect}
			>
				<div className="flex items-center justify-between gap-2">
					<span className="text-sm font-semibold truncate">{chat.title}</span>
					<span className="text-xs text-fg-subtle">
						{formatRelativeTime(chat.updatedAt)}
					</span>
				</div>
				<p className="text-xs text-fg-subtle truncate">{chat.description}</p>
				{lastMessage !== null && (
					<p className="text-[11px] text-fg-subtle truncate mt-1">
						<span className="font-semibold text-fg-muted">
							{lastMessage.role === "user" ? "You: " : "AI: "}
						</span>
						{lastMessage.content}
					</p>
				)}
				<div className="mt-2 flex items-center gap-2 flex-wrap">
					<span className="text-[11px] text-fg-subtle">
						{chat.messages.length} msgs
					</span>
					{chat.branch !== undefined && chat.branch !== "" && (
						<span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary-hover text-fg-muted font-mono">
							{chat.branch}
						</span>
					)}
					{chat.prStatus && (
						<Badge
							label={chat.prStatus === "ready" ? "PR Ready" : "PR Draft"}
							variant={chat.prStatus === "ready" ? "ready" : "draft"}
						/>
					)}
				</div>
			</button>
		);
	};

	return (
		<div className="w-full md:w-[360px] bg-bg border-b md:border-b-0 md:border-r border-border h-full flex flex-col">
			<div className="px-4 py-3 flex items-center justify-between border-b border-border">
				<div>
					<p className="text-xs uppercase tracking-wide text-fg-subtle">
						Chats
					</p>
					<h2 className="text-sm font-semibold text-fg">Workspace threads</h2>
				</div>
				<button
					type="button"
					className="h-10 w-10 rounded-xl bg-primary-600 text-white flex items-center justify-center hover:bg-primary-500"
					onClick={onNewChat}
					aria-label="New chat"
				>
					<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
						<title>New chat</title>
						<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
					</svg>
				</button>
			</div>

			<div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3 space-y-3">
				<button
					type="button"
					className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-bg-muted text-fg-muted"
					onClick={() => {
						setIsRegularOpen((prev) => !prev);
					}}
				>
					<div className="flex items-center gap-2">
						<span
							className={`transition-transform ${isRegularOpen ? "rotate-90" : ""}`}
						>
							<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
								<title>Toggle</title>
								<path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
							</svg>
						</span>
						<span className="text-sm font-semibold">Regular Chats</span>
					</div>
					<span className="text-xs text-fg-subtle">{regularChats.length}</span>
				</button>

				<div className={isRegularOpen ? "space-y-2" : "hidden"}>
					{regularChats.length === 0 && (
						<div className="px-3 py-3 text-xs text-fg-subtle">
							No regular chats
						</div>
					)}
					{regularChats.map((chat) =>
						renderChatRow(chat, "regular", () => {
							onSelectRegularChat(chat.id);
						}),
					)}
				</div>

				{sprints.map((sprint) => (
					<div key={sprint.id} className="space-y-2">
						<button
							type="button"
							className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-bg-muted text-fg-muted"
							onClick={() => {
								toggleSprint(sprint.id);
								onSelectSprint(sprint.id);
							}}
						>
							<div className="flex items-center gap-2">
								<span
									className={`transition-transform ${sprintOpenState[sprint.id] ? "rotate-90" : ""}`}
								>
									<svg
										className="w-4 h-4"
										viewBox="0 0 24 24"
										fill="currentColor"
									>
										<title>Toggle</title>
										<path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
									</svg>
								</span>
								<span className="text-sm font-semibold truncate">
									{sprint.name}
								</span>
							</div>
							<div className="flex items-center gap-2">
								<Badge
									label={sprint.status}
									variant={
										sprint.status === "active"
											? "statusActive"
											: sprint.status === "planned"
												? "statusPlanned"
												: "statusDone"
									}
								/>
								<span className="text-xs text-fg-subtle">
									{sprint.chats.length}
								</span>
							</div>
						</button>

						<div
							className={sprintOpenState[sprint.id] ? "space-y-2" : "hidden"}
						>
							{sprint.chats.length === 0 && (
								<div className="px-3 py-3 text-xs text-fg-subtle">
									No sprint chats
								</div>
							)}
							{sprint.chats.map((chat) =>
								renderChatRow(chat, "sprint", () => {
									onSelectChat(chat.id);
								}),
							)}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
