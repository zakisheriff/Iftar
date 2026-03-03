import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import EventCard from '../components/EventCard';
import events from '../data/events';
import styles from '../styles/Home.module.css';

export default function Home() {
    const totalAttendees = events.reduce((sum, e) => sum + e.attendees, 0);

    return (
        <>
            <Head>
                <title>IIT Iftar — A Legacy of Togetherness</title>
                <meta name="description" content="Five years of IIT Iftar. Every gathering, every story, every soul — archived here." />
                <link rel="icon" href="/iftar-logo.png" />
            </Head>

            <Navbar />

            <main>
                {/* ── HERO ── */}
                <section className={styles.hero}>
                    <div className={styles.heroBg}>
                        <div className={styles.heroOrb1} />
                        <div className={styles.heroOrb2} />
                        <div className={styles.heroPattern} />
                    </div>
                    <div className={styles.heroContent}>
                        <div className={styles.logoWrap}>
                            <Image src="/iftar-logo.png" alt="IIT Iftar" width={90} height={90} className={styles.heroLogo} priority />
                        </div>
                        <p className={styles.heroEyebrow}>IIT Iftar Committee</p>
                        <h1 className={styles.heroTitle}>
                            A Legacy of<br />
                            <span className={styles.heroAccent}>Togetherness</span>
                        </h1>
                        <p className={styles.heroSub}>
                            Five years. Five themes. One community. Relive every evening we gathered to break bread, share stories, and build something that lasts.
                        </p>
                        <div className={styles.heroStats}>
                            <div className={styles.heroStat}>
                                <span className={styles.heroStatNum}>5</span>
                                <span className={styles.heroStatLabel}>Events</span>
                            </div>
                            <div className={styles.heroStatDivider} />
                            <div className={styles.heroStat}>
                                <span className={styles.heroStatNum}>{totalAttendees.toLocaleString()}+</span>
                                <span className={styles.heroStatLabel}>Guests</span>
                            </div>
                            <div className={styles.heroStatDivider} />
                            <div className={styles.heroStat}>
                                <span className={styles.heroStatNum}>2022–26</span>
                                <span className={styles.heroStatLabel}>Years</span>
                            </div>
                        </div>
                        <Link href="#events" className={styles.heroCta}>
                            Explore the Archive
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 5v14" /><path d="M5 12l7 7 7-7" />
                            </svg>
                        </Link>
                    </div>
                </section>

                {/* ── EVENTS GRID ── */}
                <section className={styles.eventsSection} id="events">
                    <div className={styles.container}>
                        <div className={styles.sectionHeader}>
                            <p className={styles.sectionEyebrow}>The Archive</p>
                            <h2 className={styles.sectionTitle}>Every Iftar, Remembered</h2>
                            <p className={styles.sectionDesc}>From the first tentative gathering to a grand annual tradition — each year has its own story to tell.</p>
                        </div>
                        <div className={styles.eventsGrid}>
                            {events.slice().reverse().map((event, i) => (
                                <EventCard key={event.year} event={event} index={i} />
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── ABOUT STRIP ── */}
                <section className={styles.about} id="about">
                    <div className={styles.container}>
                        <div className={styles.aboutInner}>
                            <div className={styles.aboutText}>
                                <p className={styles.sectionEyebrow}>About the Committee</p>
                                <h2 className={styles.aboutTitle}>Built on Community</h2>
                                <p className={styles.aboutDesc}>
                                    The IIT Iftar Committee was born from a simple desire — to create a space where students, faculty, and friends could gather during Ramadan, share a meal, and feel at home. What started as 120 people in an auditorium has grown into one of IIT's most cherished annual traditions.
                                </p>
                                <p className={styles.aboutDesc}>
                                    Each year, a dedicated team of volunteers plans every detail — from the décor and the food to the music and the theme — so that every guest leaves with a memory worth keeping.
                                </p>
                            </div>
                            <div className={styles.aboutVisual}>
                                <div className={styles.aboutCard}>
                                    <div className={styles.aboutCardNum}>2022</div>
                                    <div className={styles.aboutCardLabel}>Where it all began</div>
                                </div>
                                <div className={styles.aboutCard} style={{ background: 'var(--primary)', color: '#fff' }}>
                                    <div className={styles.aboutCardNum} style={{ color: '#fff' }}>2026</div>
                                    <div className={styles.aboutCardLabel} style={{ color: 'rgba(255,255,255,0.7)' }}>Echoes of Arabia</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── FOOTER ── */}
                <footer className={styles.footer}>
                    <div className={styles.container}>
                        <div className={styles.footerInner}>
                            <div className={styles.footerBrand}>
                                <Image src="/iftar-logo.png" alt="IIT Iftar" width={28} height={28} />
                                <span>IIT Iftar Committee</span>
                            </div>
                            <p className={styles.footerText}>Preserving the spirit of community, one gathering at a time.</p>
                            <p className={styles.footerYear}>© 2022 – 2026</p>
                        </div>
                    </div>
                </footer>
            </main>
        </>
    );
}
