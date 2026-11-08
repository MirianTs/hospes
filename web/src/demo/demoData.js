import PLACES from './georgia-places.json';

// Demo data for the GitHub Pages build. Same as backend/src/seed.js: keep the two in sync.
export const USERS = [
  { key: 'admin', name: 'ადმინისტრატორი', email: 'admin@hospes.test', password: 'admin123', role: 'admin', verified: true },
  { key: 'nino', name: 'ნინო ბერიძე', email: 'owner@hospes.test', password: 'owner123', role: 'owner', phone: '+995 555 00 00 01', verified: true },
  { key: 'levan', name: 'ლევან კაპანაძე', email: 'owner2@hospes.test', password: 'owner123', role: 'owner', phone: '+995 555 00 00 02', verified: true },
  { key: 'giorgi', name: 'გიორგი მაისურაძე', email: 'guest@hospes.test', password: 'guest123', role: 'guest', phone: '+995 555 00 00 03', verified: true },
  { key: 'anna', name: 'Anna Müller', email: 'anna@hospes.test', password: 'guest123', role: 'guest', phone: '+49 151 0000000', verified: false },
];

export const HOTELS = [
  {
    key: 'alazani',
    owner: 'nino',
    name: 'ალაზნის ხედი',
    name_en: 'Alazani View',
    address: 'თელავი, ძველი ქალაქი',
    address_en: 'Telavi, Old Town',
    lat: 41.9189,
    lng: 45.4752,
    rating: 4.7,
    description:
      'საოჯახო სასტუმრო თელავის ძველ უბანში, ალაზნის ველისა და კავკასიონის ხედით. ბატონის ციხემდე 5 წუთის სავალია, საკუთარ მარანში კი ოჯახის ღვინოს დააგემოვნებთ.',
    description_en:
      'A family guesthouse in the old quarter of Telavi, with views of the Alazani Valley and the Caucasus. Batonis Tsikhe is a 5-minute walk away, and you can taste the family wine in our own cellar.',
    checkin_info: 'გასაღების ყუთი ჭიშკართან, მარცხენა კედელზეა. ოთახი მეორე სართულზეა, კიბე ეზოდან ადის.',
    checkin_info_en: 'The key box is by the gate, on the left-hand wall. The room is on the first floor; the stairs go up from the yard.',
    rooms: [
      { number: '1', title: 'ორადგილიანი, ბაღის ხედით', title_en: 'Double, garden view', price: 120, key_type: 'box', lock_id: 1, capacity: 2 },
      { number: '2', title: 'ორადგილიანი, აივნით', title_en: 'Double, with balcony', price: 140, key_type: 'box', lock_id: 2, capacity: 2 },
      { number: '3', title: 'საოჯახო ოთახი', title_en: 'Family room', price: 180, key_type: 'box', lock_id: 3, capacity: 4 },
    ],
    services: [
      { name: 'საუზმე', price: 25, description: 'ქართული საუზმე ეზოში: ხაჭაპური, ყველი, თაფლი', name_en: 'Breakfast', description_en: 'Georgian breakfast in the yard: khachapuri, cheese, honey' },
      { name: 'ღვინის დეგუსტაცია', price: 45, description: '4 ქვევრის ღვინო საკუთარი მარნიდან', name_en: 'Wine tasting', description_en: '4 qvevri wines from our own cellar' },
      { name: 'ტრანსფერი თბილისიდან', price: 150, description: 'აეროპორტიდან ან ქალაქიდან, 4 ადგილამდე', name_en: 'Transfer from Tbilisi', description_en: 'From the airport or the city, up to 4 people' },
      { name: 'ოთახის დალაგება', price: 0, description: 'დამატებითი დალაგება ყოფნის დროს', name_en: 'Room cleaning', description_en: 'Extra cleaning during your stay' },
    ],
  },
  {
    key: 'marani',
    owner: 'levan',
    name: 'ძველი მარანი',
    name_en: 'Old Marani',
    address: 'სიღნაღი, გალავნის ქუჩა',
    address_en: 'Sighnaghi, Galavani Street',
    lat: 41.6196,
    lng: 45.9221,
    rating: 4.8,
    description:
      'XIX საუკუნის ქვის სახლი სიღნაღის გალავანთან. ოთახებიდან ალაზნის ველი მოჩანს, ძველ მარანში კი საღამოობით სუფრა იშლება.',
    description_en:
      'A 19th-century stone house by the Sighnaghi town wall. The rooms look out over the Alazani Valley, and in the evenings the table is laid in the old wine cellar.',
    checkin_info: 'გასაღების ყუთი მთავარ კართან, ზარის ქვემოთაა.',
    checkin_info_en: 'The key box is by the main door, below the doorbell.',
    rooms: [
      { number: '1', title: 'ორადგილიანი, ქალაქის ხედით', title_en: 'Double, town view', price: 95, key_type: 'box', lock_id: 1, capacity: 2 },
      { number: '2', title: 'ლუქსი ბუხრით', title_en: 'Suite with fireplace', price: 150, key_type: 'box', lock_id: 2, capacity: 2 },
      { number: '3', title: 'საოჯახო ოთახი', title_en: 'Family room', price: 160, key_type: 'box', lock_id: 3, capacity: 4 },
    ],
    services: [
      { name: 'საუზმე', price: 20, description: 'საოჯახო საუზმე', name_en: 'Breakfast', description_en: 'Home-made breakfast' },
      { name: 'ქვევრის ღვინის ტური', price: 60, description: 'მარნის ტური და 3 ღვინის დეგუსტაცია', name_en: 'Qvevri wine tour', description_en: 'Cellar tour and a tasting of 3 wines' },
      { name: 'ველოსიპედის ქირაობა', price: 30, description: 'ერთი დღით', name_en: 'Bicycle rental', description_en: 'For one day' },
    ],
  },
  {
    key: 'tsinandali',
    owner: 'nino',
    name: 'წინანდლის ბაღი',
    name_en: 'Tsinandali Garden',
    address: 'წინანდალი, მამულის მახლობლად',
    address_en: 'Tsinandali, near the estate',
    lat: 41.8968,
    lng: 45.5741,
    rating: 4.6,
    description:
      'მშვიდი სასტუმრო ვენახებს შორის, წინანდლის მამულიდან 10 წუთის სავალზე. აქვს ბაღი, აუზი და ვახშამი ქართული სუფრით.',
    description_en:
      'A quiet guesthouse among the vineyards, a 10-minute walk from the Tsinandali Estate. It has a garden, a pool and dinner at a Georgian supra table.',
    checkin_info: 'გასაღების ყუთი ალაყაფის კარის მარჯვნივ, ყურძნის ლოზის ქვეშაა.',
    checkin_info_en: 'The key box is to the right of the courtyard gate, under the grapevine.',
    rooms: [
      { number: '1', title: 'სტანდარტული', title_en: 'Standard', price: 130, key_type: 'box', lock_id: 1, capacity: 2 },
      { number: '2', title: 'ვილა აუზის პირას', title_en: 'Poolside villa', price: 220, key_type: 'box', lock_id: 2, capacity: 3 },
      { number: '3', title: 'ორადგილიანი, ვენახის ხედით', title_en: 'Double, vineyard view', price: 150, key_type: 'box', lock_id: 3, capacity: 2 },
    ],
    services: [
      { name: 'საუზმე', price: 30, description: 'ბუფეტი ბაღში', name_en: 'Breakfast', description_en: 'Buffet in the garden' },
      { name: 'ვახშამი ქართული სუფრით', price: 70, description: 'ერთ ადამიანზე, ღვინით', name_en: 'Georgian supra dinner', description_en: 'Per person, with wine' },
      { name: 'ოთახის დალაგება', price: 15, description: 'დამატებითი დალაგება', name_en: 'Room cleaning', description_en: 'Extra cleaning' },
    ],
  },
  {
    key: 'kvareli',
    owner: 'levan',
    name: 'ყვარლის კარი',
    name_en: 'Kvareli Gate',
    address: 'ყვარელი, ჭავჭავაძის ქუჩა',
    address_en: 'Kvareli, Chavchavadze Street',
    lat: 41.9497,
    lng: 45.8129,
    rating: 4.5,
    description:
      'მარტივი და თბილი გესთჰაუსი კავკასიონის ძირას. კარგი საწყისი წერტილია ლაგოდეხისა და გრემის სანახავად.',
    description_en:
      'A simple, warm guesthouse at the foot of the Caucasus. A good starting point for visiting Lagodekhi and Gremi.',
    checkin_info: 'გასაღების ყუთი ეზოს ჭიშკართან, საფოსტო ყუთის გვერდითაა.',
    checkin_info_en: 'The key box is by the yard gate, next to the mailbox.',
    rooms: [
      { number: '1', title: 'ორადგილიანი', title_en: 'Double', price: 80, key_type: 'box', lock_id: 1, capacity: 2 },
      { number: '2', title: 'სამადგილიანი', title_en: 'Triple', price: 100, key_type: 'box', lock_id: 2, capacity: 3 },
      { number: '3', title: 'ერთადგილიანი', title_en: 'Single', price: 60, key_type: 'box', lock_id: 3, capacity: 1 },
    ],
    services: [
      { name: 'საუზმე', price: 20, description: 'თონის პური, ყველი, მურაბა', name_en: 'Breakfast', description_en: 'Tone bread, cheese, jam' },
      { name: 'ტრანსფერი ლაგოდეხში', price: 80, description: 'ორივე მიმართულებით', name_en: 'Transfer to Lagodekhi', description_en: 'Both ways' },
      { name: 'გიდი (1 დღე)', price: 120, description: 'ქართულ, ინგლისურ ან რუსულ ენაზე', name_en: 'Guide (1 day)', description_en: 'In Georgian, English or Russian' },
    ],
  },
];

