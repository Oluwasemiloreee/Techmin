const { getNews } = require('../server/news-service');

module.exports = async function handler(req, res) {
  try {
    const payload = await getNews();
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800');
    res.status(payload.articles.length ? 200 : 503).json(payload);
  } catch (error) {
    res.status(500).json({ error: 'Unable to load news right now.' });
  }
};
