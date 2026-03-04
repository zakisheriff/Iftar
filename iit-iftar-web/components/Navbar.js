import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import styles from './Navbar.module.css';

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 40);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}>
            <div className={styles.inner}>
                <Link href="/" className={styles.brand}>
                    <Image src="/iftar-logo.png" alt="IIT Iftar" width={32} height={32} className={styles.logo} />
                    {/* <div className={styles.brandText}>
                        <span className={styles.brandSub}>Archive</span>
                    </div> */}
                </Link>
                <div className={styles.links}>
                    <Link href="/" className={styles.link}>Home</Link>
                    <Link href="/#events" className={styles.link}>Events</Link>
                    <Link href="/#about" className={styles.link}>About</Link>
                </div>
            </div>
        </nav>
    );
}
