/**
 * SpendWise 同步服务 - 轻量 HTTP API
 * 运行在 OpenClaw 服务器上，代理 Android 设备与 MongoDB 之间的数据同步
 * 
 * 启动: node spendwise-sync-server.js
 */

import { MongoClient } from 'mongodb';
import http from 'http';

const MONGO_URI = 'mongodb://admin:$$9myHome@192.168.3.241:27017/?authSource=admin';
const DB_NAME = 'SpendWise';
const COLLECTION_NAME = 'transactions';
const PORT = 3002;

let client = null;
let collection = null;

async function initMongo() {
  try {
    client = new MongoClient(MONGO_URI);
    await client.connect();
    collection = client.db(DB_NAME).collection(COLLECTION_NAME);
    console.log('[MongoDB] Connected');
  } catch (err) {
    console.error('[MongoDB] Connection failed:', err.message);
    process.exit(1);
  }
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    // GET /transactions - 获取所有交易
    if (req.method === 'GET' && req.url === '/transactions') {
      const docs = await collection.find({}).toArray();
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, data: docs }));
      return;
    }
    
    // POST /transactions/upsert - 插入或更新单条
    if (req.method === 'POST' && req.url === '/transactions/upsert') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        const doc = JSON.parse(body);
        const filter = { localId: doc.localId };
        await collection.replaceOne(filter, doc, { upsert: true });
        res.writeHead(200);
        res.end(JSON.stringify({ success: true }));
      });
      return;
    }
    
    // POST /transactions/batch - 批量插入/更新
    if (req.method === 'POST' && req.url === '/transactions/batch') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        const docs = JSON.parse(body);
        let count = 0;
        for (const doc of docs) {
          await collection.replaceOne({ localId: doc.localId }, doc, { upsert: true });
          count++;
        }
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, count }));
      });
      return;
    }
    
    // DELETE /transactions - 清空所有
    if (req.method === 'DELETE' && req.url === '/transactions') {
      const countBefore = await collection.countDocuments();
      await collection.deleteMany({});
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, deleted: countBefore }));
      return;
    }
    
    // GET /ping - 健康检查
    if (req.method === 'GET' && req.url === '/ping') {
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, status: 'ok' }));
      return;
    }
    
    res.writeHead(404);
    res.end(JSON.stringify({ success: false, message: 'Not found' }));
  } catch (err) {
    console.error('[Error]', err.message);
    res.writeHead(500);
    res.end(JSON.stringify({ success: false, message: err.message }));
  }
});

initMongo().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[HTTP] Server running on port ${PORT}`);
  });
});
