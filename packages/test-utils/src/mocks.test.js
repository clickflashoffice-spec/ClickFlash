"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var vitest_1 = require("vitest");
var mocks_js_1 = require("./mocks.js");
(0, vitest_1.describe)('createMockServer', function () {
    (0, vitest_1.it)('creates a server with handlers', function () {
        var server = (0, mocks_js_1.createMockServer)([
            mocks_js_1.http.get('/api/test', function () { return mocks_js_1.HttpResponse.json({ ok: true }); }),
        ]);
        (0, vitest_1.expect)(server).toBeDefined();
        (0, vitest_1.expect)(server.listen).toBeDefined();
        (0, vitest_1.expect)(server.close).toBeDefined();
        server.close();
    });
});
