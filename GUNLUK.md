## 2026-08-05 — 6. oturum
**Bugünün işi:** 73-9'un üstünü açmak

**Ne yaptım:** 73-9 tavandı, 175 puanın üstündeki her şey aynı yazıyordu.
Teorik en iyi kadro 227 puan ediyor, yani 52 puan boşa gidiyordu. Merdiveni
82-0'a kadar uzattık: 74-8, 75-7 diye devam ediyor, en tepede kimsenin
yapmadığı 82-0 var. 70 ve 71 hâlâ atlanıyor çünkü gerçekten de hiçbir takım
o kadar kazanmamış.

82-0 için gereken puanı önce 215 koyduk, robot 4000 oyunda bir kez bile
geçemedi. Ölçüp 200'e indirdik — ulaşılamayan hedef hedef değil.

Sonra fotoğrafları ekledim. `player_id` zaten Basketball Reference'ın
fotoğraf dosya adıymış, yani ayrı bir eşleştirme tablosuna gerek yok.
Tarayıcı indirdiği dosyayı diske yazamadığı için kendi web sunucumu yazdım
(`tools/serve.js`) — ilk isteyende kaynaktan çekiyor, sonra diskten veriyor.
Fotoğrafı olmayan oyuncu için siluet koyduk, yoksa tarayıcı kendi kırık
resim ikonunu basıyor ve kart yamuluyordu.

