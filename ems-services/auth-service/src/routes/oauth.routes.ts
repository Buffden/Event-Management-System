import { Express, Request, Response } from 'express';
import passport from 'passport';
import { AuthService } from '../services/auth.service';
import { User } from '../types/types';

export function registerOAuthRoutes(app: Express, authService: AuthService) {
    /**
     * @route   GET http://localhost/api/auth/google
     * @desc    Initiates the Google OAuth2 authentication flow.
     */
    app.get(
        '/google',
        passport.authenticate('google', {
            scope: ['profile', 'email'],
            session: false,
        })
    );

    /**
     * @route   GET http://localhost/api/auth/google/callback
     * @desc    Handles the callback from Google after authentication.
     */
    app.get(
        '/google/callback',
        passport.authenticate('google', {
            failureRedirect: '/login', // Adjust as needed for your frontend
            session: false,
        }),
        async (req: Request, res: Response) => {
            try {
                // Because of our type definition, req.user is now correctly typed!
                const user = req.user as User;

                if (!user) {
                    return res.status(401).json({ error: 'Authentication failed via Google.' });
                }

                // This now works because we added the public method to AuthService
                const token = authService.generateJwtForUser(user);

                // For a web client, redirecting is a common pattern.
                // The frontend can parse the token from the URL and save it.
                // const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                // res.redirect(`${frontendUrl}/auth/callback?token=${token}`);

                // Or, for a mobile/REST client, return the token directly.
                res.status(200).json({
                    message: 'Google authentication successful!',
                    token: token,
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                    },
                });
            } catch (error: any) {
                console.error('Error in Google callback:', error);
                res.status(500).json({ error: 'An internal error occurred during authentication.' });
            }
        }
    );
}
