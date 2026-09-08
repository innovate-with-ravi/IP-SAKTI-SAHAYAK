/**
 * This is NOT a standalone server — it shows the lines to add to
 * your EXISTING server.js / app.js. Don't create a second Express
 * app; just add these requires + app.use() calls to what you have.
 */

// ---- add these requires near your other route imports ----
const chatsRouter = require("./routes/chats");
const messagesRouter = require("./routes/messages");
const profileRouter = require("./routes/profile");

// ---- add these alongside your existing app.use("/auth", ...) etc ----
app.use("/chats", chatsRouter);
app.use("/messages", messagesRouter);
app.use("/profile", profileRouter);

// ---- make sure these exist already (needed by the new routes) ----
// app.use(express.json());
// app.use(cors({ origin: "http://localhost:5173" })); // your Vite dev origin

// ---- multer error handler (add near your other error middleware) ----
app.use((err, req, res, next) => {
    if (err && err.message === "Unsupported file type.") {
        return res.status(400).json({ message: "Unsupported file type. Use PDF, DOC, DOCX, or TXT." });
    }
    if (err && err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "File is too large (10MB max)." });
    }
    next(err);
});
