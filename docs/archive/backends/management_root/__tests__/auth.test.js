// backend/__tests__/auth.test.js
const { hashPassword, verifyPassword } = require('../auth');

describe('Auth Module', () => {
    describe('hashPassword', () => {
        it('should hash a password', async () => {
            const password = 'testpassword123';
            const hash = await hashPassword(password);
            
            expect(hash).toBeDefined();
            expect(hash).not.toBe(password);
            expect(hash).toMatch(/^\$2[aby]\$/); // Bcrypt hash format
            expect(hash.length).toBeGreaterThan(50);
        });

        it('should produce different hashes for the same password', async () => {
            const password = 'testpassword123';
            const hash1 = await hashPassword(password);
            const hash2 = await hashPassword(password);
            
            expect(hash1).not.toBe(hash2); // Different salts should produce different hashes
        });
    });

    describe('verifyPassword', () => {
        it('should verify a correct password', async () => {
            const password = 'testpassword123';
            const hash = await hashPassword(password);
            
            const isValid = await verifyPassword(password, hash);
            expect(isValid).toBe(true);
        });

        it('should reject an incorrect password', async () => {
            const password = 'testpassword123';
            const wrongPassword = 'wrongpassword';
            const hash = await hashPassword(password);
            
            const isValid = await verifyPassword(wrongPassword, hash);
            expect(isValid).toBe(false);
        });

        it('should handle empty password', async () => {
            const password = '';
            
            // Empty password should throw an error
            await expect(hashPassword(password)).rejects.toThrow('Password must be a non-empty string');
        });
    });
});

