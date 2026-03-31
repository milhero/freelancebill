module.exports = {
  apps: [{
    name: 'freelancebill-api',
    script: 'packages/server/dist/index.js',
    cwd: '/var/www/freelancebill',
    user: 'freelancebill',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    max_memory_restart: '256M',
    instances: 1,
    autorestart: true,
    watch: false,
    error_file: '/var/log/freelancebill/error.log',
    out_file: '/var/log/freelancebill/out.log',
  }],
};
