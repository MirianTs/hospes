import PLACES from '../demo/georgia-places.json';
import { L } from '../prefs.js';

// Attribution for every photo taken from Wikimedia Commons (required by the CC BY / CC BY-SA licences).
export default function Credits() {
  const photos = Object.values(PLACES.photos);
  return (
    <section className="section">
      <div className="container">
        <h1>{L('ფოტოების ავტორები', 'Photo credits')}</h1>
        <p className="muted">
          {L(
            'ღირსშესანიშნაობებისა და დასახლებების ფოტოები Wikimedia Commons-იდანაა, თავისუფალი ლიცენზიებით. სადემონსტრაციო გესთჰაუსები გამოგონილია, ფოტოზე მათი ადგილის ხედია.',
            'Photos of landmarks and towns come from Wikimedia Commons under free licences. The demo guesthouses are fictional; their photos show the area where they would be.',
          )}
        </p>
        <ul className="credits-list">
          {photos.map((p) => (
            <li key={p.source}>
              <img src={p.url} alt="" loading="lazy" />
              <span>
                {p.author} · {p.license} ·{' '}
                <a href={p.source} target="_blank" rel="noreferrer">
                  {L('წყარო', 'Source')} ↗
                </a>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
