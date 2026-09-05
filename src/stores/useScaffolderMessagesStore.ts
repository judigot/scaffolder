import { create } from "zustand";
import type { IScaffolderMessage } from "@/interfaces/scaffolderMessages.ts";

export interface IScaffolderMessagesStore {
	messages: IScaffolderMessage[];
	setMessages: (messages: IScaffolderMessage[]) => void;
	dismissMessage: (id: string) => void;
	focusedFilePath: string | null;
	setFocusedFilePath: (path: string | null) => void;
}

export const useScaffolderMessagesStore = create<IScaffolderMessagesStore>(
	(set) => ({
		messages: [],
		setMessages: (messages) => {
			set({ messages });
		},
		dismissMessage: (id) => {
			set((state) => ({
				messages: state.messages.filter((message) => message.id !== id),
			}));
		},
		focusedFilePath: null,
		setFocusedFilePath: (path) => {
			set({ focusedFilePath: path });
		},
	}),
);
