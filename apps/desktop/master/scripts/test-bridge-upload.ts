import http from "http";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const logger = console; // Minimal logger for standard script

async function testBridgeUpload() {
    const BRIDGE_HOST = "localhost";
    const BRIDGE_PORT = 8090;
    const BRIDGE_PSK = "default_bridge_token_123";

    // 1. Check Status
    logger.info("📡 Checking Bridge Status...");
    try {
        const statusReq = http.request({
            hostname: BRIDGE_HOST,
            port: BRIDGE_PORT,
            path: "/api/bridge/status",
            method: "GET",
            headers: { Authorization: `Bearer ${BRIDGE_PSK}` }
        }, (res) => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => {
                logger.info(`✅ Bridge Status [${res.statusCode}]: ${data}`);
                uploadTestPhoto();
            });
        });
        statusReq.on("error", (err) => logger.error(`❌ Status Error: ${err.message}`));
        statusReq.end();
    } catch (e) {
        logger.error(`❌ Failed to check status: ${e}`);
    }

    function uploadTestPhoto() {
        const testImagePath = path.join(__dirname, "test-dslr-shot.jpg");
        if (!fs.existsSync(testImagePath)) {
            // Create dummy JPEG
            const dummyJpeg = Buffer.from("ffd8ffe000104a46494600010101006000600000ffe1001645786966000049492a0008000000000000000000" + crypto.randomBytes(100).toString('hex'), "hex");
            fs.writeFileSync(testImagePath, dummyJpeg);
        }

        logger.info(`📸 Sending simulated DSLR shot via Mobile Bridge...`);
        const boundary = "----WebKitFormBoundary" + crypto.randomBytes(16).toString("hex");
        
        const photoData = fs.readFileSync(testImagePath);
        const photographerId = "mobile_test_user";
        const albumId = "test_bridge_album_01";

        const CRLF = "\r\n";
        
        // Build multipart body
        const parts = [
            `--${boundary}${CRLF}Content-Disposition: form-data; name="photographerId"${CRLF}${CRLF}${photographerId}${CRLF}`,
            `--${boundary}${CRLF}Content-Disposition: form-data; name="albumId"${CRLF}${CRLF}${albumId}${CRLF}`,
            `--${boundary}${CRLF}Content-Disposition: form-data; name="photo"; filename="test-dslr-shot.jpg"${CRLF}Content-Type: image/jpeg${CRLF}${CRLF}`
        ];

        const topPayload = Buffer.from(parts.join(""));
        const endPayload = Buffer.from(`${CRLF}--${boundary}--${CRLF}`);
        const totalLength = topPayload.length + photoData.length + endPayload.length;

        const uploadReq = http.request({
            hostname: BRIDGE_HOST,
            port: BRIDGE_PORT,
            path: "/api/bridge/upload",
            method: "POST",
            headers: {
                "Content-Type": `multipart/form-data; boundary=${boundary}`,
                "Content-Length": totalLength,
                "Authorization": `Bearer ${BRIDGE_PSK}`
            }
        }, (res) => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => {
                if (res.statusCode && res.statusCode < 400) {
                    logger.info(`✅ Upload Success [${res.statusCode}]: ${data}`);
                } else {
                    logger.error(`❌ Upload Failed [${res.statusCode}]: ${data}`);
                }
                if (fs.existsSync(testImagePath)) {
                    fs.unlinkSync(testImagePath);
                }
            });
        });

        uploadReq.on("error", (err) => logger.error(`❌ Upload Error: ${err.message}`));
        
        uploadReq.write(topPayload);
        uploadReq.write(photoData);
        uploadReq.write(endPayload);
        uploadReq.end();
    }
}

testBridgeUpload();
