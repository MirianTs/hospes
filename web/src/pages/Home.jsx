import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import HotelCard from '../components/HotelCard.jsx';
import Icon from '../components/Icon.jsx';
import { CountUp, reduced, Reveal } from '../components/motion.jsx';
import { Loading, useApi } from '../components/ui.jsx';
import { addDays, cityOf, placeName, REGIONS, todayStr } from '../format.js';
import { L } from '../prefs.js';
import './home-skeleton.css';

const STEPS = () => [
  {
    icon: 'search',
    title: L('დაჯავშნე', 'Book'),
    text: L('იპოვე გესთჰაუსი რუკაზე, აირჩიე თარიღები და ოთახი.', 'Find a guesthouse on the map, pick your dates and a room.'),
  },
  {
    icon: 'camera',
    title: L('დაადასტურე ვინაობა', 'Verify your identity'),
    text: L(
      'პირადობის ფოტო და სელფი: სახეებს ბრაუზერი ადარებს, ერთ წუთში.',
      'A photo of your ID and a selfie: the browser compares the faces in about a minute.',
    ),
  },
  {
    icon: 'key',
    title: L('მიიღე კოდი', 'Get your code'),
    text: L(
      'გადახდისთანავე მოდის 6-ციფრიანი კოდი, რომელიც მხოლოდ შენს თარიღებზე მოქმედებს.',
      'Right after payment you get a 6-digit code that works only on your dates.',
    ),
  },
  {
    icon: 'unlock',
    title: L('შედი', 'Walk in'),
    text: L(
      'კოდით გახსენი გასაღების ლოქერ-ბოქსი და აიღე ოთახის გასაღები. წასვლისას ჩექაუთით იქვე დააბრუნე.',
      'Open the key locker box with the code and take your room key. When you leave, check out and return it there.',
    ),
  },
];

const PRODUCTS = () => [
  {
    icon: 'calendar',
    tag: L('სტუმრისთვის', 'For guests'),
    title: L('ონლაინ ჯავშანი', 'Online booking'),
    text: L(
      'თავისუფალი ოთახები რეალურ დროში, ორმაგი ჯავშნის გარეშე. დაჯავშნე ნებისმიერ დროს, მფლობელთან დაკავშირება არ გჭირდება.',
      'Real-time room availability with no double bookings. Book any time, no need to contact the owner.',
    ),
  },
  {
    icon: 'key',
    tag: L('სტუმრისთვის', 'For guests'),
    title: L('უკონტაქტო ჩექინი', 'Contactless check-in'),
    text: L(
      'ვინაობის ვერიფიკაცია სელფით და გასაღების მიღება ჭკვიანი ლოქერიდან, დღე-ღამის ნებისმიერ დროს.',
      'Identity verification with a selfie and key pickup from a smart locker, at any time of day or night.',
    ),
  },
  {
    icon: 'lock',
    tag: L('მფლობელისთვის', 'For owners'),
    title: 'Hospes Lock',
    text: L(
      'ჭკვიანი ლოქერ-ბოქსი, რომელიც კარს მხოლოდ ვერიფიცირებულ სტუმარს და მხოლოდ აქტიური ჯავშნის დროს უღებს.',
      'A smart locker box that opens only for a verified guest, and only during an active booking.',
    ),
  },
  {
    icon: 'map',
    tag: L('სტუმრისთვის', 'For guests'),
    title: L('ტურისტული რუკა', 'Tourist map'),
    text: L(
      'კაფეები, ტურები, გიდები, ბილიკები და ღირსშესანიშნაობები სასტუმროს გარშემო.',
      'Cafés, tours, guides, trails and sights around the guesthouse.',
    ),
  },
  {
    icon: 'grid',
    tag: L('მფლობელისთვის', 'For owners'),
    title: L('მფლობელის დეშბორდი', 'Owner dashboard'),
    text: L(
      'ჯავშნები, ფასები, დამატებითი სერვისები და გარე ჯავშნების ბლოკი ერთ ეკრანზე.',
      'Bookings, prices, extra services and blocking of outside bookings on one screen.',
    ),
  },
  {
    icon: 'bell',
    tag: L('ორივესთვის', 'For both'),
    title: L('დამატებითი სერვისები', 'Extra services'),
    text: L(
      'საუზმე, დალაგება, ტრანსფერი, დეგუსტაცია: სტუმარი ითხოვს აპიდან, მფლობელი ხედავს დეშბორდზე.',
      'Breakfast, cleaning, transfers, tastings: the guest requests them in the app, the owner sees them on the dashboard.',
    ),
  },
];

