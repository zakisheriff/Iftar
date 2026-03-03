// pages/api/img/[fileId].js
// Image proxy — fetches Drive thumbnails server-side (no CORS issues).
// Browser always sees a same-origin request regardless of Drive CORS headers.

export default async function handler(req, res) {
    const { fileId, sz = 'w600' } = req.query;

    if (!fileId) {
        return res.status(400).end('Missing fileId');
    }

    const driveUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=${sz}`;

    try {
        const imgRes = await fetch(driveUrl, {
            headers: {
                // Mimic a normal browser request so Drive serves the image
                'User-Agent': 'Mozilla/5.0 (compatible; Next.js image proxy)',
                'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
            },
            redirect: 'follow',
        });

        if (!imgRes.ok) {
            return res.status(imgRes.status).end('Drive error');
        }

        const buffer = await imgRes.arrayBuffer();
        const contentType = imgRes.headers.get('content-type') || 'image/jpeg';

        // Cache for 24h in the browser, 7 days on CDN/edge
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800');
        res.status(200).send(Buffer.from(buffer));
    } catch (err) {
        res.status(500).end('Proxy error: ' + err.message);
    }
}
