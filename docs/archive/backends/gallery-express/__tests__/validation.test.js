// backend/__tests__/validation.test.js
const { validateLogin, validateRequest } = require('../validation');

describe('Validation Module', () => {
    describe('validateLogin', () => {
        it('should validate a correct login request', () => {
            const data = {
                email: 'test@example.com',
                password: 'password123'
            };
            
            const result = validateLogin(data);
            expect(result.success).toBe(true);
            expect(result.data.email).toBe('test@example.com');
            expect(result.data.password).toBe('password123');
        });

        it('should reject login without email', () => {
            const data = {
                password: 'password123'
            };
            
            const result = validateLogin(data);
            expect(result.success).toBe(false);
            expect(result.error).toContain('email');
        });

        it('should reject login without password', () => {
            const data = {
                email: 'test@example.com'
            };
            
            const result = validateLogin(data);
            expect(result.success).toBe(false);
            expect(result.error).toContain('password');
        });

        it('should reject invalid email format', () => {
            const data = {
                email: 'not-an-email',
                password: 'password123'
            };
            
            const result = validateLogin(data);
            expect(result.success).toBe(false);
        });

        it('should reject empty email', () => {
            const data = {
                email: '',
                password: 'password123'
            };
            
            const result = validateLogin(data);
            expect(result.success).toBe(false);
        });

        it('should reject empty password', () => {
            const data = {
                email: 'test@example.com',
                password: ''
            };
            
            const result = validateLogin(data);
            expect(result.success).toBe(false);
        });
    });

    describe('validateRequest', () => {
        it('should validate a user creation request', () => {
            const data = {
                name: 'Test User',
                email: 'test@example.com',
                password: 'password123',
                role: 'Photographer'
            };
            
            const result = validateRequest(data, 'users');
            expect(result.success).toBe(true);
        });

        it('should reject user without required fields', () => {
            const data = {
                email: 'test@example.com'
                // Missing name and role
            };
            
            const result = validateRequest(data, 'users');
            expect(result.success).toBe(false);
        });

        it('should validate an album creation request', () => {
            const data = {
                id: 'album-123',
                title: 'Test Album',
                date: '2025-01-01',
                photographerId: 1,
                status: 'Draft'
            };
            
            const result = validateRequest(data, 'albums');
            expect(result.success).toBe(true);
        });
    });
});

