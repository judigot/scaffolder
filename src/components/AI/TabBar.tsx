import { Chat as ChatIcon, CloudQueue as CloudIcon } from "@mui/icons-material";

export type TabType = "chat" | "fileViewer" | "infra";

interface ITabBarProps {
	activeTab: TabType;
	onTabChange: (tab: TabType) => void;
	hasGeneratedCode?: boolean;
}

function CodeStatusIcon({ hasGeneratedCode }: { hasGeneratedCode: boolean }) {
	return (
		<div className="flex items-center gap-0.5 text-lg font-mono mb-1">
			<span>&lt;</span>
			{hasGeneratedCode ? (
				<div className="w-2 h-2 rounded-full bg-success-500" />
			) : (
				<span>/</span>
			)}
			<span>&gt;</span>
		</div>
	);
}

export default function TabBar({
	activeTab,
	onTabChange,
	hasGeneratedCode = false,
}: ITabBarProps) {
	return (
		<div className="bg-secondary border-t border-layout-border flex shrink-0">
			<button
				type="button"
				className={`flex-1 py-3 flex flex-col items-center justify-center border-r border-layout-border transition-colors ${
					activeTab === "fileViewer"
						? "text-content bg-secondary-hover"
						: "text-fg-muted bg-secondary hover:bg-secondary-hover"
				}`}
				onClick={() => {
					onTabChange("fileViewer");
				}}
				aria-label="Code View"
			>
				<CodeStatusIcon hasGeneratedCode={hasGeneratedCode} />
				<span className="text-xs font-medium">Code</span>
			</button>

			<button
				type="button"
				className={`flex-1 py-3 flex flex-col items-center justify-center transition-colors ${
					activeTab === "chat"
						? "text-content bg-secondary-hover"
						: "text-fg-muted bg-secondary hover:bg-secondary-hover"
				}`}
				onClick={() => {
					onTabChange("chat");
				}}
				aria-label="Chat View"
			>
				<ChatIcon className="w-5 h-5 mb-1" />
				<span className="text-xs font-medium">Chat</span>
			</button>

			<button
				type="button"
				className={`flex-1 py-3 flex flex-col items-center justify-center border-l border-layout-border transition-colors ${
					activeTab === "infra"
						? "text-content bg-secondary-hover"
						: "text-fg-muted bg-secondary hover:bg-secondary-hover"
				}`}
				onClick={() => {
					onTabChange("infra");
				}}
				aria-label="Infrastructure View"
			>
				<CloudIcon className="w-5 h-5 mb-1" />
				<span className="text-xs font-medium">Infra</span>
			</button>
		</div>
	);
}
