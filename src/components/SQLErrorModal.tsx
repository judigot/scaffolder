import { useRef, useEffect } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

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
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleEditorDidMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor;

    // Highlight error line if available
    if (errorLine !== null && errorLine !== undefined && errorLine > 0) {
      const lineNumber = errorLine;
      let columnNumber = 1;

      // Calculate column from position if available
      if (
        errorPosition !== null &&
        errorPosition !== undefined &&
        sqlSchema !== null &&
        sqlSchema !== undefined &&
        sqlSchema !== ''
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

      // Add decoration to highlight the entire error line (subtle background)
      const lineDecoration = {
        range: new monacoInstance.Range(
          lineNumber,
          1,
          lineNumber,
          lineLength + 1,
        ),
        options: {
          isWholeLine: true,
          className: 'sql-error-line',
          glyphMarginClassName: 'sql-error-glyph',
        },
      };

      // Add decoration to highlight the specific error position (bright highlight)
      const positionDecoration = {
        range: new monacoInstance.Range(
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
      };

      const decorationsCollection = editor.createDecorationsCollection([
        lineDecoration,
        positionDecoration,
      ]);
      // Keep reference to prevent garbage collection
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      decorationsCollection;

      // Scroll to error line and set cursor position
      editor.revealLineInCenter(lineNumber);
      editor.setPosition({ lineNumber, column: columnNumber });
    }
  };

  // Calculate column number from character position
  // PostgreSQL position is 1-indexed character position in the entire SQL string
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
      charCount += lines[i].length + 1; // +1 for the newline character
    }

    // Position within the target line (1-indexed)
    // PostgreSQL position is 1-indexed, so position 1 is the first character
    // If position is at charCount + 1, that's column 1 of the target line
    const positionInLine = position - charCount;

    // Ensure it's at least 1 and doesn't exceed the line length
    const lineLength = lines[lineNumber - 1]?.length ?? 0;
    return Math.max(1, Math.min(positionInLine, lineLength + 1));
  };

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
    <div className="space-y-4">
      <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
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
            {errorLine !== null && errorLine !== undefined && errorLine > 0 && (
              <p className="text-xs text-red-300/70 mt-2">
                Error at line {String(errorLine)}
                {errorPosition !== null &&
                  errorPosition !== undefined &&
                  `, position ${String(errorPosition)}`}
              </p>
            )}
          </div>
        </div>
      </div>

      {sqlSchema !== null && sqlSchema !== undefined && sqlSchema !== '' && (
        <div>
          <p className="text-sm font-medium text-gray-300 mb-2">SQL Schema:</p>
          <div className="border border-gray-700 rounded-lg overflow-hidden">
            <Editor
              height="300px"
              value={sqlSchema}
              language="sql"
              theme="vs-dark"
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
              }}
              onMount={handleEditorDidMount}
            />
          </div>
        </div>
      )}
    </div>
  );
}
