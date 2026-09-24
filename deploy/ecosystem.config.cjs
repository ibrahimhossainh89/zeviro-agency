// PM2 process file:  pm2 start deploy/ecosystem.config.cjs  &&  pm2 save  &&  pm2 startup
module.exports = {
  apps: [
    {
      name: 'zeviro',
      cwd: __dirname + '/../server',
      script: 'src/index.js',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '600M',
      time: true,
    },
  ],
};
