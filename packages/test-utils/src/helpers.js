"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wait = wait;
exports.createDeferred = createDeferred;
exports.generateId = generateId;
exports.clamp = clamp;
function wait(ms) {
    return new Promise(function (resolve) { return setTimeout(resolve, ms); });
}
function createDeferred() {
    var resolve;
    var reject;
    var promise = new Promise(function (res, rej) {
        resolve = res;
        reject = rej;
    });
    return { promise: promise, resolve: resolve, reject: reject };
}
function generateId() {
    return "".concat(Date.now(), "-").concat(Math.random().toString(36).slice(2, 11));
}
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
