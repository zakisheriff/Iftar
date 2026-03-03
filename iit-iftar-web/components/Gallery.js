import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import styles from './Gallery.module.css';

export default function Gallery({ year, staticImages }) {
    const [photos, setPhotos] = useState([]);
    const [nextPageToken, setNextPageToken] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingAction, setLoadingAction] = useState('none'); // 'none', 'more', 'all'
    const [error, setError] = useState(null);
    const [useDrive, setUseDrive] = useState(false);
    const [totalPhotos, setTotalPhotos] = useState(null);
    const [lightboxIndex, setLightboxIndex] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchInput, setSearchInput] = useState('');

    // On mount or search: try to load from Drive API; fall back to staticImages
    useEffect(() => {
        if (!year) return;
        setLoading(true);

        let url = `/api/gallery/${year}`;
        if (searchQuery) {
            url += `?search=${encodeURIComponent(searchQuery)}`;
        }

        fetch(url)
            .then((r) => r.json())
            .then((data) => {
                if (data.error) {
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
                    if (data.totalCount !== undefined) setTotalPhotos(data.totalCount);
                }
                setLoading(false);
            })
            .catch(() => {
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
    }, [year, staticImages, searchQuery]);

    const loadMore = () => {
        if (!nextPageToken || loadingAction !== 'none') return;
        setLoadingAction('more');

        let url = `/api/gallery/${year}?pageToken=${nextPageToken}`;
        if (searchQuery) {
            url += `&search=${encodeURIComponent(searchQuery)}`;
        }

        fetch(url)
            .then((r) => r.json())
            .then((data) => {
                setPhotos((prev) => [...prev, ...(data.photos || [])]);
                setNextPageToken(data.nextPageToken || null);
                setLoadingAction('none');
            })
            .catch(() => setLoadingAction('none'));
    };

    const loadAll = () => {
        if (!nextPageToken || loadingAction !== 'none') return;
        setLoadingAction('all');

        // Use query params to tell the backend to run the fetchAll loop
        let url = `/api/gallery/${year}?fetchAll=true`;
        if (searchQuery) {
            url += `&search=${encodeURIComponent(searchQuery)}`;
        }

        fetch(url)
            .then((r) => r.json())
            .then((data) => {
                setPhotos(data.photos || []);
                setNextPageToken(null);
                setLoadingAction('none');
            })
            .catch(() => setLoadingAction('none'));
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

    useEffect(() => {
        if (lightboxIndex === null || photos.length === 0) return;
        const preload = (idx) => {
            const img = new window.Image();
            img.src = photos[idx].full;
        };
        preload((lightboxIndex + 1) % photos.length);
        preload((lightboxIndex - 1 + photos.length) % photos.length);
    }, [lightboxIndex, photos]);

    // Strong body lock for desktop trackpad zooming
    useEffect(() => {
        if (lightboxIndex !== null) {
            const currentScrollY = window.scrollY;
            document.body.style.position = 'fixed';
            document.body.style.top = `-${currentScrollY}px`;
            document.body.style.width = '100%';
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';

            return () => {
                document.body.style.position = '';
                document.body.style.top = '';
                document.body.style.width = '';
                document.body.style.overflow = '';
                document.documentElement.style.overflow = '';

                // Temporarily disable smooth scrolling to snap instantly
                const origBehavior = document.documentElement.style.scrollBehavior;
                document.documentElement.style.scrollBehavior = 'auto';
                window.scrollTo(0, currentScrollY);
                // Restore original behavior after the frame renders
                requestAnimationFrame(() => {
                    document.documentElement.style.scrollBehavior = origBehavior;
                });
            };
        }
    }, [lightboxIndex]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setSearchQuery(searchInput.trim());
    };

    if (loading && !photos.length) {
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

    if (photos.length === 0 && !searchQuery) {
        return (
            <div className={styles.emptyState}>
                <p>Photos coming soon.</p>
                <p className={styles.emptyHint}>Add a Drive folder ID in .env.local to show them here.</p>
            </div>
        );
    }

    return (
        <div className={styles.galleryContainer}>
            {useDrive && (
                <div className={styles.galleryHeader}>
                    <div className={styles.driveTag}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, verticalAlign: 'middle' }}>
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                        {totalPhotos ? `Loaded ${photos.length} / ${totalPhotos} photos` : `Loaded ${photos.length} photos`}
                    </div>

                    <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
                        <div className={styles.searchWrapper}>
                            <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search image name..."
                                className={styles.searchInput}
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                            />
                            {searchQuery && (
                                <button type="button" className={styles.clearSearch} onClick={() => { setSearchInput(''); setSearchQuery(''); }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            )}
                            <button type="submit" className={styles.searchButton}>
                                Search
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {photos.length === 0 && searchQuery ? (
                <div className={styles.emptySearch}>
                    <p>No photos found matching "{searchQuery}".</p>
                    <button className={styles.searchButton} onClick={() => { setSearchInput(''); setSearchQuery(''); }}>
                        Clear Search
                    </button>
                </div>
            ) : (
                <div className={styles.grid}>
                    {photos.map((photo, i) => (
                        <button
                            key={photo.id}
                            className={styles.thumb}
                            onClick={() => openLightbox(i)}
                            aria-label={`Open photo ${i + 1}`}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={photo.thumb}
                                alt={photo.name}
                                className={styles.thumbImg}
                                loading="lazy"
                                onError={(e) => { e.target.style.opacity = '0'; }}
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
            )}

            {/* Load More & View All */}
            {nextPageToken && !searchQuery && (
                <div className={styles.loadMoreWrap}>
                    <button
                        className={styles.loadMoreBtn}
                        onClick={loadMore}
                        disabled={loadingAction !== 'none'}
                    >
                        {loadingAction === 'more' ? (
                            <><span className={styles.spinnerSm} /> Loading…</>
                        ) : (
                            <>Load More Photos</>
                        )}
                    </button>
                    <button
                        className={styles.viewAllBtn}
                        onClick={loadAll}
                        disabled={loadingAction !== 'none'}
                    >
                        {loadingAction === 'all' ? (
                            <><span className={styles.spinnerSm} /> Loading All…</>
                        ) : (
                            <>View All</>
                        )}
                    </button>
                </div>
            )}

            {/* ── Lightbox ── */}
            {lightboxIndex !== null && (
                <div className={styles.lightbox} onClick={closeLightbox}>

                    {/* TOP BAR: filename + download + close */}
                    <div className={styles.lbTop} onClick={(e) => e.stopPropagation()}>
                        <span className={styles.lbFileName}>{photos[lightboxIndex].name}</span>
                        <div className={styles.lbTopRight}>
                            <a
                                href={photos[lightboxIndex].download || photos[lightboxIndex].full}
                                target="_blank"
                                rel="noreferrer"
                                className={styles.downloadBtn}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                Download
                            </a>
                            <button className={styles.closeBtn} onClick={closeLightbox} aria-label="Close">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* MIDDLE: prev arrow + image + next arrow */}
                    <div className={styles.lbCenter} onClick={(e) => e.stopPropagation()}>
                        <button className={styles.lbArrow} onClick={(e) => { e.stopPropagation(); prev(); }} aria-label="Previous">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 18l-6-6 6-6" />
                            </svg>
                        </button>

                        <div className={styles.lbImgWrap}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                key={`blur-${photos[lightboxIndex].id}`}
                                src={photos[lightboxIndex].thumb}
                                alt=""
                                aria-hidden="true"
                                className={styles.lbBlur}
                            />
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                key={photos[lightboxIndex].id}
                                src={photos[lightboxIndex].full}
                                alt={photos[lightboxIndex].name}
                                className={styles.lbImage}
                                onLoad={(e) => e.target.classList.add(styles.lbImageLoaded)}
                            />
                        </div>

                        <button className={styles.lbArrow} onClick={(e) => { e.stopPropagation(); next(); }} aria-label="Next">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 18l6-6-6-6" />
                            </svg>
                        </button>
                    </div>

                    {/* BOTTOM: counter */}
                    <div className={styles.lbBottom}>
                        {lightboxIndex + 1} / {photos.length}
                    </div>

                </div>
            )}
        </div>
    );
}
