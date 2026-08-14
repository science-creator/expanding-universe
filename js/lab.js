/* =========================================================
   lab.js — 실험실 화면 (그리기 · 계기판 · 조작 · 미션)
   ---------------------------------------------------------
   계산은 universe.js 가 하고, 이 파일은 그것을 '보이게' 만든다.

   화면의 핵심 장치 세 가지
     ① 풍선을 불면 **스티커가 스스로 움직이지 않는데도** 사이가 벌어진다.
        스티커는 풍선 표면의 같은 자리에 붙어 있다 — 표면이 늘어날 뿐이다.
     ② **관측 기준 스티커를 바꿔도** 나머지가 모두 멀어져 보인다.
        "중심이 어디냐"는 물음에 화면이 직접 답한다 — 어느 곳도 중심이 아니다.
     ③ 처음 거리와 늘어난 양을 그래프로 두면 **직선**이 나온다. 허블 법칙의 축소판이다.

   ⚠ 애니메이션이 없으므로 requestAnimationFrame 을 돌리지 않는다.
   ========================================================= */
(function () {
  "use strict";

  var U = window.Universe;

  var S = {
    scene: "balloon",
    scale: 1,
    observer: 1,
    mission: null, predictPick: null, missionState: "ready"
  };

  var canvas, ctx, cssW = 900, cssH = 556;
  var records = [];
  var seen = { blown: false, huge: false, obs: {}, hubbleSeen: false };

  function $(id) { return document.getElementById(id); }
  function clamp(v, a, b) { return U.clamp(v, a, b); }
  function fmt(v) { return (Math.round(v * 10) / 10).toFixed(1); }

  /* ---------------------------------------------------------
     1. 미션
     --------------------------------------------------------- */
  var MISSIONS = [
    {
      id: 1, star: "🎈", title: "크게 불면 어떻게 될까",
      story: "풍선에 스티커 1·2·3 을 붙였다. 풍선을 <b>크게 불면</b> 스티커 사이의 거리는 " +
             "어떻게 변할까? 직접 불어 보자.",
      scene: "balloon", setup: { scale: 1 }, allow: ["scale", "stage"],
      predict: { q: "풍선을 크게 불면 스티커 사이의 거리는?",
                 opts: ["<b>모두 멀어진다</b>", "모두 가까워진다", "변하지 않는다"], ans: 0 },
      goals: [{ key: "blown", text: "풍선을 <b>② 크게</b> 이상으로 불기" }],
      why: "<b>모두 멀어집니다.</b> 스티커는 풍선 표면의 <b>같은 자리</b>에 붙어 있고 " +
           "스스로 움직이지 않았는데도요.<br>" +
           "<b>사이의 표면이 늘어났기 때문</b>입니다. 학습지의 실험 결과 그대로예요 — " +
           "3 → 5 → 10, 6 → 10 → 20, 9 → 15 → 30 cm."
    },
    {
      id: 2, star: "📏", title: "누가 더 많이 늘었을까",
      story: "처음에 <b>1-2 는 3 cm</b>, <b>1-3 은 9 cm</b> 였다. " +
             "크게 불었을 때 <b>늘어난 양</b>은 어느 쪽이 클까?",
      scene: "balloon", setup: { scale: 1 }, allow: ["scale", "stage"],
      predict: { q: "처음에 멀리 있던 쌍의 '늘어난 양'은?",
                 opts: ["<b>더 많이 늘어난다</b>", "더 적게 늘어난다", "똑같이 늘어난다"], ans: 0 },
      goals: [{ key: "huge", text: "<b>③ 더 크게</b> 까지 불어 늘어난 양 비교하기" }],
      why: "<b>처음에 멀수록 더 많이 늘어납니다.</b><br>" +
           "① → ③ 으로 갈 때 1-2 는 3 → 10 cm (<b>7 cm 증가</b>), " +
           "1-3 은 9 → 30 cm (<b>21 cm 증가</b>) — 정확히 <b>3배</b>죠.<br>" +
           "늘어난 양 = (배율 − 1) × <b>처음 거리</b> 이기 때문입니다. " +
           "처음 거리에 <b>비례</b>합니다."
    },
    {
      id: 3, star: "🎯", title: "중심은 어디일까",
      story: "풍선이 팽창할 때 <b>중심</b>은 어디일까? " +
             "스티커 1·2·3 <b>모두에서</b> 보아 확인하자.",
      scene: "center", setup: { scale: 2, observer: 1 }, allow: ["observer", "scale"],
      predict: { q: "어느 스티커에서 보면 나머지가 멀어져 보일까?",
                 opts: ["스티커 1 에서만", "가운데인 스티커 2 에서만", "<b>어느 스티커에서 보아도</b>"], ans: 2 },
      goals: [
        { key: "obs1", text: "<b>스티커 1</b> 에서 보기" },
        { key: "obs2", text: "<b>스티커 2</b> 에서 보기" },
        { key: "obs3", text: "<b>스티커 3</b> 에서 보기" }
      ],
      why: "<b>어느 스티커에서 보아도</b> 나머지가 모두 멀어져 보입니다. " +
           "그리고 <b>멀리 있는 것일수록 더 많이</b> 멀어져요.<br>" +
           "즉 <b>어느 곳도 특별한 중심이 아닙니다.</b> 풍선을 돌려 다른 각도에서 보아도 마찬가지예요.<br>" +
           "우주 공간도 마찬가지입니다 — <b>특별한 중심 없이 모든 방향으로 균일하게</b> 팽창합니다."
    },
    {
      id: 4, star: "🔵", title: "스티커는 무엇을 나타낼까",
      story: "풍선의 <b>표면</b>이 우주 공간을 나타낸다면, <b>스티커</b>는 무엇을 나타낼까?",
      scene: "center", setup: { scale: 2, observer: 2 }, allow: ["observer", "scale"],
      predict: { q: "풍선 모형에서 스티커가 나타내는 것은?",
                 opts: ["별 하나", "<b>은하</b>", "행성"], ans: 1 },
      goals: [{ key: "obs2", text: "<b>스티커 2</b> 에서 보아 확인하기" }],
      why: "<b>은하</b>입니다.<br>" +
           "· 풍선의 <b>표면</b> → 우주 공간<br>" +
           "· 풍선 위의 <b>스티커</b> → 은하<br>" +
           "· 풍선을 <b>부는 것</b> → 우주가 팽창하는 것<br>" +
           "스티커가 스스로 기어가지 않듯, <b>은하도 스스로 달아나는 것이 아닙니다.</b> " +
           "은하 사이의 <b>공간이 늘어나는</b> 것이죠."
    },
    {
      id: 5, star: "🚀", title: "멀수록 빠르게",
      story: "은하 다섯 개가 있다. 우주가 팽창할 때 <b>어느 은하가 가장 빠르게</b> 멀어질까?",
      scene: "hubble", setup: { scale: 1 }, allow: ["scale"],
      predict: { q: "가장 빠르게 멀어지는 은하는?",
                 opts: ["가장 가까운 은하", "<b>가장 먼 은하</b>", "모두 같은 빠르기"], ans: 1 },
      goals: [{ key: "hubble", text: "풍선을 불어 <b>거리-속도 직선</b> 확인하기" }],
      why: "<b>가장 먼 은하</b>입니다. 속도가 거리에 <b>비례</b>하기 때문이에요.<br>" +
           "그래서 거리-속도 그래프가 <b>직선</b>이 됩니다.<br>" +
           "<b>허블</b>은 실제 관측에서 이것을 알아냈습니다 — 대부분의 은하들이 우리은하로부터 " +
           "멀어지고 있고, <b>멀리 있는 은하일수록 더 빠르게</b> 멀어진다는 것을요. " +
           "그리고 그 까닭을 <b>우주가 팽창하고 있기 때문</b>이라고 설명했습니다."
    },
    {
      id: 6, star: "🌌", title: "우주는 팽창한다",
      story: "지금까지 본 것을 모아 보자. 풍선 실험이 우주에 대해 알려 준 것은 무엇일까?",
      scene: "hubble", setup: { scale: 2.4 }, allow: ["scale"],
      predict: { q: "우주 팽창에 대한 설명으로 옳은 것은?",
                 opts: ["우주에는 팽창의 중심이 한 곳 있다",
                        "<b>특별한 중심 없이 모든 방향으로 균일하게 팽창한다</b>",
                        "은하들이 스스로 힘을 내어 달아나고 있다"], ans: 1 },
      goals: [{ key: "hubble", text: "거리-속도 직선 확인하기" }],
      why: "정리하면 이렇습니다.<br>" +
           "· <b>허블</b>은 대부분의 은하들이 우리은하로부터 멀어지고 있다는 것을 알아내고, " +
           "그 까닭을 <b>우주가 팽창하고 있기 때문</b>이라고 설명했다.<br>" +
           "· 우주 공간에 놓인 은하들도 우주가 팽창함에 따라 서로 멀어지고 있으며, " +
           "<b>서로 멀리 떨어져 있는 은하일수록 더 빠르게</b> 멀어진다.<br>" +
           "· 우주 공간은 <b>특별한 중심 없이 모든 방향으로 균일하게</b> 팽창하고 있다."
    }
  ];

  /* ---------------------------------------------------------
     2. 장면 · 크기
     --------------------------------------------------------- */
  function sceneKind() {
    if (S.scene === "mission") return S.mission ? S.mission.scene : "balloon";
    return S.scene;
  }

  function layout() {
    if (!canvas) return;
    var r = canvas.getBoundingClientRect();
    cssW = Math.max(320, Math.round(r.width || 900));
    cssH = Math.max(200, Math.round(r.height || cssW / 1.62));
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ---------------------------------------------------------
     3. 그리기
     --------------------------------------------------------- */
  var COL = { ink: "#e2e8f0", faint: "#64748b", line: "#94a3b8" };

  function draw() {
    if (!ctx) return;
    var g = ctx;
    var grad = g.createLinearGradient(0, 0, 0, cssH);
    grad.addColorStop(0, "#0b1220"); grad.addColorStop(1, "#1e293b");
    g.fillStyle = grad; g.fillRect(0, 0, cssW, cssH);
    var k = sceneKind();
    if (k === "balloon") drawBalloon(g);
    else if (k === "center") drawCenter(g);
    else drawHubble(g);
  }

  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  /* 스티커를 풍선 위 '같은 자리'에 두기 위한 각도 (풍선을 불어도 각도는 그대로) */
  var ANG = { 1: -Math.PI * 0.62, 2: -Math.PI * 0.16, 3: Math.PI * 0.42 };

  /* ---- 장면 ① 풍선 불기 ---- */
  function drawBalloon(g) {
    var cx = cssW * 0.32, cy = cssH * 0.50;
    var maxR = Math.min(cssW * 0.24, cssH * 0.38);
    var R = maxR * (0.30 + 0.70 * (S.scale - 1) / (10 / 3 - 1));

    /* 풍선 */
    var bg = g.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R);
    bg.addColorStop(0, "rgba(248,250,252,.22)");
    bg.addColorStop(1, "rgba(148,163,184,.10)");
    g.fillStyle = bg;
    g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "rgba(226,232,240,.55)"; g.lineWidth = 2;
    g.stroke();
    /* 매듭 */
    g.fillStyle = "rgba(226,232,240,.5)";
    g.beginPath(); g.moveTo(cx - 6, cy + R); g.lineTo(cx + 6, cy + R); g.lineTo(cx, cy + R + 14);
    g.closePath(); g.fill();

    /* 스티커 — 풍선 위 같은 각도에 붙어 있다 */
    var pos = {};
    U.STICKERS.forEach(function (s) {
      var a = ANG[s.id];
      var x = cx + Math.cos(a) * R * 0.86, y = cy + Math.sin(a) * R * 0.86;
      pos[s.id] = { x: x, y: y };
      g.fillStyle = s.css;
      g.beginPath(); g.arc(x, y, 9, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#0b1220"; g.font = "bold 12px sans-serif";
      g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText(String(s.id), x, y);
      g.textBaseline = "alphabetic";
    });

    /* 스티커 사이 선 */
    [[1, 2], [2, 3], [1, 3]].forEach(function (p) {
      g.strokeStyle = "rgba(226,232,240,.35)"; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(pos[p[0]].x, pos[p[0]].y); g.lineTo(pos[p[1]].x, pos[p[1]].y); g.stroke();
    });

    g.fillStyle = COL.faint; g.font = "13px sans-serif"; g.textAlign = "center";
    g.fillText("스티커는 스스로 움직이지 않는다", cx, cy + maxR + 34);

    /* 오른쪽 : 거리 표 */
    var tx = cssW * 0.58, ty = cssH * 0.16, tw = cssW * 0.38;
    var pairs = U.allPairs(S.scale);
    var maxNow = 30;
    g.fillStyle = COL.ink; g.font = "bold 15px sans-serif"; g.textAlign = "left";
    g.fillText("스티커 사이의 거리", tx, ty - 10);

    pairs.forEach(function (p, i) {
      var y = ty + i * (cssH * 0.15);
      g.fillStyle = COL.ink; g.font = "bold 14px sans-serif";
      g.fillText("스티커 " + p.pair, tx, y + 14);
      g.fillStyle = "rgba(148,163,184,.2)";
      roundRect(g, tx, y + 22, tw, 22, 5); g.fill();
      g.fillStyle = ["#ef4444", "#60a5fa", "#16a34a"][i];
      roundRect(g, tx, y + 22, tw * clamp(p.now / maxNow, 0.02, 1), 22, 5); g.fill();
      g.fillStyle = COL.ink; g.font = "bold 14px sans-serif"; g.textAlign = "left";
      g.fillText(fmt(p.now) + " cm", tx + 8, y + 38);
      g.fillStyle = COL.faint; g.font = "12px sans-serif"; g.textAlign = "right";
      g.fillText("처음 " + p.base + " cm · +" + fmt(p.grew) + " cm", tx + tw, y + 38);
    });

    g.fillStyle = COL.faint; g.font = "14px sans-serif"; g.textAlign = "left";
    g.fillText("🎈 풍선을 불수록 사이가 벌어진다 (배율 " + S.scale.toFixed(2) + " 배)", 16, 26);
  }

  /* ---- 장면 ② 중심은 어디? ---- */
  function drawCenter(g) {
    var cy = cssH * 0.34;
    var left = cssW * 0.10, span = cssW * 0.80;
    var maxPos = U.BASE_POS[3] * (10 / 3);        // 가장 벌어졌을 때

    /* 한 줄 위에 세 스티커 — 관측자를 왼쪽 끝에 고정해 그린다 */
    var obs = S.observer;
    var list = U.recessionFrom(obs, S.scale);
    var all = [{ id: obs, base: 0, now: 0 }].concat(list);
    var maxNow = Math.max(1, U.baseDist(1, 3) * (10 / 3));

    all.forEach(function (item) {
      var st = U.STICKERS[item.id - 1];
      var x = left + span * clamp(item.now / maxNow, 0, 1);
      var isObs = (item.id === obs);
      if (isObs) {
        g.strokeStyle = "#fde047"; g.lineWidth = 2;
        g.setLineDash([4, 4]);
        g.beginPath(); g.moveTo(x, cy - 46); g.lineTo(x, cssH * 0.72); g.stroke();
        g.setLineDash([]);
      }
      g.fillStyle = st.css;
      g.beginPath(); g.arc(x, cy, isObs ? 15 : 11, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#0b1220"; g.font = "bold 13px sans-serif";
      g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText(String(item.id), x, cy);
      g.textBaseline = "alphabetic";
      g.fillStyle = isObs ? "#fde047" : COL.ink;
      g.font = "bold 13px sans-serif";
      g.fillText(isObs ? "👀 여기서 본다" : st.name, x, cy - 28);
      if (!isObs) {
        g.fillStyle = COL.faint; g.font = "12px sans-serif";
        g.fillText(fmt(item.now) + " cm", x, cy + 30);
        /* 멀어지는 화살표 — 길수록 빠르다.
           ⚠ 무대 오른쪽을 넘지 않도록 잘라 준다(배율을 최대로 하면 넘친다) */
        var alen = clamp(12 + item.grew * 5, 12, Math.max(12, cssW - x - 46));
        g.strokeStyle = st.css; g.lineWidth = 3; g.lineCap = "round";
        g.beginPath(); g.moveTo(x + 16, cy + 48); g.lineTo(x + 16 + alen, cy + 48); g.stroke();
        g.fillStyle = st.css;
        g.beginPath();
        g.moveTo(x + 16 + alen + 8, cy + 48);
        g.lineTo(x + 16 + alen, cy + 43); g.lineTo(x + 16 + alen, cy + 53);
        g.closePath(); g.fill();
        g.font = "12px sans-serif"; g.textAlign = "left";
        g.fillText("+" + fmt(item.grew) + " cm", x + 16, cy + 70);
      }
    });

    /* 결론 상자 */
    var bx = cssW * 0.10, by = cssH * 0.80, bw = cssW * 0.80;
    g.fillStyle = "rgba(15,23,42,.75)";
    g.strokeStyle = "rgba(148,163,184,.45)"; g.lineWidth = 1.5;
    roundRect(g, bx, by, bw, 52, 10); g.fill(); g.stroke();
    g.fillStyle = "#fde047"; g.font = "bold 15px sans-serif"; g.textAlign = "center";
    g.fillText("스티커 " + obs + " 에서 보면 나머지가 모두 멀어진다 — 멀리 있는 것일수록 더 많이",
               bx + bw / 2, by + 22);
    g.fillStyle = COL.ink; g.font = "14px sans-serif";
    g.fillText("기준을 바꿔 보세요. 어느 스티커에서 보아도 똑같습니다 → 특별한 중심이 없다",
               bx + bw / 2, by + 42);

    g.fillStyle = COL.faint; g.font = "14px sans-serif"; g.textAlign = "left";
    g.fillText("🎯 관측 기준 : 스티커 " + obs + " (배율 " + S.scale.toFixed(2) + " 배)", 16, 26);
  }

  /* ---- 장면 ③ 은하의 후퇴 ---- */
  function drawHubble(g) {
    var left = cssW * 0.10, span = cssW * 0.78;
    var cy = cssH * 0.30;
    var maxD = 8 * (10 / 3);

    /* 우리은하 */
    g.fillStyle = "#fde047";
    g.beginPath(); g.arc(left, cy, 10, 0, Math.PI * 2); g.fill();
    g.fillStyle = COL.ink; g.font = "bold 13px sans-serif"; g.textAlign = "center";
    g.fillText("우리은하", left, cy - 20);

    U.GALAXIES.forEach(function (gal, i) {
      var now = gal.d * S.scale;
      var v = U.recessionSpeed(gal.d, S.scale);
      var x = left + span * clamp(now / maxD, 0, 1);
      var y = cy + (i - 2) * (cssH * 0.075);
      g.fillStyle = "rgba(199,210,254,.85)";
      g.beginPath(); g.ellipse(x, y, 9, 5, -0.4, 0, Math.PI * 2); g.fill();
      g.fillStyle = COL.faint; g.font = "12px sans-serif"; g.textAlign = "center";
      g.fillText(gal.name, x, y - 12);
      /* 멀어지는 화살표 — 길이가 곧 속도.
         ⚠ 무대 오른쪽을 넘지 않도록 잘라 준다 */
      var alen = clamp(6 + v * 6, 6, Math.max(6, cssW - x - 34));
      g.strokeStyle = "#f472b6"; g.lineWidth = 2.5; g.lineCap = "round";
      g.beginPath(); g.moveTo(x + 12, y); g.lineTo(x + 12 + alen, y); g.stroke();
      g.fillStyle = "#f472b6";
      g.beginPath();
      g.moveTo(x + 12 + alen + 7, y); g.lineTo(x + 12 + alen, y - 4.5); g.lineTo(x + 12 + alen, y + 4.5);
      g.closePath(); g.fill();
    });

    /* 거리-속도 그래프 */
    var gx = cssW * 0.12, gy = cssH * 0.60, gw = cssW * 0.74, gh = cssH * 0.28;
    g.strokeStyle = COL.line; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(gx, gy + gh); g.lineTo(gx + gw, gy + gh);
    g.moveTo(gx, gy); g.lineTo(gx, gy + gh); g.stroke();
    g.fillStyle = COL.faint; g.font = "12px sans-serif"; g.textAlign = "center";
    g.fillText("거리 →", gx + gw / 2, gy + gh + 22);
    g.save(); g.translate(gx - 16, gy + gh / 2); g.rotate(-Math.PI / 2);
    g.fillText("← 멀어지는 빠르기", 0, 0); g.restore();

    var maxV = 8 * (10 / 3 - 1);
    g.strokeStyle = "#f472b6"; g.lineWidth = 2.5;
    g.beginPath();
    U.GALAXIES.forEach(function (gal, i) {
      var x = gx + gw * (gal.d / 8);
      var y = (gy + gh) - gh * clamp(U.recessionSpeed(gal.d, S.scale) / Math.max(maxV, 0.001), 0, 1);
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    });
    g.stroke();
    U.GALAXIES.forEach(function (gal) {
      var x = gx + gw * (gal.d / 8);
      var y = (gy + gh) - gh * clamp(U.recessionSpeed(gal.d, S.scale) / Math.max(maxV, 0.001), 0, 1);
      g.fillStyle = "#f472b6";
      g.beginPath(); g.arc(x, y, 4.5, 0, Math.PI * 2); g.fill();
    });

    g.fillStyle = (S.scale > 1.05) ? "#fde047" : COL.faint;
    g.font = "bold 14px sans-serif"; g.textAlign = "left";
    g.fillText(S.scale > 1.05
      ? "직선이다 — 멀리 있는 은하일수록 더 빠르게 멀어진다 (허블)"
      : "🎈 풍선을 불어 보세요 (배율을 올리면 은하가 멀어집니다)", 16, 26);
  }

  /* ---------------------------------------------------------
     4. 계기판
     --------------------------------------------------------- */
  function setBar(id, val, full) {
    $(id).querySelector(".bar-fill").style.width = clamp(val / full * 100, 0, 100) + "%";
  }
  function barText(id, t) { $(id).querySelector(".bar-val").textContent = t; }
  function ro(i, name, val, unit) {
    $("roName" + i).textContent = name; $("roVal" + i).textContent = val;
    $("roUnit" + i).textContent = unit || "";
  }

  function updatePanel() {
    var k = sceneKind();
    var p = U.allPairs(S.scale);

    if (k === "center") {
      var list = U.recessionFrom(S.observer, S.scale);
      $("gaugeTitle").textContent = "🎯 중심은 어디?";
      $("gaugeSub").innerHTML = "기준을 바꿔도 <b>결과가 같다</b>";
      $("barName1").textContent = "가까운 쪽";
      $("barName2").textContent = "먼 쪽";
      $("rowB").classList.remove("hidden");
      var mx = Math.max(list[list.length - 1].grew, 0.01);
      setBar("barA", list[0].grew, mx); barText("barA", "+" + fmt(list[0].grew) + " cm");
      setBar("barB", list[list.length - 1].grew, mx);
      barText("barB", "+" + fmt(list[list.length - 1].grew) + " cm");
      ro(1, "보는 곳", "스티커 " + S.observer, "");
      ro(2, "가까운 쪽", "+" + fmt(list[0].grew), " cm");
      ro(3, "먼 쪽", "+" + fmt(list[list.length - 1].grew), " cm");
      ro(4, "배율", S.scale.toFixed(2), " 배");
      $("fLaw").innerHTML = '늘어난 양 = (배율 − 1) × <span class="k">처음 거리</span> — ' +
                            '처음 거리에 <span class="t">비례</span>한다';
      $("fWhy").innerHTML = '<em>어느 스티커에서 보아도 나머지가 멀어진다 → <b>특별한 중심이 없다</b></em>';
      $("graphTitle").textContent = "📈 처음 거리와 늘어난 양";
      $("graphSub").innerHTML = "직선 — 멀수록 더 많이";

    } else if (k === "hubble") {
      $("gaugeTitle").textContent = "🌌 은하의 후퇴";
      $("gaugeSub").innerHTML = "멀리 있는 은하일수록 <b>빠르게</b>";
      $("barName1").textContent = "가까운 은하";
      $("barName2").textContent = "먼 은하";
      $("rowB").classList.remove("hidden");
      var vNear = U.recessionSpeed(1, S.scale), vFar = U.recessionSpeed(8, S.scale);
      var mv = Math.max(vFar, 0.01);
      setBar("barA", vNear, mv); barText("barA", fmt(vNear));
      setBar("barB", vFar, mv); barText("barB", fmt(vFar));
      ro(1, "은하 A (1)", fmt(vNear), "");
      ro(2, "은하 E (8)", fmt(vFar), "");
      ro(3, "몇 배 빠른가", (vNear > 0 ? (vFar / vNear).toFixed(1) : "-"), " 배");
      ro(4, "배율", S.scale.toFixed(2), " 배");
      $("fLaw").innerHTML = '멀어지는 빠르기 = (배율 − 1) × <span class="k">거리</span> → ' +
                            '거리에 <span class="t">비례</span>';
      $("fWhy").innerHTML = '<em>거리가 8배면 빠르기도 8배 — 그래서 그래프가 <b>직선</b>이다</em>';
      $("graphTitle").textContent = "📈 처음 거리와 늘어난 양";
      $("graphSub").innerHTML = "직선 — 멀수록 더 많이";

    } else {
      $("gaugeTitle").textContent = "🎈 풍선";
      $("gaugeSub").innerHTML = "불수록 거리가 어떻게 변할까";
      $("barName1").textContent = "1-2";
      $("barName2").textContent = "1-3";
      $("rowB").classList.remove("hidden");
      setBar("barA", p[0].now, 30); barText("barA", fmt(p[0].now) + " cm");
      setBar("barB", p[2].now, 30); barText("barB", fmt(p[2].now) + " cm");
      ro(1, "1-2 거리", fmt(p[0].now), " cm");
      ro(2, "2-3 거리", fmt(p[1].now), " cm");
      ro(3, "1-3 거리", fmt(p[2].now), " cm");
      ro(4, "배율", S.scale.toFixed(2), " 배");
      $("fLaw").innerHTML = '거리 = <span class="k">배율</span> × 처음 거리 &nbsp;·&nbsp; ' +
                            '늘어난 양 = (배율 − 1) × 처음 거리';
      $("fWhy").innerHTML = (S.scale > 1.05)
        ? '<em>1-3 이 1-2 보다 <b>' + (p[0].grew > 0 ? (p[2].grew / p[0].grew).toFixed(0) : "-") +
          '배</b> 더 많이 늘었다 — 처음 거리가 3배였으니까</em>'
        : '<em>아직 불지 않았다. 슬라이더를 밀어 보자</em>';
      $("graphTitle").textContent = "📈 처음 거리와 늘어난 양";
      $("graphSub").innerHTML = "직선 — 멀수록 더 많이";
    }

    $("tip").textContent = tipText();
    syncMissionGoals();
  }

  function tipText() {
    var k = sceneKind();
    if (k === "balloon") return "풍선을 불어 거리가 어떻게 변하는지 보세요";
    if (k === "center") return "기준 스티커를 바꿔 보세요";
    return "풍선을 불면 은하가 멀어집니다";
  }

  /* ---------------------------------------------------------
     5. 그래프 — 처음 거리 vs 늘어난 양 (언제나 직선)
     --------------------------------------------------------- */
  function drawGraph() {
    var c = $("graph");
    if (!c) return;
    var r = c.getBoundingClientRect();
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = Math.max(200, Math.round(r.width)), h = Math.max(100, Math.round(r.height));
    if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    var g = c.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = "#fff"; g.fillRect(0, 0, w, h);
    var pad = 30;
    g.strokeStyle = "#cbd5e1"; g.lineWidth = 1;
    g.beginPath(); g.moveTo(pad, h - pad); g.lineTo(w - 8, h - pad);
    g.moveTo(pad, 8); g.lineTo(pad, h - pad); g.stroke();

    var maxBase = 9, maxGrew = 9 * (10 / 3 - 1);
    g.strokeStyle = "#7c3aed"; g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(pad, h - pad);
    g.lineTo(pad + (w - pad - 8), (h - pad) - (h - pad - 8) *
      clamp((maxBase * (S.scale - 1)) / Math.max(maxGrew, 0.001), 0, 1));
    g.stroke();

    U.allPairs(S.scale).forEach(function (p) {
      var x = pad + (w - pad - 8) * (p.base / maxBase);
      var y = (h - pad) - (h - pad - 8) * clamp(p.grew / Math.max(maxGrew, 0.001), 0, 1);
      g.fillStyle = "#dc2626";
      g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#334155"; g.font = "11px sans-serif"; g.textAlign = "center";
      g.fillText(p.pair, x, y - 10);
    });

    g.fillStyle = "#64748b"; g.font = "12px sans-serif"; g.textAlign = "center";
    g.fillText("처음 거리 →", w / 2, h - 8);
  }

  /* ---------------------------------------------------------
     6. 조작 패널
     --------------------------------------------------------- */
  function syncControls() {
    var k = sceneKind();
    var allow = (S.scene === "mission" && S.mission) ? S.mission.allow : null;
    document.querySelectorAll("[data-for]").forEach(function (el) {
      var scenes = el.getAttribute("data-for").split(/\s+/);
      var need = el.getAttribute("data-need");
      var okScene = scenes.indexOf(S.scene) >= 0 || scenes.indexOf(k) >= 0;
      var okNeed = true;
      if (S.scene === "mission" && need) okNeed = allow && allow.indexOf(need) >= 0;
      el.classList.toggle("hidden", !(okScene && okNeed));
    });
    $("missionCard").classList.toggle("hidden", S.scene !== "mission");
    var stage = "";
    U.STAGES.forEach(function (s) { if (Math.abs(S.scale - s.scale) < 0.02) stage = s.name + " "; });
    $("valScale").textContent = stage + "(" + S.scale.toFixed(2) + " 배)";
  }

  function setChips(id, val) {
    var w = $(id); if (!w) return;
    w.querySelectorAll(".chip").forEach(function (b) {
      b.classList.toggle("on", b.getAttribute("data-val") === String(val));
    });
  }

  /* ---------------------------------------------------------
     7. 미션
     --------------------------------------------------------- */
  function loadProgress() {
    try { return JSON.parse(sessionStorage.getItem("ex_missions") || "[]"); } catch (e) { return []; }
  }
  function saveProgress(l) { try { sessionStorage.setItem("ex_missions", JSON.stringify(l)); } catch (e) {} }

  function renderMissionList() {
    var done = loadProgress(), host = $("missionList");
    host.innerHTML = "";
    MISSIONS.forEach(function (M) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "mcard" + (S.mission && S.mission.id === M.id ? " on" : "") +
                    (done.indexOf(M.id) >= 0 ? " done" : "");
      b.innerHTML = '<span class="mno">미션 ' + M.id + (done.indexOf(M.id) >= 0 ? " ✅" : "") + '</span>' +
                    '<span class="mtitle"><span class="mstar">' + M.star + '</span> ' + M.title + '</span>';
      b.addEventListener("click", function () { pickMission(M); });
      host.appendChild(b);
    });
    $("missionScore").textContent = done.length + " / " + MISSIONS.length;
  }

  function pickMission(M) {
    S.scene = "mission";
    $("scenes").querySelectorAll(".scene-btn").forEach(function (x) {
      x.classList.toggle("on", x.getAttribute("data-scene") === "mission");
    });
    S.mission = M; S.predictPick = null;
    S.missionState = M.predict ? "predict" : "ready";
    Object.keys(M.setup || {}).forEach(function (kk) { S[kk] = M.setup[kk]; });
    seen = { blown: false, huge: false, obs: {}, hubbleSeen: false };
    $("rngScale").value = S.scale;
    setChips("chipObs", S.observer);
    syncControls(); renderMissionList(); renderMissionBody(); refresh();
  }

  function renderMissionBody() {
    var M = S.mission, body = $("missionBody");
    if (!M) { body.classList.add("hidden"); return; }
    body.classList.remove("hidden");
    $("mTitle").textContent = M.star + " 미션 " + M.id + " · " + M.title;
    $("mStory").innerHTML = M.story;

    var pd = $("mPredict");
    if (M.predict && S.missionState === "predict") {
      pd.classList.remove("hidden");
      $("mQ").innerHTML = M.predict.q;
      var opts = $("mOpts"); opts.innerHTML = "";
      M.predict.opts.forEach(function (t, i) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "opt"; b.innerHTML = t;
        b.addEventListener("click", function () {
          S.predictPick = i; S.missionState = "ready"; renderMissionBody();
        });
        opts.appendChild(b);
      });
    } else pd.classList.add("hidden");

    var gl = $("mGoals");
    if (M.goals && S.missionState !== "predict") {
      gl.classList.remove("hidden");
      gl.innerHTML = '<div class="q">목표</div>' + M.goals.map(function (gg) {
        var ok = checkGoal(gg.key);
        return '<div class="goal' + (ok ? " ok" : "") + '">' + (ok ? "✅ " : "⬜ ") + gg.text + '</div>';
      }).join("");
    } else gl.classList.add("hidden");

    var vd = $("mVerdict");
    if (S.missionState === "won") {
      vd.className = "verdict ok";
      vd.innerHTML = "<b>🎉 성공!</b>" + M.why +
        (M.predict && S.predictPick != null
          ? "<br><br>" + (S.predictPick === M.predict.ans
              ? "예측도 <b>맞았습니다.</b> 잘했어요!"
              : "예측은 달랐지만 <b>직접 확인해서 알아냈습니다.</b> 그것이 더 중요해요.")
          : "");
      vd.classList.remove("hidden");
    } else if (S.missionState === "predict") vd.classList.add("hidden");
    else {
      vd.className = "verdict no";
      vd.innerHTML = "<b>직접 확인하세요</b>목표를 모두 채우면 이유가 열립니다.";
      vd.classList.remove("hidden");
    }
  }

  function checkGoal(key) {
    if (key.indexOf("obs") === 0) return !!seen.obs[key.slice(3)];
    switch (key) {
      case "blown": return seen.blown;
      case "huge": return seen.huge;
      case "hubble": return seen.hubbleSeen;
      default: return false;
    }
  }

  function noteSeen() {
    var k = sceneKind();
    if (S.scale >= 5 / 3 - 0.02) seen.blown = true;
    if (S.scale >= 10 / 3 - 0.03) seen.huge = true;
    if (k === "center") seen.obs[S.observer] = true;
    if (k === "hubble" && S.scale > 1.05) seen.hubbleSeen = true;
  }

  function syncMissionGoals() {
    if (S.scene !== "mission" || !S.mission || S.missionState === "predict") return;
    var M = S.mission;
    if (!M.goals) return;
    var all = M.goals.every(function (gg) { return checkGoal(gg.key); });
    if (all && S.missionState !== "won") {
      S.missionState = "won";
      var done = loadProgress();
      if (done.indexOf(M.id) < 0) { done.push(M.id); saveProgress(done); }
      renderMissionList(); renderMissionBody();
    } else if (S.missionState !== "won") {
      var gl = $("mGoals");
      if (!gl.classList.contains("hidden")) {
        var rows = gl.querySelectorAll(".goal");
        M.goals.forEach(function (gg, i) {
          if (!rows[i]) return;
          var ok = checkGoal(gg.key);
          rows[i].className = "goal" + (ok ? " ok" : "");
          rows[i].innerHTML = (ok ? "✅ " : "⬜ ") + gg.text;
        });
      }
    }
  }

  /* ---------------------------------------------------------
     8. 실험 기록
     --------------------------------------------------------- */
  function addRecord() {
    var p = U.allPairs(S.scale);
    var stage = "배율 " + S.scale.toFixed(2) + " 배";
    U.STAGES.forEach(function (s) { if (Math.abs(S.scale - s.scale) < 0.02) stage = s.name; });
    records.push({ stage: stage, a: fmt(p[0].now) + " cm", b: fmt(p[1].now) + " cm", c: fmt(p[2].now) + " cm" });
    renderRecords();
    window.PdfKit.toast("기록했습니다. (" + records.length + "번째)", "ok");
  }

  function renderRecords() {
    var body = $("recBody");
    body.innerHTML = "";
    records.forEach(function (r, i) {
      var tr = document.createElement("tr");
      tr.innerHTML = "<td>" + (i + 1) + "</td><td>" + r.stage + "</td><td><b>" + r.a +
                     "</b></td><td><b>" + r.b + "</b></td><td><b>" + r.c + "</b></td>";
      body.appendChild(tr);
    });
    $("recEmpty").classList.toggle("hidden", records.length > 0);
  }

  function refresh() { noteSeen(); draw(); updatePanel(); drawGraph(); }

  /* ---------------------------------------------------------
     9. 연결
     --------------------------------------------------------- */
  function bindChips(id, fn) {
    var w = $(id); if (!w) return;
    w.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest(".chip") : null;
      if (!b) return;
      w.querySelectorAll(".chip").forEach(function (x) { x.classList.remove("on"); });
      b.classList.add("on");
      fn(b.getAttribute("data-val"));
    });
  }

  function bind() {
    $("scenes").addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest(".scene-btn") : null;
      if (!b) return;
      $("scenes").querySelectorAll(".scene-btn").forEach(function (x) { x.classList.remove("on"); });
      b.classList.add("on");
      S.scene = b.getAttribute("data-scene");
      if (S.scene === "mission" && !S.mission) pickMission(MISSIONS[0]);
      else { syncControls(); refresh(); }
      renderMissionList();
    });

    $("btnReset").addEventListener("click", function () {
      S.scale = 1; S.observer = 1;
      $("rngScale").value = 1;
      setChips("chipStage", "small"); setChips("chipObs", "1");
      syncControls(); refresh();
    });
    $("btnRecord").addEventListener("click", addRecord);
    $("btnClearRec").addEventListener("click", function () {
      if (!records.length) return;
      if (!confirm("기록을 모두 지울까요?")) return;
      records.length = 0; renderRecords();
    });

    $("rngScale").addEventListener("input", function () {
      S.scale = parseFloat(this.value);
      setChips("chipStage", "");
      U.STAGES.forEach(function (s) { if (Math.abs(S.scale - s.scale) < 0.02) setChips("chipStage", s.key); });
      syncControls(); refresh();
    });
    bindChips("chipStage", function (v) {
      U.STAGES.forEach(function (s) { if (s.key === v) S.scale = s.scale; });
      $("rngScale").value = S.scale;
      syncControls(); refresh();
    });
    bindChips("chipObs", function (v) { S.observer = parseInt(v, 10); refresh(); });

    if (window.ResizeObserver) {
      new ResizeObserver(function () { layout(); draw(); drawGraph(); }).observe(canvas);
    } else {
      window.addEventListener("resize", function () { layout(); draw(); drawGraph(); });
    }
  }

  function boot() {
    canvas = $("stage");
    layout(); bind(); syncControls();
    renderMissionList(); renderRecords(); refresh();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.ExLab = {
    S: S, MISSIONS: MISSIONS,
    _test: {
      set: function (k, v) { S[k] = v; syncControls(); refresh(); },
      scene: function (n) { S.scene = n; syncControls(); refresh(); },
      pick: function (id) { pickMission(MISSIONS[id - 1]); },
      answer: function (i) { S.predictPick = i; S.missionState = "ready"; renderMissionBody(); refresh(); },
      goals: function () {
        if (!S.mission || !S.mission.goals) return null;
        return S.mission.goals.map(function (gg) { return [gg.key, checkGoal(gg.key)]; });
      },
      state: function () { return S.missionState; },
      records: function () { return records; },
      draw: function () { draw(); return true; }
    }
  };
})();
