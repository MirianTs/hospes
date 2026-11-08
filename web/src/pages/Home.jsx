import { Link } from 'react-router-dom';
import HotelCard from '../components/HotelCard.jsx';
import Icon from '../components/Icon.jsx';
import { Loading, useApi } from '../components/ui.jsx';
import './home-skeleton.css';

// Home page skeleton: structure and final texts only. The visual design comes
// later from a template; every rule in home-skeleton.css is scoped under .sk.

const STEPS = [
  { title: 'დაჯავშნე', text: 'იპოვე გესთჰაუსი რუკაზე, აირჩიე თარიღები და ოთახი.' },
  { title: 'დაადასტურე ვინაობა', text: 'პირადობის ფოტო და სელფი: სახეებს ბრაუზერი ადარებს, ერთ წუთში.' },
  { title: 'მიიღე კოდი', text: 'გადახდისთანავე მოდის 6-ციფრიანი კოდი, რომელიც მხოლოდ შენს თარიღებზე მოქმედებს.' },
  { title: 'შედი', text: 'კოდით გახსენი გასაღების ლოქერ-ბოქსი და აიღე ოთახის გასაღები.' },
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

function SectionHead({ title, link }) {
  return (
    <div className="sk-head">
      <h2>{title}</h2>
      {link && (
        <Link to={link.to} className="sk-more">
          {link.label} <Icon name="arrowRight" size={16} />
        </Link>
      )}
    </div>
  );
}

export default function Home() {
  const hotels = useApi('/hotels');

  return (
    <div className="sk">
      {/* 1. Hero: full-width photo (placeholder until the template), slogan on top */}
      <section className="sk-hero">
        <div className="sk-hero-img" aria-hidden="true">
          <span>ჰირო ფოტო · მთელ სიგანეზე</span>
        </div>
        <div className="container sk-hero-text">
          <h1>ჩამოდი, გააღე, დაისვენე</h1>
          <p>
            Hospes არის უკონტაქტო ჩექინი საქართველოს მცირე სასტუმროებისა და გესთჰაუსებისთვის. სტუმარი ჯავშნის ონლაინ,
            ვინაობას სელფით ადასტურებს და ოთახში რეცეფციის გარეშე შედის.
          </p>
          <div className="sk-cta">
            <Link to="/map" className="btn btn-primary btn-lg">
              <Icon name="search" /> იპოვე სასტუმრო რუკაზე
            </Link>
            <a href="#how" className="btn btn-lg sk-btn-light">
              როგორ მუშაობს
            </a>
          </div>
        </div>
      </section>

      {/* 2. How it works */}
      <section className="sk-sec" id="how">
        <div className="container">
          <SectionHead title="როგორ მუშაობს" />
          <ol className="sk-steps">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <span className="sk-num">{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 3. Products */}
      <section className="sk-sec sk-alt" id="products">
        <div className="container">
          <SectionHead title="პროდუქტები" link={{ to: '/services', label: 'ყველა სერვისი' }} />
          <div className="sk-grid">
            {PRODUCTS.map((p) => (
              <article key={p.title} className="sk-card">
                <div className="sk-card-top">
                  <span className="sk-icon">
                    <Icon name={p.icon} size={20} />
                  </span>
                  <span className="sk-tag">{p.tag}</span>
                </div>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Guesthouses (all regions) */}
      <section className="sk-sec" id="stays">
        <div className="container">
          <SectionHead title="გესთჰაუსები საქართველოში" link={{ to: '/map', label: 'ყველა რუკაზე' }} />
          {hotels.loading && <Loading />}
          {hotels.data && (
            <div className="sk-grid">
              {hotels.data.slice(0, 6).map((h) => (
                <HotelCard key={h.id} hotel={h} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 5. About */}
      <section className="sk-sec sk-alt" id="about">
        <div className="container sk-about">
          <div>
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
          </div>
          <ul className="sk-facts">
            {FACTS.map((f) => (
              <li key={f.title}>
                <Icon name="checkCircle" size={20} />
                <div>
                  <strong>{f.title}</strong>
                  <span>{f.text}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 6. Owner call to action */}
      <section className="sk-sec">
        <div className="container">
          <div className="sk-owner">
            <div>
              <h2>გაქვს გესთჰაუსი?</h2>
              <p>დაგვიკავშირდი და შენს ობიექტს სისტემაში ადმინისტრატორი დაამატებს.</p>
            </div>
            <Link to="/register" className="btn btn-primary btn-lg">
              რეგისტრაცია
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
