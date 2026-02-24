// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Exclude the Firebase Cloud Functions folder from the mobile bundle.
// functions/ is server-side Node.js code and must never be bundled into the app.
config.resolver.blockList = [
  new RegExp(path.resolve(__dirname, 'functions') + '/.*'),
];

module.exports = config;
