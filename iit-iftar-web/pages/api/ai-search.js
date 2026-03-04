// pages/api/ai-search.js
// AI-powered semantic photo search using Google Gemini Vision.
// Client pre-fetches thumbnails at w100 and sends base64 directly.
// Server makes ONE Gemini call — no server-side image fetching.

// Raise Next.js body limit — 348 photos × ~5KB base64 each ≈ 10–15 MB
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '50mb',
        },
    },
};

// Only these MIME types are valid for Gemini inlineData
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

function normalizeMime(raw) {
    // Strip parameters like "; charset=utf-8"
    const base = (raw || '').split(';')[0].trim().toLowerCase();
    return ALLOWED_MIME.has(base) ? base : 'image/jpeg';
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(503).json({
            error: 'AI Search is not configured. Add GEMINI_API_KEY to .env.local.',
        });
    }

    const { query, images } = req.body;
    // images: [{ id: string, data: base64string, mimeType: string }]

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return res.status(400).json({ error: 'A search query is required.' });
    }
    if (!Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ error: 'No images provided.' });
    }

    // Build Gemini parts: system prompt, then (image, id_label) pairs
    const parts = [
        {
            text:
                `You are a photo relevance scorer for an event photo gallery.\n` +
                `The user is searching for: "${query.trim()}"\n\n` +
                `You will see ${images.length} photos, each labeled with a Photo ID.\n` +
                `Score each photo 0–100 based on visual match:\n` +
                `  70–100 = clear match (described person/clothing/item clearly visible)\n` +
                `  40–69  = partial match (present but not the focus, or partially visible)\n` +
                `  20–39  = loosely related (similar but not a match)\n` +
                `  0–19   = unrelated\n\n` +
                `Important: these are small thumbnails so clothing colors may appear slightly different.\n` +
                `If a photo likely contains the described person based on visible clothing/features, score ≥ 50.\n` +
                `Do not over-filter — it's better to include a likely match than miss it.\n\n` +
                `Reply ONLY with a JSON array, no markdown, no extra text:\n` +
                `[{"id":"PHOTO_ID","score":NUMBER}, ...]`,
        },
    ];

    for (const img of images) {
        if (!img.data || !img.id) continue;
        parts.push({
            inlineData: {
                mimeType: normalizeMime(img.mimeType), // clean mime — no extra params
                data: img.data,
            },
        });
        parts.push({ text: `Photo ID: ${img.id}` });
    }

    const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts }],
                generationConfig: {
                    temperature: 0.05,
                    maxOutputTokens: 32768,
                },
            }),
        }
    );

    if (!geminiRes.ok) {
        const err = await geminiRes.json();
        return res.status(geminiRes.status).json({
            error: err.error?.message || `Gemini API error ${geminiRes.status}`,
        });
    }

    const geminiData = await geminiRes.json();
    const raw = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

    // Greedy match — captures the full JSON array (not just the first tiny match)
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
        return res.status(200).json({ results: [] });
    }

    let results;
    try {
        results = JSON.parse(jsonMatch[0]);
    } catch {
        return res.status(200).json({ results: [] });
    }

    results.sort((a, b) => b.score - a.score);
    return res.status(200).json({
        results,
        // Debug fields — remove once working
        _debug: {
            rawPreview: raw.slice(0, 500),
            parsedCount: results.length,
            topScores: results.slice(0, 5).map(r => r.score),
        },
    });
}
