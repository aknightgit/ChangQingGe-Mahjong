const mysql = require('mysql2');
const conn = mysql.createConnection({
  host: '192.168.3.241',
  port: 33061,
  user: 'openclaw',
  password: '0penC1aw',
  database: 'openclaw'
});
conn.query(`SELECT model_name, SUM(request_count) as req, SUM(input_tokens) as inp, SUM(output_tokens) as outp 
FROM model_usage WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) 
GROUP BY model_name ORDER BY req DESC LIMIT 10`, (e, r) => {
  if(e) { console.error(e.message); } else { console.log(JSON.stringify(r)); }
  conn.end();
});