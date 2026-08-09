"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpResponse = exports.http = exports.mockApiHandlers = void 0;
exports.createMockServer = createMockServer;
var msw_1 = require("msw");
Object.defineProperty(exports, "http", { enumerable: true, get: function () { return msw_1.http; } });
Object.defineProperty(exports, "HttpResponse", { enumerable: true, get: function () { return msw_1.HttpResponse; } });
var node_1 = require("msw/node");
function createMockServer(handlers) {
    var server = node_1.setupServer.apply(void 0, handlers);
    return server;
}
exports.mockApiHandlers = [
    msw_1.http.get('/api/health', function () {
        return msw_1.HttpResponse.json({ status: 'ok' });
    }),
    msw_1.http.get('/api/photos', function () {
        return msw_1.HttpResponse.json({
            data: [],
            pagination: { page: 1, limit: 20, total: 0 },
        });
    }),
    msw_1.http.get('/api/albums', function () {
        return msw_1.HttpResponse.json({
            data: [],
            pagination: { page: 1, limit: 20, total: 0 },
        });
    }),
];
