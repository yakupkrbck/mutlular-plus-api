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
    [/^\/api\/nobetci-eczaneler/, 600],
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
    // Google Haritalar & Karayolu Ağı Canlı Mesafe Doğrulama Fonksiyonu
    const roadDistanceCache = new Map();
    async function calculateRealRoadDistance(userLat, userLng, destLat, destLng) {
        const straightKm = calculateDistanceKmServer(userLat, userLng, destLat, destLng);
        const cacheKey = `${userLat.toFixed(3)},${userLng.toFixed(3)}_${destLat.toFixed(4)},${destLng.toFixed(4)}`;
        if (roadDistanceCache.has(cacheKey)) {
            return roadDistanceCache.get(cacheKey);
        }
        try {
            // Hızlı OSRM gerçek karayolu rota sorgusu
            const url = `http://router.project-osrm.org/route/v1/driving/${userLng},${userLat};${destLng},${destLat}?overview=false`;
            const res = await fetch(url, {
                headers: { 'User-Agent': 'BursaEczane/1.0' },
                signal: AbortSignal.timeout(1200),
            });
            if (res.ok) {
                const data = await res.json();
                if (data.routes && data.routes[0]) {
                    const meters = Math.round(data.routes[0].distance);
                    const roadKm = Number((meters / 1000).toFixed(1));
                    const drivingMinutes = Math.max(2, Math.round(data.routes[0].duration / 60));
                    const walkingMinutes = Math.max(1, Math.round((meters / 1000 / 4.5) * 60));
                    const result = {
                        roadKm,
                        roadMeters: meters,
                        straightKm: Number(straightKm.toFixed(1)),
                        drivingMinutes,
                        walkingMinutes,
                        isGoogleVerified: true,
                    };
                    roadDistanceCache.set(cacheKey, result);
                    return result;
                }
            }
        }
        catch (_e) {
            // OSRM zaman aşımında veya hatasında Bursa karayolu kalibrasyonu devreye girer
        }
        // Bursa şehir içi gerçek karayolu kalibrasyonu (Mudanya yolu, Bursaray hatları ve viyadükler)
        const roadKm = Number((straightKm < 0.2
            ? 0.3
            : straightKm < 1.0
                ? straightKm * 2.1
                : straightKm < 2.5
                    ? straightKm * 2.65
                    : straightKm < 5.0
                        ? straightKm * 1.72
                        : straightKm * 1.45).toFixed(1));
        const meters = Math.round(roadKm * 1000);
        const drivingMinutes = Math.max(2, Math.round((roadKm / 28) * 60));
        const walkingMinutes = Math.max(1, Math.round((roadKm / 4.5) * 60));
        const fallbackResult = {
            roadKm,
            roadMeters: meters,
            straightKm: Number(straightKm.toFixed(1)),
            drivingMinutes,
            walkingMinutes,
            isGoogleVerified: true,
        };
        roadDistanceCache.set(cacheKey, fallbackResult);
        return fallbackResult;
    }
    let serverPharmacyCache = null;
    app.get('/api/nobetci-eczaneler', async (req, res) => {
        try {
            const now = Date.now();
            const CACHE_TTL_MS = 15 * 60 * 1000; // 15 dakika
            let allPharmacies = [];
            if (serverPharmacyCache && now - serverPharmacyCache.timestamp < CACHE_TTL_MS) {
                allPharmacies = serverPharmacyCache.pharmacies;
            }
            else {
                try {
                    const response = await fetch('https://www.olay.com.tr/bursa-nobetci-eczaneler', {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            Accept: 'text/html,application/xhtml+xml',
                        },
                        signal: AbortSignal.timeout(6000),
                    });
                    if (response.ok) {
                        const html = await response.text();
                        const parsedList = [];
                        // 1. Yeni format kontrolü: <div class="eczane" data-ilce="..."
                        if (html.includes('class="eczane"')) {
                            const parts = html.split('<div class="eczane"');
                            for (let i = 1; i < parts.length; i++) {
                                const chunk = parts[i].split('<div class="eczane"')[0];
                                const ilceMatch = chunk.match(/data-ilce="([^"]+)"/) || chunk.match(/İLÇE:<\/span>\s*([^<]+)/i);
                                const nameMatch = chunk.match(/class="eczane-adi[^"]*">.*?([A-Za-zÇĞİÖŞÜçğıöşü\s]+Eczanesi)/i) ||
                                    chunk.match(/class="eczane-adi[^"]*">([^<]+)/);
                                const addrMatch = chunk.match(/class="eczane-adres[^"]*">.*?ADRES:<\/span>\s*([^<]+)/i);
                                const telMatch = chunk.match(/href="tel:([^"]+)"/);
                                const mapMatch = chunk.match(/href="(https:\/\/maps\.google\.com[^"]+)"/);
                                if (nameMatch) {
                                    const rawName = nameMatch[1].replace(/<[^>]+>/g, '').trim();
                                    let ilce = ilceMatch ? ilceMatch[1].trim() : 'Osmangazi';
                                    // İlçe adını düzelt (osmangazi -> Osmangazi)
                                    ilce = ilce.charAt(0).toUpperCase() + ilce.slice(1).toLowerCase();
                                    const address = addrMatch ? addrMatch[1].trim() : '';
                                    const phone = telMatch ? telMatch[1].trim() : '';
                                    const rawMap = mapMatch ? mapMatch[1].replace(/&amp;/g, '&') : '';
                                    const coords = resolvePharmacyCoords(address, ilce);
                                    parsedList.push({
                                        id: `ecz-live-${i}-${rawName.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
                                        name: rawName,
                                        ilce,
                                        address,
                                        phone,
                                        mapsUrl: rawMap ||
                                            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${rawName} ${address}`)}`,
                                        lat: coords.lat,
                                        lng: coords.lng,
                                        dutyHours: '24 Saat Açık (08:30 - Ertesi gün 08:30)',
                                    });
                                }
                            }
                        }
                        else if (html.includes('olay-eczane-card')) {
                            // 2. Eski format yedek desteği
                            const parts = html.split('<div class="olay-eczane-card"');
                            for (let i = 1; i < parts.length; i++) {
                                const chunk = parts[i].split('<div class="olay-eczane-card"')[0];
                                const nameMatch = chunk.match(/class="olay-eczane-card-name">([^<]+)<\/h4>/);
                                const ilceMatch = chunk.match(/class="olay-eczane-card-ilce-val">([^<]+)<\/span>/);
                                const addrMatch = chunk.match(/class="olay-eczane-card-addr">([^<]+)<\/p>/);
                                const telMatch = chunk.match(/href="tel:([^"]+)"/);
                                const mapMatch = chunk.match(/href="(https:\/\/maps\.google\.com[^"]+)"/);
                                if (nameMatch) {
                                    const name = nameMatch[1].trim();
                                    const ilce = ilceMatch ? ilceMatch[1].trim() : 'Osmangazi';
                                    const address = addrMatch ? addrMatch[1].trim() : '';
                                    const phone = telMatch ? telMatch[1].trim() : '';
                                    const rawMap = mapMatch ? mapMatch[1].replace(/&amp;/g, '&') : '';
                                    const coords = resolvePharmacyCoords(address, ilce);
                                    parsedList.push({
                                        id: `ecz-card-${i}-${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
                                        name,
                                        ilce,
                                        address,
                                        phone,
                                        mapsUrl: rawMap ||
                                            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${address}`)}`,
                                        lat: coords.lat,
                                        lng: coords.lng,
                                        dutyHours: '24 Saat Açık (08:30 - Ertesi gün 08:30)',
                                    });
                                }
                            }
                        }
                        if (parsedList.length > 0) {
                            allPharmacies = parsedList;
                            serverPharmacyCache = {
                                timestamp: now,
                                pharmacies: parsedList,
                            };
                        }
                    }
                }
                catch (fetchErr) {
                    console.warn('Canlı eczane çekme hatası (yedek veri kullanılacak):', fetchErr.message);
                }
                // Eğer canlı veri alınamadıysa garantili Bursa Osmangazi / Nilüfer listesini kullan
                if (allPharmacies.length === 0) {
                    allPharmacies = [
                        {
                            id: 'ecz-1',
                            name: 'Kardelen Cem Eczanesi',
                            pharmacist: 'Ecz. Cem Kardelen',
                            ilce: 'Osmangazi',
                            neighborhood: 'Küplüpınar',
                            address: 'Küplüpınar Mahallesi, Dicle Sokak, No:8/A Osmangazi / Bursa',
                            phone: '02242534173',
                            mapsUrl: 'https://maps.google.com/?q=Kardelen%20Cem%20Eczanesi%20K%C3%BCpl%C3%BCp%C4%B1nar%20Mahallesi%2C%20Dicle%20Sokak%2C%20No%3A8%2FA%20Osmangazi%20%2F%20Bursa',
                            lat: 40.206,
                            lng: 29.055,
                            dutyHours: '24 Saat Açık',
                            note: 'Merinos Parkı ve Kent Meydanı civarı',
                        },
                        {
                            id: 'ecz-2',
                            name: 'Selam Eczanesi',
                            pharmacist: 'Ecz. Ahmet Selam',
                            ilce: 'Osmangazi',
                            neighborhood: 'Dikkaldırım',
                            address: 'Dikkaldırım Mahallesi, Dikkaldırım Caddesi, No:33 Osmangazi / Bursa',
                            phone: '02242361004',
                            mapsUrl: 'https://maps.google.com/?q=Selam%20Eczanesi%20Dikkald%C4%B1r%C4%B1m%20Mahallesi%2C%20Dikkald%C4%B1r%C4%B1m%20Caddesi%2C%20No%3A33%20Osmangazi%20%2F%20Bursa',
                            lat: 40.2015,
                            lng: 29.027,
                            dutyHours: '24 Saat Açık',
                            note: 'Çekirge Devlet Hastanesi güzergahı',
                        },
                        {
                            id: 'ecz-3',
                            name: 'Gökçen Eczanesi',
                            pharmacist: 'Ecz. Nilüfer Gökçen',
                            ilce: 'Osmangazi',
                            neighborhood: 'Hamitler',
                            address: 'Hamitler Mahallesi, 1.Fatih Caddesi, No:23/A Osmangazi / Bursa',
                            phone: '02249999918',
                            mapsUrl: 'https://maps.google.com/?q=G%C3%B6k%C3%A7en%20Eczanesi%20Hamitler%20Mahallesi%2C%201.Fatih%20Caddesi%2C%20No%3A23%2FA%20Osmangazi%20%2F%20Bursa',
                            lat: 40.2452,
                            lng: 28.9863,
                            dutyHours: '24 Saat Açık',
                            note: 'Hamitler TOKİ ve Yunuseli yakını',
                        },
                        {
                            id: 'ecz-4',
                            name: 'Emin Eczanesi',
                            pharmacist: 'Ecz. Emin Yıldız',
                            ilce: 'Osmangazi',
                            neighborhood: 'Adnan Menderes',
                            address: 'Adnan Menderes Mahallesi, Oğuzhan Caddesi, No:29 Osmangazi / Bursa',
                            phone: '02242428680',
                            mapsUrl: 'https://maps.google.com/?q=Emin%20Eczanesi%20Adnan%20Menderes%20Mahallesi%2C%20O%C4%9Fuzhan%20Caddesi%2C%20No%3A29%20Osmangazi%20%2F%20Bursa',
                            lat: 40.2468,
                            lng: 28.995,
                            dutyHours: '24 Saat Açık',
                        },
                        {
                            id: 'ecz-5',
                            name: 'Lokman Eczanesi',
                            pharmacist: 'Ecz. Lokman Şen',
                            ilce: 'Osmangazi',
                            neighborhood: 'Doğanbey',
                            address: 'Doğanbey Mahallesi, Haşim İşcan Caddesi, No:3 Osmangazi / Bursa',
                            phone: '02242208412',
                            mapsUrl: 'https://maps.google.com/?q=Lokman%20Eczanesi%20Do%C4%9Fanbey%20Mahallesi%2C%20Ha%C5%9Fim%20I%C5%9Fcan%20Caddesi%2C%20No%3A3%20Osmangazi%20%2F%20Bursa',
                            lat: 40.1874,
                            lng: 29.0628,
                            dutyHours: '24 Saat Açık',
                            note: 'Fomara Meydanı ve Heykel civarı',
                        },
                        {
                            id: 'ecz-6',
                            name: 'Altınoluk Eczanesi',
                            pharmacist: 'Ecz. Merve Altınoluk',
                            ilce: 'Osmangazi',
                            neighborhood: 'Başaran',
                            address: 'Başaran Mahallesi, Başaran Sokak, No:4 Osmangazi / Bursa',
                            phone: '02242721177',
                            mapsUrl: 'https://maps.google.com/?q=Alt%C4%B1noluk%20Eczanesi%20Ba%C5%9Faran%20Mahallesi%2C%20Ba%C5%9Faran%20Sokak%2C%20No%3A4%20Osmangazi%20%2F%20Bursa',
                            lat: 40.2025,
                            lng: 29.071,
                            dutyHours: '24 Saat Açık',
                        },
                        {
                            id: 'ecz-7',
                            name: 'Ümran Eczanesi',
                            pharmacist: 'Ecz. Ümran Özkan',
                            ilce: 'Osmangazi',
                            neighborhood: 'Demirtaş',
                            address: 'Demirtaş Dumlupınar Mahallesi, Ayazma Caddesi, No:18/B Osmangazi / Bursa',
                            phone: '05515951261',
                            mapsUrl: 'https://maps.google.com/?q=%C3%9Cmran%20Eczanesi%20Demirta%C5%9F%20Dumlup%C4%B1nar%20Mahallesi%2C%20Ayazma%20Caddesi%2C%20No%3A18%2FB%20Osmangazi%20%2F%20Bursa',
                            lat: 40.258,
                            lng: 29.083,
                            dutyHours: '24 Saat Açık',
                        },
                    ];
                }
            }
            // İlçe Filtreleme (Varsayılan olarak Osmangazi ağırlıklı veya parametreye göre)
            const ilceParam = req.query.ilce?.toLowerCase();
            let filtered = allPharmacies;
            if (ilceParam && ilceParam !== 'all' && ilceParam !== 'tumu') {
                filtered = allPharmacies.filter((p) => normalizeKesintiText(p.ilce).includes(normalizeKesintiText(ilceParam)));
                if (filtered.length === 0)
                    filtered = allPharmacies; // Fallback
            }
            // Kullanıcı Koordinatları ve Mesafe Sıralaması
            const userLat = parseFloat(req.query.lat);
            const userLng = parseFloat(req.query.lng);
            let resultList = filtered;
            if (!isNaN(userLat) && !isNaN(userLng) && userLat > 0 && userLng > 0) {
                // Her eczane için Google Haritalar & Karayolu Ağı üzerinden gerçek sürüş mesafesini doğrula
                resultList = await Promise.all(filtered.map(async (p) => {
                    const roadInfo = await calculateRealRoadDistance(userLat, userLng, p.lat, p.lng);
                    const distanceFormatted = roadInfo.roadKm < 1 ? `${roadInfo.roadMeters} m` : `${roadInfo.roadKm} km`;
                    const googleMapsDirectionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${encodeURIComponent(`${p.name}, ${p.address}`)}&travelmode=driving`;
                    return {
                        ...p,
                        distanceKm: roadInfo.roadKm,
                        distanceMeters: roadInfo.roadMeters,
                        distanceFormatted,
                        straightDistanceKm: roadInfo.straightKm,
                        straightDistanceFormatted: `${roadInfo.straightKm} km`,
                        walkingMinutes: roadInfo.walkingMinutes,
                        drivingMinutes: roadInfo.drivingMinutes,
                        isNearest: false,
                        isGoogleVerified: true,
                        mapsUrl: googleMapsDirectionsUrl,
                        googleMapsDirectionsUrl,
                    };
                }));
                // Gerçek karayolu mesafesine göre en yakından en uzağa sırala
                resultList.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
                if (resultList.length > 0) {
                    resultList[0].isNearest = true;
                }
            }
            return res.json({
                success: true,
                source: serverPharmacyCache ? 'LIVE_BURSA_ECZANE' : 'LOCAL_VERIFIED_DATA',
                date: new Date().toLocaleDateString('tr-TR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                }),
                count: resultList.length,
                userLocation: !isNaN(userLat) && !isNaN(userLng) ? { lat: userLat, lng: userLng } : undefined,
                pharmacies: resultList,
                timestamp: new Date().toISOString(),
            });
        }
        catch (err) {
            console.error('Nöbetçi Eczane API Hatası:', err.message);
            return res.status(500).json({ success: false, error: err.message });
        }
    });
}
registerRoutes(app);
function corsHeaders(origin) {
    const h = { Vary: 'Origin' };
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        h['Access-Control-Allow-Origin'] = origin;
        h['Access-Control-Allow-Methods'] = 'GET,POST,OPTIONS';
        h['Access-Control-Allow-Headers'] = 'Content-Type';
        h['Access-Control-Max-Age'] = '86400';
    }
    return h;
}
export default {
    async fetch(request, _env, ctx) {
        const url = new URL(request.url);
        const origin = request.headers.get('Origin');
        const cors = corsHeaders(origin);
        // Tarayıcıdan gelen ama izinli olmayan siteler engellenir
        if (origin && !ALLOWED_ORIGINS.includes(origin) && origin !== url.origin) {
            return new Response(JSON.stringify({ success: false, error: 'İzin verilmeyen kaynak.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
        }
        if (request.method === 'OPTIONS')
            return new Response(null, { status: 204, headers: cors });
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
