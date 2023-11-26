const mysql = require('mysql2');
require('custom-env').env();

const pool = mysql.createPool({
  host: process.env.HOST_HOST,
  user: process.env.HOST_USER,
  password: process.env.HOST_PASS,
  database: process.env.HOST_DB,
  port: process.env.HOST_DB_PORT,
  timezone: '+00:00',
  charset: 'utf8mb4',
  dateStrings: ['DATE', 'DATETIME'],
  typeCast: (field, next) => { // Para hacer el parseo a JSON automáticamente
    if (field.type.includes('BLOB')) { // && field.length == 4294967295
      let value;
      try {
        value = field.string();
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    }
    return next();
  }
});

const testConnectionDB = () => {
  return new Promise((resolve, reject) => {
    // Todo: Esto cambiarlo por un usuario con menos privilegios
    pool.query('CALL USP_TEST_CONNECTION()', function (err, results) {
      if (err) {
        return reject(err);
      }
      return resolve(results[0].solution);
    });
  })
}

const queryDB = (sql, args) => {
  return new Promise((resolve, reject) => {
    pool.getConnection(function (err, connection) {
      if (err) {
        return reject(err)
      }
      // Use the connection
      connection.query(sql, args, function (err, results, fields) {
        // When done with the connection, release it.
        connection.release();
        // Handle error after the release.
        if (err) {
          return reject(err);
        }
        return resolve(results, fields);
      });
    });
  })
}

const endPool = () => {
  return new Promise((resolve, reject) => {
    pool.end(function (err) {
      if (err) {
        return reject(err);
      }
      return resolve();
    });
  });
}

module.exports = {
  pool,
  testConnectionDB,
  endPool,
  queryDB
};