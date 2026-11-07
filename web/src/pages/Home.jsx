import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HotelImage, PriceFrom } from '../components/HotelCard.jsx';
import Icon from '../components/Icon.jsx';
import { Loading, useApi } from '../components/ui.jsx';
import './home-trailhead.css';

const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Noto+Sans+Georgian:wdth,wght@62.5..100,400..900&display=swap';

function useFonts() {
  useEffect(() => {
    if (document.querySelector(`link[href="${FONTS_HREF}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONTS_HREF;
    document.head.appendChild(link);
  }, []);
}

// Test design for the home page only: dark "outdoor" look. Every rule in
// home-trailhead.css is scoped under body.th-home, so other pages are unchanged.

const STEPS = [
  { title: 'დაჯავშნე', tag: 'ონლაინ', meta: 'რუკა · თარიღები · ოთახი', text: 'იპოვე გესთჰაუსი რუკაზე, აირჩიე თარიღები და ოთახი.' },
  { title: 'დაადასტურე ვინაობა', tag: '1 წუთი', meta: 'პირადობა · სელფი', text: 'სახეებს ბრაუზერი ადარებს, ერთ წუთში.' },
  { title: 'მიიღე კოდი', tag: '6 ციფრი', meta: 'მხოლოდ შენს თარიღებზე', text: 'გადახდისთანავე მოდის კოდი, რომელიც მხოლოდ შენს ჯავშანზე მოქმედებს.' },
  { title: 'შედი', tag: '24/7', meta: 'გასაღების ყუთი · ჭკვიანი საკეტი', text: 'კოდით ან ტელეფონიდან, რეცეფციის გარეშე.' },
];

const PRODUCTS = [
  { icon: 'calendar', tag: 'სტუმრისთვის', title: 'ონლაინ ჯავშანი', text: 'თავისუფალი ოთახები რეალურ დროში. შიდა და Booking.com-ის ჯავშნები ერთად მოწმდება.' },
  { icon: 'key', tag: 'სტუმრისთვის', title: 'უკონტაქტო ჩექინი', text: 'ვერიფიკაცია სელფით და შესვლა კოდით, დღე-ღამის ნებისმიერ დროს.' },
  { icon: 'lock', tag: 'მფლობელისთვის', title: 'Hospes Lock', text: 'Arduino-ს საკეტი, რომელიც კარს მხოლოდ აქტიური ჯავშნის მქონე სტუმარს უღებს.' },
  { icon: 'map', tag: 'სტუმრისთვის', title: 'ტურისტული რუკა', text: 'კაფეები, ტურები, გიდები და ბილიკები სასტუმროს გარშემო.' },
  { icon: 'grid', tag: 'მფლობელისთვის', title: 'მფლობელის დეშბორდი', text: 'ჯავშნები, ფასები და დამატებითი სერვისები ერთ ეკრანზე.' },
  { icon: 'bell', tag: 'ორივესთვის', title: 'დამატებითი სერვისები', text: 'საუზმე, ტრანსფერი, დეგუსტაცია: სტუმარი ითხოვს აპიდან.' },
];

function Arrow() {
  return (
    <svg className="th-arrow" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4 12 L12 4 M5.5 4 H12 V10.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

// Caucasus ridge at dusk above the Alazani valley, drawn instead of a photo.
function Landscape() {
  return (
    <svg className="th-hero-art" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="th-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5d6a6a" />
          <stop offset="0.55" stopColor="#a7a497" />
          <stop offset="1" stopColor="#c9a27a" />
        </linearGradient>
        <linearGradient id="th-glow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f0a35e" />
          <stop offset="1" stopColor="#b5541c" />
        </linearGradient>
        <linearGradient id="th-shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgba(16,18,16,0)" />
          <stop offset="1" stopColor="rgba(16,18,16,0.85)" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#th-sky)" />
      {/* far ridge */}
      <path d="M0 470 L120 420 L230 445 L360 360 L470 410 L560 380 L700 300 L800 350 L900 330 L1000 260 L1080 200 L1150 150 L1240 210 L1330 250 L1430 230 L1600 300 L1600 900 L0 900 Z" fill="#6e6b62" />
      {/* alpenglow on the high peak */}
      <path d="M1000 260 L1080 200 L1150 150 L1240 210 L1330 250 L1250 245 L1190 230 L1150 260 L1100 250 L1050 290 Z" fill="url(#th-glow)" opacity="0.95" />
      <path d="M700 300 L800 350 L760 352 L730 340 L690 360 L650 335 Z" fill="url(#th-glow)" opacity="0.8" />
      {/* mid ridge */}
      <path d="M0 560 L160 500 L300 530 L420 470 L560 520 L700 470 L820 520 L960 450 L1100 500 L1240 440 L1400 500 L1600 460 L1600 900 L0 900 Z" fill="#3f443d" />
      {/* valley floor and river */}
      <path d="M0 640 Q400 600 800 630 T1600 610 L1600 900 L0 900 Z" fill="#2c332b" />
      <path d="M380 700 Q700 660 980 690 T1400 670 Q1100 705 800 712 T380 700 Z" fill="#4e5d5a" opacity="0.8" />
      {/* vineyard rows */}
      {Array.from({ length: 14 }, (_, i) => (
        <path key={i} d={`M${-60 + i * 130} 900 Q ${80 + i * 115} 790 ${260 + i * 100} 742`} stroke="rgba(239,237,230,0.06)" strokeWidth="5" fill="none" />
      ))}
      {/* foreground forest */}
      <path
        d="M0 760 L30 700 L55 745 L80 680 L110 735 L140 690 L170 750 L200 700 L230 760 L260 720 L300 780 L340 740 L380 800 L1220 810 L1260 740 L1290 780 L1320 700 L1350 750 L1380 690 L1410 740 L1440 680 L1475 735 L1510 690 L1545 745 L1575 700 L1600 730 L1600 900 L0 900 Z"
        fill="#1b2019"
      />
      <rect width="1600" height="900" fill="url(#th-shade)" />
    </svg>
  );
}

export default function Home() {
  const hotels = useApi('/hotels');
  useFonts();

  useEffect(() => {
    document.body.classList.add('th-home');
    return () => document.body.classList.remove('th-home');
  }, []);

  return (
    <div className="th">
      <section className="th-hero">
        <Landscape />
        <div className="th-wrap th-hero-inner">
          <p className="th-kicker">
            <span className="th-dash" /> ჩამოდი ნებისმიერ დროს
          </p>
          <h1 className="th-display">
            ჩამოდი. გააღე.
            <br />
            დაისვენე.
          </h1>
          <p className="th-mono th-hero-sub">ჯავშანი ონლაინ. ვინაობა სელფით. კარი კოდით.</p>

          <div className="th-hero-bottom">
            <p className="th-mono th-place">
              <Icon name="pin" size={16} /> კახეთი, საქართველო.
              <br />
              ჩექინი 24/7.
            </p>
            <div className="th-hero-cta">
              <Link to="/map" className="th-btn th-btn-accent">
                იპოვე სასტუმრო <Arrow />
              </Link>
              <a href="#how" className="th-btn th-btn-line">
                როგორ მუშაობს <Arrow />
              </a>
            </div>
          </div>
        </div>
        <span className="th-mono th-coords">თელავი · 41.92° N · 45.47° E</span>
      </section>

      <section className="th-sec th-dark" id="how">
        <div className="th-wrap">
          <p className="th-label">01 / როგორ მუშაობს</p>
          <div className="th-head">
            <h2 className="th-title">ოთხი ნაბიჯი ოთახამდე.</h2>
            <p className="th-lead">ჯავშნიდან კარამდე. მასპინძელს ადგილზე ყოფნა არ სჭირდება.</p>
          </div>
          <ol className="th-rows">
            {STEPS.map((s, i) => (
              <li key={s.title} className="th-row">
                <span className="th-mono th-num">0{i + 1}</span>
                <div className="th-row-main">
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
                <span className="th-pill">{s.tag}</span>
                <span className="th-mono th-meta">{s.meta}</span>
              </li>
            ))}
          </ol>
          <div className="th-rows-foot th-mono">
            <span>სხვადასხვა გზა. ერთი გასაღები.</span>
            <Link to="/map">
              ყველა სასტუმრო <Arrow />
            </Link>
          </div>
        </div>
      </section>

      <section className="th-sec th-green" id="products">
        <div className="th-wrap">
          <p className="th-label">02 / პროდუქტები</p>
          <div className="th-head">
            <h2 className="th-title">ერთი პლატფორმა. ორივე მხარისთვის.</h2>
            <Link to="/services" className="th-link th-mono">
              ყველა სერვისი <Arrow />
            </Link>
          </div>
          <div className="th-grid">
            {PRODUCTS.map((p) => (
              <article key={p.title} className="th-card">
                <div className="th-card-top">
                  <Icon name={p.icon} size={22} />
                  <span className="th-mono">{p.tag}</span>
                </div>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="th-sec th-dark">
        <div className="th-wrap">
          <p className="th-label">03 / სად დარჩე</p>
          <div className="th-head">
            <h2 className="th-title">გესთჰაუსები კახეთში.</h2>
            <Link to="/map" className="th-link th-mono">
              ყველა რუკაზე <Arrow />
            </Link>
          </div>
          {hotels.loading && <Loading />}
          {hotels.data && (
            <div className="th-stays">
              {hotels.data.map((h) => (
                <Link key={h.id} to={`/hotels/${h.id}`} className="th-stay">
                  <div className="th-stay-img">
                    <HotelImage hotel={h} />
                  </div>
                  <h3>{h.name}</h3>
                  <div className="th-mono th-stay-meta">
                    <span>{h.address}</span>
                    <PriceFrom value={h.min_price} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="th-sec th-dark th-about" id="about">
        <div className="th-wrap">
          <p className="th-label">04 / ჩვენს შესახებ</p>
          <h2 className="th-title">
            არა მხოლოდ ოთახი.
            <br />
            მშვიდი ჩამოსვლა.
          </h2>
          <div className="th-about-grid">
            <div>
              <p>
                საქართველოში ათასობით საოჯახო სასტუმრო და გესთჰაუსია. მასპინძელი ხშირად ერთდროულად რეცეფციონისტიცაა,
                დამლაგებელიც და გიდიც, სტუმარი კი გვიან ღამით ჩამოდის და ელოდება, ვინ გაუღებს კარს.
              </p>
              <p>Hospes ამ ლოდინს აქრობს: ჯავშანი, გადახდა, ვინაობა და ოთახში შესვლა ერთ აპშია.</p>
            </div>
            <ul className="th-mono th-facts">
              <li>რეცეფცია აღარ სჭირდება.</li>
              <li>ორმაგი ჯავშანი გამორიცხულია.</li>
              <li>ადგილობრივი გიდები რუკაზე.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="th-sec th-cta">
        <div className="th-wrap">
          <p className="th-label">მასპინძლებისთვის</p>
          <div className="th-head">
            <h2 className="th-title">გაქვს გესთჰაუსი?</h2>
            <Link to="/register" className="th-btn th-btn-accent">
              რეგისტრაცია <Arrow />
            </Link>
          </div>
          <p className="th-lead">დაგვიკავშირდი და შენს ობიექტს სისტემაში ადმინისტრატორი დაამატებს.</p>
          <div className="th-wordmark" aria-hidden="true">
            Hospes.
          </div>
        </div>
      </section>
    </div>
  );
}
