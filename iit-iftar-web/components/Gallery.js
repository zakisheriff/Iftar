import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import styles from './Gallery.module.css';

export default function Gallery({ year, staticImages }) {
    const [photos, setPhotos] = useState([]);
    const [nextPageToken, setNextPageToken] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [useDrive, setUseDrive] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(null);

    // On mount: try to load from Drive API; fall back to staticImages
    useEffect(() => {
        if (!year) return;
        setLoading(true);
        fetch(`/api/gallery/${year}`)
            .then((r) => r.json())
            .then((data) => {
                if (data.error) {
                    // API not configured — fall back to placeholder images
                    setUseDrive(false);
                    setPhotos(
                        (staticImages || []).map((src, i) => ({
                            id: String(i),
                            thumb: src,
                            full: src,
                            name: `Photo ${i + 1}`,
                        }))
                    );
                } else {
                    setUseDrive(true);
                    setPhotos(data.photos || []);
                    setNextPageToken(data.nextPageToken || null);
                }
                setLoading(false);
            })
            .catch(() => {
                // Network error — fall back
                setUseDrive(false);
                setPhotos(
                    (staticImages || []).map((src, i) => ({
                        id: String(i),
                        thumb: src,
                        full: src,
                        name: `Photo ${i + 1}`,
                    }))
                );
                setLoading(false);
            });
    }, [year, staticImages]);

    const loadMore = () => {
        if (!nextPageToken || loadingMore) return;
        setLoadingMore(true);
        fetch(`/api/gallery/${year}?pageToken=${nextPageToken}`)
            .then((r) => r.json())
            .then((data) => {
                setPhotos((prev) => [...prev, ...(data.photos || [])]);
                setNextPageToken(data.nextPageToken || null);
                setLoadingMore(false);
            })
            .catch(() => setLoadingMore(false));
    };

    // ── Lightbox ──
    const openLightbox = (i) => setLightboxIndex(i);
    const closeLightbox = () => setLightboxIndex(null);

    const prev = useCallback(() => {
        setLightboxIndex((i) => (i - 1 + photos.length) % photos.length);
    }, [photos.length]);

    const next = useCallback(() => {
        setLightboxIndex((i) => (i + 1) % photos.length);
    }, [photos.length]);

    useEffect(() => {
        const handler = (e) => {
            if (lightboxIndex === null) return;
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft') prev();
            if (e.key === 'ArrowRight') next();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [lightboxIndex, prev, next]);

    if (loading) {
        return (
            <div className={styles.loadingState}>
                <div className={styles.spinner} />
                <p>Loading photos...</p>
            </div>
        );
    }

    if (error) {
        return <div className={styles.errorState}>{error}</div>;
    }

    if (photos.length === 0) {
        return (
            <div className={styles.emptyState}>
                <p>Photos coming soon.</p>
                <p className={styles.emptyHint}>Add a Drive folder ID in .env.local to show them here.</p>
            </div>
        );
    }

    return (
        <>
            {useDrive && (
                <div className={styles.driveTag}>
                    <svg width="14" height="14" viewBox="0 0 87.3 78" style={{ marginRight: 6, verticalAlign: 'middle' }}>
                        <path fill="#0066da" d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L27.5 53H0c0 1.55.4 3.1 1.2 4.5z" />
                        <path fill="#00ac47" d="M43.65 25L29.9 0c-1.35.8-2.5 1.9-3.3 3.3L1.2 48.5A9 9 0 0 0 0 53h27.5z" />
                        <path fill="#ea4335" d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 10.9z" />
                        <path fill="#00832d" d="M43.65 25L57.4 0H29.9z" />
                        <path fill="#2684fc" d="M59.8 53H87.3l-13.75-23.75A9 9 0 0 0 70.25 26H43.65L57.4 50.1z" />
                        <path fill="#ffba00" d="M43.65 25L29.9 0H13.8l-9.9 17.15z" />
                    </svg>
                    Loaded from Google Drive · {photos.length} photos
                </div>
            )}

            <div className={styles.grid}>
                {photos.map((photo, i) => (
                    <button
                        key={photo.id}
                        className={styles.thumb}
                        onClick={() => openLightbox(i)}
                        aria-label={`Open photo ${i + 1}`}
                    >
                        {/* Use regular <img> for Drive thumbnails — Next/Image requires configured remote domains */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={photo.thumb}
                            alt={photo.name}
                            className={styles.thumbImg}
                            loading="lazy"
                        />
                        <div className={styles.thumbOverlay}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                                <line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
                            </svg>
                        </div>
                    </button>
                ))}
            </div>

            {/* Load More */}
            {nextPageToken && (
                <div className={styles.loadMoreWrap}>
                    <button
                        className={styles.loadMoreBtn}
                        onClick={loadMore}
                        disabled={loadingMore}
                    >
                        {loadingMore ? (
                            <><div className={styles.spinnerSm} /> Loading…</>
                        ) : (
                            <>Load More Photos</>
                        )}
                    </button>
                </div>
            )}

            {/* Lightbox */}
            {lightboxIndex !== null && (
                <div className={styles.lightbox} onClick={closeLightbox}>
                    <button className={styles.closeBtn} onClick={closeLightbox} aria-label="Close">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                    <button className={`${styles.navBtn} ${styles.navLeft}`} onClick={(e) => { e.stopPropagation(); prev(); }} aria-label="Previous">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                    </button>
                    <div className={styles.lightboxImg} onClick={(e) => e.stopPropagation()}>
                        {/* Full-res image for lightbox */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={photos[lightboxIndex].full}
                            alt={photos[lightboxIndex].name}
                            className={styles.lbImage}
                        />
                    </div>
                    <button className={`${styles.navBtn} ${styles.navRight}`} onClick={(e) => { e.stopPropagation(); next(); }} aria-label="Next">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </button>
                    <div className={styles.counter}>{lightboxIndex + 1} / {photos.length}</div>
                </div>
            )}
        </>
    );
}
