import { Build as BuildIcon, Chat as ChatIcon } from "@mui/icons-material";
import type { IMiddleTabConfig } from "@/components/AI/TabBar.tsx";

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
