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
    const allYears = events.map((e) => ({ year: e.year, slug: e.slug, theme: e.theme }));
    const currentIndex = events.findIndex((e) => e.slug === params.year);
    const prev = currentIndex > 0 ? events[currentIndex - 1] : null;
    const next = currentIndex < events.length - 1 ? events[currentIndex + 1] : null;
    return { props: { event, allYears, prev, next } };
}

export default function EventPage({ event, prev, next }) {
    if (!event) return null;

    return (
        <>
            <Head>
                <title>{`${event.title} — IIT Iftar`}</title>
                <meta name="description" content={`${event.theme} · ${event.date} · ${event.attendees} guests`} />
                <link rel="icon" href="/iftar-logo.png" />
            </Head>

            <Navbar />

            <main>
                {/* ── HERO BANNER ── */}
                <section className={styles.hero} style={{ '--accent': event.accentColor, '--accent-light': event.accentLight }}>
                    <div className={styles.heroBg}>
                        <Image src={event.coverImage} alt={event.title} fill className={styles.heroBgImg} priority sizes="100vw" />
                        <div className={styles.heroBgOverlay} />
                    </div>
                    <div className={styles.heroContent}>
                        <Link href="/" className={styles.backLink}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
                            </svg>
                            All Events
                        </Link>
                        <p className={styles.heroEyebrow}>{event.year}</p>
                        <h1 className={styles.heroTitle}>{event.title}</h1>
                        <p className={styles.heroTheme}>{event.theme}</p>
                        <blockquote className={styles.heroQuote}>
                            "{event.themeQuote}"
                        </blockquote>
                    </div>
                </section>

                {/* ── STATS ROW ── */}
                <section className={styles.statsSection} style={{ '--accent': event.accentColor, '--accent-light': event.accentLight }}>
                    <div className={styles.container}>
                        <div className={styles.statsRow}>
                            <div className={styles.statItem}>
                                <div className={styles.statIcon}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                                    </svg>
                                </div>
                                <div>
                                    <div className={styles.statValue}>{event.date}</div>
                                    <div className={styles.statLabel}>Date</div>
                                </div>
                            </div>
                            <div className={styles.statDivider} />
                            <div className={styles.statItem}>
                                <div className={styles.statIcon}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                                    </svg>
                                </div>
                                <div>
                                    <div className={styles.statValue}>{event.venue}</div>
                                    <div className={styles.statLabel}>Venue</div>
                                </div>
                            </div>
                            <div className={styles.statDivider} />
                            <div className={styles.statItem}>
                                <div className={styles.statIcon}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                    </svg>
                                </div>
                                <div>
                                    <div className={styles.statValue}>{event.attendees.toLocaleString()}</div>
                                    <div className={styles.statLabel}>Guests</div>
                                </div>
                            </div>
                            <div className={styles.statDivider} />
                            <div className={styles.statItem}>
                                <div className={styles.statIcon}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                    </svg>
                                </div>
                                <div>
                                    <div className={styles.statValue}>{event.highlights.length}</div>
                                    <div className={styles.statLabel}>Highlights</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── THE STORY ── */}
                <section className={styles.storySection}>
                    <div className={styles.container}>
                        <div className={styles.storyGrid}>
                            <div className={styles.storySide}>
                                <p className={styles.sectionEyebrow} style={{ color: event.accentColor }}>The Story</p>
                                <h2 className={styles.storyTitle}>What happened at {event.title}</h2>
                                <div className={styles.storyImg}>
                                    <Image src={event.coverImage} alt={event.title} fill className={styles.storyImgInner} sizes="(max-width: 640px) 100vw, 40vw" />
                                </div>
                            </div>
                            <div className={styles.highlights}>
                                {event.highlights.map((highlight, i) => (
                                    <div key={i} className={styles.highlightItem} style={{ '--accent': event.accentColor }}>
                                        <div className={styles.hlNum} style={{ background: event.accentLight, color: event.accentColor }}>
                                            {String(i + 1).padStart(2, '0')}
                                        </div>
                                        <p className={styles.hlText}>{highlight}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── GALLERY ── */}
                <section className={styles.gallerySection}>
                    <div className={styles.container}>
                        <div className={styles.gallerySectionHeader}>
                            <p className={styles.sectionEyebrow} style={{ color: event.accentColor }}>Photo Album</p>
                            <h2 className={styles.sectionTitle}>Memories from the Evening</h2>
                        </div>
                        <Gallery year={event.slug} staticImages={event.galleryImages} eventTitle={event.title} />
                    </div>
                </section>

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
                            <Link href="/" className={styles.navHome}>All Events</Link>
                            {next ? (
                                <Link href={`/events/${next.slug}`} className={styles.navCard} style={{ textAlign: 'right' }}>
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
                        <p className={styles.footerText}>IIT Iftar Committee &nbsp;·&nbsp; Preserving the spirit of community</p>
                        <p className={styles.footerYear}>© 2022 – 2026</p>
                    </div>
                </footer>
            </main>
        </>
    );
}
