import { Link } from 'react-router-dom';
import HotelArt from '../components/HotelArt.jsx';
import HotelCard from '../components/HotelCard.jsx';
import Icon from '../components/Icon.jsx';
import { Loading, useApi } from '../components/ui.jsx';

const STEPS = [
  { title: 'დაჯავშნე', text: 'იპოვე გესთჰაუსი რუკაზე, აირჩიე თარიღები და ოთახი.' },
  { title: 'დაადასტურე ვინაობა', text: 'პირადობის ფოტო და სელფი: სახეებს ბრაუზერი ადარებს, ერთ წუთში.' },
  { title: 'მიიღე კოდი', text: 'გადახდისთანავე მოდის 6-ციფრიანი კოდი, რომელიც მხოლოდ შენს თარიღებზე მოქმედებს.' },
  { title: 'შედი', text: 'კოდი გასაღების ყუთისთვის, ან ჭკვიანი საკეტი, რომელსაც ტელეფონიდან აღებ.' },
];

const PRODUCTS = [
  {
    icon: 'calendar',
    tag: 'სტუმრისთვის',
    title: 'ონლაინ ჯავშანი',
    text: 'თავისუფალი ოთახები რეალურ დროში, ორმაგი ჯავშნის გარეშე: შიდა და Booking.com-ის ჯავშნები ერთად მოწმდება.',
  },
  {
    icon: 'key',
    tag: 'სტუმრისთვის',
    title: 'უკონტაქტო ჩექინი',
    text: 'ვინაობის ვერიფიკაცია სელფით და შესვლა კოდით ან ჭკვიანი საკეტით, დღე-ღამის ნებისმიერ დროს.',
  },
  {
    icon: 'lock',
    tag: 'მფლობელისთვის',
    title: 'Hospes Lock',
    text: 'Arduino-ზე აწყობილი საკეტი, რომელიც მხოლოდ ვერიფიცირებულ სტუმარს, აქტიური ჯავშნის დროს უღებს კარს.',
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

export default function Home() {
  const hotels = useApi('/hotels');

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="eyebrow">
              <Icon name="pin" size={14} /> კახეთი · Smartstay 2026
            </span>
            <h1>
              ჩამოდი, გააღე, <span>დაისვენე</span>
            </h1>
            <p className="hero-lead">
              Hospes არის უკონტაქტო ჩექინი საქართველოს მცირე სასტუმროებისა და გესთჰაუსებისთვის. სტუმარი ჯავშნის ონლაინ,
              ვინაობას სელფით ადასტურებს და ოთახში რეცეფციის გარეშე შედის.
            </p>
            <div className="hero-cta">
              <Link to="/map" className="btn btn-primary btn-lg">
                <Icon name="search" /> იპოვე სასტუმრო რუკაზე
              </Link>
              <a href="#how" className="btn btn-outline btn-lg">
                როგორ მუშაობს
              </a>
            </div>
            <div className="hero-points">
              <span>
                <Icon name="check" size={16} /> ჩექინი 24/7
              </span>
              <span>
                <Icon name="check" size={16} /> ვერიფიკაცია პირადობით
              </span>
              <span>
                <Icon name="check" size={16} /> Booking.com-ის ჯავშნებიც ერთ კალენდარში
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <HotelArt seed={1} label="გესთჰაუსი კახეთში" />
            <div className="phone-card-top">
              <Icon name="shield" size={16} /> ვინაობა დადასტურებულია
            </div>
            <div className="phone-card">
              <div className="muted small">ალაზნის ხედი · ოთახი 102</div>
              <div className="code">482 913</div>
              <div className="inline small mt-1" style={{ color: 'var(--vine)', fontWeight: 600 }}>
                <Icon name="unlock" size={16} /> კარი გაიღო
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="how">
        <div className="container">
          <h2>როგორ მუშაობს</h2>
          <p className="muted">ოთხი ნაბიჯი ჯავშნიდან ოთახამდე. მფლობელს ადგილზე ყოფნა არ სჭირდება.</p>
          <div className="steps mt-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="card step">
                <div className="step-num">{i + 1}</div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="products" style={{ paddingTop: 0 }}>
        <div className="container">
          <h2>პროდუქტები</h2>
          <p className="muted">ერთი პლატფორმა სტუმრისთვისაც და მასპინძლისთვისაც.</p>
          <div className="grid grid-3 mt-3">
            {PRODUCTS.map((p) => (
              <div key={p.title} className="card feature">
                <div className="feature-icon">
                  <Icon name={p.icon} size={22} />
                </div>
                <div className="tag">{p.tag}</div>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="spread">
            <div>
              <h2 className="mb-0">გესთჰაუსები კახეთში</h2>
              <p className="muted mb-0">სადემონსტრაციო ობიექტები თელავში, სიღნაღში, წინანდალსა და ყვარელში.</p>
            </div>
            <Link to="/map" className="btn btn-outline">
              ყველა რუკაზე <Icon name="arrowRight" size={16} />
            </Link>
          </div>
          <div className="mt-3">
            {hotels.loading && <Loading />}
            {hotels.data && (
              <div className="grid grid-4">
                {hotels.data.map((h) => (
                  <HotelCard key={h.id} hotel={h} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="section" id="about" style={{ paddingTop: 0 }}>
        <div className="container about">
          <div>
            <h2>ჩვენს შესახებ</h2>
            <p>
              საქართველოში ათასობით საოჯახო სასტუმრო და გესთჰაუსია. მათი უმეტესობის მასპინძელი ერთდროულად რეცეფციონისტიცაა,
              დამლაგებელიც და გიდიც. სტუმარი კი ხშირად გვიან ღამით ჩამოდის და ელოდება, ვინმე როდის გაუღებს კარს.
            </p>
            <p>
              Hospes ამ ლოდინს აქრობს: ჯავშანი, გადახდა, ვინაობის შემოწმება და ოთახში შესვლა ერთ აპშია. მასპინძელი კი ყველაფერს
              ტელეფონიდან მართავს.
            </p>
            <p className="muted small">Hospes იქმნება Smartstay 2026 ჰაკათონზე. ეს სადემონსტრაციო ვერსიაა.</p>
          </div>
          <ul className="about-list card card-body">
            <li>
              <Icon name="checkCircle" />
              <div>
                <strong>მასპინძელს რეცეფცია აღარ სჭირდება.</strong>
                <div className="muted small">სტუმარი თვითონ შედის, ოღონდ მხოლოდ თავისი ჯავშნის თარიღებში.</div>
              </div>
            </li>
            <li>
              <Icon name="checkCircle" />
              <div>
                <strong>ორმაგი ჯავშანი გამორიცხულია.</strong>
                <div className="muted small">Booking.com-ზე ან ტელეფონით გაკეთებულ ჯავშანს მფლობელი ერთი ღილაკით ბლოკავს.</div>
              </div>
            </li>
            <li>
              <Icon name="checkCircle" />
              <div>
                <strong>ტურისტი რეგიონს უკეთ იცნობს.</strong>
                <div className="muted small">რუკაზე ადგილობრივი კაფეები, გიდები, ტურები და ბილიკებია.</div>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <section className="container">
        <div className="cta-band">
          <div>
            <h2>გაქვს გესთჰაუსი?</h2>
            <p>დაგვიკავშირდი და შენს ობიექტს სისტემაში ადმინისტრატორი დაამატებს.</p>
          </div>
          <Link to="/register" className="btn btn-outline btn-lg">
            რეგისტრაცია
          </Link>
        </div>
      </section>
    </>
  );
}
