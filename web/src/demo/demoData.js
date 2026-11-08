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
    address: 'თელავი, ძველი ქალაქი',
    lat: 41.9189,
    lng: 45.4752,
    rating: 4.7,
    description:
      'საოჯახო სასტუმრო თელავის ძველ უბანში, ალაზნის ველისა და კავკასიონის ხედით. ბატონის ციხემდე 5 წუთის სავალია, საკუთარ მარანში კი ოჯახის ღვინოს დააგემოვნებთ.',
    checkin_info: 'გასაღების ყუთი ჭიშკართან, მარცხენა კედელზეა. ოთახი მეორე სართულზეა, კიბე ეზოდან ადის.',
    rooms: [
      { number: '101', title: 'ორადგილიანი, ბაღის ხედით', price: 120, key_type: 'box', capacity: 2 },
      { number: '102', title: 'ორადგილიანი, აივნით', price: 140, key_type: 'smartlock', lock_id: 1, capacity: 2 },
      { number: '201', title: 'საოჯახო ოთახი', price: 180, key_type: 'smartlock', lock_id: 2, capacity: 4 },
    ],
    services: [
      { name: 'საუზმე', price: 25, description: 'ქართული საუზმე ეზოში: ხაჭაპური, ყველი, თაფლი' },
      { name: 'ღვინის დეგუსტაცია', price: 45, description: '4 ქვევრის ღვინო საკუთარი მარნიდან' },
      { name: 'ტრანსფერი თბილისიდან', price: 150, description: 'აეროპორტიდან ან ქალაქიდან, 4 ადგილამდე' },
      { name: 'ოთახის დალაგება', price: 0, description: 'დამატებითი დალაგება ყოფნის დროს' },
    ],
  },
  {
    key: 'marani',
    owner: 'levan',
    name: 'ძველი მარანი',
    address: 'სიღნაღი, გალავნის ქუჩა',
    lat: 41.6196,
    lng: 45.9221,
    rating: 4.8,
    description:
      'XIX საუკუნის ქვის სახლი სიღნაღის გალავანთან. ოთახებიდან ალაზნის ველი მოჩანს, ძველ მარანში კი საღამოობით სუფრა იშლება.',
    checkin_info: 'გასაღების ყუთი მთავარ კართან, ზარის ქვემოთაა.',
    rooms: [
      { number: '1', title: 'ორადგილიანი, ქალაქის ხედით', price: 95, key_type: 'box', capacity: 2 },
      { number: '2', title: 'ლუქსი ბუხრით', price: 150, key_type: 'smartlock', lock_id: 3, capacity: 2 },
    ],
    services: [
      { name: 'საუზმე', price: 20, description: 'საოჯახო საუზმე' },
      { name: 'ქვევრის ღვინის ტური', price: 60, description: 'მარნის ტური და 3 ღვინის დეგუსტაცია' },
      { name: 'ველოსიპედის ქირაობა', price: 30, description: 'ერთი დღით' },
    ],
  },
  {
    key: 'tsinandali',
    owner: 'nino',
    name: 'წინანდლის ბაღი',
    address: 'წინანდალი, მამულის მახლობლად',
    lat: 41.8968,
    lng: 45.5741,
    rating: 4.6,
    description:
      'მშვიდი სასტუმრო ვენახებს შორის, წინანდლის მამულიდან 10 წუთის სავალზე. აქვს ბაღი, აუზი და ვახშამი ქართული სუფრით.',
    checkin_info: 'გასაღების ყუთი ალაყაფის კარის მარჯვნივ, ყურძნის ლოზის ქვეშაა.',
    rooms: [
      { number: 'A', title: 'სტანდარტული', price: 130, key_type: 'box', capacity: 2 },
      { number: 'B', title: 'ვილა აუზის პირას', price: 220, key_type: 'smartlock', lock_id: 4, capacity: 3 },
    ],
    services: [
      { name: 'საუზმე', price: 30, description: 'ბუფეტი ბაღში' },
      { name: 'ვახშამი ქართული სუფრით', price: 70, description: 'ერთ ადამიანზე, ღვინით' },
      { name: 'ოთახის დალაგება', price: 15, description: 'დამატებითი დალაგება' },
    ],
  },
  {
    key: 'kvareli',
    owner: 'levan',
    name: 'ყვარლის კარი',
    address: 'ყვარელი, ჭავჭავაძის ქუჩა',
    lat: 41.9497,
    lng: 45.8129,
    rating: 4.5,
    description:
      'მარტივი და თბილი გესთჰაუსი კავკასიონის ძირას. კარგი საწყისი წერტილია ლაგოდეხისა და გრემის სანახავად.',
    checkin_info: 'გასაღების ყუთი ეზოს ჭიშკართან, საფოსტო ყუთის გვერდითაა.',
    rooms: [
      { number: '1', title: 'ორადგილიანი', price: 80, key_type: 'box', capacity: 2 },
      { number: '2', title: 'სამადგილიანი', price: 100, key_type: 'box', capacity: 3 },
    ],
    services: [
      { name: 'საუზმე', price: 20, description: 'თონის პური, ყველი, მურაბა' },
      { name: 'ტრანსფერი ლაგოდეხში', price: 80, description: 'ორივე მიმართულებით' },
      { name: 'გიდი (1 დღე)', price: 120, description: 'ქართულ, ინგლისურ ან რუსულ ენაზე' },
    ],
  },
];

