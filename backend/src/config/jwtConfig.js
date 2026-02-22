module.exports = {
    secret: process.env.JWT_SECRET || 'secret',
    expire: process.env.JWT_EXPIRE || '30d'
};
