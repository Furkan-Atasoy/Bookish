const { poolPromise, sql } = require('../config/db');
const redisClient = require('../config/redis');

const normalizeTitle = (title) => {
    return title
        .trim()
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

const normalizeAuthor = (author) => {
    if (!author) return null;
    return author
        .trim()
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

exports.getTrending = async (req, res) => {
    try {
        const cacheKey = 'trending_books';
        const cachedData = await redisClient.get(cacheKey);

        if (cachedData) {
            return res.json(JSON.parse(cachedData));
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .query('SELECT TOP 10 * FROM Books ORDER BY ReviewCount DESC, LastReviewAt DESC');

        const trending = result.recordset;
        await redisClient.setEx(cacheKey, 3600, JSON.stringify(trending));

        res.json(trending);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.findOrCreateBook = async (title, author) => {
    const normalizedTitle = normalizeTitle(title);
    const normalizedAuthor = normalizeAuthor(author);
    const pool = await poolPromise;

    let result = await pool.request()
        .input('title', sql.NVarChar, normalizedTitle)
        .query('SELECT BookID FROM Books WHERE TitleNormalized = @title');

    if (result.recordset.length > 0) {
        const bookId = result.recordset[0].BookID;
        await pool.request()
            .input('id', sql.Int, bookId)
            .query('UPDATE Books SET ReviewCount = ReviewCount + 1, LastReviewAt = GETDATE() WHERE BookID = @id');
        return bookId;
    } else {
        const insertResult = await pool.request()
            .input('title', sql.NVarChar, normalizedTitle)
            .input('author', sql.NVarChar, normalizedAuthor)
            .query('INSERT INTO Books (TitleNormalized, Author, ReviewCount) OUTPUT INSERTED.BookID VALUES (@title, @author, 1)');
        return insertResult.recordset[0].BookID;
    }
};
