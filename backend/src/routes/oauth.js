const router = require('express').Router();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';

// Minimal in-file passport configuration
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => done(null, { id }));

async function upsertOAuthUser(profile, provider) {
    const email = (profile.emails && profile.emails[0] && profile.emails[0].value) || null;
    const name = profile.displayName || (profile.name && `${profile.name.givenName || ''} ${profile.name.familyName || ''}`.trim()) || 'User';
    const avatarUrl = (profile.photos && profile.photos[0] && profile.photos[0].value) || undefined;
    const providerId = String(profile.id);

    if (!email) {
        // Some providers might not return email if it's private; reject in that case
        throw new Error('Email is required from provider');
    }

    let user = await User.findOne({ email });
    if (!user) {
        user = await User.create({
            name,
            email,
            avatarUrl,
            provider,
            providerId,
            providers: [{ provider, providerId }],
            role: 'student',
        });
    } else {
        // Link provider if not already linked
        const already = (user.providers || []).some(p => p.provider === provider && p.providerId === providerId);
        if (!already) {
            user.providers = Array.isArray(user.providers) ? user.providers : [];
            user.providers.push({ provider, providerId });
        }
        if (!user.provider) user.provider = provider;
        if (!user.providerId) user.providerId = providerId;
        if (!user.avatarUrl && avatarUrl) user.avatarUrl = avatarUrl;
        await user.save({ validateBeforeSave: false });
    }
    return user;
}

function finishAuth(req, res, user) {
    const token = jwt.sign({ id: user._id, role: user.role, name: user.name, phone: user.phone }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const redirectUrl = new URL(`${CLIENT_ORIGIN}/oauth/callback`);
    redirectUrl.searchParams.set('token', token);
    redirectUrl.searchParams.set('name', user.name || '');
    redirectUrl.searchParams.set('email', user.email || '');
    redirectUrl.searchParams.set('role', user.role || 'student');
    res.redirect(redirectUrl.toString());
}

// Google
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/api/auth/google/callback'
    }, async (_accessToken, _refreshToken, profile, done) => {
        try {
            const user = await upsertOAuthUser(profile, 'google');
            done(null, user);
        } catch (e) { done(e); }
    }));

    router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
    router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: CLIENT_ORIGIN + '/login' }), (req, res) => {
        finishAuth(req, res, req.user);
    });
} else {
    router.get('/google', (_req, res) => {
        res.status(503).json({
            message: 'Google OAuth is not configured',
            missing: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'].filter((k)=> !process.env[k]),
        });
    });
}

// GitHub
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(new GitHubStrategy({
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: '/api/auth/github/callback',
        scope: ['user:email']
    }, async (_accessToken, _refreshToken, profile, done) => {
        try {
            // GitHub may not include email in profile.emails array without extra scope; try to find primary
            if (!profile.emails || profile.emails.length === 0) {
                // passport-github2 typically populates emails if scope includes user:email
            }
            const user = await upsertOAuthUser(profile, 'github');
            done(null, user);
        } catch (e) { done(e); }
    }));

    router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));
    router.get('/github/callback', passport.authenticate('github', { session: false, failureRedirect: CLIENT_ORIGIN + '/login' }), (req, res) => {
        finishAuth(req, res, req.user);
    });
} else {
    router.get('/github', (_req, res) => {
        res.status(503).json({
            message: 'GitHub OAuth is not configured',
            missing: ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'].filter((k)=> !process.env[k]),
        });
    });
}

// LinkedIn
if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
    passport.use(new LinkedInStrategy({
        clientID: process.env.LINKEDIN_CLIENT_ID,
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
        callbackURL: '/api/auth/linkedin/callback',
        scope: ['r_liteprofile', 'r_emailaddress']
    }, async (_accessToken, _refreshToken, profile, done) => {
        try {
            const user = await upsertOAuthUser(profile, 'linkedin');
            done(null, user);
        } catch (e) { done(e); }
    }));

    router.get('/linkedin', passport.authenticate('linkedin', { state: true }));
    router.get('/linkedin/callback', passport.authenticate('linkedin', { session: false, failureRedirect: CLIENT_ORIGIN + '/login' }), (req, res) => {
        finishAuth(req, res, req.user);
    });
} else {
    router.get('/linkedin', (_req, res) => {
        res.status(503).json({
            message: 'LinkedIn OAuth is not configured',
            missing: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET'].filter((k)=> !process.env[k]),
        });
    });
}

// Debug endpoint to see which providers are configured
router.get('/providers', (_req, res) => {
    res.json({
        google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
        github: Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
        linkedin: Boolean(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET),
    });
});

module.exports = router;


