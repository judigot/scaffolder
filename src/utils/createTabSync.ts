interface ISyncMessage<T> {
  type: 'STATE_UPDATE';
  payload: Partial<T>;
}

export function createTabSync<T extends Record<PropertyKey, unknown>>(
  channelName: string,
) {
  let channel: BroadcastChannel | null = null;
  let pollInterval: number | null = null;
  let lastChecked = Date.now();

  const createSyncChannel = (): BroadcastChannel | null => {
    try {
      return new BroadcastChannel(channelName);
    } catch {
      console.warn(
        'BroadcastChannel not supported, falling back to localStorage',
      );
      return null;
    }
  };

  const isSyncMessage = (value: unknown): value is ISyncMessage<T> => {
    return (
      typeof value === 'object' &&
      value !== null &&
      'type' in value &&
      value.type === 'STATE_UPDATE' &&
      'payload' in value &&
      typeof value.payload === 'object' &&
      value.payload !== null
    );
  };

  const cleanupLocalStorage = (): void => {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(channelName))
      .sort()
      .slice(0, -10)
      .forEach((key) => {
        localStorage.removeItem(key);
      });
  };

  const broadcast = (updates: Partial<T>): void => {
    const message: ISyncMessage<T> = {
      type: 'STATE_UPDATE',
      payload: updates,
    };

    if (channel) {
      channel.postMessage(message);
    } else {
      const timestamp = Date.now();
      localStorage.setItem(
        `${channelName}-${String(timestamp)}`,
        JSON.stringify(message),
      );
      cleanupLocalStorage();
    }
  };

  const subscribe = (set: (state: Partial<T>) => void): void => {
    channel = createSyncChannel();

    if (channel) {
      channel.onmessage = (message: MessageEvent<ISyncMessage<T>>) => {
        set(message.data.payload);
      };
      return;
    }

    pollInterval = window.setInterval(() => {
      const currentTime = Date.now();
      Object.entries(localStorage)
        .filter(([key, value]) => {
          const timestamp = parseInt(key.replace(`${channelName}-`, ''), 10);
          return (
            key.startsWith(channelName) &&
            timestamp > lastChecked &&
            value !== null &&
            value !== ''
          );
        })
        .forEach(([, value]) => {
          if (typeof value !== 'string') {
            return;
          }
          try {
            const parsed: unknown = JSON.parse(value);
            if (isSyncMessage(parsed)) {
              set(parsed.payload);
            }
          } catch (error) {
            console.error('Error parsing sync message:', error);
          }
        });
      lastChecked = currentTime;
    }, 1000);

    window.addEventListener('unload', () => {
      if (pollInterval !== null) {
        clearInterval(pollInterval);
      }
      if (channel) {
        channel.close();
      }
    });
  };

  return (set: {
    (
      partial: T | Partial<T> | ((state: T) => T | Partial<T>),
      replace?: false,
    ): void;
    (state: T | ((state: T) => T), replace: true): void;
  }) => {
    subscribe((state) => {
      set(state);
    });

    return (state: T | Partial<T> | ((state: T) => T | Partial<T>)) => {
      if (typeof state === 'function') {
        // For function updates, we need to let the set happen first to get the actual updates
        let updates: Partial<T> | undefined;
        set((currentState) => {
          const result = state(currentState);
          updates = result;
          return result;
        });
        if (updates) {
          broadcast(updates);
        }
      } else {
        set(state);
        broadcast(state);
      }
    };
  };
}
