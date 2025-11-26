export function createTabSync(channelName) {
  let channel = null;
  let pollInterval = null;
  let lastChecked = Date.now();
  const createSyncChannel = () => {
    try {
      return new BroadcastChannel(channelName);
    } catch {
      console.warn(
        'BroadcastChannel not supported, falling back to localStorage',
      );
      return null;
    }
  };
  const isSyncMessage = (value) => {
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
  const cleanupLocalStorage = () => {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(channelName))
      .sort()
      .slice(0, -10)
      .forEach((key) => {
        localStorage.removeItem(key);
      });
  };
  const broadcast = (updates) => {
    const message = {
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
  const subscribe = (set) => {
    channel = createSyncChannel();
    if (channel) {
      channel.onmessage = (message) => {
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
            const parsed = JSON.parse(value);
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
  return (set) => {
    subscribe((state) => {
      set(state);
    });
    return (state) => {
      if (typeof state === 'function') {
        // For function updates, we need to let the set happen first to get the actual updates
        let updates;
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
