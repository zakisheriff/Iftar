import styles from './Navbar.module.css';
import Link from 'next/link';
import Image from 'next/image';

export default function Navbar() {
    return (
        <nav className={styles.nav}>
            <div className={styles.inner}>
                <Link href="/" className={styles.brand}>
                    <Image src="/iftar-logo.png" alt="IIT Iftar" width={36} height={36} className={styles.logo} />
                </Link>
                <div className={styles.links}>
                    <Link href="/#events" className={styles.link}>Events</Link>
                    <Link href="/#about" className={styles.link}>About</Link>
                </div>
            </div>
        </nav>
    );
}
