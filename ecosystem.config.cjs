const { config } = require('dotenv');
const path = require('path');
config({ path: path.resolve(__dirname, '.env') });

module.exports = {
  apps: [{
    name: 'mahjong',
    script: '.output/server/index.mjs',
    cwd: __dirname,
    env: {
      PORT: process.env.PORT || '8899',
      MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017',
      MONGODB_DB: process.env.MONGODB_DB || 'changqingge',
      REDIS_URL: process.env.REDIS_URL || '',
      DEVICE_LOG: process.env.DEVICE_LOG || 'true'
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
