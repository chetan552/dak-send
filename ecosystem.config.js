module.exports = {
  apps: [
    {
      name: "daksend-web",
      script: "node",
      args: ".next/standalone/server.js",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
    {
      name: "daksend-worker",
      script: "npx",
      args: "tsx src/lib/worker.ts",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
