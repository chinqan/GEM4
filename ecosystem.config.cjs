module.exports = {
  apps: [
    {
      name: 'gem4',
      script: 'npx',
      args: 'vite preview --port 8188',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
