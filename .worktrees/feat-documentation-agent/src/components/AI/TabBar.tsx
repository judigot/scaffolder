import {
	Build as BuildIcon,
	Chat as ChatIcon,
	CloudQueue as CloudIcon,
} from "@mui/icons-material";
import type { ReactNode } from "react";

export type TabType = "chat" | "fileViewer" | "infra";

/** Configuration for the middle tab */
export interface IMiddleTabConfig {
	/** Label displayed under the icon */
	label: string;
	/** Icon to display (defaults to ChatIcon) */
	icon?: ReactNode;
	/** Optional custom content to render instead of just the label */
	customContent?: ReactNode;
}

interface ITabBarProps {
	activeTab: TabType;
	onTabChange: (tab: TabType) => void;
	hasGeneratedCode?: boolean;
	/** Configuration for the middle tab - defaults to Chat */
	middleTab?: IMiddleTabConfig;
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

/** Default middle tab config for repositories mode */
export const CHAT_TAB_CONFIG: IMiddleTabConfig = {
	label: "Chat",
	icon: <ChatIcon className="w-5 h-5 mb-1" />,
};

/** Default middle tab config for scaffolder mode */
export const BUILDER_TAB_CONFIG: IMiddleTabConfig = {
	label: "Builder",
	icon: <BuildIcon className="w-5 h-5 mb-1" />,
};

export default function TabBar({
	activeTab,
	onTabChange,
	hasGeneratedCode = false,
	middleTab = CHAT_TAB_CONFIG,
}: ITabBarProps) {
	return (
		<div className="bg-secondary border-t border-layout-border flex shrink-0">
			{/* Builder/Chat tab (first position) */}
			<button
				type="button"
				className={`flex-1 py-3 flex flex-col items-center justify-center border-r border-layout-border transition-colors ${
					activeTab === "chat"
						? "text-content bg-secondary-hover"
						: "text-fg-muted bg-secondary hover:bg-secondary-hover"
				}`}
				onClick={() => {
					onTabChange("chat");
				}}
				aria-label={`${middleTab.label} View`}
			>
				{middleTab.customContent ? (
					middleTab.customContent
				) : (
					<>
						{middleTab.icon}
						<span className="text-xs font-medium">{middleTab.label}</span>
					</>
				)}
			</button>

			{/* Code tab (middle position) */}
			<button
				type="button"
				className={`flex-1 py-3 flex flex-col items-center justify-center transition-colors ${
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

			{/* Infra tab (last position) */}
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
