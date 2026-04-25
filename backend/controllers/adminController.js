const { poolPromise, sql } = require('../config/db');

exports.getBlockedReviews = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT bl.LogID, bl.ReviewID, bl.OriginalComment, bl.DetectedAt,
                   u.UserID, u.Username, u.Email, u.ViolationCount,
                   b.TitleNormalized, b.Author
            FROM BlockedReviewsLogs bl
            JOIN Users u   ON bl.ReviewerID = u.UserID
            JOIN Reviews r ON bl.ReviewID   = r.ReviewID
            JOIN Books b   ON r.BookID      = b.BookID
            WHERE bl.AdminAction = 'Pending'
            ORDER BY bl.DetectedAt DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.moderateReview = async (req, res) => {
    const { logId, reviewId, action } = req.body;
    try {
        const pool = await poolPromise;
        if (action === 'Approved') {
            await pool.request()
                .input('rid', sql.Int, reviewId)
                .query("UPDATE Reviews SET Status = 'Published' WHERE ReviewID = @rid");
        } else {
            await pool.request()
                .input('rid', sql.Int, reviewId)
                .query('DELETE FROM BlockedReviewsLogs WHERE ReviewID = @rid');
            await pool.request()
                .input('rid', sql.Int, reviewId)
                .query('DELETE FROM Reviews WHERE ReviewID = @rid');
        }
        await pool.request()
            .input('lid', sql.Int, logId)
            .input('a', sql.NVarChar, action)
            .query('UPDATE BlockedReviewsLogs SET AdminAction = @a WHERE LogID = @lid');
        res.json({ message: `Review ${action}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getAllUsers = async (req, res) => {
    const { q } = req.query;
    try {
        const pool = await poolPromise;
        let query = `
            SELECT u.UserID, u.Username, u.Email, u.Role, u.IsBanned,
                   u.BannedUntil, u.ViolationCount, u.BanCount, u.CreatedAt,
                   COUNT(r.ReviewID) AS ReviewCount,
                   (SELECT STUFF((
                       SELECT ' | [' + CONVERT(VARCHAR, DetectedAt, 120) + '] ' + OriginalComment
                       FROM BlockedReviewsLogs
                       WHERE ReviewerID = u.UserID
                       ORDER BY DetectedAt DESC
                       FOR XML PATH('')
                   ), 1, 3, '')) AS FlaggedComments
            FROM Users u
            LEFT JOIN Reviews r ON r.UserID = u.UserID AND r.Status = 'Published'
        `;
        if (q && q.trim()) {
            query += ` WHERE u.Username LIKE @q OR u.Email LIKE @q`;
        }
        query += ` GROUP BY u.UserID, u.Username, u.Email, u.Role, u.IsBanned, u.BannedUntil, u.ViolationCount, u.BanCount, u.CreatedAt ORDER BY u.CreatedAt DESC`;

        const req2 = pool.request();
        if (q && q.trim()) req2.input('q', sql.NVarChar, `%${q.trim()}%`);
        const result = await req2.query(query);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.banUser = async (req, res) => {
    const { userId, banType } = req.body;
    try {
        const pool = await poolPromise;
        let query;
        if (banType === 'unban') {
            query = `UPDATE Users SET IsBanned = 0, BannedUntil = NULL, ViolationCount = 0, BanCount = 0 WHERE UserID = @uid`;
        } else if (banType === 'permanent') {
            query = `UPDATE Users SET IsBanned = 1, BannedUntil = NULL, BanCount = 4 WHERE UserID = @uid`;
        } else if (banType === '24h') {
            query = `UPDATE Users SET BannedUntil = DATEADD(hour, 24, GETDATE()), IsBanned = 0, BanCount = 1 WHERE UserID = @uid`;
        } else if (banType === '7d') {
            query = `UPDATE Users SET BannedUntil = DATEADD(day, 7, GETDATE()), IsBanned = 0, BanCount = 2 WHERE UserID = @uid`;
        } else if (banType === '30d') {
            query = `UPDATE Users SET BannedUntil = DATEADD(day, 30, GETDATE()), IsBanned = 0, BanCount = 3 WHERE UserID = @uid`;
        } else {
            return res.status(400).json({ message: 'Invalid banType' });
        }
        await pool.request().input('uid', sql.Int, userId).query(query);
        res.json({ message: `User ${banType === 'unban' ? 'unbanned' : `banned (${banType})`} successfully` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteReview = async (req, res) => {
    const { reviewId } = req.params;
    try {
        const pool = await poolPromise;
        await pool.request().input('rid', sql.Int, reviewId).query('DELETE FROM BlockedReviewsLogs WHERE ReviewID = @rid');
        await pool.request().input('rid', sql.Int, reviewId).query('DELETE FROM Reviews WHERE ReviewID = @rid');
        res.json({ message: 'Review deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