// Coordinates are approximate; cafes, tours and guides are fictional.
export const POIS = [
  { type: 'cafe', name: 'კაფე „ჩურჩხელა“', description: 'ქართული დესერტები და ყავა თელავის ცენტრში.', lat: 41.9202, lng: 45.4768 },
  { type: 'cafe', name: 'ღვინის ბარი „ქვევრი“', description: 'ადგილობრივი ღვინოები ჭიქით, სიღნაღის ხედით.', lat: 41.6203, lng: 45.9209 },
  { type: 'cafe', name: 'საცხობი „თონე“', description: 'ცხელი თონის პური და ხაჭაპური დილიდან.', lat: 41.9486, lng: 45.8106 },
  { type: 'tour', name: 'ღვინის ტური ალაზნის ველზე', description: 'ნახევარდღიანი ტური 3 საოჯახო მარანში, დეგუსტაციით.', lat: 41.9171, lng: 45.4822 },
  { type: 'tour', name: 'ქვევრის მასტერკლასი', description: 'როგორ მზადდება ქვევრის ღვინო: 2 საათი მარანში.', lat: 41.8991, lng: 45.5689 },
  { type: 'guide', name: 'გიდი ნინო: ქართ. / ინგლ. / გერმ.', description: 'თელავი და კახეთის მონასტრები, ნახევარი ან სრული დღე.', lat: 41.9165, lng: 45.4721 },
  { type: 'guide', name: 'გიდი დავითი: ლაშქრობები', description: 'მთის მარშრუტები ყვარლიდან და ლაგოდეხიდან.', lat: 41.9523, lng: 45.8174 },
  { type: 'trail', name: 'ნინოსხევის ჩანჩქერის ბილიკი', description: 'ლაგოდეხის დაცული ტერიტორია: ტყის ბილიკი ჩანჩქერამდე.', lat: 41.8592, lng: 46.2958 },
  { type: 'trail', name: 'წმ. ნინოს წყარო (ბოდბე)', description: 'ბოდბის მონასტრიდან ტყით ჩამავალი ბილიკი წყარომდე.', lat: 41.6032, lng: 45.9362 },
  { type: 'landmark', name: 'ალავერდის მონასტერი', description: 'XI საუკუნის ტაძარი ალაზნის ველზე, საკუთარი მარნით.', lat: 42.0326, lng: 45.3771 },
  { type: 'landmark', name: 'გრემის ციხე-ქალაქი', description: 'კახეთის სამეფოს XVI საუკუნის დედაქალაქი და მთავარანგელოზთა ეკლესია.', lat: 41.9993, lng: 45.6661 },
  { type: 'landmark', name: 'ბატონის ციხე', description: 'კახეთის მეფეების სასახლე თელავის ცენტრში, ერეკლე II-ის სასახლით.', lat: 41.9187, lng: 45.4777 },
  { type: 'landmark', name: 'სიღნაღის გალავანი', description: 'XVIII საუკუნის გალავანი კოშკებით და ალაზნის ველის პანორამით.', lat: 41.6181, lng: 45.9252 },
  { type: 'landmark', name: 'ნეკრესის მონასტერი', description: 'მთის ფერდზე მდებარე ერთ-ერთი უძველესი მონასტერი კახეთში.', lat: 41.9651, lng: 45.7992 },
  { type: 'landmark', name: 'წინანდლის მამული', description: 'ალექსანდრე ჭავჭავაძის სახლ-მუზეუმი, ბაღი და ისტორიული მარანი.', lat: 41.8948, lng: 45.5712 },
];

// Guesthouses and landmarks all over Georgia (georgia-places.json, photos from Wikimedia Commons).
// backend/src/seed.js reads the same file.
const photoUrl = (key) => PLACES.photos[key]?.url;
for (const h of HOTELS) h.photos = PLACES.existingHotelPhotos[h.key] ? [photoUrl(PLACES.existingHotelPhotos[h.key])] : [];
HOTELS.push(...PLACES.hotels.map(({ photo, ...h }) => ({ ...h, photos: [photoUrl(photo)] })));
for (const p of POIS) p.photo = photoUrl(PLACES.existingPoiPhotos[p.name]) ?? null;
POIS.push(...PLACES.landmarks.map(({ photo, ...p }) => ({ ...p, photo: photoUrl(photo) })));