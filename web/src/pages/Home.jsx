import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import HotelCard from '../components/HotelCard.jsx';
import Icon from '../components/Icon.jsx';
import { CountUp, Reveal } from '../components/motion.jsx';
import { Loading, useApi } from '../components/ui.jsx';
import { addDays, cityOf, REGIONS, todayStr } from '../format.js';
import './home-skeleton.css';

const STEPS = [
  { icon: 'search', title: 'დაჯავშნე', text: 'იპოვე გესთჰაუსი რუკაზე, აირჩიე თარიღები და ოთახი.' },
  { icon: 'camera', title: 'დაადასტურე ვინაობა', text: 'პირადობის ფოტო და სელფი: სახეებს ბრაუზერი ადარებს, ერთ წუთში.' },
  { icon: 'key', title: 'მიიღე კოდი', text: 'გადახდისთანავე მოდის 6-ციფრიანი კოდი, რომელიც მხოლოდ შენს თარიღებზე მოქმედებს.' },
  { icon: 'unlock', title: 'შედი', text: 'კოდით გახსენი გასაღების ლოქერ-ბოქსი და აიღე ოთახის გასაღები.' },
];

const PRODUCTS = [
  {
    icon: 'calendar',
    tag: 'სტუმრისთვის',
    title: 'ონლაინ ჯავშანი',
    text: 'თავისუფალი ოთახები რეალურ დროში, ორმაგი ჯავშნის გარეშე. დაჯავშნე ნებისმიერ დროს, მფლობელთან დაკავშირება არ გჭირდება.',
  },
  {
    icon: 'key',
    tag: 'სტუმრისთვის',
    title: 'უკონტაქტო ჩექინი',
    text: 'ვინაობის ვერიფიკაცია სელფით და გასაღების მიღება ჭკვიანი ლოქერიდან, დღე-ღამის ნებისმიერ დროს.',
  },
  {
    icon: 'lock',
    tag: 'მფლობელისთვის',
    title: 'Hospes Lock',
    text: 'ჭკვიანი ლოქერ-ბოქსი, რომელიც კარს მხოლოდ ვერიფიცირებულ სტუმარს და მხოლოდ აქტიური ჯავშნის დროს უღებს.',
  },
  {
    icon: 'map',
    tag: 'სტუმრისთვის',
    title: 'ტურისტული რუკა',
    text: 'კაფეები, ტურები, გიდები, ბილიკები და ღირსშესანიშნაობები სასტუმროს გარშემო.',
  },
  {
    icon: 'grid',
    tag: 'მფლობელისთვის',
    title: 'მფლობელის დეშბორდი',
    text: 'ჯავშნები, ფასები, დამატებითი სერვისები და გარე ჯავშნების ბლოკი ერთ ეკრანზე.',
  },
  {
    icon: 'bell',
    tag: 'ორივესთვის',
    title: 'დამატებითი სერვისები',
    text: 'საუზმე, დალაგება, ტრანსფერი, დეგუსტაცია: სტუმარი ითხოვს აპიდან, მფლობელი ხედავს დეშბორდზე.',
  },
];

const FACTS = [
  { title: 'მასპინძელს რეცეფცია აღარ სჭირდება.', text: 'სტუმარი თვითონ შედის, ოღონდ მხოლოდ თავისი ჯავშნის თარიღებში.' },
  { title: 'ორმაგი ჯავშანი გამორიცხულია.', text: 'Booking.com-ზე ან ტელეფონით გაკეთებულ ჯავშანს მფლობელი ერთი ღილაკით ბლოკავს.' },
  { title: 'ტურისტი რეგიონს უკეთ იცნობს.', text: 'რუკაზე ადგილობრივი კაფეები, გიდები, ტურები და ბილიკებია.' },
];

const REGION_OF = Object.fromEntries(REGIONS.flatMap(([r, cs]) => cs.map((c) => [c, r])));
const regionOf = (h) => REGION_OF[cityOf(h.address)] || 'სხვა';

