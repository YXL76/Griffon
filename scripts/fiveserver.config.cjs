// @ts-check

/**@type {import('./five-server').LiveServerParams}*/
const config = {
  browser: "google-chrome-unstable",
  cors: false,
  host: "localhost",
  logLevel: 0,
  middleware: [
    (_req, res, next) => {
      res.header("Cross-Origin-Opener-Policy", "same-origin");
      res.header("Cross-Origin-Embedder-Policy", "require-corp");
      next();
    },
  ],
  injectBody: false,
};

module.exports = config;
