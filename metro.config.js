const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

const localStatePath = path.join(__dirname, ".local", "state");
const escapeForRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

config.resolver = {
  ...config.resolver,
  blockList: [
    new RegExp(`^${escapeForRegex(localStatePath)}.*`),
  ],
};

module.exports = config;
