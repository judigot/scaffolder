import { Chat as ChatIcon } from '@mui/icons-material';

export type TabType = 'chat' | 'fileViewer';

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
        <div className="w-2 h-2 rounded-full bg-green-500" />
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
    <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 flex z-50">
      <button
        type="button"
        className={`flex-1 py-3 flex flex-col items-center justify-center ${
          activeTab === 'fileViewer'
            ? 'text-blue-400 bg-gray-700/50'
            : 'text-gray-400'
        }`}
        onClick={() => {
          onTabChange('fileViewer');
        }}
        aria-label="Code View"
      >
        <CodeStatusIcon hasGeneratedCode={hasGeneratedCode} />
        <span className="text-xs font-medium">Code</span>
      </button>

      <button
        type="button"
        className={`flex-1 py-3 flex flex-col items-center justify-center ${
          activeTab === 'chat'
            ? 'text-blue-400 bg-gray-700/50'
            : 'text-gray-400'
        }`}
        onClick={() => {
          onTabChange('chat');
        }}
        aria-label="Chat View"
      >
        <ChatIcon className="w-5 h-5 mb-1" />
        <span className="text-xs font-medium">Chat</span>
      </button>
    </div>
  );
}
