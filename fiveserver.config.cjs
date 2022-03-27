// @ts-check

/**@type {import('./scripts/five-server').LiveServerParams}*/
const config = {
  browser: "google-chrome-unstable",
  cors: false,
  host: "localhost",
  logLevel: 0,
  middleware: [
    (_req, res, next) => {
      res.header("Cross-Origin-Opener-Policy", "same-origin");
      res.header("Cross-Origin-Embedder-Policy", "require-corp");
      res.header("Service-Worker-Allowed", "/");
      next();
    },
  ],
  injectBody: false,
  root: "dist",
};

module.exports = config;
