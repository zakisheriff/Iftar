// pages/api/gallery/[year].js
// Server-side route — fetches files from a public Google Drive folder.
// The API key is kept server-side (never exposed in the browser).

export default async function handler(req, res) {
    const { year, pageToken } = req.query;
    const apiKey = process.env.GOOGLE_DRIVE_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: "GOOGLE_DRIVE_API_KEY not configured in .env.local" });
    }

    // Map year -> Drive folder ID (set in .env.local)
    const folderIds = {
        "2022": process.env.DRIVE_FOLDER_2022,
        "2023": process.env.DRIVE_FOLDER_2023,
        "2024": process.env.DRIVE_FOLDER_2024,
        "2025": process.env.DRIVE_FOLDER_2025,
        "2026": process.env.DRIVE_FOLDER_2026,
    };

    const folderId = folderIds[year];
    if (!folderId) {
        return res.status(404).json({ error: `No Drive folder configured for year ${year}` });
    }

    try {
        // Only return image files, ordered by name, 50 per page
        const params = new URLSearchParams({
            key: apiKey,
            q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
            fields: "nextPageToken,files(id,name,mimeType,thumbnailLink,webContentLink)",
            orderBy: "name",
            pageSize: "50",
        });

        if (pageToken) {
            params.set("pageToken", pageToken);
        }

        const driveRes = await fetch(
            `https://www.googleapis.com/drive/v3/files?${params.toString()}`
        );

        if (!driveRes.ok) {
            const err = await driveRes.json();
            return res.status(driveRes.status).json({ error: err.error?.message || "Drive API error" });
        }

        const data = await driveRes.json();

        // Build clean photo objects for the frontend
        const photos = (data.files || []).map((file) => ({
            id: file.id,
            // Proxied through our own server — no CORS, no cookie, no browser restrictions
            thumb: `/api/img/${file.id}?sz=w600`,
            full: `/api/img/${file.id}?sz=w1200`,
            // Download still goes direct to Drive (triggers browser save dialog)
            download: `https://drive.google.com/uc?export=download&id=${file.id}`,
            name: file.name,
        }));

        return res.status(200).json({
            photos,
            nextPageToken: data.nextPageToken || null,
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
