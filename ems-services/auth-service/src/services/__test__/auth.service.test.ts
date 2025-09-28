// src/services/__test__/auth.service.test.ts
import {AuthService} from '../auth.service';
import {prisma} from '../../database';
import jwt from 'jsonwebtoken';
import {Role} from '../../../generated/prisma/index';

describe('AuthService (integration)', () => {
    let authService: AuthService;

    beforeEach(() => {
        authService = new AuthService();
    });

    const uniqueEmail = () => `test_${Date.now()}_${Math.floor(Math.random() * 100000)}@example.com`;

    it('registers a new user against the real database and publishes email message', async () => {
        const email = uniqueEmail();
        const password = 'Password123!';

        const result = await authService.register({
            email,
            password,
            name: 'John Doe',
            role: Role.USER,
        });

        expect(result.user.email).toBe(email);
        expect(typeof result.token).toBe('string');

        const dbUser = await prisma.user.findUnique({ where: { email } });
        expect(dbUser).toBeTruthy();
        expect(dbUser?.isActive).toBe(false);
        expect(dbUser?.emailVerified).toBeNull();

        // Cleanup
        await prisma.user.delete({ where: { id: result.user.id } });
    });

    it('verifies email and then allows login', async () => {
        const email = uniqueEmail();
        const password = 'Password123!';

        const { user } = await authService.register({
            email,
            password,
            name: 'Jane Doe',
            role: Role.USER,
        });

        // Generate a verification token using the same secret and payload structure
        const verifyToken = jwt.sign({ userId: user.id, type: 'email-verification' }, process.env.EMAIL_VERIFICATION_SECRET! , { expiresIn: '1h' });
        const verified = await authService.verifyEmail(verifyToken);
        expect(verified.user.isActive).toBe(true);
        expect(verified.user.emailVerified).toBeTruthy();

        // Now login should succeed
        const login = await authService.login({ email, password });
        expect(typeof login.token).toBe('string');
        expect(login.user.email).toBe(email);

        // Cleanup
        await prisma.user.delete({ where: { id: user.id } });
    });
});