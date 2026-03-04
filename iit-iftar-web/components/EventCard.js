import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import styles from './EventCard.module.css';

export default function EventCard({ event, index }) {
    // Alternating bento pattern: 
    // Row 1: span 2, span 1
    // Row 2: span 1, span 2
    // Row 3: span 2, span 1 ...
    const isFeatured = index % 4 === 0 || index % 4 === 3;
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.unobserve(entry.target);
                }
            },
            { threshold: 0.1 }
        );

        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    return (
        <Link
            ref={ref}
            href={`/events/${event.slug}`}
            className={`${styles.card} ${isFeatured ? styles.featured : ''} ${isVisible ? styles.visible : ''}`}
            style={{
                '--accent': event.accentColor,
                '--accent-light': event.accentLight,
                animationDelay: `${(index % 2) * 0.15}s`,
            }}
        >
            {/* Cover image */}
            <div className={styles.imageWrap}>
                <Image
                    src={event.coverImage}
                    alt={event.title}
                    fill
                    className={styles.image}
                    sizes={isFeatured
                        ? '(max-width: 640px) 100vw, 66vw'
                        : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'}
                />
                <div className={styles.imageMask} />
            </div>

            {/* Year badge */}
            <div className={styles.yearBadge}>{event.year}</div>

            {/* Content overlaid at bottom */}
            <div className={styles.body}>
                <span className={styles.theme}>{event.theme}</span>
                <h3 className={styles.title}>{event.title}</h3>
                <p className={styles.quote}>"{event.themeQuote.slice(0, 72)}…"</p>
                <div className={styles.footer}>
                    <div className={styles.meta}>
                        <span>{event.comingSoon ? 'Coming Soon' : `${event.attendees.toLocaleString()} guests`}</span>
                        <span className={styles.dot}>·</span>
                        <span>{event.venue.split(',')[0]}</span>
                    </div>
                    <div className={styles.cta}>
                        View
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
                        </svg>
                    </div>
                </div>
            </div>
        </Link>
    );
}
