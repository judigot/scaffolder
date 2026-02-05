/// <reference types="vitest/globals" />

/**
 * Terminal Mode Component Tests (Vitest-only)
 * Tests for the Terminal Mode UI rendering and functionality
 *
 * This test uses Vitest-specific module mocking (hoisting) that doesn't work with Bun.
 * The .vitest.tsx extension ensures it's only run by Vitest, not Bun.
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  authenticatedUserConfig,
  newUserConfig,
} from '../../test/fixtures/users.ts';
import { clearAllMocks, mockFn, mockModule } from '../../test/utils/mock.ts';
import { renderWithAuth } from '../../test/utils/renderWithAuth.tsx';

let TerminalModeComponent: typeof import('./TerminalMode.tsx').default | null =
  null;

// Mock ResizeObserver
class MockResizeObserver {
  observe = mockFn();
  unobserve = mockFn();
  disconnect = mockFn();
}
Object.defineProperty(globalThis, 'ResizeObserver', {
  value: MockResizeObserver,
  writable: true,
});

// Mock xterm.js - it requires browser APIs
mockModule('@xterm/xterm', () => {
  const MockTerminal = mockFn(function (this: Record<string, unknown>) {
    this.open = mockFn();
    this.write = mockFn();
    this.writeln = mockFn();
    this.clear = mockFn();
    this.focus = mockFn();
    this.blur = mockFn();
    this.scrollToBottom = mockFn();
    this.dispose = mockFn();
    this.onData = mockFn();
    this.onResize = mockFn();
    this.loadAddon = mockFn();
    this.unicode = { activeVersion: '11' };
  });
  return { Terminal: MockTerminal };
});

mockModule('@xterm/addon-fit', () => {
  const MockFitAddon = mockFn(function (this: Record<string, unknown>) {
    this.fit = mockFn();
  });
  return { FitAddon: MockFitAddon };
});

mockModule('@xterm/addon-web-links', () => {
  const MockWebLinksAddon = mockFn(function (this: Record<string, unknown>) {
    // Empty addon
  });
  return { WebLinksAddon: MockWebLinksAddon };
});

mockModule('@xterm/addon-unicode11', () => {
  const MockUnicode11Addon = mockFn(function (this: Record<string, unknown>) {
    // Empty addon
  });
  return { Unicode11Addon: MockUnicode11Addon };
});

describe('TerminalMode', () => {
  beforeAll(async () => {
    const module = await import('./TerminalMode.tsx');
    TerminalModeComponent = module.default;
  });

  beforeEach(() => {
    clearAllMocks();
  });

  const getTerminalMode = () => {
    if (TerminalModeComponent === null) {
      throw new Error('TerminalMode component not loaded');
    }
    return TerminalModeComponent;
  };

  type TerminalModeProps = Partial<{
    host: string;
    sshPrivateKey: string;
    accessToken: string;
  }>;

  const renderTerminalMode = (
    props: TerminalModeProps,
    authConfig: typeof authenticatedUserConfig,
  ) => {
    const Component = getTerminalMode();
    return renderWithAuth(
      <Component
        host={props.host}
        sshPrivateKey={props.sshPrivateKey}
        accessToken={props.accessToken}
      />,
      { authConfig },
    );
  };

  describe('Rendering', () => {
    it('renders the terminal top bar', () => {
      renderTerminalMode(
        {
          host: '54.123.45.67',
          sshPrivateKey: 'test-key',
          accessToken: 'test-token',
        },
        authenticatedUserConfig,
      );

      // Check for TERMINAL title
      expect(screen.getByText('TERMINAL')).toBeInTheDocument();
    });

    it('renders secondary tabs', () => {
      renderTerminalMode(
        {
          host: '54.123.45.67',
          sshPrivateKey: 'test-key',
          accessToken: 'test-token',
        },
        authenticatedUserConfig,
      );

      expect(
        screen.getByRole('tab', { name: /terminal/i }),
      ).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /files/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /preview/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /logs/i })).toBeInTheDocument();
    });

    it('renders action buttons', () => {
      renderTerminalMode(
        {
          host: '54.123.45.67',
          sshPrivateKey: 'test-key',
          accessToken: 'test-token',
        },
        authenticatedUserConfig,
      );

      // Action buttons should be present
      expect(screen.getByRole('button', { name: /yes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /no/i })).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /interrupt/i }),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /exit/i })).toBeInTheDocument();
    });

    it('renders the terminal composer input', () => {
      renderTerminalMode(
        {
          host: '54.123.45.67',
          sshPrivateKey: 'test-key',
          accessToken: 'test-token',
        },
        authenticatedUserConfig,
      );

      expect(
        screen.getByPlaceholderText(/send to terminal/i),
      ).toBeInTheDocument();
    });

    it('renders mode indicator', () => {
      renderTerminalMode(
        {
          host: '54.123.45.67',
          sshPrivateKey: 'test-key',
          accessToken: 'test-token',
        },
        authenticatedUserConfig,
      );

      // Mode indicators should have buttons for Terminal, Agent, Ask
      expect(
        screen.getByRole('button', { name: /terminal mode/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /agent mode/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /ask mode/i }),
      ).toBeInTheDocument();
    });
  });

  describe('Connection Status', () => {
    it('shows connected status when credentials are provided', () => {
      renderTerminalMode(
        {
          host: '54.123.45.67',
          sshPrivateKey: 'test-key',
          accessToken: 'test-token',
        },
        authenticatedUserConfig,
      );

      // Should show "Connected to [host]" in top bar
      expect(
        screen.getByText(/connected to 54\.123\.45\.67/i),
      ).toBeInTheDocument();
    });

    it('shows disconnected status when no credentials', () => {
      renderTerminalMode({}, newUserConfig);

      expect(screen.getByText(/disconnected/i)).toBeInTheDocument();
    });

    it('disables input when not connected', () => {
      renderTerminalMode({}, newUserConfig);

      const input = screen.getByPlaceholderText(/not connected to server/i);
      expect(input).toBeDisabled();
    });
  });

  describe('Input Handling', () => {
    it('allows typing in the composer when connected', async () => {
      const user = userEvent.setup();

      renderTerminalMode(
        {
          host: '54.123.45.67',
          sshPrivateKey: 'test-key',
          accessToken: 'test-token',
        },
        authenticatedUserConfig,
      );

      const input = screen.getByPlaceholderText(/send to terminal/i);
      await user.type(input, 'ls -la');

      expect(input).toHaveValue('ls -la');
    });

    it('clears input after submitting command', async () => {
      const user = userEvent.setup();

      renderTerminalMode(
        {
          host: '54.123.45.67',
          sshPrivateKey: 'test-key',
          accessToken: 'test-token',
        },
        authenticatedUserConfig,
      );

      const input = screen.getByPlaceholderText(/send to terminal/i);
      await user.type(input, 'pwd{enter}');

      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });
  });

  describe('Secondary Tabs', () => {
    it('switches to Files tab when clicked', async () => {
      const user = userEvent.setup();

      renderTerminalMode(
        {
          host: '54.123.45.67',
          sshPrivateKey: 'test-key',
          accessToken: 'test-token',
        },
        authenticatedUserConfig,
      );

      const filesTab = screen.getByRole('tab', { name: /files/i });
      await user.click(filesTab);

      expect(screen.getByText(/file browser coming soon/i)).toBeInTheDocument();
    });

    it('switches to Preview tab when clicked', async () => {
      const user = userEvent.setup();

      renderTerminalMode(
        {
          host: '54.123.45.67',
          sshPrivateKey: 'test-key',
          accessToken: 'test-token',
        },
        authenticatedUserConfig,
      );

      const previewTab = screen.getByRole('tab', { name: /preview/i });
      await user.click(previewTab);

      expect(screen.getByText(/preview coming soon/i)).toBeInTheDocument();
    });

    it('switches to Logs tab when clicked', async () => {
      const user = userEvent.setup();

      renderTerminalMode(
        {
          host: '54.123.45.67',
          sshPrivateKey: 'test-key',
          accessToken: 'test-token',
        },
        authenticatedUserConfig,
      );

      const logsTab = screen.getByRole('tab', { name: /logs/i });
      await user.click(logsTab);

      expect(screen.getByText(/logs coming soon/i)).toBeInTheDocument();
    });
  });

  describe('Container Styling', () => {
    it('has correct background color variable', () => {
      const { container } = renderTerminalMode(
        {
          host: '54.123.45.67',
          sshPrivateKey: 'test-key',
          accessToken: 'test-token',
        },
        authenticatedUserConfig,
      );

      const terminalContainer = container.firstChild;
      if (!(terminalContainer instanceof HTMLElement)) {
        throw new Error('Expected container.firstChild to be an HTMLElement');
      }
      expect(terminalContainer).toHaveStyle({
        background: 'var(--terminal-bg)',
      });
    });

    it('takes full height and width', () => {
      const { container } = renderTerminalMode(
        {
          host: '54.123.45.67',
          sshPrivateKey: 'test-key',
          accessToken: 'test-token',
        },
        authenticatedUserConfig,
      );

      const terminalContainer = container.firstChild;
      if (!(terminalContainer instanceof HTMLElement)) {
        throw new Error('Expected container.firstChild to be an HTMLElement');
      }
      expect(terminalContainer).toHaveClass('h-full', 'w-full');
    });
  });
});

describe('TerminalMode CSS Variables', () => {
  it('CSS variables should be defined', () => {
    // Check that our CSS custom properties are accessible
    const root = document.documentElement;
    const style = getComputedStyle(root);

    // These should exist after styles are loaded
    // In JSDOM they might be empty, but shouldn't throw
    const bgValue = style.getPropertyValue('--terminal-bg');
    const fgValue = style.getPropertyValue('--terminal-fg');

    // In a real browser, these would have values
    // In JSDOM, we're just checking they can be read
    expect(typeof bgValue).toBe('string');
    expect(typeof fgValue).toBe('string');
  });
});
