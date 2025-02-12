const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.post('/scrape', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL not defined' });
    }

    try {
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1280, height: 800 });

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                const distance = 100;
                const timer = setInterval(() => {
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    if (totalHeight >= document.body.scrollHeight) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            });
        });

        const images = await page.evaluate(() => {
            const imgTags = [...document.querySelectorAll('img')].map(img => img.src);
            const bgImages = [...document.querySelectorAll('*')]
                .map(el => window.getComputedStyle(el).backgroundImage)
                .filter(url => url.startsWith('url('))
                .map(url => url.replace(/^url\(["']?/, '').replace(/["']?\)$/, ''));

            return [...new Set([...imgTags, ...bgImages])];
        });

        await browser.close();
        res.json({ images });

    } catch (error) {
        res.status(500).json({ error: 'Error trying to get images', details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`server started in http://localhost:${PORT}`);
});
