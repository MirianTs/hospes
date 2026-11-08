import PLACES from '../demo/georgia-places.json';

// Attribution for every photo taken from Wikimedia Commons (required by the CC BY / CC BY-SA licences).
export default function Credits() {
  const photos = Object.values(PLACES.photos);
  return (
    <section className="section">
      <div className="container">
        <h1>ფოტოების ავტორები</h1>
        <p className="muted">
          ღირსშესანიშნაობებისა და დასახლებების ფოტოები Wikimedia Commons-იდანაა, თავისუფალი ლიცენზიებით. სადემონსტრაციო
          გესთჰაუსები გამოგონილია, ფოტოზე მათი ადგილის ხედია.
        </p>
        <ul className="credits-list">
          {photos.map((p) => (
            <li key={p.source}>
              <img src={p.url} alt="" loading="lazy" />
              <span>
                {p.author} · {p.license} ·{' '}
                <a href={p.source} target="_blank" rel="noreferrer">
                  წყარო ↗
                </a>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
