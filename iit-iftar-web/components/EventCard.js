import Link from 'next/link';
import Image from 'next/image';
import styles from './EventCard.module.css';

export default function EventCard({ event, index }) {
    return (
        <Link href={`/events/${event.slug}`} className={styles.card} style={{
            '--accent': event.accentColor,
            '--accent-light': event.accentLight,
            animationDelay: `${index * 0.1}s`
        }}>
            <div className={styles.imageWrap}>
                <Image
                    src={event.coverImage}
                    alt={event.title}
                    fill
                    className={styles.image}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <div className={styles.yearBadge}>{event.year}</div>
                <div className={styles.overlay} />
            </div>
            <div className={styles.body}>
                <div className={styles.theme}>{event.theme}</div>
                <h3 className={styles.title}>{event.title}</h3>
                <p className={styles.quote}>"{event.themeQuote.slice(0, 80)}…"</p>
                <div className={styles.meta}>
                    <div className={styles.metaItem}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        {event.attendees.toLocaleString()} guests
                    </div>
                    <div className={styles.metaItem}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                        </svg>
                        {event.venue.split(',')[0]}
                    </div>
                </div>
                <div className={styles.arrow}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
                    </svg>
                </div>
            </div>
        </Link>
    );
}