function SectionHead({ title, sub, link, children }) {
  return (
    <Reveal className="sk-head">
      <div>
        <h2>{title}</h2>
        {sub && <p className="sk-sub">{sub}</p>}
      </div>
      {children}
      {link && (
        <Link to={link.to} className="sk-more">
          {link.label} <Icon name="arrowRight" size={16} />
        </Link>
      )}
    </Reveal>
  );
}

// Full-width photo slideshow (landmark photos from Commons), slow zoom + crossfade.
function HeroSlides({ slides }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (slides.length < 2) return undefined;
    const t = setInterval(() => setI((x) => (x + 1) % slides.length), 6500);
    return () => clearInterval(t);
  }, [slides.length]);
  const cur = slides[i];
  return (
    <>
      <div className="sk-hero-img" aria-hidden="true">
        {slides.map((s, k) => (
          <img key={s.id} src={s.photo} alt="" className={k === i ? 'on' : ''} loading={k === 0 ? 'eager' : 'lazy'} />
        ))}
      </div>
      {cur && (
        <div className="sk-hero-meta">
          <span className="sk-hero-place">
            <Icon name="pin" size={14} /> {cur.name}
          </span>
          <div className="sk-dots" role="tablist" aria-label="ფოტოები">
            {slides.map((s, k) => (
              <button
                key={s.id}
                type="button"
                className={k === i ? 'on' : ''}
                aria-label={s.name}
                aria-selected={k === i}
                role="tab"
                onClick={() => setI(k)}
              />
            ))}
          </div>
          <Link to="/credits" className="sk-credit">
            ფოტო: Wikimedia Commons
          </Link>
        </div>
      )}
    </>
  );
}