const FACTS = () => [
  {
    title: L('მასპინძელს რეცეფცია აღარ სჭირდება.', 'Hosts no longer need a reception desk.'),
    text: L(
      'სტუმარი თვითონ შედის, ოღონდ მხოლოდ თავისი ჯავშნის თარიღებში.',
      'Guests let themselves in, but only during the dates of their booking.',
    ),
  },
  {
    title: L('ორმაგი ჯავშანი გამორიცხულია.', 'Double bookings are ruled out.'),
    text: L(
      'Booking.com-ზე ან ტელეფონით გაკეთებულ ჯავშანს მფლობელი ერთი ღილაკით ბლოკავს.',
      'The owner blocks a booking made on Booking.com or by phone with a single button.',
    ),
  },
  {
    title: L('ტურისტი რეგიონს უკეთ იცნობს.', 'Travellers get to know the region better.'),
    text: L(
      'რუკაზე ადგილობრივი კაფეები, გიდები, ტურები და ბილიკებია.',
      'The map shows local cafés, guides, tours and trails.',
    ),
  },
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
    // With reduced motion the photo changes only when the visitor picks a dot.
    if (slides.length < 2 || reduced()) return undefined;
    const t = setInterval(() => setI((x) => (x + 1) % slides.length), 6500);
    return () => clearInterval(t);
  }, [slides.length]);
  // If the list gets shorter (new data), an old index would point past the end and hide the caption.
  const cur = slides[i] ?? slides[0];
  return (
    <>
      <div className="sk-hero-img" aria-hidden="true">
        {slides.map((s, k) => (
          <img key={s.id} src={s.photo} alt="" className={s === cur ? 'on' : ''} loading={k === 0 ? 'eager' : 'lazy'} />
        ))}
      </div>
      {cur && (
        <div className="sk-hero-meta">
          <span className="sk-hero-place">
            <Icon name="pin" size={14} /> {cur.name}
          </span>
          <div className="sk-dots" role="tablist" aria-label={L('ფოტოები', 'Photos')}>
            {slides.map((s, k) => (
              <button
                key={s.id}
                type="button"
                className={s === cur ? 'on' : ''}
                aria-label={s.name}
                aria-selected={s === cur}
                role="tab"
                onClick={() => setI(k)}
              />
            ))}
          </div>
          <Link to="/credits" className="sk-credit">
            {L('ფოტო: Wikimedia Commons', 'Photo: Wikimedia Commons')}
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
        <span>{L('სად მიდიხარ?', 'Where are you going?')}</span>
        <select value={place} onChange={(e) => setPlace(e.target.value)}>
          <option value="">{L('მთელი საქართველო', 'All of Georgia')}</option>
          {groups.map(([region, cs]) => (
            <optgroup key={region} label={placeName(region)}>
              <option value={`r:${region}`}>
                {L(`${region} · ყველა`, `${placeName(region)} · all`)}
              </option>
              {cs.map((c) => (
                <option key={c} value={`c:${c}`}>
                  {placeName(c)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <label className="sk-sf">
        <span>{L('შესვლა', 'Check-in')}</span>
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
        <span>{L('გასვლა', 'Check-out')}</span>
        <input type="date" min={checkIn ? addDays(checkIn, 1) : todayStr()} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
      </label>
      <button type="submit" className="btn btn-primary btn-lg sk-search-go">
        <Icon name="search" /> {L('ძებნა', 'Search')}
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
      {/* role="group": a plain div's aria-label is ignored by screen readers. */}
      <div className="sk-track" ref={track} onScroll={update} role="group" aria-label={label}>
        {children}
      </div>
      <button type="button" className="sk-arrow prev" onClick={() => go(-1)} disabled={edge.start} aria-label={L('წინა', 'Previous')}>
        <Icon name="arrowLeft" size={18} />
      </button>
      <button type="button" className="sk-arrow next" onClick={() => go(1)} disabled={edge.end} aria-label={L('შემდეგი', 'Next')}>
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
          <div className="sk-hero-copy">
          <h1 className="sk-rise">{L('მოდი, ნახე, დაისვენე', 'Come, see, unwind')}</h1>
          <p className="sk-rise" style={{ '--d': '120ms' }}>
            {L(
              'Hospes არის უკონტაქტო ჩექინი საქართველოს მცირე სასტუმროებისა და გესთჰაუსებისთვის. სტუმარი ჯავშნის ონლაინ, ვინაობას სელფით ადასტურებს და ოთახში რეცეფციის გარეშე შედის.',
              'Hospes is contactless check-in for small hotels and guesthouses in Georgia. Guests book online, verify their identity with a selfie and get into their room without a reception desk.',
            )}
          </p>
          </div>
          <div className="sk-rise" style={{ '--d': '240ms' }}>
            <HeroSearch groups={regions.map((r) => [r.name, r.towns])} />
          </div>
          <a href="#how" className="sk-scroll sk-rise" style={{ '--d': '360ms' }}>
            {L('როგორ მუშაობს', 'How it works')} <Icon name="arrowRight" size={14} />
          </a>
        </div>
      </section>

      {/* 2. Numbers */}
      <section className="sk-stats">
        <div className="container container-wide sk-stats-row">
          {[
            { n: hotels.data?.length, label: L('გესთჰაუსი და კოტეჯი', 'guesthouses and cottages') },
            { n: pois.data?.length, label: L('სანახავი ადგილი რუკაზე', 'places to see on the map') },
            { n: regions.length, label: L('კუთხე საქართველოში', 'regions of Georgia') },
            { n: 24, suffix: '/7', label: L('ჩექინი რეცეფციის გარეშე', 'check-in without a reception desk') },
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
          <SectionHead
            title={L('როგორ მუშაობს', 'How it works')}
            sub={L(
              'ოთხი ნაბიჯი ჯავშნიდან ოთახამდე. მასპინძლის ლოდინი არ გჭირდება.',
              'Four steps from booking to your room. No waiting for the host.',
            )}
          />
          <ol className="sk-steps">
            {STEPS().map((s, i) => (
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
          <SectionHead title={L('პროდუქტები', 'Products')} link={{ to: '/services', label: L('ყველა სერვისი', 'All services') }} />
          <div className="sk-grid">
            {PRODUCTS().map((p, i) => (
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
            <SectionHead
              title={L('სად წავიდეთ?', 'Where to go?')}
              sub={L(
                'აირჩიე კუთხე და რუკაზე ნახავ მის გესთჰაუსებს და სანახავ ადგილებს.',
                'Pick a region to see its guesthouses and sights on the map.',
              )}
            />
            <Carousel label={L('კუთხეები', 'Regions')}>
              {regions.map((r) => (
                <Link key={r.name} to={`/map?place=${encodeURIComponent(`r:${r.name}`)}`} className="sk-dest">
                  {r.cover && <img src={r.cover} alt="" loading="lazy" />}
                  <span className="sk-dest-text">
                    <strong>{placeName(r.name)}</strong>
                    <small>{L(`${r.count} გესთჰაუსი`, `${r.count} ${r.count === 1 ? 'guesthouse' : 'guesthouses'}`)}</small>
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
          <SectionHead title={L('გესთჰაუსები საქართველოში', 'Guesthouses in Georgia')} link={{ to: '/map', label: L('ყველა რუკაზე', 'All on the map') }} />
          {hotels.loading && <Loading />}
          {hotels.data && (
            <>
              <div className="chips sk-tabs" role="tablist" aria-label={L('კუთხე', 'Region')}>
                {[{ name: '', count: hotels.data.length }, ...regions].map((r) => (
                  <button
                    key={r.name || 'all'}
                    type="button"
                    role="tab"
                    aria-selected={region === r.name}
                    className={`chip${region === r.name ? ' on' : ''}`}
                    onClick={() => setRegion(r.name)}
                  >
                    {r.name ? placeName(r.name) : L('ყველა', 'All')} <span className="chip-count">{r.count}</span>
                  </button>
                ))}
              </div>
              <Carousel label={L('გესთჰაუსები', 'Guesthouses')}>
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
            <SectionHead title={L('ჩვენს შესახებ', 'About us')} />
            <p>
              {L(
                'საქართველოში ათასობით საოჯახო სასტუმრო და გესთჰაუსია. მათი უმეტესობის მასპინძელი ერთდროულად რეცეფციონისტიცაა, დამლაგებელიც და გიდიც. სტუმარი კი ხშირად გვიან ღამით ჩამოდის და ელოდება, ვინმე როდის გაუღებს კარს.',
                'Georgia has thousands of family hotels and guesthouses. Most of their hosts are receptionist, cleaner and guide all at once. Guests, meanwhile, often arrive late at night and wait for someone to open the door.',
              )}
            </p>
            <p>
              {L(
                'Hospes ამ ლოდინს აქრობს: ჯავშანი, გადახდა, ვინაობის შემოწმება და ოთახში შესვლა ერთ აპშია. მასპინძელი კი ყველაფერს ტელეფონიდან მართავს.',
                'Hospes ends that wait: booking, payment, identity check and getting into the room are all in one app, and the host manages everything from their phone.',
              )}
            </p>
          </Reveal>
          <ul className="sk-facts">
            {FACTS().map((f, i) => (
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
              <h2>{L('გაქვს გესთჰაუსი?', 'Own a guesthouse?')}</h2>
              <p>
                {L(
                  'დაგვიკავშირდი და შენს ობიექტს სისტემაში ადმინისტრატორი დაამატებს.',
                  'Get in touch and an administrator will add your property to the system.',
                )}
              </p>
            </div>
            <Link to="/register" className="btn btn-primary btn-lg">
              {L('რეგისტრაცია', 'Sign up')} <Icon name="arrowRight" size={18} />
            </Link>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
