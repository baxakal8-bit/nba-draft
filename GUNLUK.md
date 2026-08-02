## 2026-08-02 — 4. oturum
**Bugünün işi:** Oyunu yapmak

**Ne yaptım:** Draft oyununu sıfırdan kurduk. 82-0'ın kopyası değil — ondan
almak istediğim tek şey vardı, "zor bir hedefe tekrar tekrar saldırmak".
Kural şu oldu: 100 milyon bütçe, beş tur, her turda 15 oyuncu-sezon
gösteriliyor, beş pozisyonu da dolduruyorsun.

Oyunun bütün mantığı fiyatın değerden farklı olması. Fiyat sadece sayıdan
geliyor (bir de oynadığı maç sayısından), değer ise Score — asist, ribaund,
savunma, hepsi içinde. Yani sessiz ama iyi bir oyuncu ucuza çok puan
getiriyor, çok sayı atan ama kötü şut yüzdesi olan biri servet götürüp az
veriyor. Score oynarken gizli, sonunda açılıyor.

Sonra sırayla: aynı oyuncunun iki farklı sezonunu almayı engelledik,
Hall of Fame + bugünün yıldızlarından bir "efsane" listesi yapıp onlara
+3 puan verdik (sadece oyunda, karşılaştırıcıda değil), skoru açan bir
düğme koyduk, fiyatları NBA maaşı gibi ($30M) gösterdik.

Günün son işi en önemlisiydi: boş pozisyon bedavaydı. Robot testinde "hep
en pahalıyı al" stratejisi oyunların %97'sini eksik kadroyla bitiriyordu ve
cezasını çekmiyordu. İki deneme yaptık, ilki işe yaramadı, ikincisi yaradı.
Artık kalan kutuları dolduramayacak kadar para harcamana izin verilmiyor,
ve paran azalınca ucuz oyuncular çıkıyor. Dört stratejinin dördü de %100
tam kadro bitiriyor, kelepir avcısı hâlâ açık ara önde (121 - 108 - 86 - 61).

**Ne bozdum / yanlış yaptım:** Oyun sayfası sonsuza kadar "Loading data..."
dedi, sebebi `game.html`'e `data.js`'i eklemeyi unutmamızdı — konsolu açıp
bakmayı öğrendim, sayfa takıldığında ilk yapılacak şey oymuş.

Bir de boş pozisyon için ilk çözümümüz işe yaramadı: taban puanı düşürüp
ucuz oyuncu çıkarttık ama paran zaten $0-2M'a düştüğü ve ligdeki en ucuz
oyuncu $3M olduğu için alacak bir şey yoktu. Ölçmeseydik "düzelttik"
sanacaktık.

**Yarım kalan:** 60'ların pivotları hâlâ en büyük kelepir — o dönemde
ribaund bol olduğu için Score'ları şişiyor. Oyuncu bunu fark ederse oyun
tek taktiğe düşebilir.

**Babama sorum:** yok

**Keyif:** evet

**Kavram kontrolü:**
- Fiyat ile değeri ayırmak neden oyunu oyun yapar → kendi kurdu ✅
- Boş slotun bedava olması → sayıyla gösterince oturdu, çözümü de kendi
  söyledi ("son turlarda minimum azalsın ki kadro dolsun") ✅
- Konsola bakmak / sessiz hata → 🔸

---

## 2026-08-02 — 3. oturum
**Bugünün işi:** Ağırlık testleri

**Ne yaptım:** Ağırlıkları deneyen bir arama algoritması yazdık
(`tools/tune.js`). Sezonları ikiye böldü, yarısında ağırlıkları ayarladı,
diğer yarısında sınadı. Bulduğu ağırlıklar MVP'yi 29 yerine 35 sezonda
tutturuyordu ama blok ağırlığını sıfıra indirmişti. Ben bunun savunma
oyuncularını bozacağını ölçmeden önce söyledim, sonra DPOY pusulasında
ölçtük ve haklı çıktım (%58.6 → %56.6). Kendi ağırlıklarımda kaldım.
Yayınlanmış iki formülle de karşılaştırdık (Game Score, Win Score) —
benimkiler onlarla başa baş.

Sonra sırayla: Win Shares'i skora ekledim (çeyreği), All-NBA ve
All-Defensive takımlarını ekledim (All-NBA 3 / 2.25 / 1.75, All-Defensive
2 / 1.5), "Impact Score" adını "Score" yaptım, sayfayı koyu tasarıma
çevirdim, ve tarayıcının kendi dropdown'larını atıp kendi yazdığımız
bileşenle değiştirdik.

**Ne bozdum / yanlış yaptım:** Kodu Claude yazdığı için takıldığım bir yer
olmadı, ama en baştaki planların bir kısmını anlamadım — özellikle
sezonları ikiye bölme fikrini ve MVP oyunu formüle koyunca testin neden
bozulduğunu. Sayı görünce oturdu, anlatımla olmadı.

Bir de ödül bonusu eklerken Gobert 2025'in "0%" görünmesini fark ettim.
Meğer oy almış ama binde iki, yuvarlanınca sıfır çıkıyormuş. `<1%` yaptık.

**Yarım kalan:** Yok.

**Babama sorum:** yok

**Keyif:** evet

**Kavram kontrolü:**
- Ölçtüğün şeyi iyileştirirsin, ölçmediğin bozulur → ölçmeden kendi buldu ✅
- `ws` mi `ws / takım galibiyeti` mi → kendi düzeltti, "maç kazandırmak"
  dediği şeyin `ws` olduğunu gördü ✅
- Dropdown'daki sonsuz döngü → bilemedi, konuştuk 🔸
- Overfitting / sezonları ikiye bölmek → anlamadı, Claude karar verdi 🔸

---

