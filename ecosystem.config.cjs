module.exports = {
  apps: [
    {
      name: 'gem4',
      script: 'npx',
      args: 'vite preview --host 0.0.0.0 --port 7860',
      cwd: './',
      env: {
        NODE_ENV: 'production'
      },
    },
  ],
};
