/**
 * WebSocket Worker (Rule 08: Performance Hardening)
 * 
 * Handles heavy WebSocket message parsing and processing off the main UI thread.
 */

self.onmessage = (event: MessageEvent) => {
    const { type, data } = event.data;

    if (type === 'PARSE_MESSAGE') {
        try {
            const parsed = JSON.parse(data);

            // Perform any heavy processing here (e.g., data normalization, filtering)
            // For now, we just pass it back

            self.postMessage({
                type: 'MESSAGE_PARSED',
                payload: parsed
            });
        } catch (_error) {
            self.postMessage({
                type: 'ERROR',
                error: 'Failed to parse message'
            });
        }
    }
};

export { };
