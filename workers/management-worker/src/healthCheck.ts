import http from 'http';
import { logger } from "@clickflash/logger";

const options = {
    hostname: 'localhost',
    port: 8092,
    path: '/api/health',
    method: 'GET'
};

const req = http.request(options, (res) => {
    logger.info(String(`STATUS: ${res.statusCode}`));
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        logger.info(String(`BODY: ${chunk}`));
    });
});

req.on('error', (e) => {
    logger.error(String(`problem with request: ${e.message}`));
});

req.end();
