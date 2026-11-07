# Hospes — PROGRESS

## გაკეთდა
- 2026-09-26: Smartstay 2026 ჰაკათონის დემო (backend Express+SQLite, web React+Vite, Arduino საკეტები) და GitHub Pages დემო — https://miriants.github.io/hospes/
- 2026-11-02 (NucBox): რეპო დაკლონილია Documents\Code\hospes-proekti-ში.
- 2026-11-05 (NucBox): GitHub Pages რეპოში გამორთული იყო (Pages demo workflow 404-ით ცვიოდა) — ჩავრთეთ (წყარო: GitHub Actions), deploy თავიდან გავუშვით, დემო ისევ მუშაობს.
- 2026-11-08 (SkillLAB): Arduino ლოქერის პროექტი (hospes-proekti-2: 4 სერვო, Web Serial საიტი) დაემატა hardware/servo-locker/-ში.

- 2026-11-08 (SkillLAB): მთავარი გვერდის რებილდი დაიწყო, ბრენჩი `homepage-skeleton` (main-იდან): ჩონჩხი მომხმარებლის ტექსტებით (ჰირო მთელ სიგანეზე ფოტოს ადგილით → როგორ მუშაობს → პროდუქტები → გესთჰაუსები საქართველოში → ჩვენს შესახებ → გაქვს გესთჰაუსი?). მორგებულია ტელეფონზე, ტაბლეტზე და დესკტოპზე. ტესტ-დიზაინი `design-trailhead` ბრენჩზე დარჩა.

- 2026-11-08 (SkillLAB): ჩონჩხი ცოცხალზეა: https://miriants.github.io/hospes/ (Pages deploy ხელით, `homepage-skeleton`-იდან; github-pages გარემოს წესებში ეს ბრენჩიც დაემატა). ხელახლა: `gh workflow run "Pages demo" --ref homepage-skeleton`. ძველი დემოს დასაბრუნებლად იგივე `--ref main`.
## დარჩა
- 2026-11-08 (SkillLAB): **გაგრძელება სხვა კომპიუტერზე:** `git fetch && git switch homepage-skeleton`, მერე `cd web && npm install && npm run dev`. ბრენჩები GitHub-ზეა: `homepage-skeleton` (ახალი ჩონჩხი), `design-trailhead` (ძველი ტესტ-დიზაინი). main-ზე push Pages საიტს აახლებს, ამიტომ main-ში ჯერ არ შეგვაქვს.
- 2026-11-08 (SkillLAB): მომხმარებელი მისცემს თემფლეითს → მთავარი გვერდის დიზაინის გამართვა; ჰიროს ფოტო; ახალი სლოგანი.
- 2026-11-08 (SkillLAB): დემო გესთჰაუსები მხოლოდ კახეთშია, სხვა რეგიონებიც უნდა დაემატოს.
- 2026-11-08 (SkillLAB): შემდეგ: დანარჩენი გვერდები (სერვისები, რუკა, რეგისტრაცია/შესვლა).

## გადაწყვეტილებები
- 2026-11-01: პროექტი გაჩერებულია, მაგრამ ისევ დაგვჭირდება.

## ღია პრობლემები
- დემო-დონე: სახის შედარებას სერვერი ბრაუზერს ენდობა, გადახდა სიმულაციაა, დემო ანგარიშები რეალურ პილოტამდე წასაშლელია.
