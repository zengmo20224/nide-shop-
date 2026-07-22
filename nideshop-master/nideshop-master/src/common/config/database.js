const mysql = require('think-model-mysql');

module.exports = {
  handle: mysql,
  database: process.env.DB_NAME || 'nideshop',
  prefix: 'nideshop_',
  encoding: 'utf8mb4',
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || '3306',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'root',
  dateStrings: true
};