Günün geri kalanı: kart istatistikleri okunmuyordu (kontrast 4.84:1'di,
16.08:1 yaptık ve üç sütuna dizdik), dürbün jokeri (bir oyunda beş kez tek
bir kartın puanına bakabilirsin), yan pozisyon kartları (PG dolu olsa bile
Luka çıkabiliyor — PG'deki adamı taşıyıp yerini açabilirsin), pozisyon
havuzlarını dengeledik (pivot havuzu PG'nin iki katıydı), takımı link olarak
paylaşma, ve karşılaştırıcıdaki açıklamayı hover'a taşıdık.

En sonunda proje **internete çıktı**: github.com/baxakal8-bit/nba-draft ve
baxakal8-bit.github.io/nba-draft

**Ne bozdum / yanlış yaptım:** Cloudflare Pages'e yayınladık ama site
açılmadı, sonsuza kadar döndü. Kodda hata yoktu — internet sağlayıcım
(Superonline) `pages.dev` adresini engelliyormuş. DNS sorduğumuzda
Cloudflare'in adresi yerine Superonline'ın kendi sunucusunu veriyordu.
1.1.1.1 ve 8.8.8.8 de engelliymiş. GitHub Pages'e taşıyınca açıldı.

Bir de takım rekoru listesini eskiden yapay zekâya sordurmuştum, bu oturumda
onun 63 satırından 29'unun yanlış olduğu ortaya çıkmıştı — gerçek veriyle
karşılaştırınca. O ders bugün tekrar işe yaradı: usage fikrimi de ölçtük,
MVP testini kazandı ama mantığı sağlam değildi ve kendim vazgeçtim.

**Yarım kalan:** Sayfa ilk açılışta 4-5 saniye boş duruyor, 4.7MB veri
iniyor. "Loading data..." yazsa daha iyi olur.

**Babama sorum:** yok

**Keyif:** evet

**Kavram kontrolü:**
- Top kaybını usage'a bölmek → fikri kendi buldu, itirazı duyunca kendi
  vazgeçti (test kazanmasına rağmen) ✅
- Neden site açılmıyor → DNS'i görünce anladı, "kodda hata yok" kısmı oturdu 🔸
- Fotoğraf için neden ayrı sunucu gerekti → kendi çözdü, kendi yazdı ✅

---

## 2026-08-03 — 5. oturum
**Bugünün işi:** 60'ların ribaundunu düzeltmek

**Ne yaptım:** Kelepir listesinin tamamı 60'ların pivotuydu. Sebebi o dönemde
ribaundun bol olması — 1960'ta 20+ dakika oynayan biri maç başına 7.67 ribaund
alıyor, bugün 5.05. Kimse ribaundu unutmadı, sadece toplanacak top çoktu.

İki yol vardı: 60-70 arasına sabit bir çarpan koymak, ya da her sezonu kendi
lig ortalamasına bölmek. İkincisini seçtim çünkü ilkinde sınırı ben uyduruyor
oldum — 1974 ×0.7, 1975 ×1.0 olması saçma. Şimdi çarpan veriden çıkıyor: 1960
için 0.65, 1975 için 0.86, bugün 1.00. Wilt 1967 60.7'den 56.5'e indi, modern
oyuncular kılını kıpırdatmadı, kelepir listesinin 12'sinin 8'i modern oldu.

Sonra bugünkü işten saptım ve beş şey daha yaptım:

1. Skoru NBA rekoruna çeviren bir tablo (`records.js`). 121 puan = 51-31,
   175 = 73-9. Her galibiyet sayısı için o rekoru gerçekten yapmış bir takım
   yazıyor, en yenisi seçiliyor.
2. En iyi skor hafızası. Skorlar açık ve kapalı için ayrı rekor tutuluyor,
   çünkü açıkken oynamak aynı oyun değil.
3. Beş joker: shuffle, reveal, double dip, other years (aynı isimler başka
   sezonlar), sell (oyuncuyu geri sat, parayı al).
4. İki pozisyonlu oyuncular. Sezon dosyası tek pozisyon veriyor ama kariyer
   dosyasında G-F, F-C gibi ikili etiketler var — 7998 oyuncu-sezonu (%35)
   iki pozisyonlu oldu. Kadroda taşıma ve takas ekledim, ve kendi
   pozisyonunda oynayana +2 bonus koyduk.
5. Denge ayarı: fiyatlar %10 ucuzladı, sonra bir %10 daha ucuzlattım ama geri
   aldım çünkü çok kolay oldu. 73-9 eşiği 185'ten 175'e indi.

En sonunda **72-10** attım. 1996 Bulls. Kadro: Luka, Kobe, Rodman, Duncan,
Steven Adams — üç tane az sayı atan büyük adam, iki yıldız.

**Ne bozdum / yanlış yaptım:** İki tane sessiz hata çıktı, ikisi de hata
vermeden çalışıyordu.

Birincisi Claude'un yazdığı tekilleştirme koduydu: oyuncuyu `player_id` ile
eşliyordu, yani bir oyuncunun bütün sezonlarını teke indiriyordu. Kod
çalışıyordu ama her oyunda 20 puan eksik veriyordu. Robotla ölçmeseydik fark
etmezdik.

İkincisi benim fark ettiğim: bir oyuncuyu C'ye aldıktan sonra PF/C olan
birini PF'ye alınca puanı düşüyordu. Meğer o adamın gerçek pozisyonu C'ymiş,
C dolu olduğu için PF'ye ödünç giriyormuş, +2 alamıyormuş. Kart iki durumda
da aynı görünüyordu. Şimdi kart hep gerçek pozisyonu önce yazıyor.

Bir de rekor listesini bir yapay zekâya sordurmuştum, 63 satırın 29'u
yanlıştı — 2015 Jazz'a 28-54 demiş, gerçek 38-44. Elimizdeki gerçek takım
verisiyle karşılaştırınca çıktı. Doğrulamasaydık oyun yanlış takım
söyleyecekti.

**Yarım kalan:** 73-9 hâlâ tavan, üstüne 82-0'a kadar devam etme fikri duruyor.
Teorik tavan 239 puan, yani 175'in çok üstünde yer var. Commit yok, repo yok.

**Babama sorum:** yok

**Keyif:** evet

**Kavram kontrolü:**
- Çarpanı sayıya mı ağırlığa mı uygulasak (ikisi aynı mı)? → kendi buldu,
  "3x5x4 = 4x3x5" dedi ✅
- Fiyatı ucuzlatmak neden işe yaramadı? → parayı harcayamadığını gösterince
  oturdu 🔸
- Veriyi doğrulamak → yapay zekânın uydurduğu listeyi görünce anladı ✅

---

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
- dönem düzeltmesi (bir sayıyı kendi çağına bölmek) — 3 Ağu ✅
- çarpma sırası değişmez (kommutatiflik) — 3 Ağu ✅
- veriyi kaynağıyla doğrulamak — 3 Ağu ✅
- bağlayıcı olmayan kısıt (parayı harcayamamak) — 3 Ağu 🔸
- çalışan ama yanlış kod — 3 Ağu 🔸
- DNS ve alan adı engelleme — 5 Ağu 🔸
- kontrast oranı (okunabilirlik ölçüsü) — 5 Ağu ✅
- statik site yayınlamak (git push = yayın) — 5 Ağu ✅
- lisans (kod açık ama izin ayrı bir şey) — 5 Ağu 🔸
- başkasının dosyasını kopyalamak vs adres vermek — 5 Ağu 🔸
- testi kazanan fikri mantığı yüzünden reddetmek — 5 Ağu ✅
