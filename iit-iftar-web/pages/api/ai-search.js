// pages/api/ai-search.js
// AI-powered semantic photo search using Google Gemini Vision.
//
// The client pre-fetches thumbnails at w100 size and sends base64 directly.
// This server just calls Gemini — no server-side image fetching at all.
// ONE Gemini call for all images → fast, no rate limit issues.

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
                `You are a strict photo relevance scorer for an event gallery search.\n` +
                `The user is looking for: "${query.trim()}"\n\n` +
                `You will see ${images.length} photos, each labeled with a Photo ID.\n` +
                `Score each 0–100 based on how well the photo visually matches the search:\n` +
                `  80–100 = clear, direct match (the described person/object is prominent)\n` +
                `  50–79  = partial match (matches but not the main subject)\n` +
                `  20–49  = loosely related (similar scene/type but not a match)\n` +
                `  0–19   = does not match\n\n` +
                `Be STRICT. Only score ≥ 50 if the match is clear and visible.\n` +
                `Do NOT inflate scores. Photos without the described element should score ≤ 20.\n\n` +
                `Reply ONLY with a JSON array, no markdown:\n` +
                `[{"id":"PHOTO_ID","score":NUMBER}, ...]`,
        },
    ];

    for (const img of images) {
        if (!img.data || !img.id) continue;
        parts.push({
            inlineData: {
                mimeType: img.mimeType || 'image/jpeg',
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
                    maxOutputTokens: 8192,
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

    // Extract JSON array (strip markdown fences if present)
    const jsonMatch = raw.match(/\[[\s\S]*?\]/);
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
    return res.status(200).json({ results });
}
