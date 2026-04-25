const sql = require('mssql');
const bcrypt = require('bcryptjs');
const { createClient } = require('redis');
require('dotenv').config();

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: { encrypt: true, trustServerCertificate: true },
};

const bookPool = [
    { title: "Sefiller", author: "Victor Hugo" },
    { title: "Suç ve Ceza", author: "Fyodor Dostoyevski" },
    { title: "1984", author: "George Orwell" },
    { title: "Hayvan Çiftliği", author: "George Orwell" },
    { title: "Dönüşüm", author: "Franz Kafka" },
    { title: "Simyacı", author: "Paulo Coelho" },
    { title: "Kürk Mantolu Madonna", author: "Sabahattin Ali" },
    { title: "Tutunamayanlar", author: "Oğuz Atay" },
    { title: "Şeker Portakalı", author: "Jose Mauro de Vasconcelos" },
    { title: "Küçük Prens", author: "Antoine de Saint-Exupéry" },
    { title: "Körlük", author: "Jose Saramago" },
    { title: "Yabancı", author: "Albert Camus" },
    { title: "Cesur Yeni Dünya", author: "Aldous Huxley" },
    { title: "Fahrenheit 451", author: "Ray Bradbury" },
    { title: "Saatleri Ayarlama Enstitüsü", author: "Ahmet Hamdi Tanpınar" }
];

const commentSnippets = [
    "Bu kitabı okurken zamanın nasıl geçtiğini anlamadım. Karakter derinliği muazzam işlenmiş.",
    "Yazarın dili o kadar akıcı ki, kendimi bir anda hikayenin ortasında buldum.",
    "Toplumsal eleştirileri ve alt metinleri ile gerçekten başucu eseri olmayı hak ediyor.",
    "Beklentilerimin çok üzerinde bir eser oldu. Her sayfasında yeni bir sorgulama içine girdim.",
    "Hikaye kurgusu biraz yavaş ilerlese de finaliyle tüm taşları yerine oturtuyor.",
    "Özellikle ana karakterin iç dünyasındaki çatışmalar beni benden aldı.",
    "Günümüz dünyasına dair çok derin gözlemler içeren, sarsıcı bir roman.",
    "Kitabın atmosferi o kadar karanlık ve etkileyici ki, günlerce etkisinden çıkamadım.",
    "Kesinlikle herkesin hayatında en az bir kez okuması gereken bir klasik.",
    "Edebiyatın gücünü bu denli hissettiren nadir kitaplardan biri olmuş."
];

function generateLongComment() {
    let comment = "";
    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
        comment += commentSnippets[Math.floor(Math.random() * commentSnippets.length)] + " ";
    }
    return comment.trim();
}

async function seedRandomData() {
    let pool;
    let redisClient;
    try {
        pool = await sql.connect(dbConfig);
        redisClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
        await redisClient.connect();

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('123', salt);

        console.log('🚀 Veri üretimi başlatıldı...');

        for (let i = 1; i <= 10; i++) {
            const username = `Musteri_${i}`;
            const email = `musteri${i}@example.com`;

            // Kullanıcı oluştur
            const userRes = await pool.request()
                .input('u', sql.NVARCHAR, username)
                .input('e', sql.NVARCHAR, email)
                .input('p', sql.NVARCHAR, passwordHash)
                .query('INSERT INTO Users (Username, Email, PasswordHash) OUTPUT INSERTED.UserID VALUES (@u, @e, @p)');
            
            const userId = userRes.recordset[0].UserID;
            console.log(`👤 Kullanıcı oluşturuldu: ${username}`);

            // Her kullanıcıya 10 kitap okut
            const shuffledBooks = [...bookPool].sort(() => 0.5 - Math.random());
            const selectedBooks = shuffledBooks.slice(0, 10);

            for (const book of selectedBooks) {
                const titleNormalized = book.title.toLowerCase().trim();
                
                // Kitap bul veya oluştur
                const bookRes = await pool.request()
                    .input('tn', sql.NVARCHAR, titleNormalized)
                    .query('SELECT BookID FROM Books WHERE TitleNormalized = @tn');
                
                let bookId;
                if (bookRes.recordset.length > 0) {
                    bookId = bookRes.recordset[0].BookID;
                } else {
                    const newBookRes = await pool.request()
                        .input('tn', sql.NVARCHAR, titleNormalized)
                        .input('a', sql.NVARCHAR, book.author)
                        .query('INSERT INTO Books (TitleNormalized, Author) OUTPUT INSERTED.BookID VALUES (@tn, @a)');
                    bookId = newBookRes.recordset[0].BookID;
                }

                // İnceleme (Review) oluştur
                const rating = 6 + Math.floor(Math.random() * 5); // 6-10 arası puan
                const comment = generateLongComment();

                await pool.request()
                    .input('uid', sql.INT, userId)
                    .input('bid', sql.INT, bookId)
                    .input('r', sql.INT, rating)
                    .input('c', sql.NVARCHAR, comment)
                    .query('INSERT INTO Reviews (UserID, BookID, Rating, Comment, Status) VALUES (@uid, @bid, @r, @c, \'Published\')');
                
                // Kitap istatistiğini güncelle
                await pool.request()
                    .input('bid', sql.INT, bookId)
                    .query('UPDATE Books SET ReviewCount = (SELECT COUNT(*) FROM Reviews WHERE BookID = @bid AND Status = \'Published\'), LastReviewAt = GETDATE() WHERE BookID = @bid');
            }
            console.log(`📚 ${username} için 10 inceleme eklendi.`);
        }

        // Cache temizle
        await redisClient.del('trending_books');
        console.log('🧹 Redis cache temizlendi.');

        console.log('✅ İşlem başarıyla tamamlandı. 10 yeni kullanıcı ve 100 yeni inceleme eklendi.');

    } catch (err) {
        console.error('❌ Hata:', err);
    } finally {
        if (pool) await pool.close();
        if (redisClient) await redisClient.quit();
    }
}

seedRandomData();