// Search card in the hero: where + dates, opens the map with these filters.
function HeroSearch({ groups }) {
  const navigate = useNavigate();
  const [place, setPlace] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const submit = (e) => {
    e.preventDefault();
    const q = new URLSearchParams();
    if (place) q.set('place', place);
    if (checkIn && checkOut > checkIn) {
      q.set('in', checkIn);
      q.set('out', checkOut);
    }
    const s = q.toString();
    navigate(`/map${s ? `?${s}` : ''}`);
  };
  return (
    <form className="sk-search" onSubmit={submit}>
      <label className="sk-sf sk-sf-grow">
        <span>სად მიდიხარ?</span>
        <select value={place} onChange={(e) => setPlace(e.target.value)}>
          <option value="">მთელი საქართველო</option>
          {groups.map(([region, cs]) => (
            <optgroup key={region} label={region}>
              <option value={`r:${region}`}>{region} · ყველა</option>
              {cs.map((c) => (
                <option key={c} value={`c:${c}`}>
                  {c}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <label className="sk-sf">
        <span>შესვლა</span>
        <input
          type="date"
          min={todayStr()}
          value={checkIn}
          onChange={(e) => {
            const v = e.target.value;
            setCheckIn(v);
            if (v && (!checkOut || checkOut <= v)) setCheckOut(addDays(v, 1));
          }}
        />
      </label>
      <label className="sk-sf">
        <span>გასვლა</span>
        <input type="date" min={checkIn ? addDays(checkIn, 1) : todayStr()} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
      </label>
      <button type="submit" className="btn btn-primary btn-lg sk-search-go">
        <Icon name="search" /> ძებნა
      </button>
    </form>
  );
}

// Horizontal, swipeable row of cards with arrow buttons.
function Carousel({ children, label }) {
  const track = useRef(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const update = () => {
    const el = track.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 });
  };
  useEffect(() => {
    update();
    const el = track.current;
    el.scrollTo({ left: 0 });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [children]);
  const go = (dir) => {
    const el = track.current;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
  };
  return (
    <div className="sk-carousel">
      <div className="sk-track" ref={track} onScroll={update} aria-label={label}>
        {children}
      </div>
      <button type="button" className="sk-arrow prev" onClick={() => go(-1)} disabled={edge.start} aria-label="წინა">
        <Icon name="arrowLeft" size={18} />
      </button>
      <button type="button" className="sk-arrow next" onClick={() => go(1)} disabled={edge.end} aria-label="შემდეგი">
        <Icon name="arrowRight" size={18} />
      </button>
    </div>
  );
}

export default function Home() {
  const hotels = useApi('/hotels');
  const pois = useApi('/pois');
  const [region, setRegion] = useState('');

  const slides = useMemo(
    () => (pois.data || []).filter((p) => p.photo && (p.type === 'landmark' || p.type === 'trail')).slice(0, 6),
    [pois.data],
  );

  // Regions that have guesthouses, in REGIONS order, with their towns, counts and a cover photo.
  const regions = useMemo(() => {
    const list = hotels.data || [];
    return REGIONS.map(([name, cs]) => {
      const hs = list.filter((h) => regionOf(h) === name);
      const towns = cs.filter((c) => hs.some((h) => cityOf(h.address) === c));
      const cover = hs.find((h) => h.photos?.[0])?.photos[0];
      return { name, towns, count: hs.length, cover };
    }).filter((r) => r.count);
  }, [hotels.data]);

  const shown = useMemo(
    () => (hotels.data || []).filter((h) => !region || regionOf(h) === region),
    [hotels.data, region],
  );

  return (
    <div className="sk">
      {/* 1. Hero */}
      <section className="sk-hero">
        <HeroSlides slides={slides} />
        <div className="container container-wide sk-hero-text">
          <h1 className="sk-rise">ჩამოდი, გააღე, დაისვენე</h1>
          <p className="sk-rise" style={{ '--d': '120ms' }}>
            Hospes არის უკონტაქტო ჩექინი საქართველოს მცირე სასტუმროებისა და გესთჰაუსებისთვის. სტუმარი ჯავშნის ონლაინ,
            ვინაობას სელფით ადასტურებს და ოთახში რეცეფციის გარეშე შედის.
          </p>
          <div className="sk-rise" style={{ '--d': '240ms' }}>
            <HeroSearch groups={regions.map((r) => [r.name, r.towns])} />
          </div>
          <a href="#how" className="sk-scroll sk-rise" style={{ '--d': '360ms' }}>
            როგორ მუშაობს <Icon name="arrowRight" size={14} />
          </a>
        </div>
      </section>

      {/* 2. Numbers */}
      <section className="sk-stats">
        <div className="container container-wide sk-stats-row">
          {[
            { n: hotels.data?.length, label: 'გესთჰაუსი და კოტეჯი' },
            { n: pois.data?.length, label: 'სანახავი ადგილი რუკაზე' },
            { n: regions.length, label: 'კუთხე საქართველოში' },
            { n: 24, suffix: '/7', label: 'ჩექინი რეცეფციის გარეშე' },
          ].map((s, k) => (
            <Reveal key={s.label} delay={k * 90} className="sk-stat">
              <strong>{s.n ? <CountUp to={s.n} suffix={s.suffix} /> : '·'}</strong>
              <span>{s.label}</span>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 3. How it works */}
      <section className="sk-sec" id="how">
        <div className="container container-wide">
          <SectionHead title="როგორ მუშაობს" sub="ოთხი ნაბიჯი ჯავშნიდან ოთახამდე. მასპინძლის ლოდინი არ გჭირდება." />
          <ol className="sk-steps">
            {STEPS.map((s, i) => (
              <Reveal as="li" key={s.title} delay={i * 120}>
                <span className="sk-num">
                  <Icon name={s.icon} size={20} />
                  <em>{i + 1}</em>
                </span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* 4. Products */}
      <section className="sk-sec sk-alt" id="products">
        <div className="container container-wide">
          <SectionHead title="პროდუქტები" link={{ to: '/services', label: 'ყველა სერვისი' }} />
          <div className="sk-grid">
            {PRODUCTS.map((p, i) => (
              <Reveal as="article" key={p.title} className="sk-card" delay={(i % 3) * 100}>
                <div className="sk-card-top">
                  <span className="sk-icon">
                    <Icon name={p.icon} size={20} />
                  </span>
                  <span className="sk-tag">{p.tag}</span>
                </div>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Destinations */}
      {regions.length > 0 && (
        <section className="sk-sec" id="destinations">
          <div className="container container-wide">
            <SectionHead title="სად წავიდეთ?" sub="აირჩიე კუთხე და რუკაზე ნახავ მის გესთჰაუსებს და სანახავ ადგილებს." />
            <Carousel label="კუთხეები">
              {regions.map((r) => (
                <Link key={r.name} to={`/map?place=${encodeURIComponent(`r:${r.name}`)}`} className="sk-dest">
                  {r.cover && <img src={r.cover} alt="" loading="lazy" />}
                  <span className="sk-dest-text">
                    <strong>{r.name}</strong>
                    <small>{r.count} გესთჰაუსი</small>
                  </span>
                </Link>
              ))}
            </Carousel>
          </div>
        </section>
      )}

      {/* 6. Guesthouses */}
      <section className="sk-sec sk-alt" id="stays">
        <div className="container container-wide">
          <SectionHead title="გესთჰაუსები საქართველოში" link={{ to: '/map', label: 'ყველა რუკაზე' }} />
          {hotels.loading && <Loading />}
          {hotels.data && (
            <>
              <div className="chips sk-tabs" role="tablist" aria-label="კუთხე">
                {[{ name: '', count: hotels.data.length }, ...regions].map((r) => (
                  <button
                    key={r.name || 'all'}
                    type="button"
                    role="tab"
                    aria-selected={region === r.name}
                    className={`chip${region === r.name ? ' on' : ''}`}
                    onClick={() => setRegion(r.name)}
                  >
                    {r.name || 'ყველა'} <span className="chip-count">{r.count}</span>
                  </button>
                ))}
              </div>
              <Carousel label="გესთჰაუსები">
                {shown.map((h) => (
                  <div key={h.id} className="sk-slide">
                    <HotelCard hotel={h} />
                  </div>
                ))}
              </Carousel>
            </>
          )}
        </div>
      </section>

      {/* 7. About */}
      <section className="sk-sec" id="about">
        <div className="container container-wide sk-about">
          <Reveal>
            <SectionHead title="ჩვენს შესახებ" />
            <p>
              საქართველოში ათასობით საოჯახო სასტუმრო და გესთჰაუსია. მათი უმეტესობის მასპინძელი ერთდროულად
              რეცეფციონისტიცაა, დამლაგებელიც და გიდიც. სტუმარი კი ხშირად გვიან ღამით ჩამოდის და ელოდება, ვინმე როდის
              გაუღებს კარს.
            </p>
            <p>
              Hospes ამ ლოდინს აქრობს: ჯავშანი, გადახდა, ვინაობის შემოწმება და ოთახში შესვლა ერთ აპშია. მასპინძელი კი
              ყველაფერს ტელეფონიდან მართავს.
            </p>
          </Reveal>
          <ul className="sk-facts">
            {FACTS.map((f, i) => (
              <Reveal as="li" key={f.title} delay={i * 120}>
                <Icon name="checkCircle" size={20} />
                <div>
                  <strong>{f.title}</strong>
                  <span>{f.text}</span>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* 8. Owner call to action */}
      <section className="sk-sec sk-sec-tight">
        <div className="container container-wide">
          <Reveal className="sk-owner">
            <div>
              <h2>გაქვს გესთჰაუსი?</h2>
              <p>დაგვიკავშირდი და შენს ობიექტს სისტემაში ადმინისტრატორი დაამატებს.</p>
            </div>
            <Link to="/register" className="btn btn-primary btn-lg">
              რეგისტრაცია <Icon name="arrowRight" size={18} />
            </Link>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
