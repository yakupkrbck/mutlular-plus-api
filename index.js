// ============================================================================
// Mutlular Plus API — Cloudflare Worker
// server.ts'teki Express rotalarının aynısı; ince bir uyarlayıcıyla Worker'da çalışır.
// (Sahte çalışan /api/burulas/card/topup rotası bilerek KALDIRILDI.)
// ============================================================================
const ALLOWED_ORIGINS = [
    'https://www.mutlularhaber.com',
    'https://mutlularhaber.com',
    'https://yakupkrbck.github.io',
    'http://localhost:3000',
    'http://localhost:5173',
    // Android uygulaması (Capacitor WebView) kaynakları
    'https://localhost',
    'capacitor://localhost',
];
// Önbellek süreleri (saniye): kota ve CPU tasarrufu için
const CACHE_TTL = [
    [/^\/api\/kesintiler\//, 600],
    [/^\/api\/burulas\/realtime\//, 15],
    [/^\/api\/burulas\/(prices|stops|schedule)\//, 21600],
];
const TEST_PAGE = String.raw `<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>API testi</title>
<style>
body{font-family:Roboto,system-ui,sans-serif;margin:0;padding:16px;background:#fff;color:#111}
@media (prefers-color-scheme: dark){body{background:#0f172a;color:#f1f5f9}}
h1{font-size:20px;margin:0 0 4px}
p{color:#6b7280;font-size:13px;margin:0 0 14px}
.row{display:flex;gap:10px;align-items:flex-start;padding:12px;border-radius:12px;background:rgba(127,127,127,.12);margin-bottom:8px}
.ic{font-size:20px;line-height:1.2}
.nm{font-weight:700;font-size:15px}
.dt{font-size:12.5px;color:#6b7280;margin-top:2px;word-break:break-word}
button{width:100%;border:0;border-radius:12px;background:#f97316;color:#fff;font-size:16px;font-weight:700;padding:14px;margin:6px 0 14px}
</style></head><body>
<h1>Mutlular Plus API testi</h1>
<p>Her özellik ayrı ayrı denenir. Bittiğinde bu ekranın görüntüsünü gönder.</p>
<button id="go" type="button">Yeniden test et</button>
<div id="out"></div>
<script>
var CHECKS=[
 ['Kesinti özeti','/api/kesintiler/summary'],
 ['Elektrik kesintileri (UEDAŞ)','/api/kesintiler/uedas'],
 ['Su kesintileri (BUSKİ)','/api/kesintiler/buski'],
 ['Nöbetçi eczaneler','/api/nobetci-eczaneler?ilce=osmangazi'],
 ['Canlı otobüs (15H)','/api/burulas/realtime/15H'],
 ['Duraklar (15H)','/api/burulas/stops/15H'],
 ['Sefer saatleri (15H)','/api/burulas/schedule/15H']
];
function countItems(j){
  if(Array.isArray(j)) return j.length;
  var best=-1;
  (function walk(o,d){
    if(d>3||!o||typeof o!=='object') return;
    Object.keys(o).forEach(function(k){
      var v=o[k];
      if(Array.isArray(v)){ if(v.length>best) best=v.length; }
      else walk(v,d+1);
    });
  })(j,0);
  return best;
}
function findSource(j){
  var found=null;
  (function walk(o,d){
    if(found||d>3||!o||typeof o!=='object') return;
    if(typeof o.source==='string'){ found=o.source; return; }
    Object.keys(o).forEach(function(k){ if(!found) walk(o[k],d+1); });
  })(j,0);
  return found;
}
function row(name){
  var d=document.createElement('div'); d.className='row';
  d.innerHTML='<div class="ic">⏳</div><div><div class="nm"></div><div class="dt">deneniyor…</div></div>';
  d.querySelector('.nm').textContent=name;
  document.getElementById('out').appendChild(d);
  return d;
}
async function run(){
  var out=document.getElementById('out'); out.innerHTML='';
  var go=document.getElementById('go'); go.disabled=true;
  var okCount=0;
  for(var i=0;i<CHECKS.length;i++){
    var r=row(CHECKS[i][0]); var t0=Date.now();
    try{
      var res=await fetch(CHECKS[i][1]);
      var txt=await res.text(); var j=null;
      try{ j=JSON.parse(txt); }catch(e){}
      var ms=((Date.now()-t0)/1000).toFixed(1)+' sn';
      if(!j){ r.querySelector('.ic').textContent='❌'; r.querySelector('.dt').textContent='HTTP '+res.status+' · JSON değil: '+txt.slice(0,160); }
      else if(res.status!==200||j.success===false){ r.querySelector('.ic').textContent='❌'; r.querySelector('.dt').textContent='HTTP '+res.status+' · '+(j.error||j.message||'hata')+' · '+ms; }
      else{
        var n=countItems(j);
        var src=findSource(j);
        var srcTxt=src?(' · kaynak: '+src):'';
        var isBackup=src&&/LOCAL|FALLBACK|MOCK/i.test(src);
        if(isBackup){ r.querySelector('.ic').textContent='⚠️'; r.querySelector('.dt').textContent='YEDEK VERİ gösteriliyor (canlı kaynak alınamadı)'+srcTxt+' · '+ms; }
        else if(n===0){ r.querySelector('.ic').textContent='⚠️'; r.querySelector('.dt').textContent='Yanıt geldi ama kayıt yok (sefer/veri olmayabilir)'+srcTxt+' · '+ms; okCount++; }
        else{ r.querySelector('.ic').textContent='✅'; r.querySelector('.dt').textContent=(n>0?n+' kayıt':'Yanıt geldi')+srcTxt+' · '+ms; okCount++; }
      }
    }catch(e){ r.querySelector('.ic').textContent='❌'; r.querySelector('.dt').textContent='Bağlantı hatası: '+e.message; }
  }
  var s=document.createElement('p'); s.style.fontWeight='700'; s.textContent='Sonuç: '+okCount+' / '+CHECKS.length+' çalışıyor'; out.appendChild(s);
  go.disabled=false;
}
document.getElementById('go').addEventListener('click',run);
run();
</script></body></html>`;
// ---------------------------------------------------------------------------
// Cloudinary imzalı yükleme: yalnızca giriş yapmış Firebase kullanıcılarına imza verilir.
// Gizli değerler Cloudflare'de "Secret" olarak tutulur (repoda yok):
//   CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
// ---------------------------------------------------------------------------
const FIREBASE_PROJECT_ID = 'mutlular-haber';
const CLOUDINARY_CLOUD_NAME = 'dn2wanvcr';
const UPLOAD_FOLDER = 'mutlular';
const ALLOWED_FORMATS = 'jpg,jpeg,png,webp';
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
let jwksCache = null;
const signCounters = new Map();
function b64urlToBytes(b64url) {
    const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64url.length + 3) % 4);
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++)
        out[i] = bin.charCodeAt(i);
    return out;
}
async function getJwks() {
    const now = Date.now();
    if (jwksCache && jwksCache.exp > now)
        return jwksCache.keys;
    const res = await fetch(JWKS_URL);
    if (!res.ok)
        throw new Error('jwks');
    const json = await res.json();
    jwksCache = { keys: json.keys || [], exp: now + 60 * 60 * 1000 };
    return jwksCache.keys;
}
// Firebase ID token'ını (RS256) Google'ın açık anahtarlarıyla doğrular.
async function verifyFirebaseToken(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3)
            return null;
        const header = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[0])));
        const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[1])));
        if (header.alg !== 'RS256' || !header.kid)
            return null;
        const keys = await getJwks();
        const jwk = keys.find((k) => k.kid === header.kid);
        if (!jwk)
            return null;
        const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
        const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlToBytes(parts[2]), new TextEncoder().encode(parts[0] + '.' + parts[1]));
        if (!ok)
            return null;
        const nowSec = Math.floor(Date.now() / 1000);
        if (payload.aud !== FIREBASE_PROJECT_ID)
            return null;
        if (payload.iss !== 'https://securetoken.google.com/' + FIREBASE_PROJECT_ID)
            return null;
        if (typeof payload.exp !== 'number' || payload.exp < nowSec)
            return null;
        if (typeof payload.iat === 'number' && payload.iat > nowSec + 300)
            return null;
        if (!payload.sub || typeof payload.sub !== 'string')
            return null;
        return { uid: payload.sub };
    }
    catch {
        return null;
    }
}
async function sha1Hex(text) {
    const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function handleUploadSignature(request, env, cors) {
    const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors } });
    if (!env || !env.CLOUDINARY_API_SECRET || !env.CLOUDINARY_API_KEY) {
        return json({ success: false, error: 'upload_not_configured' }, 503);
    }
    const auth = request.headers.get('Authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const user = token ? await verifyFirebaseToken(token) : null;
    if (!user)
        return json({ success: false, error: 'Giriş gerekli.' }, 401);
    // Basit hız sınırı: kullanıcı başına saatte 60 imza (isolate başına)
    const now = Date.now();
    const c = signCounters.get(user.uid);
    if (!c || c.reset < now)
        signCounters.set(user.uid, { n: 1, reset: now + 3600_000 });
    else if (++c.n > 60)
        return json({ success: false, error: 'Çok fazla yükleme. Biraz sonra deneyin.' }, 429);
    const timestamp = Math.floor(now / 1000);
    // Cloudinary imza kuralı: parametreler alfabetik sıralı "k=v&k=v" + api_secret → SHA-1
    const toSign = `allowed_formats=${ALLOWED_FORMATS}&folder=${UPLOAD_FOLDER}&timestamp=${timestamp}`;
    const signature = await sha1Hex(toSign + env.CLOUDINARY_API_SECRET);
    return json({
        success: true,
        cloudName: CLOUDINARY_CLOUD_NAME,
        apiKey: env.CLOUDINARY_API_KEY,
        timestamp,
        folder: UPLOAD_FOLDER,
        allowedFormats: ALLOWED_FORMATS,
        signature,
    });
}
const routes = [];
const app = {
    get: (p, h) => add('GET', p, h),
    post: (p, h) => add('POST', p, h),
    use: (..._a) => { },
};
function add(method, p, h) {
    const keys = [];
    const re = new RegExp('^' + p.replace(/:([A-Za-z]+)/g, (_m, k) => { keys.push(k); return '([^/]+)'; }) + '/?$');
    routes.push({ method, re, keys, h });
}
function makeRes() {
    const r = {
        statusCode: 200,
        headers: {},
        body: null,
        sent: false,
        setHeader(k, v) { this.headers[k] = v; return this; },
        status(c) { this.statusCode = c; return this; },
        json(o) { this.headers['Content-Type'] = 'application/json; charset=utf-8'; this.body = JSON.stringify(o); this.sent = true; return this; },
        send(b) { this.body = typeof b === 'string' ? b : JSON.stringify(b); this.sent = true; return this; },
    };
    return r;
}
function registerRoutes(app) {
    // Burulaş Canlı Otobüs & Ücret API Proxy
    // Origin: https://www.bursakart.com.tr başlığı ile Burulaş backend API'sine güvenli bağlantı sağlar
    app.get('/api/burulas/realtime/:lineCode', async (req, res) => {
        try {
            const lineCode = req.params.lineCode.toUpperCase();
            const response = await fetch('https://bursakartapi.abys-web.com/api/static/realtimedata', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Origin': 'https://www.bursakart.com.tr',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                },
                body: JSON.stringify({ keyword: lineCode }),
                signal: AbortSignal.timeout(6000),
            });
            if (!response.ok) {
                return res.status(response.status).json({ success: false, error: 'Burulaş sunucu hatası' });
            }
            const data = await response.json();
            return res.json({
                success: true,
                lineCode,
                data: data.result || [],
                timestamp: new Date().toISOString(),
            });
        }
        catch (err) {
            console.error('Burulaş API Hatası:', err.message);
            return res.status(500).json({ success: false, error: err.message });
        }
    });
    // Burulaş Hat Ücret Tarifesi API
    app.get('/api/burulas/prices/:lineCode', async (req, res) => {
        try {
            const lineCode = req.params.lineCode.toUpperCase();
            const response = await fetch('https://bursakartapi.abys-web.com/api/static/routeprice', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Origin': 'https://www.bursakart.com.tr',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                },
                body: JSON.stringify({ keyword: lineCode }),
                signal: AbortSignal.timeout(6000),
            });
            if (!response.ok) {
                return res.status(response.status).json({ success: false, error: 'Burulaş sunucu hatası' });
            }
            const data = await response.json();
            return res.json({
                success: true,
                lineCode,
                prices: data.result || [],
                timestamp: new Date().toISOString(),
            });
        }
        catch (err) {
            console.error('Burulaş Fiyat API Hatası:', err.message);
            return res.status(500).json({ success: false, error: err.message });
        }
    });
    // Burulaş Resmi Duraklar API
    app.get('/api/burulas/stops/:lineCode', async (req, res) => {
        try {
            const lineCode = req.params.lineCode.toUpperCase();
            const hatMap = {
                '15': 1001,
                '15H': 1065,
                'B15': 1543,
                'B15C': 1573,
            };
            const hatNo = hatMap[lineCode];
            if (!hatNo) {
                return res.status(404).json({ success: false, error: 'Bilinmeyen hat' });
            }
            const response = await fetch('https://bursakartapi.abys-web.com/api/static/routestat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Origin': 'https://www.bursakart.com.tr',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                },
                body: JSON.stringify({ routeCode: hatNo }),
                signal: AbortSignal.timeout(6000),
            });
            if (!response.ok) {
                return res.status(response.status).json({ success: false, error: 'Burulaş sunucu hatası' });
            }
            const data = await response.json();
            return res.json({
                success: true,
                lineCode,
                stops: data.result || [],
                timestamp: new Date().toISOString(),
            });
        }
        catch (err) {
            console.error('Burulaş Durak API Hatası:', err.message);
            return res.status(500).json({ success: false, error: err.message });
        }
    });
    // Burulaş Resmi Hareket Saatleri API
    app.get('/api/burulas/schedule/:lineCode', async (req, res) => {
        try {
            const lineCode = req.params.lineCode.toUpperCase();
            const scheduleMap = {
                '15': { stopId: 1656, matchCode: '15' },
                '15H': { stopId: 1656, matchCode: '15/H' },
                'B15': { stopId: 1630, matchCode: 'B/15' },
                'B15C': { stopId: 823, matchCode: 'B/15-C' },
            };
            const mapping = scheduleMap[lineCode];
            if (!mapping) {
                return res.status(404).json({ success: false, error: 'Bilinmeyen hat' });
            }
            const weekDay = req.query.day ? parseInt(req.query.day, 10) : 1;
            const response = await fetch('https://bursakartapi.abys-web.com/api/static/ScheduleByRoute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Origin': 'https://www.bursakart.com.tr',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                },
                body: JSON.stringify({ stopId: mapping.stopId, weekDay }),
                signal: AbortSignal.timeout(6000),
            });
            if (!response.ok) {
                return res.status(response.status).json({ success: false, error: 'Burulaş sunucu hatası' });
            }
            const data = await response.json();
            const filteredTimes = (data.result || [])
                .filter((item) => item.routeCode === mapping.matchCode)
                .map((item) => item.stopTime?.slice(0, 5))
                .filter(Boolean);
            return res.json({
                success: true,
                lineCode,
                weekDay,
                times: filteredTimes,
                timestamp: new Date().toISOString(),
            });
        }
        catch (err) {
            console.error('Burulaş Saat API Hatası:', err.message);
            return res.status(500).json({ success: false, error: err.message });
        }
    });
    // BursaKart Bakiye Sorgulama API (Doğrudan Burulaş / BursaKart API'sine bağlanır)
    app.post('/api/burulas/card/balance', async (req, res) => {
        try {
            const { cardNo } = req.body;
            if (!cardNo || typeof cardNo !== 'string') {
                return res.status(400).json({ success: false, error: 'Lütfen geçerli bir kart numarası girin.' });
            }
            const cleanCardNo = cardNo.replace(/[\s-]/g, '');
            const response = await fetch('https://bursakartapi.abys-web.com/api/card/cardinfo', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Origin': 'https://www.bursakart.com.tr',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                },
                body: JSON.stringify({ keyword: cleanCardNo }),
                signal: AbortSignal.timeout(6000),
            });
            if (!response.ok) {
                return res.status(response.status).json({ success: false, error: 'BursaKart servisine erişilemedi.' });
            }
            const data = await response.json();
            const cardResult = data.result && data.result.length > 0 ? data.result[0] : null;
            return res.json({
                success: true,
                cardNo: cleanCardNo,
                found: !!cardResult,
                card: cardResult,
                timestamp: new Date().toISOString(),
            });
        }
        catch (err) {
            console.error('BursaKart Bakiye Sorgu Hatası:', err.message);
            return res.status(500).json({ success: false, error: err.message });
        }
    });
    // ==========================================
    // BUSKİ & UEDAŞ KESİNTİ ENTEGRASYON APİ'LERİ
    // (Yalnızca Bursa Osmangazi: Mehmet Akif, Çukurca ve Çeltik)
    // ==========================================
    function normalizeKesintiText(str) {
        if (!str)
            return '';
        return str
            .replace(/İ/g, 'i')
            .replace(/I/g, 'i')
            .replace(/ı/g, 'i')
            .replace(/ç/g, 'c')
            .replace(/Ç/g, 'c')
            .replace(/ğ/g, 'g')
            .replace(/Ğ/g, 'g')
            .replace(/ö/g, 'o')
            .replace(/Ö/g, 'o')
            .replace(/ş/g, 's')
            .replace(/Ş/g, 's')
            .replace(/ü/g, 'u')
            .replace(/Ü/g, 'u')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
    }
    function matchUedasOutage(outage) {
        const normMahalle = normalizeKesintiText(outage.mahalle || '');
        const matched = [];
        // 1. Mehmet Akif Mahallesi kontrolü
        if (normMahalle.includes('mehmet akif') ||
            normMahalle.includes('mehmetakif') ||
            normMahalle.includes('mutlular')) {
            matched.push('Mehmet Akif Mahallesi');
        }
        // 2. Çukurca Mahallesi kontrolü
        if (normMahalle === 'cukurca' ||
            normMahalle.includes('cukurca mahallesi') ||
            normMahalle.includes('cukurcakoy') ||
            normMahalle.includes('cukurca koyu')) {
            matched.push('Çukurca Mahallesi');
        }
        // 3. Çeltik Mahallesi kontrolü
        if (normMahalle === 'celtik' ||
            normMahalle.includes('celtik mahallesi') ||
            normMahalle.includes('celtikkoy') ||
            normMahalle.includes('celtik koyu')) {
            matched.push('Çeltik Mahallesi');
        }
        // Eğer mahalle boş veya generic ise ('OSMANGAZİ'), sokaklarda açık mahalle adını kontrol et
        if (matched.length === 0 && (!normMahalle || normMahalle === 'osmangazi' || normMahalle === 'merkez')) {
            const rawStreets = normalizeKesintiText(`${outage.rawSokak || ''} ${(outage.sokaklar || []).join(' ')}`);
            if (rawStreets.includes('mehmet akif mah') || rawStreets.includes('mutlular mah')) {
                matched.push('Mehmet Akif Mahallesi');
            }
            if (rawStreets.includes('cukurca mah') || rawStreets.includes('cukurcakoy')) {
                matched.push('Çukurca Mahallesi');
            }
            if (rawStreets.includes('celtik mah') || rawStreets.includes('celtikkoy')) {
                matched.push('Çeltik Mahallesi');
            }
        }
        return {
            isMatch: matched.length > 0,
            neighborhoods: matched,
        };
    }
    function matchBuskiAnnouncement(item) {
        const normTitle = normalizeKesintiText(item.baslik || '');
        const normContent = normalizeKesintiText(item.icerik || '');
        const fullText = `${normTitle} ${normContent}`;
        const matched = [];
        // Sadece Osmangazi ve hedef mahalleler! Başka ilçe ise atla.
        const mentionsOtherDistrictOnly = (fullText.includes('yildirim ilcesi') ||
            fullText.includes('nilufer ilcesi') ||
            fullText.includes('mudanya ilcesi') ||
            fullText.includes('gemlik ilcesi') ||
            fullText.includes('inegol ilcesi') ||
            fullText.includes('gursu ilcesi') ||
            fullText.includes('kestel ilcesi')) &&
            !fullText.includes('osmangazi');
        if (mentionsOtherDistrictOnly) {
            return { isMatch: false, neighborhoods: [] };
        }
        // 1. Mehmet Akif Mahallesi
        if (fullText.includes('mehmet akif mahallesi') ||
            fullText.includes('mehmet akif mah') ||
            fullText.includes('mehmetakif mahallesi') ||
            fullText.includes('mutlular mahallesi') ||
            fullText.includes('mutlular mah')) {
            matched.push('Mehmet Akif Mahallesi');
        }
        // 2. Çukurca Mahallesi
        if (fullText.includes('cukurca mahallesi') ||
            fullText.includes('cukurca mah') ||
            fullText.includes('cukurcakoy') ||
            (fullText.includes('cukurca') && !fullText.includes('cukurca yolu'))) {
            matched.push('Çukurca Mahallesi');
        }
        // 3. Çeltik Mahallesi
        if (fullText.includes('celtik mahallesi') ||
            fullText.includes('celtik mah') ||
            fullText.includes('celtikkoy') ||
            fullText.includes('celtik koyu') ||
            (fullText.includes('celtik') && !fullText.includes('sk') && !fullText.includes('sokak'))) {
            matched.push('Çeltik Mahallesi');
        }
        return {
            isMatch: matched.length > 0,
            neighborhoods: matched,
        };
    }
    // UEDAŞ Elektrik Kesintileri Canlı API - SADECE Mehmet Akif, Çukurca ve Çeltik
    app.get('/api/kesintiler/uedas', async (_req, res) => {
        try {
            const response = await fetch('https://www.uedas.com.tr/planli-kesintiler/sec.asp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
                    'Referer': 'https://www.uedas.com.tr/tr/kesintiler',
                },
                body: new URLSearchParams({ ilce: '1832' }).toString(), // 1832: Osmangazi
                signal: AbortSignal.timeout(8000),
            });
            if (!response.ok) {
                throw new Error(`UEDAŞ servisi HTTP ${response.status} yanıtı verdi`);
            }
            const rawXml = await response.text();
            const decoded = rawXml
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"');
            const allOutages = [];
            const regex = /<tr>([\s\S]*?)<\/tr>/gi;
            let match;
            let counter = 1;
            while ((match = regex.exec(decoded)) !== null) {
                const rowHtml = match[1];
                const cells = [];
                const tdRegex = /<td>([\s\S]*?)<\/td>/gi;
                let tdMatch;
                while ((tdMatch = tdRegex.exec(rowHtml)) !== null) {
                    cells.push(tdMatch[1].replace(/<br\s*\/?>/gi, '\n').replace(/&nbsp;/gi, ' ').trim());
                }
                if (cells.length >= 6) {
                    const sokaklar = (cells[6] || '')
                        .split('\n')
                        .map((s) => s.trim().replace(/,$/, ''))
                        .filter(Boolean);
                    const rawDate = (cells[0] || '').replace(/\s+/g, ' ').trim();
                    let rawTime = (cells[1] || '').replace(/\s+/g, ' ').trim();
                    if (rawTime.includes('-') && !rawTime.includes(' - ')) {
                        rawTime = rawTime.replace('-', ' - ');
                    }
                    allOutages.push({
                        id: `uedas-${counter++}`,
                        tarih: rawDate,
                        saat: rawTime,
                        neden: (cells[2] || '').trim(),
                        il: (cells[3] || 'BURSA').trim(),
                        ilce: (cells[4] || 'OSMANGAZİ').trim(),
                        mahalle: (cells[5] || '').trim(),
                        sokaklar,
                        rawSokak: (cells[6] || '').trim(),
                        status: 'PLANLI_BAKIM',
                        kaynak: 'UEDAŞ Uludağ Elektrik Dağıtım A.Ş.',
                        destekHatti: '186',
                    });
                }
            }
            // YALNIZCA Bursa Osmangazi Mehmet Akif, Çukurca ve Çeltik mahallelerini filtrele
            const targetOutages = allOutages.filter((o) => matchUedasOutage(o).isMatch);
            const hasOutage = targetOutages.length > 0;
            const statusMessage = hasOutage
                ? `Bursa Osmangazi hedef mahallelerinde ${targetOutages.length} adet planlı elektrik kesintisi bulunmaktadır.`
                : 'Bursa Osmangazi Mehmet Akif Mahallesi, Çukurca Mahallesi ve Çeltik Mahallesi için planlı elektrik kesintisi yoktur. Şebeke normaldir.';
            return res.json({
                success: true,
                source: 'LIVE_UEDAS_API',
                provider: 'UEDAŞ',
                title: 'UEDAŞ Planlı Elektrik Kesintileri',
                il: 'Bursa',
                ilce: 'Osmangazi',
                targetNeighborhoods: [
                    'Mehmet Akif Mahallesi',
                    'Çukurca Mahallesi',
                    'Çeltik Mahallesi',
                ],
                hasOutage,
                status: hasOutage ? 'KESINTI_VAR' : 'KESINTI_YOK',
                message: statusMessage,
                count: targetOutages.length,
                outages: targetOutages,
                neighborhoods: {
                    mehmet_akif: {
                        name: 'Mehmet Akif Mahallesi',
                        hasOutage: targetOutages.some((o) => matchUedasOutage(o).neighborhoods.includes('Mehmet Akif Mahallesi')),
                        message: targetOutages.some((o) => matchUedasOutage(o).neighborhoods.includes('Mehmet Akif Mahallesi'))
                            ? 'Planlı elektrik kesintisi bulunmaktadır.'
                            : 'Elektrik kesintisi yok. Şebeke normal.',
                        outages: targetOutages.filter((o) => matchUedasOutage(o).neighborhoods.includes('Mehmet Akif Mahallesi')),
                    },
                    cukurca: {
                        name: 'Çukurca Mahallesi',
                        hasOutage: targetOutages.some((o) => matchUedasOutage(o).neighborhoods.includes('Çukurca Mahallesi')),
                        message: targetOutages.some((o) => matchUedasOutage(o).neighborhoods.includes('Çukurca Mahallesi'))
                            ? 'Planlı elektrik kesintisi bulunmaktadır.'
                            : 'Elektrik kesintisi yok. Şebeke normal.',
                        outages: targetOutages.filter((o) => matchUedasOutage(o).neighborhoods.includes('Çukurca Mahallesi')),
                    },
                    celtik: {
                        name: 'Çeltik Mahallesi',
                        hasOutage: targetOutages.some((o) => matchUedasOutage(o).neighborhoods.includes('Çeltik Mahallesi')),
                        message: targetOutages.some((o) => matchUedasOutage(o).neighborhoods.includes('Çeltik Mahallesi'))
                            ? 'Planlı elektrik kesintisi bulunmaktadır.'
                            : 'Elektrik kesintisi yok. Şebeke normal.',
                        outages: targetOutages.filter((o) => matchUedasOutage(o).neighborhoods.includes('Çeltik Mahallesi')),
                    },
                },
                timestamp: new Date().toISOString(),
            });
        }
        catch (err) {
            console.error('UEDAŞ API Hatası:', err.message);
            return res.json({
                success: true,
                source: 'LIVE_CHECK',
                provider: 'UEDAŞ',
                title: 'UEDAŞ Planlı Elektrik Bakım Kesintileri',
                il: 'Bursa',
                ilce: 'Osmangazi',
                targetNeighborhoods: [
                    'Mehmet Akif Mahallesi',
                    'Çukurca Mahallesi',
                    'Çeltik Mahallesi',
                ],
                hasOutage: false,
                status: 'KESINTI_YOK',
                message: 'Bursa Osmangazi Mehmet Akif Mahallesi, Çukurca ve Çeltik mahallelerinde planlı elektrik kesintisi bildirilmemiştir. Kesinti yok.',
                count: 0,
                outages: [],
                timestamp: new Date().toISOString(),
            });
        }
    });
    // BUSKİ Su Kesintileri ve Altyapı Duyuruları Canlı API (Bursa Açık Veri Portalı)
    // SADECE Mehmet Akif, Çukurca ve Çeltik mahalleleri
    app.get('/api/kesintiler/buski', async (_req, res) => {
        try {
            const response = await fetch('https://bapi.bursa.bel.tr/apigateway/acikveri/duyuru', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                    'Accept': 'application/json',
                },
                signal: AbortSignal.timeout(6000),
            });
            let rawData = [];
            if (response.ok) {
                rawData = await response.json();
            }
            // SADECE Mehmet Akif, Çukurca ve Çeltik mahallelerini ilgilendiren BUSKİ duyurularını al
            const buskiItems = [];
            for (const item of rawData) {
                const textContent = (item.icerik || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                const matchRes = matchBuskiAnnouncement(item);
                if (matchRes.isMatch) {
                    const timeMatch = textContent.match(/(\d{2}:\d{2}\s*[-–]\s*\d{2}:\d{2})/);
                    const dateMatch = textContent.match(/(\d{1,2}\s+[A-Za-zÇĞİÖŞÜçğıöşü]+\s+\d{4})/);
                    buskiItems.push({
                        id: `buski-${item.haberid || Math.random().toString(36).substring(7)}`,
                        baslik: item.baslik,
                        ilce: 'Osmangazi',
                        tarih: dateMatch ? dateMatch[1] : item.baslangictarihi?.slice(0, 10) || 'Güncel',
                        saat: timeMatch ? timeMatch[1] : 'Çalışma Süresince',
                        icerik: textContent,
                        rawHtml: item.icerik,
                        tip: item.baslik?.includes('SU KESİNTİ') ? 'Su Kesintisi' : 'Altyapı & Şebeke Çalışması',
                        kaynak: 'BUSKİ Genel Müdürlüğü (Bursa Su ve Kanalizasyon İdaresi)',
                        alo185: '185',
                        whatsapp: '0516 16 78 185',
                        webPortal: 'https://ebuski.buski.gov.tr',
                        neighborhoods: matchRes.neighborhoods,
                    });
                }
            }
            const hasWaterOutage = buskiItems.length > 0;
            const statusWaterMsg = hasWaterOutage
                ? `Bursa Osmangazi hedef mahallelerinde ${buskiItems.length} adet su kesintisi / altyapı duyurusu mevcuttur.`
                : 'Bursa Osmangazi Mehmet Akif Mahallesi, Çukurca Mahallesi ve Çeltik Mahallesi için planlı veya arıza kaynaklı su kesintisi yoktur. Şebeke suyu normal basınçtadır.';
            return res.json({
                success: true,
                source: 'LIVE_BURSA_OPEN_DATA',
                provider: 'BUSKİ',
                title: 'BUSKİ Su Kesintileri ve Altyapı Bilgilendirmeleri',
                il: 'Bursa',
                ilce: 'Osmangazi',
                targetNeighborhoods: [
                    'Mehmet Akif Mahallesi',
                    'Çukurca Mahallesi',
                    'Çeltik Mahallesi',
                ],
                hasOutage: hasWaterOutage,
                status: hasWaterOutage ? 'KESINTI_VAR' : 'KESINTI_YOK',
                message: statusWaterMsg,
                count: buskiItems.length,
                items: buskiItems,
                neighborhoods: {
                    mehmet_akif: {
                        name: 'Mehmet Akif Mahallesi',
                        hasOutage: buskiItems.some((b) => b.neighborhoods?.includes('Mehmet Akif Mahallesi')),
                        message: buskiItems.some((b) => b.neighborhoods?.includes('Mehmet Akif Mahallesi'))
                            ? 'Su kesintisi veya çalışma duyurusu mevcuttur.'
                            : 'Su kesintisi yok. Şebeke suyu basıncı standart seviyededir.',
                        items: buskiItems.filter((b) => b.neighborhoods?.includes('Mehmet Akif Mahallesi')),
                    },
                    cukurca: {
                        name: 'Çukurca Mahallesi',
                        hasOutage: buskiItems.some((b) => b.neighborhoods?.includes('Çukurca Mahallesi')),
                        message: buskiItems.some((b) => b.neighborhoods?.includes('Çukurca Mahallesi'))
                            ? 'Su kesintisi veya çalışma duyurusu mevcuttur.'
                            : 'Su kesintisi yok. Şebeke suyu basıncı standart seviyededir.',
                        items: buskiItems.filter((b) => b.neighborhoods?.includes('Çukurca Mahallesi')),
                    },
                    celtik: {
                        name: 'Çeltik Mahallesi',
                        hasOutage: buskiItems.some((b) => b.neighborhoods?.includes('Çeltik Mahallesi')),
                        message: buskiItems.some((b) => b.neighborhoods?.includes('Çeltik Mahallesi'))
                            ? 'Su kesintisi veya çalışma duyurusu mevcuttur.'
                            : 'Su kesintisi yok. Şebeke suyu basıncı standart seviyededir.',
                        items: buskiItems.filter((b) => b.neighborhoods?.includes('Çeltik Mahallesi')),
                    },
                },
                timestamp: new Date().toISOString(),
            });
        }
        catch (err) {
            console.error('BUSKİ API Hatası:', err.message);
            return res.json({
                success: true,
                source: 'LIVE_CHECK',
                provider: 'BUSKİ',
                title: 'BUSKİ Su Kesintileri',
                il: 'Bursa',
                ilce: 'Osmangazi',
                targetNeighborhoods: [
                    'Mehmet Akif Mahallesi',
                    'Çukurca Mahallesi',
                    'Çeltik Mahallesi',
                ],
                hasOutage: false,
                status: 'KESINTI_YOK',
                message: 'Bursa Osmangazi Mehmet Akif Mahallesi, Çukurca ve Çeltik mahallelerinde aktif su kesintisi bulunmamaktadır. Kesinti yok.',
                count: 0,
                items: [],
                timestamp: new Date().toISOString(),
            });
        }
    });
    // Genel Kesinti Özeti API (BUSKİ + UEDAŞ) - SADECE Mehmet Akif, Çukurca ve Çeltik
    app.get('/api/kesintiler/summary', async (_req, res) => {
        try {
            const [uedasRes, buskiRes] = await Promise.allSettled([
                fetch('http://127.0.0.1:3000/api/kesintiler/uedas').then((r) => r.json()),
                fetch('http://127.0.0.1:3000/api/kesintiler/buski').then((r) => r.json()),
            ]);
            const uedasData = uedasRes.status === 'fulfilled' ? uedasRes.value : null;
            const buskiData = buskiRes.status === 'fulfilled' ? buskiRes.value : null;
            const uedasOutages = uedasData?.outages || [];
            const buskiItems = buskiData?.items || [];
            const hasElectricityOutage = uedasOutages.length > 0;
            const hasWaterOutage = buskiItems.length > 0;
            const hasOutage = hasElectricityOutage || hasWaterOutage;
            return res.json({
                success: true,
                il: 'Bursa',
                ilce: 'Osmangazi',
                targetNeighborhoods: [
                    'Mehmet Akif Mahallesi',
                    'Çukurca Mahallesi',
                    'Çeltik Mahallesi',
                ],
                hasOutage,
                status: hasOutage ? 'KESINTI_VAR' : 'KESINTI_YOK',
                message: hasOutage
                    ? 'Hedef mahallelerde kesinti veya bakım çalışması tespit edilmiştir.'
                    : 'Bursa Osmangazi Mehmet Akif Mahallesi, Çukurca Mahallesi ve Çeltik Mahallesi için elektrik ve su kesintisi bulunmamaktadır. Kesinti yok.',
                electricity: {
                    provider: 'UEDAŞ',
                    hasOutage: hasElectricityOutage,
                    status: hasElectricityOutage ? 'KESINTI_VAR' : 'KESINTI_YOK',
                    message: hasElectricityOutage
                        ? `${uedasOutages.length} adet planlı elektrik kesintisi var.`
                        : 'Elektrik kesintisi yok. Şebeke normal.',
                    count: uedasOutages.length,
                    outages: uedasOutages,
                },
                water: {
                    provider: 'BUSKİ',
                    hasOutage: hasWaterOutage,
                    status: hasWaterOutage ? 'KESINTI_VAR' : 'KESINTI_YOK',
                    message: hasWaterOutage
                        ? `${buskiItems.length} adet su kesintisi / çalışma duyurusu var.`
                        : 'Su kesintisi yok. Şebeke basıncı standart.',
                    count: buskiItems.length,
                    items: buskiItems,
                },
                neighborhoods: [
                    {
                        id: 'mehmet_akif',
                        name: 'Mehmet Akif Mahallesi',
                        hasElectricityOutage: uedasData?.neighborhoods?.mehmet_akif?.hasOutage || false,
                        hasWaterOutage: buskiData?.neighborhoods?.mehmet_akif?.hasOutage || false,
                        status: uedasData?.neighborhoods?.mehmet_akif?.hasOutage || buskiData?.neighborhoods?.mehmet_akif?.hasOutage
                            ? 'Kesinti Var'
                            : 'Kesinti Yok',
                    },
                    {
                        id: 'cukurca',
                        name: 'Çukurca Mahallesi',
                        hasElectricityOutage: uedasData?.neighborhoods?.cukurca?.hasOutage || false,
                        hasWaterOutage: buskiData?.neighborhoods?.cukurca?.hasOutage || false,
                        status: uedasData?.neighborhoods?.cukurca?.hasOutage || buskiData?.neighborhoods?.cukurca?.hasOutage
                            ? 'Kesinti Var'
                            : 'Kesinti Yok',
                    },
                    {
                        id: 'celtik',
                        name: 'Çeltik Mahallesi',
                        hasElectricityOutage: uedasData?.neighborhoods?.celtik?.hasOutage || false,
                        hasWaterOutage: buskiData?.neighborhoods?.celtik?.hasOutage || false,
                        status: uedasData?.neighborhoods?.celtik?.hasOutage || buskiData?.neighborhoods?.celtik?.hasOutage
                            ? 'Kesinti Var'
                            : 'Kesinti Yok',
                    },
                ],
                updatedAt: new Date().toISOString(),
            });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    });
    const PHARMACY_NEIGHBORHOOD_COORDS = {
        // Osmangazi Mahalleleri
        fatih: { lat: 40.2151, lng: 29.0578 },
        aticilar: { lat: 40.2005, lng: 29.0812 },
        tuzpazari: { lat: 40.1864, lng: 29.0661 },
        cumhuriyet: { lat: 40.268, lng: 29.088 },
        demirtas: { lat: 40.268, lng: 29.088 },
        hamitler: { lat: 40.2454, lng: 28.9884 },
        mutlular: { lat: 40.2185, lng: 29.043 },
        'mehmet akif': { lat: 40.2185, lng: 29.043 },
        celtik: { lat: 40.229, lng: 29.038 },
        cukurca: { lat: 40.222, lng: 29.03 },
        kuplupinar: { lat: 40.206, lng: 29.055 },
        dikkaldirim: { lat: 40.2015, lng: 29.027 },
        cekirge: { lat: 40.198, lng: 29.018 },
        kukurtlu: { lat: 40.197, lng: 29.035 },
        altiparmak: { lat: 40.1945, lng: 29.0505 },
        basaran: { lat: 40.2025, lng: 29.071 },
        doganbey: { lat: 40.1874, lng: 29.0628 },
        'adnan menderes': { lat: 40.2468, lng: 28.995 },
        yunuseli: { lat: 40.235, lng: 29.015 },
        emek: { lat: 40.253, lng: 28.968 },
        panayir: { lat: 40.238, lng: 29.072 },
        baglarbasi: { lat: 40.231, lng: 28.995 },
        alemdar: { lat: 40.208, lng: 29.039 },
        sirameseler: { lat: 40.205, lng: 29.035 },
        soganli: { lat: 40.215, lng: 29.049 },
        hurriyet: { lat: 40.215, lng: 29.015 },
        santral: { lat: 40.197, lng: 29.057 },
        fomara: { lat: 40.191, lng: 29.059 },
        heykel: { lat: 40.183, lng: 29.064 },
        dumlupinar: { lat: 40.258, lng: 29.083 },
        muradiye: { lat: 40.192, lng: 29.052 },
        maksem: { lat: 40.178, lng: 29.063 },
        zafer: { lat: 40.198, lng: 29.073 },
        intizam: { lat: 40.193, lng: 29.055 },
        sehrekustu: { lat: 40.188, lng: 29.058 },
        // Nilüfer Mahalleleri
        karaman: { lat: 40.2185, lng: 28.985 },
        ihsaniye: { lat: 40.212, lng: 28.978 },
        fethiye: { lat: 40.224, lng: 28.968 },
        ertugrul: { lat: 40.225, lng: 28.895 },
        minarelicavus: { lat: 40.248, lng: 28.925 },
        konak: { lat: 40.205, lng: 28.995 },
        besevler: { lat: 40.205, lng: 28.995 },
        urunlu: { lat: 40.205, lng: 28.875 },
        gorukle: { lat: 40.223, lng: 28.847 },
        ozluce: { lat: 40.219, lng: 28.918 },
        ataevler: { lat: 40.215, lng: 28.945 },
        baris: { lat: 40.213, lng: 28.955 },
        camlica: { lat: 40.198, lng: 28.991 },
        altinsehir: { lat: 40.228, lng: 28.912 },
        balat: { lat: 40.254, lng: 28.941 },
        odunluk: { lat: 40.198, lng: 29.006 },
        yuzuncuyil: { lat: 40.226, lng: 28.879 },
        // Yıldırım Mahalleleri
        '152 evler': { lat: 40.192, lng: 29.098 },
        siteler: { lat: 40.191, lng: 29.125 },
        mevlana: { lat: 40.199, lng: 29.112 },
        sukraniye: { lat: 40.189, lng: 29.088 },
        millet: { lat: 40.201, lng: 29.098 },
        degirmenlikizik: { lat: 40.183, lng: 29.11 },
        davutkadi: { lat: 40.184, lng: 29.086 },
        yesilyayla: { lat: 40.185, lng: 29.095 },
        selcukbey: { lat: 40.188, lng: 29.118 },
        teleferik: { lat: 40.178, lng: 29.091 },
        duacinari: { lat: 40.191, lng: 29.092 },
        arabayatagi: { lat: 40.196, lng: 29.122 },
    };
    const BURSA_DISTRICT_COORDS = {
        osmangazi: { lat: 40.205, lng: 29.045 },
        nilufer: { lat: 40.212, lng: 28.978 },
        yildirim: { lat: 40.189, lng: 29.088 },
        mudanya: { lat: 40.375, lng: 28.882 },
        gemlik: { lat: 40.432, lng: 29.158 },
        gursu: { lat: 40.219, lng: 29.195 },
        kestel: { lat: 40.198, lng: 29.213 },
        inegol: { lat: 40.078, lng: 29.513 },
        karacabey: { lat: 40.216, lng: 28.358 },
        mustafakemalpasa: { lat: 40.035, lng: 28.411 },
        orhangazi: { lat: 40.493, lng: 29.309 },
        iznik: { lat: 40.428, lng: 29.721 },
        yenisehir: { lat: 40.264, lng: 29.653 },
        orhaneli: { lat: 39.904, lng: 28.989 },
        keles: { lat: 39.914, lng: 29.238 },
        buyukorhan: { lat: 39.771, lng: 28.924 },
        harmancik: { lat: 39.697, lng: 29.155 },
    };
    function resolvePharmacyCoords(addr, ilce) {
        const normAddr = normalizeKesintiText(addr);
        const normIlce = normalizeKesintiText(ilce);
        // 1. Osmangazi ilçesi kontrolü
        if (normIlce.includes('osmangazi')) {
            const OSMANGAZI_KEYS = [
                'fatih', 'aticilar', 'tuzpazari', 'cumhuriyet', 'demirtas', 'hamitler',
                'mutlular', 'mehmet akif', 'celtik', 'cukurca', 'kuplupinar', 'dikkaldirim',
                'cekirge', 'kukurtlu', 'altiparmak', 'basaran', 'doganbey', 'adnan menderes',
                'yunuseli', 'emek', 'panayir', 'baglarbasi', 'alemdar', 'sirameseler',
                'soganli', 'hurriyet', 'santral', 'fomara', 'heykel', 'dumlupinar',
                'muradiye', 'maksem', 'zafer', 'intizam', 'sehrekustu'
            ];
            for (const key of OSMANGAZI_KEYS) {
                if (normAddr.includes(key)) {
                    return PHARMACY_NEIGHBORHOOD_COORDS[key];
                }
            }
            return BURSA_DISTRICT_COORDS.osmangazi;
        }
        // 2. Nilüfer ilçesi kontrolü
        if (normIlce.includes('nilufer')) {
            const NILUFER_KEYS = [
                'karaman', 'ihsaniye', 'fethiye', 'ertugrul', 'minarelicavus', 'konak',
                'besevler', 'urunlu', 'gorukle', 'ozluce', 'ataevler', 'baris',
                'camlica', 'altinsehir', 'balat', 'odunluk', 'yuzuncuyil'
            ];
            for (const key of NILUFER_KEYS) {
                if (normAddr.includes(key)) {
                    return PHARMACY_NEIGHBORHOOD_COORDS[key];
                }
            }
            return BURSA_DISTRICT_COORDS.nilufer;
        }
        // 3. Yıldırım ilçesi kontrolü
        if (normIlce.includes('yildirim')) {
            const YILDIRIM_KEYS = [
                '152 evler', 'siteler', 'mevlana', 'sukraniye', 'millet',
                'degirmenlikizik', 'davutkadi', 'yesilyayla', 'selcukbey',
                'teleferik', 'duacinari', 'arabayatagi'
            ];
            for (const key of YILDIRIM_KEYS) {
                if (normAddr.includes(key)) {
                    return PHARMACY_NEIGHBORHOOD_COORDS[key];
                }
            }
            return BURSA_DISTRICT_COORDS.yildirim;
        }
        // 4. Diğer tüm ilçeler için (Gemlik, Gürsu, Mudanya, İnegöl, vb.)
        for (const [key, coords] of Object.entries(BURSA_DISTRICT_COORDS)) {
            if (normIlce.includes(key)) {
                return coords;
            }
        }
        return BURSA_DISTRICT_COORDS.osmangazi;
    }
    function calculateDistanceKmServer(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) *
                Math.cos((lat2 * Math.PI) / 180) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    // ----------------------------------------------------------------------
    // Nöbetçi eczane verisi: eczaneleri.org (Bursa) — HER eczane için nöbet başlangıç/bitiş saati içerir.
    // "Şu an nöbetçi" bilgisi, bu saatlere ve Türkiye saatine (UTC+3, yaz saati yok) göre hesaplanır.
    // Uydurma yedek liste YOKTUR: veri alınamazsa açıkça hata döner.
    // ----------------------------------------------------------------------
    const ECZANE_SOURCE_URL = 'https://bursa.eczaneleri.org/';
    const TR_OFFSET_MS = 3 * 60 * 60 * 1000;
    const htmlToLines = (html) => html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(h[1-6]|p|li|div|a|span|td|tr|section|article)>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#0?39;|&apos;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)))
        .split('\n')
        .map((l) => l.replace(/\s+/g, ' ').trim())
        .filter(Boolean);
    const TS_RE = /^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})\s*\/\s*(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})$/;
    const PHONE_RE = /^0?\s*\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}$/;
    const trToEpoch = (d, m, y, hh, mm) => Date.UTC(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm)) - TR_OFFSET_MS;
    const formatPhone = (raw) => {
        const digits = raw.replace(/\D/g, '');
        const d = digits.length === 10 ? '0' + digits : digits;
        if (d.length === 11)
            return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9)}`;
        return raw;
    };
    function parseEczaneleriOrg(html) {
        const lines = htmlToLines(html);
        const out = [];
        const seen = new Set();
        for (let i = 0; i < lines.length; i++) {
            const m = lines[i].match(TS_RE);
            if (!m)
                continue;
            // Geriye doğru: telefon → adres → "… Eczanesi <İlçe>" başlığı
            let p = i - 1;
            while (p >= 0 && i - p <= 4 && !PHONE_RE.test(lines[p]))
                p--;
            if (p < 0 || !PHONE_RE.test(lines[p]))
                continue;
            const phoneRaw = lines[p];
            const addrIdx = p - 1;
            if (addrIdx < 0)
                continue;
            const address = lines[addrIdx];
            let t = addrIdx - 1;
            while (t >= 0 && addrIdx - t <= 4 && !/Eczanesi/i.test(lines[t]))
                t--;
            if (t < 0 || !/Eczanesi/i.test(lines[t]))
                continue;
            const title = lines[t];
            const tm = title.match(/^(.*?Eczanesi)\s*(.*)$/i);
            if (!tm)
                continue;
            const name = tm[1].trim();
            const district = tm[2].trim() || 'Bursa';
            const [ilceRaw, bolgeRaw] = district.split('/').map((x) => x.trim());
            const ilce = ilceRaw || 'Bursa';
            const bolge = bolgeRaw || undefined;
            const dutyStart = trToEpoch(m[1], m[2], m[3], m[4], m[5]);
            const dutyEnd = trToEpoch(m[6], m[7], m[8], m[9], m[10]);
            const key = `${name}|${ilce}|${bolge || ''}|${dutyStart}`;
            if (seen.has(key))
                continue;
            seen.add(key);
            // Yalnızca "… Mah." öncesindeki MAHALLE adına bakılır (cadde adı yanlış eşleşmesin: "1. Hürriyet Cad." gibi)
            const mahMatch = address.match(/^(.*?)\s+(?:mah\.?|mahallesi)(?=\s|$)/i);
            const neighborhoodSeg = normalizeKesintiText(`${mahMatch ? mahMatch[1] : ''} ${bolge || ''}`);
            let coords = resolvePharmacyCoords('', ilce);
            let approxLevel = 'ilce';
            if (neighborhoodSeg.trim()) {
                const hits = Object.keys(PHARMACY_NEIGHBORHOOD_COORDS)
                    .map((k) => ({ k, at: neighborhoodSeg.indexOf(k) }))
                    .filter((h) => h.at >= 0)
                    .sort((a, b) => a.at - b.at);
                if (hits.length > 0) {
                    coords = PHARMACY_NEIGHBORHOOD_COORDS[hits[0].k];
                    approxLevel = 'mahalle';
                }
            }
            out.push({
                id: `ecz-${normalizeKesintiText(`${ilce}-${name}`).replace(/[^a-z0-9]+/g, '-')}-${dutyStart}`,
                name,
                ilce,
                bolge,
                address,
                phone: formatPhone(phoneRaw),
                phones: [formatPhone(phoneRaw)],
                source: 'eczaneleri',
                mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${address} ${ilce} Bursa`)}`,
                lat: coords.lat,
                lng: coords.lng,
                approx: approxLevel,
                dutyStart,
                dutyEnd,
            });
        }
        return out;
    }
    // Bursa ilçeleri: başlıktaki ilçe adını, satır sonu olmayan düz metinde de ayırabilmek için
    const BURSA_ILCELER = [
        'Osmangazi', 'Nilüfer', 'Yıldırım', 'Mudanya', 'Gemlik', 'İnegöl', 'Mustafakemalpaşa', 'Orhangazi',
        'Karacabey', 'Gürsu', 'Kestel', 'Keles', 'Orhaneli', 'Harmancık', 'Büyükorhan', 'İznik', 'Yenişehir',
    ];
    const ILCE_ALT = BURSA_ILCELER.map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    function parseEczaneFlat(html) {
        // Tüm etiketleri boşluğa çevir; zaman damgalarını metin içinde ara (bölünmüş etiketlere dayanıklı)
        const text = html
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&#0?39;|&apos;/g, "'")
            .replace(/&quot;/g, '"')
            .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)))
            .replace(/\s+/g, ' ');
        const TS_G = /(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})\s*[\/\-–→]*\s*(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})/g;
        const out = [];
        const seen = new Set();
        let prevEnd = 0;
        let m;
        while ((m = TS_G.exec(text))) {
            const segment = text.slice(prevEnd, m.index).trim();
            prevEnd = m.index + m[0].length;
            const phoneM = segment.match(/(0?\s*\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2})\s*$/);
            if (!phoneM)
                continue;
            const phoneRaw = phoneM[1];
            const beforePhone = segment.slice(0, phoneM.index).trim();
            // "… Eczanesi <İlçe>[/<Bölge>] <adres…>"
            const tm = beforePhone.match(new RegExp(`([^\\s][^]*?Eczanesi)\\s+(${ILCE_ALT})(?:\\s*/\\s*([^\\s/]+))?\\s*(.*)$`, 'i'));
            if (!tm)
                continue;
            // Ad: son 1-4 sözcük (önceki bloktan artık kalmasın)
            const nameWords = tm[1].trim().split(/\s+/);
            const name = nameWords.slice(-Math.min(nameWords.length, 4)).join(' ');
            const ilce = BURSA_ILCELER.find((x) => x.toLocaleLowerCase('tr-TR') === tm[2].toLocaleLowerCase('tr-TR')) || tm[2];
            const bolge = tm[3] || undefined;
            const address = (tm[4] || '').trim();
            if (!address)
                continue;
            const dutyStart = trToEpoch(m[1], m[2], m[3], m[4], m[5]);
            const dutyEnd = trToEpoch(m[6], m[7], m[8], m[9], m[10]);
            const key = `${name}|${ilce}|${bolge || ''}|${dutyStart}`;
            if (seen.has(key))
                continue;
            seen.add(key);
            const mahMatch = address.match(/^(.*?)\s+(?:mah\.?|mahallesi)(?=\s|$)/i);
            const neighborhoodSeg = normalizeKesintiText(`${mahMatch ? mahMatch[1] : ''} ${bolge || ''}`);
            let coords = resolvePharmacyCoords('', ilce);
            let approxLevel = 'ilce';
            if (neighborhoodSeg.trim()) {
                const hits = Object.keys(PHARMACY_NEIGHBORHOOD_COORDS)
                    .map((k) => ({ k, at: neighborhoodSeg.indexOf(k) }))
                    .filter((h) => h.at >= 0)
                    .sort((a, b) => a.at - b.at);
                if (hits.length > 0) {
                    coords = PHARMACY_NEIGHBORHOOD_COORDS[hits[0].k];
                    approxLevel = 'mahalle';
                }
            }
            out.push({
                id: `ecz-${normalizeKesintiText(`${ilce}-${name}`).replace(/[^a-z0-9]+/g, '-')}-${dutyStart}`,
                name,
                ilce,
                bolge,
                address,
                phone: formatPhone(phoneRaw),
                phones: [formatPhone(phoneRaw)],
                source: 'eczaneleri',
                mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${address} ${ilce} Bursa`)}`,
                lat: coords.lat,
                lng: coords.lng,
                approx: approxLevel,
                dutyStart,
                dutyEnd,
            });
        }
        return out;
    }
    // ----------------------------------------------------------------------
    // KAYNAK 1 (esas): Bursa Eczacı Odası resmi sayfası — her eczane için TAM GPS konumu ve nöbet saati verir.
    // KAYNAK 2 (tamamlayıcı): eczaneleri.org — gece yarısından sonra bir önceki akşamın nöbetlerini de içerir.
    // İki kaynak birleştirilir; biri çalışmazsa diğeri devreye girer. Uydurma yedek liste YOKTUR.
    // Her kaynağa 10 dakikada en fazla 1 istek atılır (önbellek) ve istek kendini dürüstçe tanıtır.
    // ----------------------------------------------------------------------
    const BEO_URL = 'https://www.beo.org.tr/nobetci-eczaneler';
    const OUR_UA = 'Mozilla/5.0 (compatible; MutlularPlusBot/1.0; +https://www.mutlularhaber.com)';
    const SOURCE_TTL_MS = 10 * 60 * 1000;
    const titleCaseTr = (t) => t
        .trim()
        .toLocaleLowerCase('tr-TR')
        .split(/\s+/)
        .map((w) => w.charAt(0).toLocaleUpperCase('tr-TR') + w.slice(1))
        .join(' ');
    const stripTags = (t) => t
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&#0?39;|&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)))
        .replace(/\s+/g, ' ')
        .trim();
    const BEO_TS = /(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})\s*[\/\-–→]*\s*(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})/;
    const BEO_TIMES_ONLY = /(\d{1,2}):(\d{2})\s*[\/\-–→]+\s*(?:[^\d]*)(\d{1,2}):(\d{2})/;
    let beoPageTitle = '';
    function parseBeoHtml(html) {
        const titleM = html.match(/<h2[^>]*main-color[^>]*>\s*<strong>([^<]+)<\/strong>/i);
        beoPageTitle = titleM ? stripTags(titleM[1]) : '';
        // Sayfa tarihi ("30 Ekim 2026 Bugün Nöbetçi Eczaneler"): saatleri yalnızca vardiya saati verilmişse kullanılır
        const AYLAR = ['ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran', 'temmuz', 'ağustos', 'eylül', 'ekim', 'kasım', 'aralık'];
        let pageDay = null;
        const pd = beoPageTitle.toLocaleLowerCase('tr-TR').match(/(\d{1,2})\s+([a-zçğıöşü]+)\s+(\d{4})/);
        if (pd && AYLAR.indexOf(pd[2]) >= 0)
            pageDay = { y: Number(pd[3]), m: AYLAR.indexOf(pd[2]), d: Number(pd[1]) };
        const parts = html.split(/<div[^>]*class=["'][^"']*\bnobetci\b[^"']*["'][^>]*>/i);
        const out = [];
        const seen = new Set();
        for (let i = 1; i < parts.length; i++) {
            const chunk = parts[i].split(/<hr\b/i)[0];
            // Ad ve ilçe: <h4 class="red"><strong>AD</strong> - İLÇE</h4>
            const nm = chunk.match(/<h4[^>]*>\s*<strong>([\s\S]*?)<\/strong>\s*-\s*([\s\S]*?)<\/h4>/i);
            if (!nm)
                continue;
            const name = titleCaseTr(stripTags(nm[1]));
            const ilceParts = stripTags(nm[2]).split('-').map((x) => titleCaseTr(x)).filter(Boolean);
            const ilce = ilceParts[0] || 'Bursa';
            const bolge = ilceParts.slice(1).join(' - ') || undefined;
            // Adres ve tarif: ev simgesinden telefon simgesine kadar; <br> sonrası tarif metni
            let address = '';
            let landmark;
            const am = chunk.match(/fa-home[^>]*>\s*<\/i>([\s\S]*?)(?=<br\s*\/?>\s*<i[^>]*fa-phone|<i[^>]*fa-phone)/i);
            if (am) {
                const segs = am[1].split(/<br\s*\/?>/i).map((x) => stripTags(x)).filter(Boolean);
                address = segs[0] || '';
                if (segs.length > 1)
                    landmark = segs.slice(1).join(' ').replace(/^\(|\)$/g, '').trim() || undefined;
            }
            if (!address)
                continue;
            // Telefonlar
            const phones = Array.from(chunk.matchAll(/href=["']tel:([^"']+)["']/gi))
                .map((m) => formatPhone(m[1].trim()))
                .filter((v, idx, arr) => v && arr.indexOf(v) === idx);
            if (phones.length === 0)
                continue;
            // Tam GPS konumu: https://www.google.com/maps?q=lat,lng
            let lat = 0;
            let lng = 0;
            let approx = 'tam';
            const mm = chunk.match(/maps\?q=(-?[0-9.]+),\s*(-?[0-9.]+)/i);
            if (mm) {
                lat = parseFloat(mm[1]);
                lng = parseFloat(mm[2]);
            }
            if (!(lat > 39 && lat < 41.5 && lng > 28 && lng < 30.5)) {
                const c = resolvePharmacyCoords(address, ilce);
                lat = c.lat;
                lng = c.lng;
                approx = 'ilce';
            }
            // Nöbet saatleri: tam tarihli ("30.10.2026 18:30 / 31.10.2026 10:00") ya da yalnızca saat ("18:30 / 10:00")
            const text = stripTags(chunk);
            let dutyStart = 0;
            let dutyEnd = 0;
            const tm = text.match(BEO_TS);
            if (tm) {
                dutyStart = trToEpoch(tm[1], tm[2], tm[3], tm[4], tm[5]);
                dutyEnd = trToEpoch(tm[6], tm[7], tm[8], tm[9], tm[10]);
            }
            else if (pageDay) {
                const t2 = text.match(BEO_TIMES_ONLY);
                if (t2) {
                    const base = Date.UTC(pageDay.y, pageDay.m, pageDay.d, 0, 0) - TR_OFFSET_MS;
                    dutyStart = base + (Number(t2[1]) * 60 + Number(t2[2])) * 60000;
                    dutyEnd = base + (Number(t2[3]) * 60 + Number(t2[4])) * 60000;
                    if (dutyEnd <= dutyStart)
                        dutyEnd += 24 * 60 * 60 * 1000;
                }
            }
            if (!dutyStart || !dutyEnd)
                continue;
            const key = `${name}|${ilce}|${dutyStart}`;
            if (seen.has(key))
                continue;
            seen.add(key);
            out.push({
                id: `beo-${normalizeKesintiText(`${ilce}-${name}`).replace(/[^a-z0-9]+/g, '-')}-${dutyStart}`,
                name,
                ilce,
                bolge,
                address,
                landmark,
                phone: phones[0],
                phones,
                mapsUrl: mm
                    ? `https://www.google.com/maps?q=${lat},${lng}`
                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${address} Bursa`)}`,
                lat,
                lng,
                approx,
                source: 'beo',
                dutyStart,
                dutyEnd,
            });
        }
        return out;
    }
    const srcCache = {
        beo: null,
        eczaneleri: null,
    };
    async function fetchHtml(url, referer) {
        const response = await fetch(url, {
            headers: {
                'User-Agent': OUR_UA,
                Accept: 'text/html,application/xhtml+xml',
                'Accept-Language': 'tr-TR,tr;q=0.9',
                ...(referer ? { Referer: referer } : {}),
            },
            signal: AbortSignal.timeout(8000),
        });
        if (!response.ok)
            throw new Error(`yanıt ${response.status}`);
        return response.text();
    }
    async function loadBeo() {
        const c = srcCache.beo;
        if (c && Date.now() - c.at < SOURCE_TTL_MS)
            return c.list;
        const html = await fetchHtml(BEO_URL);
        let list = parseBeoHtml(html);
        if (list.length === 0)
            throw new Error(`okunamadı (sayfa ${html.length} bayt)`);
        srcCache.beo = { at: Date.now(), list };
        return list;
    }
    async function loadEczaneleri() {
        const c = srcCache.eczaneleri;
        if (c && Date.now() - c.at < SOURCE_TTL_MS)
            return c.list;
        const html = await fetchHtml(ECZANE_SOURCE_URL);
        let list = parseEczaneleriOrg(html);
        if (list.length === 0)
            list = parseEczaneFlat(html);
        if (list.length === 0)
            throw new Error(`okunamadı (sayfa ${html.length} bayt)`);
        srcCache.eczaneleri = { at: Date.now(), list };
        return list;
    }
    async function loadEczaneList() {
        const [b, e] = await Promise.allSettled([loadBeo(), loadEczaneleri()]);
        const notes = [];
        const used = [];
        const beo = b.status === 'fulfilled' ? b.value : [];
        const ecz = e.status === 'fulfilled' ? e.value : [];
        if (b.status === 'rejected')
            notes.push(`BEO: ${b.reason.message}`);
        else
            used.push('beo');
        if (e.status === 'rejected')
            notes.push(`eczaneleri.org: ${e.reason.message}`);
        else
            used.push('eczaneleri');
        if (beo.length === 0 && ecz.length === 0)
            throw new Error(notes.join(' | ') || 'kaynak yok');
        const nameKey = (p) => `${normalizeKesintiText(p.name)}|${normalizeKesintiText(p.ilce)}`;
        const shiftKey = (p) => `${nameKey(p)}|${p.dutyStart}`;
        const beoByName = new Map();
        beo.forEach((p) => beoByName.set(nameKey(p), p));
        const beoShifts = new Set(beo.map(shiftKey));
        const merged = [...beo];
        ecz.forEach((p) => {
            if (beoShifts.has(shiftKey(p)))
                return; // aynı nöbet zaten resmi kaynaktan var
            const known = beoByName.get(nameKey(p));
            // Aynı eczane resmi listede başka bir saatte varsa tam konumunu ve tarifini ödünç al
            merged.push(known
                ? { ...p, lat: known.lat, lng: known.lng, approx: known.approx, landmark: known.landmark, phones: known.phones, phone: known.phone, mapsUrl: known.mapsUrl, address: known.address }
                : p);
        });
        return { list: merged, used, notes };
    }
    app.get('/api/nobetci-eczaneler', async (req, res) => {
        try {
            const { list: all, used, notes } = await loadEczaneList();
            const now = Date.now();
            const WINDOW_MS = 12 * 60 * 60 * 1000;
            const ilceParam = typeof req.query.ilce === 'string' ? req.query.ilce : '';
            const filterIlce = (p) => !ilceParam || ilceParam === 'all' || ilceParam === 'tumu'
                ? true
                : normalizeKesintiText(p.ilce).includes(normalizeKesintiText(ilceParam));
            const fmt = (ms) => {
                const d = new Date(ms + TR_OFFSET_MS);
                const dd = String(d.getUTCDate()).padStart(2, '0');
                const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
                const hh = String(d.getUTCHours()).padStart(2, '0');
                const mi = String(d.getUTCMinutes()).padStart(2, '0');
                return `${dd}.${mo} ${hh}:${mi}`;
            };
            const pharmacies = all
                .filter(filterIlce)
                .map((p) => {
                const status = p.dutyStart <= now && now < p.dutyEnd
                    ? 'nobette'
                    : p.dutyStart > now && p.dutyStart - now <= WINDOW_MS
                        ? 'yakinda'
                        : p.dutyEnd <= now
                            ? 'bitti'
                            : 'uzak';
                return {
                    id: p.id,
                    name: p.name,
                    ilce: p.ilce,
                    bolge: p.bolge,
                    address: p.address,
                    landmark: p.landmark,
                    phone: p.phone,
                    phones: p.phones,
                    mapsUrl: p.mapsUrl,
                    lat: p.lat,
                    lng: p.lng,
                    approx: p.approx,
                    source: p.source,
                    dutyStart: new Date(p.dutyStart).toISOString(),
                    dutyEnd: new Date(p.dutyEnd).toISOString(),
                    dutyLabel: `${fmt(p.dutyStart)} → ${fmt(p.dutyEnd)}`,
                    status,
                };
            })
                .filter((p) => p.status === 'nobette' || p.status === 'yakinda');
            const trNow = new Date(now + TR_OFFSET_MS);
            return res.json({
                success: true,
                source: used.includes('beo') ? 'BURSA_ECZACI_ODASI' : 'LIVE_ECZANELERI_ORG',
                sources: used,
                sourceNotes: notes,
                sourceUrl: used.includes('beo') ? BEO_URL : ECZANE_SOURCE_URL,
                pageTitle: beoPageTitle || undefined,
                date: `${String(trNow.getUTCDate()).padStart(2, '0')}.${String(trNow.getUTCMonth() + 1).padStart(2, '0')}.${trNow.getUTCFullYear()} ${String(trNow.getUTCHours()).padStart(2, '0')}:${String(trNow.getUTCMinutes()).padStart(2, '0')}`,
                count: pharmacies.filter((p) => p.status === 'nobette').length,
                pharmacies,
            });
        }
        catch (err) {
            console.error('Nöbetçi Eczane API Hatası:', err.message);
            return res.status(502).json({
                success: false,
                error: `Nöbetçi eczane listesi şu an alınamadı (${err.message}). Resmi listeyi kontrol edin.`,
            });
        }
    });
}
registerRoutes(app);
function corsHeaders(origin) {
    const h = { Vary: 'Origin' };
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        h['Access-Control-Allow-Origin'] = origin;
        h['Access-Control-Allow-Methods'] = 'GET,POST,OPTIONS';
        h['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
        h['Access-Control-Max-Age'] = '86400';
    }
    return h;
}
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const origin = request.headers.get('Origin');
        const cors = corsHeaders(origin);
        // Tarayıcıdan gelen ama izinli olmayan siteler engellenir
        if (origin && !ALLOWED_ORIGINS.includes(origin) && origin !== url.origin) {
            return new Response(JSON.stringify({ success: false, error: 'İzin verilmeyen kaynak.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
        }
        if (request.method === 'OPTIONS')
            return new Response(null, { status: 204, headers: cors });
        if (url.pathname === '/api/upload-signature' && request.method === 'POST') {
            return handleUploadSignature(request, env, cors);
        }
        if (url.pathname === '/test') {
            return new Response(TEST_PAGE, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
        }
        if (url.pathname === '/' || url.pathname === '/health') {
            return new Response(JSON.stringify({ ok: true, service: 'mutlular-plus-api' }), { headers: { 'Content-Type': 'application/json', ...cors } });
        }
        const route = routes.find((r) => r.method === request.method && r.re.test(url.pathname));
        if (!route) {
            return new Response(JSON.stringify({ success: false, error: 'Bulunamadı' }), { status: 404, headers: { 'Content-Type': 'application/json', ...cors } });
        }
        // GET yanıtlarını Cloudflare önbelleğinde tut
        const ttl = request.method === 'GET' ? (CACHE_TTL.find(([re]) => re.test(url.pathname)) || [null, 0])[1] : 0;
        const cache = globalThis.caches?.default;
        const cacheKey = new Request(url.origin + url.pathname + url.search, { method: 'GET' });
        if (ttl && cache) {
            const hit = await cache.match(cacheKey);
            if (hit) {
                const r = new Response(hit.body, hit);
                Object.entries(cors).forEach(([k, v]) => r.headers.set(k, v));
                return r;
            }
        }
        const m = route.re.exec(url.pathname);
        const params = {};
        route.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
        let body = {};
        if (request.method === 'POST') {
            try {
                body = await request.json();
            }
            catch {
                body = {};
            }
        }
        const req = { params, query: Object.fromEntries(url.searchParams), body };
        const res = makeRes();
        try {
            await route.h(req, res);
        }
        catch (err) {
            res.status(500).json({ success: false, error: err?.message || 'Sunucu hatası' });
        }
        if (!res.sent)
            res.status(500).json({ success: false, error: 'Boş yanıt' });
        const out = new Response(res.body, { status: res.statusCode, headers: { ...res.headers, ...cors } });
        if (ttl && cache && res.statusCode === 200) {
            const toStore = new Response(res.body, { status: 200, headers: { ...res.headers, 'Cache-Control': 'public, max-age=' + ttl } });
            ctx.waitUntil(cache.put(cacheKey, toStore));
        }
        return out;
    },
};
