export interface IMessage {
	id: string;
	role: "user" | "assistant";
	content: string;
	timestamp: Date;
}

export interface IChat {
	id: string;
	title: string;
	description: string;
	messages: IMessage[];
	createdAt: Date;
	updatedAt: Date;
	prStatus: "draft" | "ready" | null;
	prUrl?: string;
	opencodeSessionId?: string;
	/** Git branch name associated with this chat (e.g., "feat/add-auth") */
	branch?: string;
}

export interface ISprint {
	id: string;
	name: string;
	status: "active" | "planned" | "done";
	chats: IChat[];
	createdAt: Date;
	updatedAt: Date;
}

export interface IRepository {
	id: string;
	name: string;
	path: string;
	localPath?: string;
	isRemovable?: boolean;
	/** Public GitHub repository URL for fetching files */
	repoUrl: string;
	sprints: ISprint[];
	chats: IChat[];
}
