const mysql = require('mysql2');
const conn = mysql.createConnection({
  host: '192.168.3.241',
  port: 33061,
  user: 'openclaw',
  password: '0penC1aw',
  database: 'openclaw'
});
conn.query(`SELECT model, SUM(input_tokens) as inp, SUM(output_tokens) as outp, SUM(cache_read_tokens) as cached, SUM(cost_total) as cost
FROM model_usage WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY) 
GROUP BY model ORDER BY inp DESC LIMIT 10`, (e, r) => {
  if(e) { console.error(e.message); } else { console.log(JSON.stringify(r)); }
  conn.end();
});