## 2026-08-01 — 2. oturum
**Bugünün işi:** Formüldeki şut verimliliği açığını kapatmak

**Ne yaptım:** Sayının ağırlığını sabit 1.0 olmaktan çıkarıp şut yüzdesiyle
çarpmayı ben önerdim. Önce fg% denedik ama üçlük atanları cezalandırıyordu,
çünkü fg% girmiş bir üçlüğü de bir sayıyor. TS% ile eFG% arasında kaldık,
eFG%'i seçtim. 1980 öncesinde üçlük olmadığı için o sezonlarda eFG% ile fg%
aynı sayı — böylece herkes tek cetvelle ölçülüyor.

Sonra formülü MVP oylamasıyla sınadık: 70 sezonda benim 1. sıradaki oyuncum
29 kere gerçek MVP çıktı (%41), gerçek MVP 59 kere ilk 5'imdeydi (%84).

Son olarak MVP ve DPOY oylarını skora bonus olarak ekledim (tavan 5 ve 3).
Gobert nihayet savunması için puan alıyor.

**Ne bozdum / yanlış yaptım:** MVP oyunu formüle koymak istedim, Claude
"o zaman testin anlamı kalmaz" dedi, anlamadım, ısrar ettim. Sonunda ayrı
tutarak çözdük. Ayrıca asist ağırlığını gerçek veriyle değiştirmeyi denedik
ama sonuç neredeyse değişmedi, veri de 1997'de başlıyordu — vazgeçtim.

**Yarım kalan:** Ağırlık testleri. Yarın altı ağırlığı oynatıp %41'i
yükseltmeye çalışacağız. Dikkat edilecek şey overfitting.

**Babama sorum:** yok

**Keyif:** evet

**Kavram kontrolü:**
- Port nedir? → kendi cümleleriyle anlattı ✅
  "Port, bilgisayara veri gelince hangi programa gideceğini bilmesi için
  yardımcı olan bir adres."
  Benzetmeyi de kendi kurdu, söylenmeden: **IP sokak, port ev numarası.**
  Eksik kalan tek yer: alan adının arka planda porta değil IP'ye
  dönüştüğü (DNS), portun ise `https://` kısmından geldiği (443).
- Cevap anahtarını formüle koymak neden bozar? → zorlandı, konuştuk 🔸

---

## 2026-07-28 — 1. oturum
**Bugünün işi:** Veri kaynağını bulmak ve indirmek

**Ne yaptım:** Projeyi 82-0 oyunundan oyuncu karşılaştırıcısına daralttım,
KAPSAM.md yazdık. Veri kaynağı için API'leri eledik, Basketball Reference
kaynaklı hazır bir CSV indirdik (1947-2026, 33.340 satır). Sonra MVP'yi
yaptık: iki oyuncu + sezon seçiliyor, maç başına istatistikleri yan yana
çıkıyor, yüksek olan yeşil işaretleniyor.

**Ne bozdum / yanlış yaptım:** API tarafında takıldım. stats.nba.com'u
denedim, bağlantıyı yüzüme kapattı (ERR_CONNECTION_RESET). Kaggle sayfası
da açılmadı (ChunkLoadError). İkisini de aşamadık, başka yoldan gittik.

**Yarım kalan:** Yok — kapatmak üzereyken formüle de girdik ve bitirdik.
Impact Score çalışıyor. Ağırlıkları possession mantığıyla ben kurdum:
possession başına ortalama 1.15 sayı, possession el değiştirmesi 2.30.
Buradan asist 1.20, oreb 1.68, dreb 0.62, çalma 2.30, blok 0.60,
top kaybı -2.30. Blok ağırlığından emin değilim, orası tahmin.
Şut yüzdelerini hesaba katmayı denedik ama her denemede başka bir şey
bozuldu, o yüzden basit halde bıraktık ve sayfada açıkça yazdık.

**Babama sorum:** yok

**Keyif:** evet

**Kavram kontrolü:**
- Neden API yerine dosya? → bilemedi, konuştuk 🔸
- Ağırlıklar neden lazım? → kendi buldu, sorulmadan söyledi ✅
- Top kaybı ağırlığı? → kendi türetti (-2.30) ✅
- Points per possession mantığı? → çalma ve top kaybında kendi kurdu ✅

---
# Kavramlar
(ilk öğrendiği tarih — anlatabildiği tarih)

- cache — 28 Tem ✅
- CORS / ERR_CONNECTION_RESET — 28 Tem 🔸
- fetch — 28 Tem 🔸
- statik veri seti vs canlı API — 28 Tem 🔸
- points per possession — 28 Tem ✅
- ağırlıklandırma (weights) — 28 Tem ✅
- marjinal değer ("olmasaydı ne olurdu") — 28 Tem 🔸
- shot creation / usage — 28 Tem 🔸
- eFG% / TS% — 1 Ağu ✅
- port — 1 Ağu ✅ (benzetmeyi kendi kurdu)
- DNS — 1 Ağu 🔸
- cevap anahtarını girdi yapmak (circularity) — 1 Ağu 🔸
- overfitting — 2 Ağu 🔸
- proxy metrik tuzağı (ölçtüğünü iyileştirir, ölçmediğini bozar) — 2 Ağu ✅
- Win Shares — 2 Ağu ✅
- box-sizing — 2 Ağu 🔸
- olay döngüsü (bir olayın tepkisi kendini tetiklemesi) — 2 Ağu 🔸
- fiyat ≠ değer (oyunu oyun yapan boşluk) — 2 Ağu ✅
- CSV'de tırnak içindeki virgül — 2 Ağu 🔸
- sessiz hata / konsola bakmak — 2 Ağu 🔸
- robotla oynatıp ölçmek (playtest) — 2 Ağu ✅
