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
- overfitting — 1 Ağu (yarın)
