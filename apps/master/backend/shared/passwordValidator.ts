/**
 * Password Validation Module
 * Provides password strength validation for production security
 */

export const PASSWORD_REQUIREMENTS = {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
    commonPasswords: [
        'password', 'DEFAULT_PASSWORD_PLACEHOLDER', '12345678', 'qwerty', 'abc123',
        'letmein', 'welcome', 'monkey', '1234567890', 'password1'
    ]
};

export interface PasswordValidationResult {
    valid: boolean;
    errors: string[];
    strength: 'weak' | 'medium' | 'strong' | 'invalid';
}

export function validatePassword(password: string): PasswordValidationResult {
    const errors: string[] = [];

    if (!password || typeof password !== 'string') {
        return { valid: false, errors: ['Password is required'], strength: 'invalid' };
    }

    if (password.length < PASSWORD_REQUIREMENTS.minLength) {
        errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters long`);
    }

    if (password.length > PASSWORD_REQUIREMENTS.maxLength) {
        errors.push(`Password must not exceed ${PASSWORD_REQUIREMENTS.maxLength} characters`);
    }

    if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }

    if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }

    if (PASSWORD_REQUIREMENTS.requireNumbers && !/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }

    const passwordLower = password.toLowerCase();
    if (PASSWORD_REQUIREMENTS.commonPasswords.some(common => passwordLower.includes(common))) {
        errors.push('Password is too common. Please choose a more unique password');
    }

    let strength: 'weak' | 'medium' | 'strong' = 'weak';
    if (errors.length === 0) {
        const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
        const hasMultipleNumbers = (password.match(/[0-9]/g) || []).length >= 2;
        const isLongEnough = password.length >= 12;

        if (hasSpecialChars && hasMultipleNumbers && isLongEnough) {
            strength = 'strong';
        } else if ((hasSpecialChars || hasMultipleNumbers) && password.length >= 10) {
            strength = 'medium';
        }
    }

    return { valid: errors.length === 0, errors, strength };
}

export function getPasswordRequirements(): string[] {
    const requirements: string[] = [];
    requirements.push(`At least ${PASSWORD_REQUIREMENTS.minLength} characters long`);
    if (PASSWORD_REQUIREMENTS.requireUppercase) requirements.push('At least one uppercase letter (A-Z)');
    if (PASSWORD_REQUIREMENTS.requireLowercase) requirements.push('At least one lowercase letter (a-z)');
    if (PASSWORD_REQUIREMENTS.requireNumbers) requirements.push('At least one number (0-9)');
    requirements.push('Not a common password');
    return requirements;
}

export function isDefaultPassword(password: string): boolean {
    const defaultPasswords = ['DEFAULT_PASSWORD_PLACEHOLDER', 'password', 'admin', 'admin123', 'changeme'];
    return defaultPasswords.some(def => password.toLowerCase() === def.toLowerCase());
}
