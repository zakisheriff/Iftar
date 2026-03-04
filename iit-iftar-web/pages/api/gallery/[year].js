// pages/api/gallery/[year].js
// Server-side route — fetches files from a public Google Drive folder.
// The API key is kept server-side (never exposed in the browser).

export default async function handler(req, res) {
    const { year, pageToken, search, fetchAll } = req.query;
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
        let q = `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`;

        if (search) {
            // Clean the search string and prevent quotes breaking the query
            const sanitizedSearch = search.replace(/'/g, "\\'");
            q += ` and name contains '${sanitizedSearch}'`;
        }

        let totalCount = undefined;

        // If it's the first page load and no search query, let's quickly count all the images
        if (!pageToken && !search) {
            totalCount = 0;
            let countToken = null;
            do {
                const countParams = new URLSearchParams({
                    key: apiKey,
                    q: q,
                    fields: "nextPageToken,files(id)",
                    pageSize: "1000",
                });
                if (countToken) countParams.set("pageToken", countToken);
                const countRes = await fetch(`https://www.googleapis.com/drive/v3/files?${countParams.toString()}`);
                if (countRes.ok) {
                    const countData = await countRes.json();
                    totalCount += countData.files?.length || 0;
                    countToken = countData.nextPageToken;
                } else {
                    break;
                }
            } while (countToken);
        }

        let allFiles = [];
        let currentToken = pageToken;

        do {
            const params = new URLSearchParams({
                key: apiKey,
                q: q,
                fields: "nextPageToken,files(id,name,mimeType,thumbnailLink,webContentLink)",
                orderBy: "name",
                pageSize: fetchAll ? "1000" : "50",
            });

            if (currentToken) {
                params.set("pageToken", currentToken);
            }

            const driveRes = await fetch(
                `https://www.googleapis.com/drive/v3/files?${params.toString()}`
            );

            if (!driveRes.ok) {
                const err = await driveRes.json();
                return res.status(driveRes.status).json({ error: err.error?.message || "Drive API error" });
            }

            const data = await driveRes.json();
            allFiles = allFiles.concat(data.files || []);
            currentToken = data.nextPageToken;

        } while (fetchAll && currentToken);

        // Build clean photo objects for the frontend
        const photos = allFiles.map((file) => ({
            id: file.id,
            // Proxied through our own server — no CORS, no cookie, no browser restrictions
            thumb: `/api/img/${file.id}?sz=w600`,
            full: `/api/img/${file.id}?sz=w1200`,
            // Download still goes direct to Drive (triggers browser save dialog)
            download: `https://drive.google.com/uc?export=download&id=${file.id}`,
            name: file.name,
            // Small Google-hosted thumbnail used directly by AI search (no proxy needed)
            thumbnailLink: file.thumbnailLink || null,
        }));

        return res.status(200).json({
            photos,
            nextPageToken: currentToken || null,
            totalCount,
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
