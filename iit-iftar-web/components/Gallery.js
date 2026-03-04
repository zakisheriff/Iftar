import { useState, useEffect, useCallback } from 'react';
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

    // Search state
    const [searchMode, setSearchMode] = useState('name'); // 'name' | 'ai'
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // AI search state
    const [aiLoading, setAiLoading] = useState(false);
    const [aiResults, setAiResults] = useState(null); // null = not searched; [] = no results
    const [aiError, setAiError] = useState(null);

    // On mount or name search: load from Drive API; fall back to staticImages
    useEffect(() => {
        if (!year) return;
        setLoading(true);

        let url = `/api/gallery/${year}`;
        if (searchMode === 'name' && searchQuery) {
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
    }, [year, staticImages, searchMode === 'name' ? searchQuery : null]); // eslint-disable-line

    // ── AI Search ──
    const runAiSearch = async (query) => {
        if (!query.trim() || photos.length === 0) return;
        setAiLoading(true);
        setAiResults(null);
        setAiError(null);

        try {
            // ── Step 1: If there are more pages, auto-fetch ALL photos first ──
            let allPhotos = photos;
            if (nextPageToken) {
                const r = await fetch(`/api/gallery/${year}?fetchAll=true`);
                if (r.ok) {
                    const d = await r.json();
                    if (d.photos?.length) {
                        allPhotos = d.photos;
                        setPhotos(d.photos);
                        setNextPageToken(null);
                        if (d.totalCount !== undefined) setTotalPhotos(d.totalCount);
                    }
                }
            }

            // ── Step 2: Fetch all thumbnails at w100 in parallel (client-side) ──
            const fetchBase64 = (photo) =>
                new Promise((resolve) => {
                    const url = photo.thumb.replace(/sz=\w+/, 'sz=w100');
                    fetch(url)
                        .then((r) => {
                            if (!r.ok) return resolve(null);
                            const mimeType = r.headers.get('content-type') || 'image/jpeg';
                            return r.blob().then((blob) => {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                    const base64 = reader.result.split(',')[1];
                                    resolve({ id: photo.id, data: base64, mimeType });
                                };
                                reader.onerror = () => resolve(null);
                                reader.readAsDataURL(blob);
                            });
                        })
                        .catch(() => resolve(null));
                });

            // All in parallel — browser handles concurrent requests efficiently
            const imageResults = await Promise.all(allPhotos.map(fetchBase64));
            const images = imageResults.filter(Boolean);

            if (images.length === 0) {
                throw new Error('Could not load any thumbnails for AI search.');
            }

            // ── Step 3: One Gemini call for all photos ──
            const res = await fetch('/api/ai-search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: query.trim(), images }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'AI search failed');
            setAiResults(data.results || []);
        } catch (err) {
            setAiError(err.message);
        } finally {
            setAiLoading(false);
        }
    };

    const loadMore = () => {
        if (!nextPageToken || loadingAction !== 'none') return;
        setLoadingAction('more');

        let url = `/api/gallery/${year}?pageToken=${nextPageToken}`;
        if (searchMode === 'name' && searchQuery) {
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

        let url = `/api/gallery/${year}?fetchAll=true`;
        if (searchMode === 'name' && searchQuery) {
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
        setLightboxIndex((i) => (i - 1 + displayPhotos.length) % displayPhotos.length);
    }, [photos.length, aiResults]); // eslint-disable-line

    const next = useCallback(() => {
        setLightboxIndex((i) => (i + 1) % displayPhotos.length);
    }, [photos.length, aiResults]); // eslint-disable-line

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
        if (lightboxIndex === null || displayPhotos.length === 0) return;
        const preload = (idx) => {
            const img = new window.Image();
            img.src = displayPhotos[idx].full;
        };
        preload((lightboxIndex + 1) % displayPhotos.length);
        preload((lightboxIndex - 1 + displayPhotos.length) % displayPhotos.length);
    }, [lightboxIndex, photos, aiResults]); // eslint-disable-line

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

                const origBehavior = document.documentElement.style.scrollBehavior;
                document.documentElement.style.scrollBehavior = 'auto';
                window.scrollTo(0, currentScrollY);
                requestAnimationFrame(() => {
                    document.documentElement.style.scrollBehavior = origBehavior;
                });
            };
        }
    }, [lightboxIndex]);

    // ── Mode switching ──
    const switchMode = (mode) => {
        setSearchMode(mode);
        setSearchInput('');
        setSearchQuery('');
        setAiResults(null);
        setAiError(null);
    };

    // ── Search submit ──
    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchMode === 'name') {
            setSearchQuery(searchInput.trim());
        } else {
            runAiSearch(searchInput);
        }
    };

    // ── Display photos (sorted by AI score if in AI mode) ──
    const scoreMap = {};
    if (aiResults) {
        aiResults.forEach(({ id, score }) => { scoreMap[id] = score; });
    }

    const displayPhotos = (() => {
        if (searchMode === 'ai' && aiResults) {
            // Filter to score >= 20, sorted by score desc
            return photos
                .filter((p) => (scoreMap[p.id] ?? 0) >= 40)
                .sort((a, b) => (scoreMap[b.id] ?? 0) - (scoreMap[a.id] ?? 0));
        }
        return photos;
    })();

    // ── Render ──
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

                    {/* Search area */}
                    <div className={styles.searchArea}>
                        {/* Mode toggle */}
                        <div className={styles.searchToggle}>
                            <button
                                type="button"
                                className={`${styles.searchToggleBtn} ${searchMode === 'name' ? styles.searchToggleActive : ''}`}
                                onClick={() => switchMode('name')}
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                                Name
                            </button>
                            <button
                                type="button"
                                className={`${styles.searchToggleBtn} ${searchMode === 'ai' ? styles.searchToggleActive : ''}`}
                                onClick={() => switchMode('ai')}
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                </svg>
                                AI Search
                            </button>
                        </div>

                        {/* Search input */}
                        <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
                            <div className={`${styles.searchWrapper} ${searchMode === 'ai' ? styles.searchWrapperAi : ''}`}>
                                {searchMode === 'ai' ? (
                                    <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                    </svg>
                                ) : (
                                    <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                                    </svg>
                                )}
                                <input
                                    type="text"
                                    placeholder={searchMode === 'ai' ? 'Describe what you see… e.g. man in blue kurta' : 'Search image name...'}
                                    className={styles.searchInput}
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                />
                                {(searchQuery || aiResults) && (
                                    <button
                                        type="button"
                                        className={styles.clearSearch}
                                        onClick={() => { setSearchInput(''); setSearchQuery(''); setAiResults(null); setAiError(null); }}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    className={`${styles.searchButton} ${searchMode === 'ai' ? styles.searchButtonAi : ''}`}
                                    disabled={aiLoading}
                                >
                                    {aiLoading ? <span className={styles.spinnerSm} /> : 'Search'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* AI thinking state */}
            {aiLoading && (
                <div className={styles.aiThinking}>
                    <div className={styles.aiThinkingDots}>
                        <span /><span /><span />
                    </div>
                    <p>AI is searching <strong>all photos</strong> for <em>&ldquo;{searchInput}&rdquo;</em>&hellip;</p>
                    <span className={styles.aiThinkingHint}>Auto-loading all photos · one Gemini call · may take ~20–40 sec</span>
                </div>
            )}

            {/* AI error */}
            {aiError && !aiLoading && (
                <div className={styles.aiErrorBanner}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {aiError}
                </div>
            )}

            {/* AI results count */}
            {searchMode === 'ai' && aiResults && !aiLoading && (
                <div className={styles.aiResultsSummary}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    {displayPhotos.length > 0
                        ? `AI found ${displayPhotos.length} matching photo${displayPhotos.length !== 1 ? 's' : ''} for "${searchInput}"`
                        : `No photos matched "${searchInput}"`}
                </div>
            )}

            {/* Empty name search */}
            {photos.length === 0 && searchMode === 'name' && searchQuery ? (
                <div className={styles.emptySearch}>
                    <p>No photos found matching &ldquo;{searchQuery}&rdquo;.</p>
                    <button className={styles.searchButton} onClick={() => { setSearchInput(''); setSearchQuery(''); }}>
                        Clear Search
                    </button>
                </div>
            ) : (
                !aiLoading && (
                    displayPhotos.length === 0 && searchMode === 'ai' && aiResults ? (
                        <div className={styles.emptySearch}>
                            <p>No photos matched your description.</p>
                            <p style={{ fontSize: '13px', opacity: 0.6 }}>Try a different description, or load more photos first.</p>
                            <button className={styles.searchButton} onClick={() => { setSearchInput(''); setAiResults(null); }}>
                                Clear Search
                            </button>
                        </div>
                    ) : (
                        <div className={styles.grid}>
                            {displayPhotos.map((photo, i) => {
                                const score = scoreMap[photo.id];
                                return (
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
                                        {/* AI relevance badge */}
                                        {searchMode === 'ai' && score !== undefined && (
                                            <div className={`${styles.aiMatchBadge} ${score >= 85 ? styles.aiMatchBadgeHigh : ''}`}>
                                                ★ {score}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )
                )
            )}

            {/* Load More & View All — hide during AI search */}
            {nextPageToken && searchMode !== 'ai' && !searchQuery && (
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
            {lightboxIndex !== null && displayPhotos[lightboxIndex] && (
                <div className={styles.lightbox} onClick={closeLightbox}>

                    {/* TOP BAR: filename + download + close */}
                    <div className={styles.lbTop} onClick={(e) => e.stopPropagation()}>
                        <span className={styles.lbFileName}>{displayPhotos[lightboxIndex].name}</span>
                        <div className={styles.lbTopRight}>
                            <a
                                href={displayPhotos[lightboxIndex].download || displayPhotos[lightboxIndex].full}
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

                    {/* MIDDLE: image */}
                    <div className={styles.lbCenter} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.lbImgWrap}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                key={`blur-${displayPhotos[lightboxIndex].id}`}
                                src={displayPhotos[lightboxIndex].thumb}
                                alt=""
                                aria-hidden="true"
                                className={styles.lbBlur}
                            />
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                key={displayPhotos[lightboxIndex].id}
                                src={displayPhotos[lightboxIndex].full}
                                alt={displayPhotos[lightboxIndex].name}
                                className={styles.lbImage}
                                onLoad={(e) => e.target.classList.add(styles.lbImageLoaded)}
                            />
                        </div>
                    </div>

                    {/* BOTTOM: controls & counter */}
                    <div className={styles.lbBottom}>
                        <button className={styles.lbArrow} onClick={(e) => { e.stopPropagation(); prev(); }} aria-label="Previous">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 18l-6-6 6-6" />
                            </svg>
                        </button>
                        <div className={styles.lbCounter}>
                            {lightboxIndex + 1} / {displayPhotos.length}
                        </div>
                        <button className={styles.lbArrow} onClick={(e) => { e.stopPropagation(); next(); }} aria-label="Next">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 18l6-6-6-6" />
                            </svg>
                        </button>
                    </div>

                </div>
            )}
        </div>
    );
}
