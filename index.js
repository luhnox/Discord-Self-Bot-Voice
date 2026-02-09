/**
 * Discord Self-Bot Voice
 * Entry point for the application
 * 
 * This bot maintains persistent voice channel connections with multi-account support.
 * Configuration is now handled through config.json instead of .env
 * See README.md for configuration and usage instructions.
 */

// Load .env if it exists (optional)
try {
    require('dotenv').config();
} catch (e) {
    // dotenv not required
}

const { start } = require('./src/app');

// Start the application
start();