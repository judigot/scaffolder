import { useEffect, useState } from "react";
import { AIChatContainer } from "@/components/AI/AIChatContainer.tsx";
import Navbar from "@/components/AI/Navbar.tsx";
import TabBar from "@/components/AI/TabBar.tsx";
import useDebouncedValue from "@/hooks/useDebouncedValue.ts";
import { useDecryptedUserMetadata } from "@/hooks/useDecryptedUserMetadata.ts";
import { useUser } from "@/hooks/useUser.ts";
import { useUserFiles } from "@/hooks/useUserFiles.ts";
import { useFormStore } from "@/useFormStore.ts";
import { useMockDatabaseStore } from "@/useMockDatabaseStore.ts";
import { useProjectStore } from "@/useProjectStore.ts";
import { useTransformationsStore } from "@/useTransformationsStore.ts";
import { useUIStore } from "@/useUIStore.ts";

function AI() {
	const { activeTab, setActiveTab } = useUIStore();

	const formData = useFormStore();
	const {
		userMetadata,
		isLoading: isUserLoading,
		serverConfigStatus,
	} = useUser();
	const { decryptedMetadata } = useDecryptedUserMetadata();
	const { publicRepoURL, setPublicRepoURL } = formData;

	const { setTransformations, schemaInfo } = useTransformationsStore();
	const { typeMappings, dbTypes } = useMockDatabaseStore();

	const { setUserFiles } = useMockDatabaseStore();

	const { selectedProject, invalidateProjectCache } = useProjectStore();

	useEffect(() => {
		if (
			selectedProject !== null &&
			(userMetadata !== null || decryptedMetadata !== null)
		) {
			invalidateProjectCache(selectedProject.name);
		}
	}, [
		userMetadata,
		decryptedMetadata,
		selectedProject,
		invalidateProjectCache,
	]);

	const [inputRepoURL] = useState<string>(publicRepoURL);

	const { refetch: refetchUserFiles, data: userFiles } = useUserFiles(
		{
			publicRepoURL,
		},
		{
			refetchInterval: 5 * 60 * 1000,
			staleTime: 5 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
			refetchOnWindowFocus: false,
			enabled: !!publicRepoURL,
		},
	);

	useEffect(() => {
		if (userFiles) {
			if (userFiles.length > 0) {
				setUserFiles(userFiles);
			}
		}
	}, [userFiles, setUserFiles]);

	const [debouncedRepoURL] = useDebouncedValue(inputRepoURL, 1000);

	useEffect(() => {
		setPublicRepoURL(inputRepoURL);
		if (inputRepoURL && debouncedRepoURL !== publicRepoURL) {
			void refetchUserFiles();
		}
	}, [
		debouncedRepoURL,
		inputRepoURL,
		publicRepoURL,
		setPublicRepoURL,
		refetchUserFiles,
	]);

	useEffect(() => {
		if (!typeMappings || Object.keys(typeMappings).length === 0) {
			return;
		}
		if (!dbTypes || dbTypes.length === 0) {
			return;
		}
		setTransformations();
	}, [typeMappings, dbTypes, setTransformations]);

	useEffect(() => {
		if (publicRepoURL) {
			void refetchUserFiles();
		}
	}, [publicRepoURL, refetchUserFiles]);

	// Add keyboard shortcut to toggle between tabs (Ctrl+B)
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key === "b") {
				e.preventDefault();
				const currentTab = useUIStore.getState().activeTab;
				setActiveTab(currentTab === "chat" ? "fileViewer" : "chat");
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [setActiveTab]);

	return (
		<div className="text-fg bg-bg h-screen flex flex-col overflow-hidden">
			<Navbar
				isUserLoading={isUserLoading}
				serverConfigStatus={serverConfigStatus}
			/>
			<div className="flex-1 overflow-hidden min-h-0">
				<AIChatContainer activeTab={activeTab} onTabChange={setActiveTab} />
			</div>

			{/* Bottom Tab Bar */}
			<TabBar
				activeTab={activeTab}
				onTabChange={setActiveTab}
				hasGeneratedCode={schemaInfo.length > 0}
			/>
		</div>
	);
}

export default AI;
