const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const { pool } = require('../../config/db');

const store = new MySQLStore(
  {
    createDatabaseTable: true,
    schema: {
      tableName: 'sessions',
      columnNames: { session_id: 'session_id', expires: 'expires', data: 'data' }
    }
  },
  pool
);

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'change_this_secret',
  store,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    // secure: true, // bật khi dùng HTTPS
    maxAge: 1000 * 60 * 60 * 8  /// 8 giờ
  }
});

module.exports = { sessionMiddleware, store };
