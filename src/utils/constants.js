/**
 * Application Constants
 */

module.exports = {
    // Reconnection settings
    MAX_RECONNECT_ATTEMPTS: 5,
    BASE_BACKOFF_DELAY_MS: 2000,
    MAX_BACKOFF_DELAY_MS: 60000,
    JOIN_RETRY_ATTEMPTS: 3,
    JOIN_RETRY_DELAY_MS: 5000,
    
    // Timing
    CONFIG_RELOAD_DELAY_MS: 2000,
    CHANNEL_SWITCH_DELAY_MS: 2000,
    LOG_CLEANUP_INTERVAL_MS: 24 * 60 * 60 * 1000, // 24 hours
    
    // Default settings
    DEFAULT_LOG_RETENTION_DAYS: 7,
    
    // Discord channel types
    VOICE_CHANNEL_TYPES: ['GUILD_VOICE', 2],
    
    // Token labels
    TOKEN_LABELS: {
        MAIN: 'MAIN',
        SECOND: 'SECOND',
        LEGACY: 'LEGACY'
    }
};
