const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// FIX: Limit workers to prevent OOM/Crash on Windows during build
config.maxWorkers = 1;

module.exports = config;
