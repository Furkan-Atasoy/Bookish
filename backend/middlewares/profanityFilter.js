const bannedWords = [
    'badword', 'idiot', 'stupid', 'curse', 'offensive',
    'spam', 'trash', 'garbage', 'f*ck', 's*it', 'hate',
    'loser', 'moron', 'dumb', 'useless',
];

const profanityFilter = (req, res, next) => {
    const { comment } = req.body;

    if (!comment) {
        req.reviewStatus = 'Published';
        req.isFlagged = false;
        return next();
    }

    const lowerComment = comment.toLowerCase();
    const containsProfanity = bannedWords.some(word => lowerComment.includes(word));

    if (containsProfanity) {
        req.reviewStatus = 'Blocked';
        req.isFlagged = true;
    } else {
        req.reviewStatus = 'Published';
        req.isFlagged = false;
    }

    next();
};

module.exports = profanityFilter;
