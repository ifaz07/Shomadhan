const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const User = require("../models/User.model");

const deploymentOrigin = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "";
const backendBaseUrl =
  process.env.BACKEND_URL ||
  (deploymentOrigin ? `${deploymentOrigin}/backend` : "http://localhost:5001");
const hasGoogleOAuth =
  Boolean(process.env.GOOGLE_CLIENT_ID) &&
  Boolean(process.env.GOOGLE_CLIENT_SECRET);
const hasFacebookOAuth =
  Boolean(process.env.FACEBOOK_APP_ID) &&
  Boolean(process.env.FACEBOOK_APP_SECRET);

// ─── Serialize / Deserialize (needed for OAuth session dance) ─────────
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// ─── Google Strategy ──────────────────────────────────────────────────
if (hasGoogleOAuth) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${backendBaseUrl}/api/v1/auth/google/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user already exists by googleId
          let user = await User.findOne({ googleId: profile.id });
          let isNewUser = false;

          if (!user) {
            // Check if email already registered (link accounts)
            user = await User.findOne({ email: profile.emails[0].value });
            if (user) {
              user.googleId = profile.id;
              if (!user.avatar) user.avatar = profile.photos?.[0]?.value || "";
              await user.save({ validateBeforeSave: false });
            } else {
              // Create new user - mark as unverified
              isNewUser = true;
              user = await User.create({
                googleId: profile.id,
                name: profile.displayName,
                email: profile.emails[0].value,
                avatar: profile.photos?.[0]?.value || "",
                authProvider: "google",
                isVerified: false, // New OAuth users must verify
              });
            }
          }

          // Attach isNewUser flag to user object for callback
          user.isNewOAuthUser = isNewUser;
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      },
    ),
  );
}

// ─── Facebook Strategy ────────────────────────────────────────────────
if (hasFacebookOAuth) {
  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: `${backendBaseUrl}/api/v1/auth/facebook/callback`,
        profileFields: ["id", "displayName", "emails", "photos"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user already exists by facebookId
          let user = await User.findOne({ facebookId: profile.id });
          let isNewUser = false;

          if (!user) {
            const email = profile.emails?.[0]?.value;
            if (email) {
              // Check if email already registered (link accounts)
              user = await User.findOne({ email });
              if (user) {
                user.facebookId = profile.id;
                if (!user.avatar) user.avatar = profile.photos?.[0]?.value || "";
                await user.save({ validateBeforeSave: false });
              }
            }

            if (!user) {
              // Create new user - mark as unverified
              isNewUser = true;
              user = await User.create({
                facebookId: profile.id,
                name: profile.displayName,
                email: email || `${profile.id}@facebook.placeholder`,
                avatar: profile.photos?.[0]?.value || "",
                authProvider: "facebook",
                isVerified: false, // New OAuth users must verify
              });
            }
          }

          // Attach isNewUser flag to user object for callback
          user.isNewOAuthUser = isNewUser;
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      },
    ),
  );
}

module.exports = passport;
