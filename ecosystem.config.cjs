module.exports = {
  apps: [
    {
      name: 'gem4',
      script: 'npx',
      args: 'vite preview --host 0.0.0.0 --port 8188',
      cwd: './',
      env: {
        NODE_ENV: 'production'
      },
    },
  ],
};
