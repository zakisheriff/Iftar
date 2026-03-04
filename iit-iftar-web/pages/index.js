import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import EventCard from '../components/EventCard';
import events from '../data/events';
import styles from '../styles/Home.module.css';

export default function Home() {
    const totalAttendees = events.reduce((sum, e) => sum + parseInt(e.attendees || 0, 10), 0);
    const sortedEvents = events.slice().reverse();

    return (
        <>
            <Head>
                <title>IIT Iftar</title>
                <meta name="description" content="Five years of IIT Iftar. Every gathering, every story, every soul — archived here." />
                <link rel="icon" href="/iftar-logo.png" />
            </Head>

            <Navbar />

            <main className={styles.main}>
                {/* ── HERO ── */}
                <section className={styles.hero}>

                    <div className={styles.heroContent}>
                        <div className={styles.logoWrap}>
                            <Image
                                src="/iftar-logo.png"
                                alt="IIT Iftar"
                                width={96}
                                height={96}
                                className={styles.heroLogo}
                                priority
                            />
                        </div>
                        <h1 className={styles.heroTitle}>
                            A Legacy of<br />
                            <span className={styles.heroAccent}>Togetherness</span>
                        </h1>
                        <p className={styles.heroSub}>
                            Four years. Four themes. One unbroken thread of community.
                            Relive the evenings we gathered, shared stories, and built something that lasts.
                        </p>
                        <div className={styles.heroActions}>
                            <div className={styles.heroStats}>
                                <div className={styles.heroStat}>
                                    <span className={styles.heroStatNum}>{events.length}</span>
                                    <span className={styles.heroStatLabel}>Events</span>
                                </div>
                                <div className={styles.heroStatDivider} />
                                <div className={styles.heroStat}>
                                    <span className={styles.heroStatNum}>{totalAttendees.toLocaleString()}+</span>
                                    <span className={styles.heroStatLabel}>Guests</span>
                                </div>
                                <div className={styles.heroStatDivider} />
                                <div className={styles.heroStat}>
                                    <span className={styles.heroStatNum}>2023–26</span>
                                    <span className={styles.heroStatLabel}>Years</span>
                                </div>
                            </div>
                            <Link href="#events" className={styles.heroCta}>
                                Relive the Memories
                            </Link>
                        </div>
                    </div>


                </section>

                {/* ── EVENTS GRID ── */}
                <section className={styles.eventsSection} id="events">
                    <div className={styles.container}>
                        <FadeInBox className={styles.sectionHeader}>
                            <p className={styles.sectionEyebrow}>The Memories</p>
                            <h2 className={styles.sectionTitle}>Every Iftar, Remembered.</h2>
                            <p className={styles.sectionDesc}>
                                From the first tentative gathering to a grand annual tradition — each year has its own story to tell.
                            </p>
                        </FadeInBox>
                        <div className={styles.eventsGrid}>
                            {sortedEvents.map((event, i) => (
                                <EventCard key={event.year} event={event} index={i} />
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── TIMELINE ── */}
                <section className={styles.timeline}>
                    <div className={styles.container}>
                        <FadeInBox className={styles.sectionHeader}>
                            <p className={styles.sectionEyebrow}>The Journey</p>
                            <h2 className={styles.sectionTitle}>Four Years at a Glance</h2>
                        </FadeInBox>
                        <FadeInBox className={styles.timelineList}>
                            {events.map((event, i) => (
                                <TimelineItem key={event.year} event={event} index={i} />
                            ))}
                        </FadeInBox>
                    </div>
                </section>

                {/* ── QUOTE BANNER ── */}
                <section className={styles.quoteBanner}>
                    <FadeInBox className={styles.container}>
                        <p className={styles.quoteText}>
                            "The best of people are those who are most beneficial to others."
                        </p>
                        <p className={styles.quoteAuthor}>— Al-Muʿjam al-Awsat (al-Tabarani), Hadith 6192.</p>
                    </FadeInBox>
                </section>

                {/* ── ABOUT ── */}
                <section className={styles.about} id="about">
                    <FadeInBox className={styles.container}>
                        <div className={styles.aboutInner}>
                            <div>
                                <p className={styles.aboutLabel}>About the Committee</p>
                                <h2 className={styles.aboutTitle}>Built on Community,<br />Rooted in Tradition</h2>
                                <p className={styles.aboutDesc}>
                                    The IIT Iftar Committee was born from a simple desire — to create a space where students, faculty, and friends could gather during Ramadan, share a meal, and feel at home. What started with just over a hundred people in an auditorium has blossomed into one of IIT's most cherished and anticipated annual traditions.
                                </p>
                                <p className={styles.aboutDesc}>
                                    Each year, a dedicated team of student volunteers plans every single detail — from the intricate décor and authentic cuisine to the live music and underlying theme — ensuring that every guest experiences the warmth of community.
                                </p>
                                <p className={styles.aboutDesc}>
                                    <strong>This digital archive was proudly designed and developed by the IIT Iftar 2026 Committee</strong>, allowing everyone to look back at the beautiful evenings we've shared over the years. Some stories never fade; they just echo.
                                </p>
                            </div>
                            <div className={styles.statsPanel}>
                                {events.map((event) => (
                                    <div key={event.year} className={styles.statBlock}>
                                        <div className={styles.statNum}>{event.year}</div>
                                        <div className={styles.statLabel}>{event.theme}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </FadeInBox>
                </section>

                {/* ── FOOTER ── */}
                <footer className={styles.footer}>
                    <div className={styles.container}>
                        <div className={styles.footerInner}>
                            <div className={styles.footerBrand}>
                                <Image src="/iftar-logo.png" alt="IIT Iftar" width={48} height={48} />
                                <span>IIT Iftar Committee</span>
                            </div>
                            <div className={styles.footerGold} />
                            <p className={styles.footerText}>Preserving the spirit of community, one gathering at a time.</p>
                            <p className={styles.footerYear}>© 2023 – 2026 · All Rights Reserved</p>
                        </div>
                    </div>
                </footer>
            </main>
        </>
    );
}

function TimelineItem({ event }) {
    return (
        <Link
            href={`/events/${event.slug}`}
            className={styles.timelineItem}
            style={{ textDecoration: 'none' }}
        >
            <div className={styles.timelineYear}>{event.year}</div>
            <div className={styles.timelineDot}>
                <div className={styles.timelineDotInner} />
            </div>
            <div className={styles.timelineContent}>
                <div className={styles.timelineTheme}>{event.theme}</div>
                <div className={styles.timelineTitle}>{event.title}</div>
                <div className={styles.timelineGuests}>{event.attendees.toLocaleString()} guests · {event.venue.split(',')[0]}</div>
            </div>
        </Link>
    );
}

function FadeInBox({ children, className = '' }) {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIsVisible(true);
                observer.unobserve(entry.target);
            }
        }, { threshold: 0.15 });

        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    return (
        <div ref={ref} className={`${className} ${styles.fadeInBox} ${isVisible ? styles.visible : ''}`}>
            {children}
        </div>
    );
}
