/**
 * Discord Self-Bot Voice
 * Entry point for the application
 * 
 * This bot maintains persistent voice channel connections with multi-account support.
 * See README.md for configuration and usage instructions.
 */

require('dotenv').config();
const { start } = require('./src/app');

// Start the application
start();