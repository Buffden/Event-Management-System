import { Express, Request, Response } from 'express';
import passport from 'passport';
import { AuthService } from '../services/auth.service';
import { User } from '../types/types';
import { logger } from '../utils/logger';

export function registerOAuthRoutes(app: Express, authService: AuthService) {
    /**
     * @route   GET http://localhost/api/auth/google?role=USER|SPEAKER
     * @desc    Initiates the Google OAuth2 authentication flow.
     * @query   role - Optional role selection (USER or SPEAKER) for new sign-ups
     */
    app.get(
        '/google',
        (req: Request, res: Response, next: any) => {
            // Extract role from query parameter and pass it as state to OAuth flow
            const role = req.query.role as string;
            const state = role && (role === 'USER' || role === 'SPEAKER') ? role : undefined;

            passport.authenticate('google', {
                scope: ['profile', 'email'],
                session: false,
                state: state, // Pass role through OAuth state parameter
            })(req, res, next);
        }
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
            passReqToCallback: true, // Enable access to request in strategy
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

                // Redirect to role-specific dashboard with token
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost';
                let dashboardPath = '/dashboard/attendee'; // Default for USER

                switch (user.role) {
                    case 'ADMIN':
                        dashboardPath = '/dashboard/admin';
                        break;
                    case 'SPEAKER':
                        dashboardPath = '/dashboard/speaker';
                        break;
                    case 'USER':
                    default:
                        dashboardPath = '/dashboard/attendee';
                        break;
                }

                res.redirect(`${frontendUrl}${dashboardPath}?token=${token}&oauth=true`);
            } catch (error: any) {
                logger.error('Error in Google callback', error, { userId: (req.user as User)?.id });
                res.status(500).json({ error: 'An internal error occurred during authentication.' });
            }
        }
    );
}
