import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { IRepository } from "@/components/AI/chat-app/types.ts";
import Badge from "@/components/AI/chat-app/ui/Badge.tsx";

interface IRepositoryTabsProps {
	repositories: IRepository[];
	activeRepoId: string;
	onSelectRepo: (repoId: string) => void;
	onSelectBranch: (
		repoId: string,
		chatId: string,
		scope: "sprint" | "regular",
		sprintId?: string,
	) => void;
	onAddRepo: (repoUrl: string) => void | Promise<void>;
	onRemoveRepo: (repoUrl: string, repoId: string) => void | Promise<void>;
}

interface IDropdownPosition {
	top: number;
	left: number;
}

export default function RepoTabs({
	repositories,
	activeRepoId,
	onSelectRepo,
	onSelectBranch,
	onAddRepo,
	onRemoveRepo,
}: IRepositoryTabsProps) {
	const [openRepoId, setOpenRepoId] = useState<string | null>(null);
	const [dropdownPosition, setDropdownPosition] = useState<IDropdownPosition>({
		top: 0,
		left: 0,
	});
	const [showAddModal, setShowAddModal] = useState(false);
	const [newRepoUrl, setNewRepoUrl] = useState("");
	const [urlError, setUrlError] = useState<string | null>(null);
	const [isAdding, setIsAdding] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			// Check if click is outside the dropdown and the trigger buttons
			const dropdown = document.getElementById("repo-dropdown-portal");
			const target = event.target;
			if (!(target instanceof Node)) {
				return;
			}
			const isClickOnDropdown = dropdown?.contains(target) === true;
			const isClickOnButton = Array.from(buttonRefs.current.values()).some(
				(btn) => btn.contains(target),
			);

			if (!isClickOnDropdown && !isClickOnButton) {
				setOpenRepoId(null);
			}
		};
		window.addEventListener("click", handleClickOutside);
		return () => {
			window.removeEventListener("click", handleClickOutside);
		};
	}, []);

	// Update dropdown position when opened
	useEffect(() => {
		if (openRepoId !== null && openRepoId !== "") {
			const button = buttonRefs.current.get(openRepoId);
			if (button) {
				const rect = button.getBoundingClientRect();
				setDropdownPosition({
					top: rect.bottom + 8,
					left: Math.max(8, Math.min(rect.left, window.innerWidth - 296)), // 288 + 8 padding
				});
			}
		}
	}, [openRepoId]);

	// Focus input when modal opens
	useEffect(() => {
		if (showAddModal) {
			setTimeout(() => {
				inputRef.current?.focus();
			}, 100);
		}
	}, [showAddModal]);

	const getRepoCount = (repo: IRepository) =>
		repo.sprints.reduce((total, sprint) => total + sprint.chats.length, 0) +
		repo.chats.length;

	const openRepo = repositories.find((r) => r.id === openRepoId);

	const normalizeRepoInput = (value: string): string | null => {
		const trimmed = value.trim();
		if (!trimmed) {
			return null;
		}

		const urlMatch = /^https?:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/?$/i.exec(
			trimmed,
		);
		if (urlMatch?.[1] && urlMatch?.[2]) {
			return `https://github.com/${urlMatch[1]}/${urlMatch[2]}`;
		}

		const shortMatch = /^([\w.-]+)\/([\w.-]+)$/.exec(trimmed);
		if (shortMatch?.[1] && shortMatch?.[2]) {
			return `https://github.com/${shortMatch[1]}/${shortMatch[2]}`;
		}

		return null;
	};

	const handleAddRepo = async () => {
		const trimmedUrl = newRepoUrl.trim();

		if (!trimmedUrl) {
			setUrlError("Please enter a repository URL");
			return;
		}

		const normalizedUrl = normalizeRepoInput(trimmedUrl);
		if (!normalizedUrl) {
			setUrlError(
				"Please enter a valid repository (e.g., judigot/repo or https://github.com/judigot/repo)",
			);
			return;
		}

		// Check if repo already exists
		const exists = repositories.some(
			(r) => r.repoUrl.toLowerCase() === normalizedUrl.toLowerCase(),
		);
		if (exists) {
			setUrlError("This repository has already been added");
			return;
		}

		setIsAdding(true);
		try {
			await onAddRepo(normalizedUrl);
			setNewRepoUrl("");
			setUrlError(null);
			setShowAddModal(false);
		} catch (error) {
			if (error instanceof Error && error.message.trim() !== "") {
				setUrlError(error.message);
			} else {
				setUrlError("Failed to add repository. Please try again.");
			}
		} finally {
			setIsAdding(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			e.preventDefault();
			void handleAddRepo();
		} else if (e.key === "Escape") {
			setShowAddModal(false);
			setNewRepoUrl("");
			setUrlError(null);
		}
	};

	const handleRemoveRepo = async (repo: IRepository) => {
		setIsAdding(true);
		try {
			await onRemoveRepo(repo.repoUrl, repo.id);
			setOpenRepoId(null);
		} catch (error) {
			if (error instanceof Error && error.message.trim() !== "") {
				setUrlError(error.message);
			} else {
				setUrlError("Failed to remove repository. Please try again.");
			}
		} finally {
			setIsAdding(false);
		}
	};

	return (
		<>
			<div
				ref={containerRef}
				className="px-3 py-2 bg-secondary border-b border-border flex gap-2 overflow-x-auto scrollbar-thin"
			>
				{repositories.map((repo) => {
					const isActive = repo.id === activeRepoId;

					return (
						<div key={repo.id} className="relative flex-shrink-0">
							<div
								className={`flex items-center rounded-xl border ${
									isActive
										? "border-primary-600/40 bg-primary-900/30 text-fg"
										: "border-transparent bg-bg-subtle text-fg-muted"
								}`}
							>
								<button
									type="button"
									className="flex items-center gap-2 px-3 py-2"
									onClick={() => {
										onSelectRepo(repo.id);
									}}
								>
									<svg
										className="w-4 h-4 opacity-80"
										viewBox="0 0 24 24"
										fill="currentColor"
									>
										<title>Repository</title>
										<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
									</svg>
									<span className="text-sm font-semibold max-w-[120px] truncate">
										{repo.name}
									</span>
									<span className="text-xs font-semibold bg-bg-muted text-fg-subtle px-2 py-0.5 rounded-full">
										{getRepoCount(repo)}
									</span>
								</button>
								<div className="h-6 w-px bg-border opacity-60" />
								<button
									ref={(el) => {
										if (el) {
											buttonRefs.current.set(repo.id, el);
										}
									}}
									type="button"
									className={`h-full px-2 rounded-r-xl ${
										openRepoId === repo.id
											? "bg-secondary-hover text-fg"
											: "text-fg-subtle"
									}`}
									onClick={(event) => {
										event.stopPropagation();
										setOpenRepoId((prev) =>
											prev === repo.id ? null : repo.id,
										);
									}}
									aria-label={`Open branches for ${repo.name}`}
								>
									<svg
										className="w-4 h-4"
										viewBox="0 0 24 24"
										fill="currentColor"
									>
										<title>Open branches</title>
										<path d="M7 10l5 5 5-5z" />
									</svg>
								</button>
							</div>
						</div>
					);
				})}

				{/* Add repository button */}
				<button
					type="button"
					onClick={() => {
						setShowAddModal(true);
					}}
					className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-border text-fg-muted hover:border-primary-600/40 hover:text-fg hover:bg-primary-900/20 transition-colors"
					aria-label="Add repository"
				>
					<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
						<title>Add repository</title>
						<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
					</svg>
					<span className="text-sm font-semibold">Add</span>
				</button>
			</div>

			{/* Dropdown rendered via portal */}
			{openRepoId !== null &&
				openRepo !== undefined &&
				createPortal(
					<div
						id="repo-dropdown-portal"
						className="fixed z-[100] w-72 max-w-[calc(100vw-16px)] rounded-2xl bg-bg-subtle border border-border shadow-xl p-3 max-h-[70vh] overflow-y-auto scrollbar-thin"
						style={{
							top: dropdownPosition.top,
							left: dropdownPosition.left,
						}}
					>
						<div className="space-y-3">
							<div className="space-y-2">
								<p className="text-[10px] uppercase tracking-wide text-fg-subtle">
									Regular Chats
								</p>
								{openRepo.chats.length === 0 && (
									<p className="text-xs text-fg-subtle">No regular chats</p>
								)}
								{openRepo.chats.map((chat) => (
									<button
										key={chat.id}
										type="button"
										className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-secondary text-left text-sm text-fg-muted hover:bg-secondary-hover hover:text-fg transition-colors"
										onClick={() => {
											onSelectBranch(openRepo.id, chat.id, "regular");
											setOpenRepoId(null);
										}}
									>
										<span className="truncate font-medium">{chat.title}</span>
										{chat.prStatus !== null && (
											<Badge
												label={chat.prStatus === "ready" ? "Ready" : "Draft"}
												variant={chat.prStatus === "ready" ? "ready" : "draft"}
											/>
										)}
									</button>
								))}
							</div>
							<div className="border-t border-border pt-3 space-y-3">
								<p className="text-[10px] uppercase tracking-wide text-fg-subtle">
									Sprint Chats
								</p>
								{openRepo.sprints.length === 0 && (
									<p className="text-xs text-fg-subtle">No sprints</p>
								)}
								{openRepo.sprints.map((sprint) => (
									<div key={sprint.id} className="space-y-2">
										<div className="flex items-center justify-between">
											<span className="text-xs font-semibold text-fg">
												{sprint.name}
											</span>
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
										</div>
										{sprint.chats.map((chat) => (
											<button
												key={chat.id}
												type="button"
												className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-secondary text-left text-sm text-fg-muted hover:bg-secondary-hover hover:text-fg transition-colors"
												onClick={() => {
													onSelectBranch(
														openRepo.id,
														chat.id,
														"sprint",
														sprint.id,
													);
													setOpenRepoId(null);
												}}
											>
												<span className="truncate font-medium">
													{chat.title}
												</span>
												{chat.prStatus !== null && (
													<Badge
														label={
															chat.prStatus === "ready" ? "Ready" : "Draft"
														}
														variant={
															chat.prStatus === "ready" ? "ready" : "draft"
														}
													/>
												)}
											</button>
										))}
									</div>
								))}
							</div>
							{openRepo.isRemovable && (
								<div className="border-t border-border pt-3">
									<button
										type="button"
										onClick={() => {
											void handleRemoveRepo(openRepo);
										}}
										className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-danger-600/40 text-danger-300 hover:bg-danger-900/20 hover:text-danger-200 transition-colors text-sm font-semibold"
										disabled={isAdding}
									>
										<svg
											className="w-4 h-4"
											viewBox="0 0 24 24"
											fill="currentColor"
										>
											<title>Remove repository</title>
											<path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-4.5l-1-1z" />
										</svg>
										Remove repository
									</button>
								</div>
							)}
						</div>
					</div>,
					document.body,
				)}

			{/* Add repository modal */}
			{showAddModal &&
				createPortal(
					<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60">
						<div
							className="bg-bg-subtle border border-border rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl"
							role="dialog"
							aria-modal="true"
							aria-labelledby="add-repo-title"
						>
							<div className="flex items-center justify-between mb-4">
								<h2
									id="add-repo-title"
									className="text-lg font-semibold text-fg"
								>
									Add Repository
								</h2>
								<button
									type="button"
									onClick={() => {
										setShowAddModal(false);
										setNewRepoUrl("");
										setUrlError(null);
									}}
									className="p-1 rounded-lg text-fg-muted hover:text-fg hover:bg-secondary transition-colors"
									aria-label="Close"
								>
									<svg
										className="w-5 h-5"
										viewBox="0 0 24 24"
										fill="currentColor"
									>
										<title>Close</title>
										<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
									</svg>
								</button>
							</div>

							<div className="space-y-4">
								<div>
									<label
										htmlFor="repo-url"
										className="block text-sm font-medium text-fg-muted mb-2"
									>
										GitHub Repository URL
									</label>
									<input
										ref={inputRef}
										id="repo-url"
										type="url"
										value={newRepoUrl}
										onChange={(e) => {
											setNewRepoUrl(e.target.value);
											setUrlError(null);
										}}
										onKeyDown={handleKeyDown}
										placeholder="judigot/repo or https://github.com/judigot/repo"
										className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-fg placeholder-fg-subtle focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
									/>
									{urlError !== null && (
										<p className="mt-2 text-sm text-danger-400">{urlError}</p>
									)}
								</div>

								<p className="text-xs text-fg-subtle">
									Use owner/repo or a GitHub URL to clone into your workspace.
								</p>

								<div className="flex gap-3 pt-2">
									<button
										type="button"
										onClick={() => {
											setShowAddModal(false);
											setNewRepoUrl("");
											setUrlError(null);
										}}
										className="flex-1 px-4 py-2.5 rounded-xl border border-border text-fg-muted hover:text-fg hover:bg-secondary transition-colors font-medium"
									>
										Cancel
									</button>
									<button
										type="button"
										onClick={() => void handleAddRepo()}
										disabled={!newRepoUrl.trim() || isAdding}
										className="flex-1 px-4 py-2.5 rounded-xl bg-primary-600 text-white hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
									>
										{isAdding ? "Adding..." : "Add Repository"}
									</button>
								</div>
							</div>
						</div>
					</div>,
					document.body,
				)}
		</>
	);
}
