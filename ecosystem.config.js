module.exports = {
  apps: [
    {
      name: "clouddrive-server",
      script: "index.js",
      cwd: "d:\\web-projectttttttttttt\\server",
      watch: true,
      ignore_watch: ["node_modules", "data", "uploads"]
    },
    {
      name: "clouddrive-client",
      script: "node_modules/vite/bin/vite.js",
      cwd: "d:\\web-projectttttttttttt\\client",
      watch: false,
      env: {
        NODE_ENV: "development"
      }
    }
  ]
};
