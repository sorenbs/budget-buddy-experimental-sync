const exclusionList = require('metro-config/src/defaults/exclusionList');

const { getDefaultConfig } = require("expo/metro-config");

const defaultConfig = getDefaultConfig(__dirname);

defaultConfig.resolver.assetExts.push("db");

defaultConfig.resolver.blockList = exclusionList([/server\/dbs\/.*/])

module.exports = defaultConfig;
