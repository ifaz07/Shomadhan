const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const User = require("../models/User.model");
const { getBackendUrl } = require("./runtimeUrls");

const backendBaseUrl = getBackendUrl();
const hasGoogleOAuth =
  Boolean(process.env.GOOGLE_CLIENT_ID) &&
  Boolean(process.env.GOOGLE_CLIENT_SECRET);
const hasFacebookOAuth =
  Boolean(process.env.FACEBOOK_APP_ID) &&
  Boolean(process.env.FACEBOOK_APP_SECRET);

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
          let user = await User.findOne({ googleId: profile.id });
          let isNewUser = false;

          if (!user) {
            user = await User.findOne({ email: profile.emails[0].value });
            if (user) {
              user.googleId = profile.id;
              if (!user.avatar) user.avatar = profile.photos?.[0]?.value || "";
              await user.save({ validateBeforeSave: false });
            } else {
              isNewUser = true;
              user = await User.create({
                googleId: profile.id,
                name: profile.displayName,
                email: profile.emails[0].value,
                avatar: profile.photos?.[0]?.value || "",
                authProvider: "google",
                isVerified: false,
              });
            }
          }

          user.isNewOAuthUser = isNewUser;
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      },
    ),
  );
}

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
          let user = await User.findOne({ facebookId: profile.id });
          let isNewUser = false;

          if (!user) {
            const email = profile.emails?.[0]?.value;
            if (email) {
              user = await User.findOne({ email });
              if (user) {
                user.facebookId = profile.id;
                if (!user.avatar) user.avatar = profile.photos?.[0]?.value || "";
                await user.save({ validateBeforeSave: false });
              }
            }

            if (!user) {
              isNewUser = true;
              user = await User.create({
                facebookId: profile.id,
                name: profile.displayName,
                email: email || `${profile.id}@facebook.placeholder`,
                avatar: profile.photos?.[0]?.value || "",
                authProvider: "facebook",
                isVerified: false,
              });
            }
          }

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
