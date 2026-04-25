const { poolPromise, sql } = require('../config/db');

exports.searchUsers = async (req, res) => {
    const { q } = req.query;
    if (!q || !q.trim()) return res.json([]);

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('q', sql.NVarChar, `%${q.trim()}%`)
            .query(`
                SELECT u.UserID, u.Username, u.CreatedAt,
                       COUNT(r.ReviewID) AS ReviewCount
                FROM Users u
                LEFT JOIN Reviews r ON r.UserID = u.UserID
                    AND r.Visibility = 'Public' AND r.Status = 'Published'
                WHERE u.Username LIKE @q AND u.IsBanned = 0
                GROUP BY u.UserID, u.Username, u.CreatedAt
                ORDER BY ReviewCount DESC
            `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getUserProfile = async (req, res) => {
    const { userId } = req.params;
    try {
        const pool = await poolPromise;

        const userResult = await pool.request()
            .input('uid', sql.Int, userId)
            .query(`
                SELECT UserID, Username, CreatedAt,
                       COUNT(r.ReviewID) AS TotalReviews,
                       AVG(CAST(r.Rating AS FLOAT)) AS AvgRating
                FROM Users u
                LEFT JOIN Reviews r ON r.UserID = u.UserID
                    AND r.Visibility = 'Public' AND r.Status = 'Published'
                WHERE u.UserID = @uid AND u.IsBanned = 0
                GROUP BY u.UserID, u.Username, u.CreatedAt
            `);

        if (!userResult.recordset.length) {
            return res.status(404).json({ message: 'User not found' });
        }

        const reviewsResult = await pool.request()
            .input('uid', sql.Int, userId)
            .query(`
                SELECT r.ReviewID, r.Rating, r.Comment, r.LikeCount, r.CreatedAt,
                       b.TitleNormalized, b.Author, b.BookID
                FROM Reviews r
                JOIN Books b ON r.BookID = b.BookID
                WHERE r.UserID = @uid AND r.Visibility = 'Public' AND r.Status = 'Published'
                ORDER BY r.CreatedAt DESC
            `);

        res.json({
            user: userResult.recordset[0],
            reviews: reviewsResult.recordset,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
