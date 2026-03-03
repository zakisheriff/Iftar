import '../styles/globals.css';

export default function App({ Component, pageProps }) {
    return (
        <>
            <div className="global-bg">
                <div className="global-bg-inner">
                    <div className="global-orb1" />
                    <div className="global-orb2" />
                    <div className="global-orb3" />
                    <div className="global-pattern" />
                </div>
            </div>
            <Component {...pageProps} />
        </>
    );
}
