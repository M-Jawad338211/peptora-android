const isDev = typeof __DEV__ !== "undefined" ? __DEV__ : process.env.NODE_ENV !== "production";

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_LEVEL = isDev ? LEVELS.debug : LEVELS.warn;

function timestamp() {
  return new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
}

function log(level, tag, message, data) {
  if (!isDev || LEVELS[level] < MIN_LEVEL) return;
  const prefix = `[${timestamp()}] [${tag}]`;
  const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  if (data !== undefined) {
    fn(prefix, message, data);
  } else {
    fn(prefix, message);
  }
}

export const logger = {
  debug: (tag, msg, data) => log("debug", tag, msg, data),
  info: (tag, msg, data) => log("info", tag, msg, data),
  warn: (tag, msg, data) => log("warn", tag, msg, data),
  error: (tag, msg, data) => log("error", tag, msg, data),
};
