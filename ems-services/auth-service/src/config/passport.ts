import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';

export function configurePassport(authService: AuthService) {
    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID!,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
                callbackURL: process.env.GOOGLE_CALLBACK_URL!,
            },
            async (accessToken: string, refreshToken: string, profile: Profile, done: (error: any, user?: any, info?: any) => void) => {
                try {
                    // This logic should live in your AuthService to keep concerns separated
                    const user = await authService.findOrCreateGoogleUser(profile);
                    if (user) {
                        return done(null, user); // Success
                    }
                    return done(null, false, { message: 'Could not process Google profile.' }); // Failure
                } catch (error) {
                    return done(error, false); // Error
                }
            }
        )
    );
}