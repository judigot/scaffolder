import type { IRepository } from '@/components/AI/chat-app/types.ts';

/**
 * NOTE: In production, repositories should be stored in Auth0 user_metadata
 * under a key like `repositories` containing an array of { repoUrl, addedAt }
 * 
 * Example user_metadata structure:
 * {
 *   repositories: [
 *     { repoUrl: "https://github.com/owner/repo1", addedAt: "2026-01-20T10:00:00Z" },
 *     { repoUrl: "https://github.com/owner/repo2", addedAt: "2026-01-25T14:30:00Z" }
 *   ]
 * }
 * 
 * The app would then fetch each repo's files on-demand using useUserFiles hook.
 * Chats, sprints, and messages would be stored separately (likely in a database).
 */

export const mockRepositories: IRepository[] = [
  {
    id: 'repo-demo',
    name: 'acme-platform',
    path: '~/projects/acme-platform',
    repoUrl: 'https://github.com/vercel/next.js',
    sprints: [
      // Active sprint with multiple chats in various states
      {
        id: 'sprint-1',
        name: 'Sprint 12: User Dashboard',
        status: 'active',
        createdAt: new Date('2026-01-20T09:00:00'),
        updatedAt: new Date('2026-01-27T16:45:00'),
        chats: [
          {
            id: 'chat-s1-1',
            title: 'Dashboard layout grid',
            description: 'Responsive grid system for dashboard widgets',
            createdAt: new Date('2026-01-20T10:00:00'),
            updatedAt: new Date('2026-01-27T14:30:00'),
            prStatus: 'ready',
            prUrl: 'https://github.com/acme/platform/pull/142',
            messages: [
              {
                id: 'msg-1',
                role: 'user',
                content: 'Create a responsive dashboard layout with a 12-column grid. It should support widgets of different sizes (1x1, 2x1, 2x2, etc.) and reflow on mobile.',
                timestamp: new Date('2026-01-20T10:00:00'),
              },
              {
                id: 'msg-2',
                role: 'assistant',
                content: 'I\'ve created a responsive grid system using CSS Grid with the following features:\n\n- 12-column layout on desktop\n- 6-column on tablet\n- 2-column on mobile\n- Widget size classes: `widget-sm`, `widget-md`, `widget-lg`, `widget-xl`\n- Auto-placement with dense packing\n- Drag-and-drop reordering support\n\nThe implementation is in `src/components/Dashboard/DashboardGrid.tsx`.',
                timestamp: new Date('2026-01-20T10:05:00'),
              },
              {
                id: 'msg-3',
                role: 'user',
                content: 'Add smooth animations when widgets are reordered',
                timestamp: new Date('2026-01-22T09:15:00'),
              },
              {
                id: 'msg-4',
                role: 'assistant',
                content: 'Added CSS transitions for widget reordering:\n\n- 300ms ease-out transition for position changes\n- Scale effect on drag start (1.02x)\n- Shadow elevation during drag\n- Placeholder animation for drop target\n\nAlso added `prefers-reduced-motion` support for accessibility.',
                timestamp: new Date('2026-01-22T09:20:00'),
              },
            ],
          },
          {
            id: 'chat-s1-2',
            title: 'Analytics widget',
            description: 'Real-time analytics chart component',
            createdAt: new Date('2026-01-21T11:00:00'),
            updatedAt: new Date('2026-01-26T17:00:00'),
            prStatus: 'draft',
            messages: [
              {
                id: 'msg-5',
                role: 'user',
                content: 'Build an analytics widget that shows real-time visitor count with a sparkline chart',
                timestamp: new Date('2026-01-21T11:00:00'),
              },
              {
                id: 'msg-6',
                role: 'assistant',
                content: 'Created the AnalyticsWidget component with:\n\n- Real-time visitor count with WebSocket updates\n- 24-hour sparkline using lightweight canvas rendering\n- Trend indicator (up/down arrow with percentage)\n- Loading skeleton state\n- Error boundary with retry button\n\nThe widget auto-reconnects on connection loss.',
                timestamp: new Date('2026-01-21T11:08:00'),
              },
            ],
          },
          {
            id: 'chat-s1-3',
            title: 'User activity feed',
            description: 'Recent activity timeline component',
            createdAt: new Date('2026-01-23T14:00:00'),
            updatedAt: new Date('2026-01-27T16:45:00'),
            prStatus: 'draft',
            messages: [
              {
                id: 'msg-7',
                role: 'user',
                content: 'Create an activity feed widget showing recent user actions with infinite scroll',
                timestamp: new Date('2026-01-23T14:00:00'),
              },
              {
                id: 'msg-8',
                role: 'assistant',
                content: 'Implemented ActivityFeed component:\n\n- Virtualized list for performance (renders only visible items)\n- Infinite scroll with intersection observer\n- Activity types: login, purchase, comment, share, follow\n- Relative timestamps ("2 minutes ago")\n- User avatar with fallback initials\n- Filter by activity type\n\nCurrently working on the "mark all as read" feature.',
                timestamp: new Date('2026-01-23T14:12:00'),
              },
            ],
          },
        ],
      },
      // Planned sprint
      {
        id: 'sprint-2',
        name: 'Sprint 13: Notifications System',
        status: 'planned',
        createdAt: new Date('2026-01-25T08:00:00'),
        updatedAt: new Date('2026-01-27T10:00:00'),
        chats: [
          {
            id: 'chat-s2-1',
            title: 'Push notification service',
            description: 'FCM integration for web push',
            createdAt: new Date('2026-01-25T09:00:00'),
            updatedAt: new Date('2026-01-25T09:00:00'),
            prStatus: 'draft',
            messages: [
              {
                id: 'msg-9',
                role: 'user',
                content: 'Set up Firebase Cloud Messaging for web push notifications. Need service worker, permission flow, and token management.',
                timestamp: new Date('2026-01-25T09:00:00'),
              },
            ],
          },
          {
            id: 'chat-s2-2',
            title: 'Notification preferences UI',
            description: 'User settings for notification types',
            createdAt: new Date('2026-01-26T10:30:00'),
            updatedAt: new Date('2026-01-26T10:30:00'),
            prStatus: 'draft',
            messages: [],
          },
        ],
      },
      // Completed sprint
      {
        id: 'sprint-3',
        name: 'Sprint 11: Authentication',
        status: 'done',
        createdAt: new Date('2026-01-06T09:00:00'),
        updatedAt: new Date('2026-01-19T18:00:00'),
        chats: [
          {
            id: 'chat-s3-1',
            title: 'OAuth2 social login',
            description: 'Google, GitHub, and Twitter login',
            createdAt: new Date('2026-01-06T10:00:00'),
            updatedAt: new Date('2026-01-12T16:00:00'),
            prStatus: 'ready',
            prUrl: 'https://github.com/acme/platform/pull/128',
            messages: [
              {
                id: 'msg-10',
                role: 'user',
                content: 'Implement OAuth2 social login with Google, GitHub, and Twitter providers',
                timestamp: new Date('2026-01-06T10:00:00'),
              },
              {
                id: 'msg-11',
                role: 'assistant',
                content: 'OAuth2 implementation complete:\n\n- NextAuth.js integration\n- Google, GitHub, Twitter providers configured\n- Account linking for existing users\n- Profile picture sync\n- Secure token storage with HTTP-only cookies\n- CSRF protection enabled\n\nAll providers tested and working.',
                timestamp: new Date('2026-01-06T10:30:00'),
              },
            ],
          },
          {
            id: 'chat-s3-2',
            title: 'Two-factor authentication',
            description: 'TOTP-based 2FA with recovery codes',
            createdAt: new Date('2026-01-10T09:00:00'),
            updatedAt: new Date('2026-01-15T14:00:00'),
            prStatus: 'ready',
            prUrl: 'https://github.com/acme/platform/pull/135',
            messages: [
              {
                id: 'msg-12',
                role: 'user',
                content: 'Add two-factor authentication using TOTP (Google Authenticator compatible)',
                timestamp: new Date('2026-01-10T09:00:00'),
              },
              {
                id: 'msg-13',
                role: 'assistant',
                content: 'Implemented TOTP-based 2FA:\n\n- QR code setup flow\n- Manual key entry option\n- 6-digit verification\n- 10 recovery codes generated on setup\n- Remember device for 30 days option\n- Backup codes downloadable as PDF\n\nSecurity: Rate limiting on verification attempts.',
                timestamp: new Date('2026-01-10T09:45:00'),
              },
            ],
          },
        ],
      },
    ],
    // Regular chats (not part of any sprint) - quick fixes, experiments, questions
    chats: [
      {
        id: 'chat-r1',
        title: 'Fix: Memory leak in useInterval',
        description: 'Investigate and fix memory leak reported in production',
        createdAt: new Date('2026-01-27T08:30:00'),
        updatedAt: new Date('2026-01-27T09:15:00'),
        prStatus: 'ready',
        prUrl: 'https://github.com/acme/platform/pull/156',
        messages: [
          {
            id: 'msg-14',
            role: 'user',
            content: 'There\'s a memory leak in production. Memory usage keeps growing over time. Users are reporting the tab becomes unresponsive after a few hours.',
            timestamp: new Date('2026-01-27T08:30:00'),
          },
          {
            id: 'msg-15',
            role: 'assistant',
            content: 'Found the issue! The `useInterval` hook in `src/hooks/useInterval.ts` wasn\'t cleaning up properly:\n\n**Problem:**\n```ts\nuseEffect(() => {\n  const id = setInterval(callback, delay);\n  // Missing cleanup!\n});\n```\n\n**Fix:**\n```ts\nuseEffect(() => {\n  const id = setInterval(callback, delay);\n  return () => clearInterval(id);\n}, [callback, delay]);\n```\n\nAlso found 3 components using `setInterval` directly without cleanup. Fixed all of them.',
            timestamp: new Date('2026-01-27T08:45:00'),
          },
          {
            id: 'msg-16',
            role: 'user',
            content: 'Great catch! Can you also add a test for this?',
            timestamp: new Date('2026-01-27T09:00:00'),
          },
          {
            id: 'msg-17',
            role: 'assistant',
            content: 'Added test in `src/hooks/__tests__/useInterval.test.ts`:\n\n- Verifies interval starts on mount\n- Verifies cleanup on unmount\n- Verifies callback updates without restarting interval\n- Verifies delay changes restart the interval\n\nAll tests passing. PR is ready for review.',
            timestamp: new Date('2026-01-27T09:15:00'),
          },
        ],
      },
      {
        id: 'chat-r2',
        title: 'Experiment: Dark mode colors',
        description: 'Testing new color palette for dark mode',
        createdAt: new Date('2026-01-26T15:00:00'),
        updatedAt: new Date('2026-01-26T16:30:00'),
        prStatus: null, // Not promoted to PR yet
        messages: [
          {
            id: 'msg-18',
            role: 'user',
            content: 'I want to experiment with a new dark mode color palette. The current one feels too flat. Can you suggest something with more depth?',
            timestamp: new Date('2026-01-26T15:00:00'),
          },
          {
            id: 'msg-19',
            role: 'assistant',
            content: 'Here\'s a new palette with more depth using subtle gradients and layered surfaces:\n\n**Background layers:**\n- Base: `#0a0a0b` (near black)\n- Surface 1: `#121214` (cards)\n- Surface 2: `#1a1a1e` (elevated cards)\n- Surface 3: `#222228` (modals)\n\n**Accent colors:**\n- Primary: `#6366f1` → `#818cf8` (gradient)\n- Success: `#10b981`\n- Warning: `#f59e0b`\n- Danger: `#ef4444`\n\n**Text:**\n- Primary: `#fafafa`\n- Secondary: `#a1a1aa`\n- Muted: `#71717a`\n\nI\'ve created a preview in `src/styles/themes/dark-v2.css`. Want me to apply it?',
            timestamp: new Date('2026-01-26T15:20:00'),
          },
          {
            id: 'msg-20',
            role: 'user',
            content: 'Yes, apply it but keep the old theme as a fallback',
            timestamp: new Date('2026-01-26T16:00:00'),
          },
          {
            id: 'msg-21',
            role: 'assistant',
            content: 'Done! Added theme switcher with three options:\n\n1. **Light** - Original light theme\n2. **Dark (Classic)** - Original dark theme\n3. **Dark (Depth)** - New dark theme\n\nUsers can switch in Settings → Appearance. The preference is stored in localStorage and synced to user profile if logged in.\n\nLet me know if you want to promote this to a sprint feature or keep experimenting.',
            timestamp: new Date('2026-01-26T16:30:00'),
          },
        ],
      },
      {
        id: 'chat-r3',
        title: 'Question: Best caching strategy?',
        description: 'Architecture discussion about API caching',
        createdAt: new Date('2026-01-25T11:00:00'),
        updatedAt: new Date('2026-01-25T11:45:00'),
        prStatus: null,
        messages: [
          {
            id: 'msg-22',
            role: 'user',
            content: 'What\'s the best caching strategy for our API? We have a mix of frequently changing data (user feed) and rarely changing data (user profile, settings).',
            timestamp: new Date('2026-01-25T11:00:00'),
          },
          {
            id: 'msg-23',
            role: 'assistant',
            content: 'Here\'s a recommended caching strategy:\n\n**Rarely changing data (profile, settings):**\n- Cache-Control: `max-age=3600, stale-while-revalidate=86400`\n- React Query: `staleTime: 5min, gcTime: 30min`\n- Invalidate on user action (update profile, change settings)\n\n**Frequently changing data (feed, notifications):**\n- Cache-Control: `max-age=0, must-revalidate`\n- React Query: `staleTime: 0, refetchInterval: 30s`\n- Consider WebSocket for real-time updates\n\n**Static assets:**\n- Cache-Control: `max-age=31536000, immutable`\n- Content-hash in filenames\n\n**API responses:**\n- Use ETags for conditional requests\n- Implement pagination cursors (not offsets)\n\nWant me to implement this?',
            timestamp: new Date('2026-01-25T11:45:00'),
          },
        ],
      },
      {
        id: 'chat-r4',
        title: 'Refactor: Extract form validation',
        description: 'DRY up form validation logic across the app',
        createdAt: new Date('2026-01-24T13:00:00'),
        updatedAt: new Date('2026-01-24T15:30:00'),
        prStatus: 'draft',
        messages: [
          {
            id: 'msg-24',
            role: 'user',
            content: 'We have duplicate form validation logic in multiple components. Can you extract it into reusable validators?',
            timestamp: new Date('2026-01-24T13:00:00'),
          },
          {
            id: 'msg-25',
            role: 'assistant',
            content: 'Created a validation library in `src/lib/validation/`:\n\n**Validators:**\n- `email(value)` - RFC 5322 compliant\n- `password(value, options)` - Strength requirements\n- `url(value)` - Valid URL format\n- `phone(value, country)` - E.164 format\n- `required(value)` - Non-empty check\n- `minLength(value, min)` / `maxLength(value, max)`\n- `pattern(value, regex, message)`\n\n**Composable:**\n```ts\nconst validateEmail = compose(\n  required("Email is required"),\n  email("Invalid email format")\n);\n```\n\n**React Hook:**\n```ts\nconst { errors, validate } = useValidation({\n  email: [required(), email()],\n  password: [required(), password({ minLength: 8 })]\n});\n```\n\nRefactored 12 forms to use the new system. PR ready for review.',
            timestamp: new Date('2026-01-24T15:30:00'),
          },
        ],
      },
    ],
  },
];
