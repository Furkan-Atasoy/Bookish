const { poolPromise, sql } = require('../config/db');
const { findOrCreateBook } = require('./bookController');
const redisClient = require('../config/redis');

const AUTO_BAN_THRESHOLD = 3;

exports.createReview = async (req, res) => {
    const { title, author, rating, comment, visibility } = req.body;
    const userId = req.user.id;
    const status = req.reviewStatus;

    try {
        const bookId = await findOrCreateBook(title, author);
        const pool = await poolPromise;

        const result = await pool.request()
            .input('uid', sql.Int, userId)
            .input('bid', sql.Int, bookId)
            .input('rating', sql.Int, rating)
            .input('comment', sql.NVarChar, comment)
            .input('vis', sql.NVarChar, visibility || 'Public')
            .input('status', sql.NVarChar, status)
            .query(`
                INSERT INTO Reviews (UserID, BookID, Rating, Comment, Visibility, Status)
                OUTPUT INSERTED.ReviewID
                VALUES (@uid, @bid, @rating, @comment, @vis, @status)
            `);

        const reviewId = result.recordset[0].ReviewID;

        if (status === 'Blocked') {
            await pool.request()
                .input('rid', sql.Int, reviewId)
                .input('uid', sql.Int, userId)
                .input('comm', sql.NVarChar, comment)
                .query('INSERT INTO BlockedReviewsLogs (ReviewID, ReviewerID, OriginalComment) VALUES (@rid, @uid, @comm)');

            await pool.request()
                .input('uid', sql.Int, userId)
                .query('UPDATE Users SET ViolationCount = ViolationCount + 1 WHERE UserID = @uid');

            const userResult = await pool.request()
                .input('uid', sql.Int, userId)
                .query('SELECT ViolationCount, BanCount FROM Users WHERE UserID = @uid');

            const { ViolationCount: violations, BanCount } = userResult.recordset[0];

            if (violations >= AUTO_BAN_THRESHOLD) {
                let query = '';
                let message = '';
                let isPermanent = false;

                if (BanCount === 0) {
                    query = 'UPDATE Users SET BannedUntil = DATEADD(hour, 24, GETDATE()), ViolationCount = 0, BanCount = 1 WHERE UserID = @uid';
                    message = 'Your account has been automatically suspended for 24 hours due to repeated policy violations.';
                } else if (BanCount === 1) {
                    query = 'UPDATE Users SET BannedUntil = DATEADD(day, 7, GETDATE()), ViolationCount = 0, BanCount = 2 WHERE UserID = @uid';
                    message = 'This is your second major violation. Your account has been suspended for 7 days.';
                } else if (BanCount === 2) {
                    query = 'UPDATE Users SET BannedUntil = DATEADD(day, 30, GETDATE()), ViolationCount = 0, BanCount = 3 WHERE UserID = @uid';
                    message = 'This is your third major violation. Your account has been suspended for 30 days.';
                } else {
                    query = 'UPDATE Users SET IsBanned = 1, BannedUntil = NULL, ViolationCount = 0 WHERE UserID = @uid';
                    message = 'Your account has been permanently suspended due to chronic policy violations.';
                    isPermanent = true;
                }

                await pool.request().input('uid', sql.Int, userId).query(query);

                return res.status(201).json({
                    message,
                    status: isPermanent ? 'PermanentlyBanned' : 'AutoBanned',
                });
            }
        }

        await redisClient.del('trending_books');

        const currentViolations = await getViolationCount(pool, userId);
        res.status(201).json({
            message: status === 'Blocked'
                ? `Review flagged for moderation. Violation ${currentViolations} of 3 — 3 violations trigger a suspension.`
                : 'Review posted successfully',
            status,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

async function getViolationCount(pool, userId) {
    const r = await pool.request()
        .input('uid', sql.Int, userId)
        .query('SELECT ViolationCount FROM Users WHERE UserID = @uid');
    return r.recordset[0]?.ViolationCount || 0;
}

exports.getPublicReviews = async (req, res) => {
    const minRating = parseInt(req.query.minRating) || 1;
    const maxRating = parseInt(req.query.maxRating) || 10;
    const sortBy = req.query.sortBy === 'likes'
        ? 'r.LikeCount DESC, r.CreatedAt DESC'
        : 'r.CreatedAt DESC';

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('minR', sql.Int, minRating)
            .input('maxR', sql.Int, maxRating)
            .query(`
                SELECT r.ReviewID, r.Rating, r.Comment, r.Visibility, r.Status,
                       r.CreatedAt, r.LikeCount,
                       u.Username, u.UserID,
                       b.TitleNormalized, b.Author, b.BookID
                FROM Reviews r
                JOIN Users u ON r.UserID = u.UserID
                JOIN Books b ON r.BookID = b.BookID
                WHERE r.Visibility = 'Public' AND r.Status = 'Published'
                  AND r.Rating >= @minR AND r.Rating <= @maxR
                ORDER BY ${sortBy}
            `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getUserReviews = async (req, res) => {
    const userId = req.user.id;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('uid', sql.Int, userId)
            .query(`
                SELECT r.*, b.TitleNormalized, b.Author
                FROM Reviews r
                JOIN Books b ON r.BookID = b.BookID
                WHERE r.UserID = @uid
                ORDER BY r.CreatedAt DESC
            `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.toggleLike = async (req, res) => {
    const userId = req.user.id;
    const reviewId = parseInt(req.params.reviewId);

    try {
        const pool = await poolPromise;

        const existing = await pool.request()
            .input('uid', sql.Int, userId)
            .input('rid', sql.Int, reviewId)
            .query('SELECT LikeID FROM ReviewLikes WHERE UserID = @uid AND ReviewID = @rid');

        if (existing.recordset.length > 0) {
            await pool.request()
                .input('uid', sql.Int, userId)
                .input('rid', sql.Int, reviewId)
                .query('DELETE FROM ReviewLikes WHERE UserID = @uid AND ReviewID = @rid');
            await pool.request()
                .input('rid', sql.Int, reviewId)
                .query('UPDATE Reviews SET LikeCount = CASE WHEN LikeCount > 0 THEN LikeCount - 1 ELSE 0 END WHERE ReviewID = @rid');
            res.json({ liked: false });
        } else {
            await pool.request()
                .input('uid', sql.Int, userId)
                .input('rid', sql.Int, reviewId)
                .query('INSERT INTO ReviewLikes (ReviewID, UserID) VALUES (@rid, @uid)');
            await pool.request()
                .input('rid', sql.Int, reviewId)
                .query('UPDATE Reviews SET LikeCount = LikeCount + 1 WHERE ReviewID = @rid');
            res.json({ liked: true });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getLikedReviews = async (req, res) => {
    const userId = req.user.id;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('uid', sql.Int, userId)
            .query(`
                SELECT r.ReviewID, r.Rating, r.Comment, r.LikeCount, r.CreatedAt,
                       b.TitleNormalized, b.Author, u.Username
                FROM ReviewLikes rl
                JOIN Reviews r ON rl.ReviewID = r.ReviewID
                JOIN Books b   ON r.BookID = b.BookID
                JOIN Users u   ON r.UserID = u.UserID
                WHERE rl.UserID = @uid AND r.Visibility = 'Public' AND r.Status = 'Published'
                ORDER BY rl.CreatedAt DESC
            `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getMyLikedIds = async (req, res) => {
    const userId = req.user.id;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('uid', sql.Int, userId)
            .query('SELECT ReviewID FROM ReviewLikes WHERE UserID = @uid');
        res.json(result.recordset.map(r => r.ReviewID));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
