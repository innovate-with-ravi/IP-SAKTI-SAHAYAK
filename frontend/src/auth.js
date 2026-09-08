/**
 * PLACEHOLDER — replace this with your existing auth middleware
 * (the one already used by your login/register/OTP routes).
 *
 * Do not run this file as-is in production; it exists so the
 * new routes below have something to import. Point the import
 * in chats.js / messages.js / profile.js at your real middleware
 * instead, e.g.:
 *
 *   const authenticate = require("../middleware/authenticate"); // your existing file
 */

const jwt = require("jsonwebtoken");

function authenticate(req, res, next) {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No token provided." });
    }

    const token = header.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId || decoded.id;
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token." });
    }
}

module.exports = authenticate;
