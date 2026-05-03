module.exports = {
  apps: [
    {
      name: "furkanunsalan",
      script: "server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        HOSTNAME: "127.0.0.1",
        PORT: "3010",
      },
      env_file: ".env.production",
      max_memory_restart: "512M",
    },
  ],
};
