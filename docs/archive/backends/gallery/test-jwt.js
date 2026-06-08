/**
 * JWT Test Script
 * Verifies that jsonwebtoken module is properly installed and functional
 * 
 * @module test-jwt
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

console.log('Testing JWT import...');
console.log('JWT loaded:', typeof jwt);
console.log('JWT.sign:', typeof jwt.sign);
console.log('JWT.verify:', typeof jwt.verify);

const testToken = jwt.sign({ test: 'data' }, 'secret', { expiresIn: '1h' });
console.log('Test token created:', testToken);

const decoded = jwt.verify(testToken, 'secret');
console.log('Test token verified:', decoded);

console.log('All tests passed!');