// Coordinates are approximate; cafes, tours and guides are fictional.
export const POIS = [
  { type: 'cafe', name: 'კაფე „ჩურჩხელა“', description: 'ქართული დესერტები და ყავა თელავის ცენტრში.', name_en: 'Café "Churchkhela"', description_en: 'Georgian desserts and coffee in the centre of Telavi.', lat: 41.9202, lng: 45.4768 },
  { type: 'cafe', name: 'ღვინის ბარი „ქვევრი“', description: 'ადგილობრივი ღვინოები ჭიქით, სიღნაღის ხედით.', name_en: '"Qvevri" Wine Bar', description_en: 'Local wines by the glass, with a view over Sighnaghi.', lat: 41.6203, lng: 45.9209 },
  { type: 'cafe', name: 'საცხობი „თონე“', description: 'ცხელი თონის პური და ხაჭაპური დილიდან.', name_en: '"Tone" Bakery', description_en: 'Hot tone bread and khachapuri from early morning.', lat: 41.9486, lng: 45.8106 },
  { type: 'tour', name: 'ღვინის ტური ალაზნის ველზე', description: 'ნახევარდღიანი ტური 3 საოჯახო მარანში, დეგუსტაციით.', name_en: 'Alazani Valley wine tour', description_en: 'Half-day tour of 3 family wine cellars, with tastings.', lat: 41.9171, lng: 45.4822 },
  { type: 'tour', name: 'ქვევრის მასტერკლასი', description: 'როგორ მზადდება ქვევრის ღვინო: 2 საათი მარანში.', name_en: 'Qvevri masterclass', description_en: 'How qvevri wine is made: 2 hours in a wine cellar.', lat: 41.8991, lng: 45.5689 },
  { type: 'guide', name: 'გიდი ნინო: ქართ. / ინგლ. / გერმ.', description: 'თელავი და კახეთის მონასტრები, ნახევარი ან სრული დღე.', name_en: 'Guide Nino: Georgian / English / German', description_en: 'Telavi and the monasteries of Kakheti, half or full day.', lat: 41.9165, lng: 45.4721 },
  { type: 'guide', name: 'გიდი დავითი: ლაშქრობები', description: 'მთის მარშრუტები ყვარლიდან და ლაგოდეხიდან.', name_en: 'Guide Davit: hiking', description_en: 'Mountain routes from Kvareli and Lagodekhi.', lat: 41.9523, lng: 45.8174 },
  { type: 'trail', name: 'ნინოსხევის ჩანჩქერის ბილიკი', description: 'ლაგოდეხის დაცული ტერიტორია: ტყის ბილიკი ჩანჩქერამდე.', name_en: 'Ninoskhevi Waterfall trail', description_en: 'Lagodekhi Protected Areas: a forest trail to the waterfall.', lat: 41.8592, lng: 46.2958 },
  { type: 'trail', name: 'წმ. ნინოს წყარო (ბოდბე)', description: 'ბოდბის მონასტრიდან ტყით ჩამავალი ბილიკი წყარომდე.', name_en: 'St. Nino\'s Spring (Bodbe)', description_en: 'A trail leading down through the forest from Bodbe Monastery to the spring.', lat: 41.6032, lng: 45.9362 },
  { type: 'landmark', name: 'ალავერდის მონასტერი', description: 'XI საუკუნის ტაძარი ალაზნის ველზე, საკუთარი მარნით.', name_en: 'Alaverdi Monastery', description_en: '11th-century cathedral in the Alazani Valley, with its own wine cellar.', lat: 42.0326, lng: 45.3771 },
  { type: 'landmark', name: 'გრემის ციხე-ქალაქი', description: 'კახეთის სამეფოს XVI საუკუნის დედაქალაქი და მთავარანგელოზთა ეკლესია.', name_en: 'Gremi Citadel', description_en: '16th-century capital of the Kingdom of Kakheti, with the Church of the Archangels.', lat: 41.9993, lng: 45.6661 },
  { type: 'landmark', name: 'ბატონის ციხე', description: 'კახეთის მეფეების სასახლე თელავის ცენტრში, ერეკლე II-ის სასახლით.', name_en: 'Batonis Tsikhe Fortress', description_en: 'Fortress of the kings of Kakheti in central Telavi, with the palace of Erekle II.', lat: 41.9187, lng: 45.4777 },
  { type: 'landmark', name: 'სიღნაღის გალავანი', description: 'XVIII საუკუნის გალავანი კოშკებით და ალაზნის ველის პანორამით.', name_en: 'Sighnaghi Town Wall', description_en: '18th-century town wall with towers and a panorama of the Alazani Valley.', lat: 41.6181, lng: 45.9252 },
  { type: 'landmark', name: 'ნეკრესის მონასტერი', description: 'მთის ფერდზე მდებარე ერთ-ერთი უძველესი მონასტერი კახეთში.', name_en: 'Nekresi Monastery', description_en: 'One of the oldest monasteries in Kakheti, on a mountainside.', lat: 41.9651, lng: 45.7992 },
  { type: 'landmark', name: 'წინანდლის მამული', description: 'ალექსანდრე ჭავჭავაძის სახლ-მუზეუმი, ბაღი და ისტორიული მარანი.', name_en: 'Tsinandali Estate', description_en: 'Alexander Chavchavadze\'s house museum, garden and historic wine cellar.', lat: 41.8948, lng: 45.5712 },
];

// Guesthouses and landmarks all over Georgia (georgia-places.json, photos from Wikimedia Commons).
// backend/src/seed.js reads the same file.
const photoUrl = (key) => PLACES.photos[key]?.url;
for (const h of HOTELS) h.photos = PLACES.existingHotelPhotos[h.key] ? [photoUrl(PLACES.existingHotelPhotos[h.key])] : [];
HOTELS.push(...PLACES.hotels.map(({ photo, ...h }) => ({ ...h, photos: [photoUrl(photo)] })));
for (const p of POIS) p.photo = photoUrl(PLACES.existingPoiPhotos[p.name]) ?? null;
POIS.push(...PLACES.landmarks.map(({ photo, ...p }) => ({ ...p, photo: photoUrl(photo) })));