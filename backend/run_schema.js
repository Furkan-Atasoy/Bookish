const sql = require('mssql');
require('dotenv').config();

const config = {
    server: process.env.DB_SERVER || 'localhost',
    port: parseInt(process.env.DB_PORT) || 1433,
    database: 'master',
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD,
    options: { encrypt: false, trustServerCertificate: true },
};

async function runSchema() {
    let pool;
    try {
        pool = await sql.connect(config);
        console.log('Connected to MSSQL master database...');

        await pool.request().query(`
            IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'Bookish')
            CREATE DATABASE Bookish
        `);
        console.log('Bookish database ready.');

        await pool.close();

        const bookishConfig = { ...config, database: 'Bookish' };
        pool = await sql.connect(bookishConfig);

        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
            CREATE TABLE Users (
                UserID       INT PRIMARY KEY IDENTITY(1,1),
                Username     NVARCHAR(50)  UNIQUE NOT NULL,
                Email        NVARCHAR(100) UNIQUE NOT NULL,
                PasswordHash NVARCHAR(MAX) NOT NULL,
                Role         NVARCHAR(20)  DEFAULT 'User',
                IsBanned     BIT           DEFAULT 0,
                BannedUntil  DATETIME      NULL,
                ViolationCount INT         NOT NULL DEFAULT 0,
                BanCount     INT           NOT NULL DEFAULT 0,
                CreatedAt    DATETIME      DEFAULT GETDATE()
            )
        `);
        console.log('Users table ready.');

        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Books' AND xtype='U')
            CREATE TABLE Books (
                BookID          INT PRIMARY KEY IDENTITY(1,1),
                TitleNormalized NVARCHAR(255) UNIQUE NOT NULL,
                Author          NVARCHAR(255) NULL,
                ReviewCount     INT           DEFAULT 0,
                LastReviewAt    DATETIME      DEFAULT GETDATE()
            )
        `);
        console.log('Books table ready.');

        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Reviews' AND xtype='U')
            CREATE TABLE Reviews (
                ReviewID   INT PRIMARY KEY IDENTITY(1,1),
                UserID     INT FOREIGN KEY REFERENCES Users(UserID),
                BookID     INT FOREIGN KEY REFERENCES Books(BookID),
                Rating     INT CHECK (Rating >= 1 AND Rating <= 10),
                Comment    NVARCHAR(MAX),
                Visibility NVARCHAR(10)  DEFAULT 'Public',
                Status     NVARCHAR(20)  DEFAULT 'Published',
                LikeCount  INT           DEFAULT 0,
                CreatedAt  DATETIME      DEFAULT GETDATE()
            )
        `);
        console.log('Reviews table ready.');

        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='BlockedReviewsLogs' AND xtype='U')
            CREATE TABLE BlockedReviewsLogs (
                LogID           INT PRIMARY KEY IDENTITY(1,1),
                ReviewID        INT FOREIGN KEY REFERENCES Reviews(ReviewID),
                ReviewerID      INT FOREIGN KEY REFERENCES Users(UserID),
                OriginalComment NVARCHAR(MAX),
                DetectedAt      DATETIME      DEFAULT GETDATE(),
                AdminAction     NVARCHAR(20)  DEFAULT 'Pending'
            )
        `);
        console.log('BlockedReviewsLogs table ready.');

        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ReviewLikes' AND xtype='U')
            CREATE TABLE ReviewLikes (
                LikeID    INT PRIMARY KEY IDENTITY(1,1),
                ReviewID  INT FOREIGN KEY REFERENCES Reviews(ReviewID),
                UserID    INT FOREIGN KEY REFERENCES Users(UserID),
                CreatedAt DATETIME DEFAULT GETDATE(),
                UNIQUE (ReviewID, UserID)
            )
        `);
        console.log('ReviewLikes table ready.');

        console.log('\nSchema setup complete! Bookish is ready.');
        await pool.close();
        process.exit(0);
    } catch (err) {
        console.error('Schema error:', err.message);
        if (pool) await pool.close();
        process.exit(1);
    }
}

runSchema();
