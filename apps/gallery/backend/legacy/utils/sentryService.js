// apps/gallery/backend/utils/sentryService.js
let Sentry = null;
let isInitialized = false;

/**
 * Initialize Sentry for Gallery Backend
 */
async function initSentry(dsn, environment = 'development', release = 'gallery-backend@1.0.0') {
    if (!dsn) return;
    try {
        Sentry = require('@sentry/node');
        Sentry.init({
            dsn,
            environment,
            release,
            tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
            ignoreErrors: ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET'],
            beforeSend(event) {
                if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_ENABLED) return null;
                event.tags = { ...event.tags, component: 'gallery-backend' };
                return event;
            }
        });
        isInitialized = true;
    } catch (error) {
        isInitialized = false;
        console.error('[Sentry] Failed to initialize:', error.message);
    }
}

function captureException(error, context = {}) {
    if (!isInitialized || !Sentry) return;
    try {
        if (Object.keys(context).length > 0) {
            Sentry.withScope((scope) => {
                Object.keys(context).forEach((key) => scope.setContext(key, context[key]));
                Sentry.captureException(error);
            });
        } else {
            Sentry.captureException(error);
        }
    } catch (err) {
        console.error('[Sentry] Failed to capture exception:', err.message);
    }
}

function captureMessage(message, level = 'info') {
    if (!isInitialized || !Sentry) return;
    try {
        Sentry.captureMessage(message, level);
    } catch (err) {
        console.error('[Sentry] Failed to capture message:', err.message);
    }
}

function setUser(user) {
    if (!isInitialized || !Sentry) return;
    try {
        Sentry.setUser(user ? { id: user.id || user.email, email: user.email, role: user.role } : null);
    } catch (err) {
        console.error('[Sentry] Failed to set user:', err.message);
    }
}

module.exports = {
    initSentry,
    captureException,
    captureMessage,
    setUser,
    getIsInitialized: () => isInitialized
};
