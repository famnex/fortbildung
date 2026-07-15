module.exports = {
  apps: [
    {
      name: 'fortbildung',
      script: 'app.js',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3018
      }
    }
  ]
};
