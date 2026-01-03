import { useCallback, useEffect, useRef, useState } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';

interface ISQLErrorModalProps {
  errorMessage: string;
  sqlSchema: string | null | undefined;
  errorLine: number | null | undefined;
  errorPosition: number | null | undefined;
}

export function SQLErrorModal({
  errorMessage,
  sqlSchema,
  errorLine,
  errorPosition,
}: ISQLErrorModalProps) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);
  const decorationsCollectionRef = useRef<ReturnType<
    Parameters<OnMount>[0]['createDecorationsCollection']
  > | null>(null);
  const [editorWidth, setEditorWidth] = useState<number>(800);

  // Calculate column number from character position
  // The errorPosition and errorLine have been adjusted to exclude DROP TABLE commands
  // at the start of sqlSchema. We need to strip those commands before calculating.
  // Calculate column number from absolute character position
  // Position is 1-indexed character position in the full SQL string
  const calculateColumnFromPosition = (
    sql: string,
    position: number,
    lineNumber: number,
  ): number => {
    if (position <= 0 || lineNumber <= 0) {
      return 1;
    }

    const lines = sql.split('\n');
    if (lineNumber > lines.length) {
      return 1;
    }

    // Calculate total characters up to (but not including) the target line
    let charCount = 0;
    for (let i = 0; i < lineNumber - 1; i++) {
      charCount += lines[i]?.length ?? 0;
      if (i < lineNumber - 1) {
        charCount += 1; // +1 for the newline character
      }
    }

    // Position within the target line (1-indexed)
    const positionInLine = position - charCount;

    // Ensure it's at least 1 and doesn't exceed the line length
    const lineLength = lines[lineNumber - 1]?.length ?? 0;
    return Math.max(1, Math.min(positionInLine, lineLength + 1));
  };

  const applyDecorations = useCallback(
    (editor: Parameters<OnMount>[0], monaco: Parameters<OnMount>[1]) => {
      if (sqlSchema === null || sqlSchema === undefined || sqlSchema === '') {
        return;
      }

      // Use errorLine prop directly from backend (extracted from pg error object)
      if (errorLine === null || errorLine === undefined || errorLine <= 0) {
        return;
      }

      const lineNumber = errorLine;

      // Use errorPosition prop (extracted from pg error object) for column calculation
      let columnNumber = 1;
      if (
        errorPosition !== null &&
        errorPosition !== undefined &&
        errorPosition > 0
      ) {
        columnNumber = calculateColumnFromPosition(
          sqlSchema,
          errorPosition,
          lineNumber,
        );
      }

      // Get the model to check line length
      const model = editor.getModel();
      if (model === null) {
        return;
      }

      const lineLength = model.getLineLength(lineNumber);
      const highlightEndColumn = Math.min(columnNumber + 3, lineLength + 1);

      // Create decorations using createDecorationsCollection (replaces deprecated deltaDecorations)
      const newDecorations = [
        {
          range: new monaco.Range(lineNumber, 1, lineNumber, lineLength + 1),
          options: {
            isWholeLine: true,
            className: 'sql-error-line',
            glyphMarginClassName: 'sql-error-glyph',
          },
        },
        {
          range: new monaco.Range(
            lineNumber,
            Math.max(1, columnNumber - 1),
            lineNumber,
            highlightEndColumn,
          ),
          options: {
            isWholeLine: false,
            className: 'sql-error-highlight',
            inlineClassName: 'sql-error-inline',
            minimap: {
              color: '#ff4444',
              position: 1,
            },
            overviewRuler: {
              color: '#ff4444',
              position: 1,
            },
            hoverMessage: {
              value: errorMessage,
            },
          },
        },
      ];

      // Update decorations using createDecorationsCollection (replaces deprecated deltaDecorations)
      if (decorationsCollectionRef.current === null) {
        decorationsCollectionRef.current =
          editor.createDecorationsCollection(newDecorations);
      } else {
        decorationsCollectionRef.current.set(newDecorations);
      }

      // Scroll to error line and set cursor position
      editor.revealLineInCenter(lineNumber);
      editor.setPosition({ lineNumber, column: columnNumber });
    },
    [sqlSchema, errorLine, errorPosition, errorMessage],
  );

  const handleEditorDidMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor;
    monacoRef.current = monacoInstance;
    // Apply decorations immediately after mount
    applyDecorations(editor, monacoInstance);
  };

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;

    if (editor === null || monaco === null) {
      return;
    }

    applyDecorations(editor, monaco);

    // Cleanup: remove decorations when component unmounts or dependencies change
    return () => {
      if (decorationsCollectionRef.current !== null) {
        decorationsCollectionRef.current.clear();
        decorationsCollectionRef.current = null;
      }
    };
  }, [errorLine, errorPosition, errorMessage, sqlSchema, applyDecorations]);

  useEffect(() => {
    // Calculate editor width based on longest line in SQL schema
    if (sqlSchema !== null && sqlSchema !== undefined && sqlSchema !== '') {
      const lines = sqlSchema.split('\n');
      const longestLine = lines.reduce(
        (longest, line) => (line.length > longest.length ? line : longest),
        '',
      );

      // Estimate width: character width (monospace ~7.5px at 13px font) + line numbers (~60px) + padding (~40px)
      // Use a reasonable min/max range for readability
      const estimatedWidth = Math.max(
        500,
        Math.min(1400, longestLine.length * 7.5 + 100),
      );
      setEditorWidth(estimatedWidth);
    }
  }, [sqlSchema]);

  useEffect(() => {
    // Add custom CSS for error highlighting
    const style = document.createElement('style');
    style.textContent = `
      .sql-error-line {
        background-color: rgba(255, 68, 68, 0.1) !important;
      }
      .sql-error-highlight {
        background-color: rgba(255, 68, 68, 0.4) !important;
        border-left: 3px solid #ff4444 !important;
        border-right: 3px solid #ff4444 !important;
      }
      .sql-error-inline {
        background-color: rgba(255, 68, 68, 0.5) !important;
        font-weight: bold !important;
      }
      .sql-error-glyph {
        background-color: #ff4444 !important;
        width: 4px !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <svg
            className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-300 mb-1">SQL Error</p>
            <p className="text-xs text-red-200/80 whitespace-pre-wrap">
              {errorMessage}
            </p>
          </div>
        </div>
      </div>

      {sqlSchema !== null && sqlSchema !== undefined && sqlSchema !== '' && (
        <div className="w-max">
          <p className="text-sm font-medium text-gray-300 mb-1.5">
            SQL Schema:
          </p>
          <div className="border border-gray-700 rounded-lg overflow-hidden w-max">
            <Editor
              width={editorWidth}
              height="250px"
              value={sqlSchema}
              language="sql"
              theme="vs-dark"
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'off',
              }}
              onMount={handleEditorDidMount}
            />
          </div>
        </div>
      )}
    </div>
  );
}
