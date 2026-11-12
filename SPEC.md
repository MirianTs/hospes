# Hospes — ჰაკათონის პროექტი (Smartstay 2026, 36 სთ, დემო-დონე)

## იდეა
უკონტაქტო check-in პლატფორმა საქართველოს მცირე სასტუმროებისა და გესთჰაუსებისთვის
+ ტურისტული აღმოჩენის რუკა (კაფეები, ტურები, გიდები, ბილიკები, ღირსშესანიშნაობები).

## სტეკი
- Backend: Node.js + Express + SQLite (better-sqlite3)
- Frontend: React (Vite), mobile-responsive
- რუკა: Leaflet + OpenStreetMap; Google Maps მხოლოდ გარე ლინკებად
- სახის ამოცნობა: @vladmandic/face-api ბრაუზერში (ID ფოტო vs სელფი)
- Arduino: `serialport` პაკეტი; backend ლოკალურად ეშვება ლეპტოპზე
- გადახდა: mock (fake ფორმა)
- Mobile (Expo): მოგვიანებით, თუ დრო დარჩა

## როლები
guest / owner / admin — ერთი User ცხრილი `role` ველით. JWT ავტორიზაცია.

## მონაცემთა მოდელი
- User: id, name, phone, email, password_hash, role, verification_status, id_doc_url, selfie_url
- Hotel: id, name, address, lat, lng, owner_id, google_rating (static), description, photos, checkin_info (გასაღების ყუთის მდებარეობა, ჩანს მხოლოდ ჩექინის შემდეგ)
- Room: id, hotel_id, number, price, key_type (მხოლოდ box: გასაღების ლოქერ-ბოქსი), lock_id (Hospes Lock-ის განყოფილება, Arduino servo 1–4, nullable, უნიკალური ერთი სასტუმროს ფარგლებში), status
- HotelService: id, hotel_id, name, price (საუზმე, დალაგება...)
- Booking: id, user_id (nullable), room_id, check_in, check_out, status, source (internal/external), access_code, total_price
- ServiceRequest: id, booking_id, hotel_service_id, status (pending/done)
- POI: id, type (cafe/tour/guide/trail/landmark), name, description, lat, lng, google_maps_url, photo

## API routes
- auth: POST /register, POST /login, GET /me, POST /verify (ID + selfie შედეგი)
- public: GET /hotels, GET /hotels/:id, GET /rooms/:id/availability, GET /pois?type=
- guest: POST /bookings, GET /bookings/my, POST /bookings/:id/pay (mock),
  POST /checkin/code (კოდის შემოწმება; lock_id-ის მქონე ოთახზე → Serial "OPEN<id>"),
  POST /bookings/:id/cancel, POST /bookings/:id/checkout (გასაღების დასაბრუნებელი განყოფილება #4),
  GET|POST /bookings/:id/services
- owner: GET /owner/hotels, GET /owner/bookings, PATCH /rooms/:id (ფასი/სტატუსი),
  CRUD /owner/services, POST /owner/blocks (Booking.com-ის ხელით ბლოკი → Booking source=external),
  DELETE /owner/blocks/:id (ბლოკის მოხსნა), GET /owner/service-requests, PATCH /owner/service-requests/:id (pending/done)
- admin: POST /admin/hotels, POST /admin/rooms, POST /admin/pois (ობიექტებსა და რუკის ადგილებს მხოლოდ ადმინი ამატებს),
  GET /admin/users, PATCH /admin/users/:id (როლი, ვერიფიკაცია), GET /admin/hardware, POST /admin/locks/:n/open (სერვოს ტესტი),
  /admin/rfid/* (ბარათით შესვლა: ბარათები, რეჟიმი, ცოცხალი ჟურნალი)

## წესები
- ოთახზე თარიღების გადაფარვა აკრძალულია (internal + external ჯავშნები ერთად მოწმდება)
- access_code მოქმედებს მხოლოდ check_in → check_out შუალედში
- ჩექინი მხოლოდ ვერიფიცირებულ მომხმარებელს, აქტიური ჯავშნით

## Frontend გვერდები
მთავარი (ჩვენს შესახებ + პროდუქტები) · სერვისები კატეგორიებით · ძებნა რუკით + ფილტრი ·
ობიექტის გვერდი + ჯავშანი · რეგისტრაცია/ვერიფიკაცია · პირადი კაბინეტი / ჩემი ჯავშნები ·
ჩექინის ეკრანი (6-ციფრიანი კოდი; ჭკვიანი საკეტის ღილაკი ამოღებულია) · დამატებითი სერვისები · მფლობელის დეშბორდი ·
ადმინი (ობიექტები, მომხმარებლები, Arduino) · ბარათით შესვლა (`/lock`) · ფოტოების ავტორები (`/credits`)

## Arduino
Uno + 4 SG90 (გარე 5V კვება, საერთო GND) + RC522 ბარათის მკითხველი. ბრძანება Serial-ით (9600 baud): "OPEN1".."OPEN4"
→ servo იხსნება, 5 წამში თავისით ბრუნდება (დაფა პასუხობს OPENED<n>, მერე LOCKED<n>). ბარათის მიდებაზე დაფა აგზავნის
"RFID:<uid>", გაღებას backend წყვეტს. განყოფილებები 1–3 ოთახების გასაღებებისაა, #4 ჩექაუთზე გასაღების დასაბრუნებელი.

## დემო სცენარი
რეგისტრაცია + ვერიფიკაცია → რუკაზე ძებნა → გესთჰაუსის ჯავშანი → კოდი →
კოდის შემოწმება → ლოქერ-ბოქსის (Hospes Lock-ის განყოფილების) გაღება →
სერვისის მოთხოვნა → მფლობელი ხედავს ჯავშანს, ცვლის ფასს, ბლოკავს გარე ჯავშანს.

## პრიორიტეტი
1. ჯავშანი + კოდი  2. Arduino unlock  3. მფლობელის დეშბორდი
4. რუკა + POI  5. სახის ვერიფიკაცია  6. დამატებითი სერვისები
Seed მონაცემები: 30 გესთჰაუსი მთელ საქართველოში (მათგან 4 კახეთშია, დემო მფლობელებითა და ჯავშნებით),
113 ადგილი რუკაზე (15 კახეთში + 98 `web/src/demo/georgia-places.json`-იდან).
