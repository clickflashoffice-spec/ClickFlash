import { logger } from '@/utils/logger';

const http = require('http');
const fs = require('fs');

const data = JSON.stringify({
  albumId: "test-album-001",
  title: "Test Photo Node Verified",
  url: "test_node.jpg",
  isFavorite: true,
  tinyUrl: "tiny_node.jpg",
  quality_flags: []
});

const cookies = fs.readFileSync('e:/ClickFlash/apps/master/cookies.txt', 'utf8');
const sessionMatch = cookies.match(/connect\.sid=([^; \n\r]+)/);
if (!sessionMatch) {
  logger.error("No connect.sid found in cookies.txt");
  process.exit(1);
}
const sessionCookie = `connect.sid=${sessionMatch[1]}`;

const options = {
  hostname: 'localhost',
  port: 8090,
  path: '/api/collections/photos/records',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'Cookie': sessionCookie
  }
};

const req = http.request(options, (res) => {
  logger.info(`Status: ${res.statusCode}`);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    logger.info(`Body: ${chunk}`);
  });
});

req.on('error', (e) => {
  logger.error(`Problem with request: ${e.message}`);
});

req.write(data);
req.end();
