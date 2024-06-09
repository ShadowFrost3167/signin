require('dotenv').config();

const {Pool} = require("pg");

const isProduction = process.env.NODE_ENV === "production";

const connectionString = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`;

// const pool = new Pool({
//     connectionString: isProduction ? process.env.DATABASE_URL : connectionString,
//     ssl: isProduction ? { rejectUnauthorized: false } : false,
//     idleTimeoutMillis: 30000, // 30 seconds
//     connection: {
//     options: `project=${process.env.ENDPOINT_ID}`,
//   },
//     connectionTimeoutMillis: 2000, // 2 seconds
// });

// module.exports = {pool};


const pool = new Pool({
    host: PGHOST,
    database: PGDATABASE,
    username: PGUSER,
    password: PGPASSWORD,
    port: 5432,
    ssl: {
      require: true,
    },
  });

  
  async function getPgVersion() {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT version()');
      console.log(result.rows[0]);
    } finally {
      client.release();
    }
  }
  getPgVersion();
