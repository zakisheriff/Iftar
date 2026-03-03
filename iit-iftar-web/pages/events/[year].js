import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import Gallery from '../../components/Gallery';
import events from '../../data/events';
import styles from '../../styles/Event.module.css';

export async function getStaticPaths() {
    return {
        paths: events.map((e) => ({ params: { year: e.slug } })),
        fallback: false,
    };
}

export async function getStaticProps({ params }) {
    const event = events.find((e) => e.slug === params.year) || null;
    const currentIndex = events.findIndex((e) => e.slug === params.year);
    const prev = currentIndex > 0 ? events[currentIndex - 1] : null;
    const next = currentIndex < events.length - 1 ? events[currentIndex + 1] : null;
    return { props: { event, prev, next } };
}

export default function EventPage({ event, prev, next }) {
    if (!event) return null;
    const { comingSoon } = event;

    return (
        <>
            <Head>
                <title>{`${event.title} — IIT Iftar`}</title>
                <meta name="description" content={`${event.theme} · ${event.date} · ${event.venue}`} />
                <link rel="icon" href="/iftar-logo.png" />
            </Head>

            <Navbar />

            <main className={styles.main}>
                {/* ── HEADER ── */}
                <header className={styles.header}>
                    <div className={styles.container}>
                        <div className={styles.headerTop}>
                            <Link href="/#events" className={styles.backLink}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
                                </svg>
                                All Events
                            </Link>
                        </div>

                        <div className={styles.headerGrid}>
                            <div className={styles.headerTitleArea}>
                                <div className={styles.heroMeta}>
                                    <span className={styles.heroYear}>{event.year}</span>
                                    {comingSoon && <span className={styles.comingSoonPill}>Coming Soon</span>}
                                </div>
                                <h1 className={styles.heroTitle}>{event.title}</h1>
                                <p className={styles.heroTheme}>{event.theme}</p>
                            </div>

                            <div className={styles.headerInfoArea}>
                                <blockquote className={styles.heroQuote}>
                                    "{event.themeQuote}"
                                </blockquote>

                                <div className={styles.heroFacts}>
                                    <div className={styles.heroFact}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                                        </svg>
                                        {event.date}
                                    </div>
                                    <span className={styles.heroFactDot} />
                                    <div className={styles.heroFact}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                                        </svg>
                                        {event.venue}
                                    </div>
                                    {!comingSoon && event.attendees > 0 && (
                                        <>
                                            <span className={styles.heroFactDot} />
                                            <div className={styles.heroFact}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                                </svg>
                                                {event.attendees.toLocaleString()} guests
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* ── BANNER IMAGE ── */}
                <section className={styles.bannerSection}>
                    <div className={styles.container}>
                        <div className={styles.heroBanner}>
                            <Image
                                src={event.coverImage}
                                alt={event.title}
                                fill
                                className={styles.heroBannerImg}
                                priority
                                sizes="100vw"
                            />
                            <div className={styles.heroBannerOverlay} />
                        </div>
                    </div>
                </section>

                {/* ── COMING SOON BANNER (2026 only) ── */}
                {comingSoon && (
                    <section className={styles.comingSoonSection}>
                        <div className={styles.container}>
                            <div className={styles.comingSoonInner}>
                                <div className={styles.comingSoonIcon}>
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className={styles.comingSoonTitle}>This event hasn't happened yet</h2>
                                    <p className={styles.comingSoonDesc}>
                                        IIT Iftar 2026 is happening on <strong>March 9, 2026</strong> at <strong>Temple Trees, Colombo</strong>.
                                        Photos and highlights will be published here after the event.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* ── THE STORY ── */}
                <section className={styles.storySection}>
                    <div className={styles.container}>
                        <div className={styles.storyGrid}>
                            <div className={styles.storySide}>
                                <p className={styles.sectionEyebrow}>
                                    {comingSoon ? 'What to Expect' : 'The Story'}
                                </p>
                                <h2 className={styles.sectionTitle}>
                                    {comingSoon
                                        ? `What's planned for ${event.title}`
                                        : `What happened at ${event.title}`}
                                </h2>
                                {!comingSoon && (
                                    <div className={styles.storyDetailsCard}>
                                        <div className={styles.storyDetailsRow}>
                                            <span className={styles.storyDetailsLabel}>Date</span>
                                            <span className={styles.storyDetailsValue}>{event.date}</span>
                                        </div>
                                        <div className={styles.storyDetailsRow}>
                                            <span className={styles.storyDetailsLabel}>Venue</span>
                                            <span className={styles.storyDetailsValue}>{event.venue}</span>
                                        </div>
                                        <div className={styles.storyDetailsRow}>
                                            <span className={styles.storyDetailsLabel}>Theme</span>
                                            <span className={styles.storyDetailsValue}>{event.theme}</span>
                                        </div>
                                        <div className={styles.storyDetailsRow}>
                                            <span className={styles.storyDetailsLabel}>Guests</span>
                                            <span className={styles.storyDetailsValue}>{event.attendees.toLocaleString()}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right: highlights */}
                            <div className={styles.highlights}>
                                {event.highlights.map((highlight, i) => (
                                    <div key={i} className={styles.highlightItem}>
                                        <div className={styles.hlNum}>{String(i + 1).padStart(2, '0')}</div>
                                        <p className={styles.hlText}>{highlight}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── GALLERY (only if images exist) ── */}
                {!comingSoon && (
                    <section className={styles.gallerySection}>
                        <div className={styles.container}>
                            <div className={styles.gallerySectionHeader}>
                                <p className={styles.sectionEyebrow}>Photo Album</p>
                                <h2 className={styles.sectionTitle}>Memories from the Evening</h2>
                            </div>
                            <Gallery
                                year={event.slug}
                                staticImages={event.galleryImages}
                                eventTitle={event.title}
                            />
                        </div>
                    </section>
                )}

                {/* ── NAVIGATION ── */}
                <section className={styles.navSection}>
                    <div className={styles.container}>
                        <div className={styles.navRow}>
                            {prev ? (
                                <Link href={`/events/${prev.slug}`} className={styles.navCard}>
                                    <div className={styles.navCardLabel}>← Previous</div>
                                    <div className={styles.navCardTitle}>{prev.year} · {prev.theme}</div>
                                </Link>
                            ) : <div />}
                            <Link href="/#events" className={styles.navHome}>All Events</Link>
                            {next ? (
                                <Link href={`/events/${next.slug}`} className={`${styles.navCard} ${styles.navCardRight}`}>
                                    <div className={styles.navCardLabel}>Next →</div>
                                    <div className={styles.navCardTitle}>{next.year} · {next.theme}</div>
                                </Link>
                            ) : <div />}
                        </div>
                    </div>
                </section>

                {/* ── FOOTER ── */}
                <footer className={styles.footer}>
                    <div className={styles.container}>
                        <p className={styles.footerText}>IIT Iftar Committee · Preserving the spirit of community</p>
                        <p className={styles.footerYear}>© 2023 – 2026</p>
                    </div>
                </footer>
            </main>
        </>
    );
}
