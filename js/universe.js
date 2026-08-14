/* =========================================================
   universe.js — 팽창하는 우주 계산 엔진
   ---------------------------------------------------------
   이 파일은 화면을 전혀 모른다. 숫자만 만든다.

   ⚠ ES 모듈(import/export)을 쓰지 않는다. 더블클릭(file://)으로도 열려야 한다.

   ---------------------------------------------------------
   엔진의 핵심 아이디어 — 여기를 고칠 사람은 반드시 읽을 것
   ---------------------------------------------------------

   1. 팽창은 **거리에 배율을 곱하는 것** 하나뿐이다

      선생님 학습지의 풍선 실험 결과가 그것을 그대로 보여 준다.

        스티커 1-2 : 3 → 5 → 10 cm
        스티커 2-3 : 6 → 10 → 20 cm
        스티커 1-3 : 9 → 15 → 30 cm

      세 줄이 **같은 배율**로 늘어난다(1배 → 5/3배 → 10/3배).
      그래서 이 엔진은 거리 하나하나를 따로 두지 않고 **배율 `a` 하나만** 상태로 들고 있고,
      모든 거리를 `a × 처음 거리` 로 계산한다.

      여기서 학습지의 물음들이 저절로 풀린다 —
        · 늘어난 양 = (a − 1) × 처음 거리  →  **처음에 멀수록 더 많이 늘어난다**
        · 멀어지는 빠르기도 처음 거리에 비례  →  **멀리 있는 은하일수록 더 빠르게 멀어진다**
      이것이 허블이 알아낸 것의 축소판이다.

   2. **중심이 없다**는 것을 계산으로 보여 준다

      "풍선이 팽창할 때 중심은 어디일까? 돌려서 다른 각도에서 보아도 그 곳이 중심일까?"

      말로 "중심이 없다"고 하면 믿기 어렵다. 그래서 이 엔진은
      **어느 스티커를 기준(관측자)으로 삼든** 나머지가 멀어지는 모습을 계산한다.
      기준을 바꿔도 결과가 똑같다 — 그래서 **어느 곳도 특별한 중심이 아니다.**
      `recessionFrom(observer)` 가 그 계산이다.

   3. 숫자는 **선생님 학습지 그대로**

      3 · 6 · 9 → 5 · 10 · 15 → 10 · 20 · 30 (cm).
      '더 그럴듯한 값'으로 고치지 말 것 — 학생이 종이와 화면을 나란히 놓고 본다.
   ========================================================= */
(function (global) {
  "use strict";

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  /* ---------------------------------------------------------
     1. 풍선 위의 스티커 — 처음(작게 불었을 때) 거리
        학습지의 ① 단계 값이다.
     --------------------------------------------------------- */
  var STICKERS = [
    { id: 1, name: "스티커 1", css: "#f87171" },
    { id: 2, name: "스티커 2", css: "#60a5fa" },
    { id: 3, name: "스티커 3", css: "#4ade80" }
  ];

  /* 처음 거리 (cm) — 스티커 1 을 0 으로 두고 한 줄에 늘어놓았을 때의 자리 */
  var BASE_POS = { 1: 0, 2: 3, 3: 9 };      // 1-2 = 3, 2-3 = 6, 1-3 = 9

  /* 학습지의 세 단계 배율 */
  var STAGES = [
    { key: "small", name: "① 작게", scale: 1 },
    { key: "big",   name: "② 크게", scale: 5 / 3 },
    { key: "huge",  name: "③ 더 크게", scale: 10 / 3 }
  ];

  /* 처음 거리 */
  function baseDist(a, b) { return Math.abs(BASE_POS[b] - BASE_POS[a]); }

  /* 배율 scale 일 때의 거리 */
  function distAt(a, b, scale) { return baseDist(a, b) * scale; }

  /* 늘어난 양 = (배율 − 1) × 처음 거리 */
  function growth(a, b, scale) { return baseDist(a, b) * (scale - 1); }

  /* 세 쌍의 거리를 한꺼번에 */
  function allPairs(scale) {
    return [
      { pair: "1-2", a: 1, b: 2, base: baseDist(1, 2), now: distAt(1, 2, scale), grew: growth(1, 2, scale) },
      { pair: "2-3", a: 2, b: 3, base: baseDist(2, 3), now: distAt(2, 3, scale), grew: growth(2, 3, scale) },
      { pair: "1-3", a: 1, b: 3, base: baseDist(1, 3), now: distAt(1, 3, scale), grew: growth(1, 3, scale) }
    ];
  }

  /* ---------------------------------------------------------
     2. 중심이 없다 — 어느 스티커에서 보아도 결과가 같다
        기준 스티커에서 본 나머지의 '거리'와 '멀어진 양'을 돌려준다.
     --------------------------------------------------------- */
  function recessionFrom(observerId, scale) {
    var out = [];
    STICKERS.forEach(function (s) {
      if (s.id === observerId) return;
      var base = baseDist(observerId, s.id);
      out.push({
        id: s.id, name: s.name, css: s.css,
        base: base,
        now: base * scale,
        grew: base * (scale - 1),
        /* 멀어지는 빠르기(상댓값). 처음 거리에 비례한다 = 허블 법칙 */
        speed: base
      });
    });
    return out.sort(function (x, y) { return x.base - y.base; });
  }

  /* 기준을 바꿔도 '멀수록 빠르다'가 그대로인가 — 검사용 */
  function fartherIsFaster(scale) {
    return STICKERS.every(function (o) {
      var list = recessionFrom(o.id, scale);
      for (var i = 1; i < list.length; i++) {
        if (list[i].base > list[i - 1].base && !(list[i].grew > list[i - 1].grew)) return false;
      }
      return true;
    });
  }

  /* ---------------------------------------------------------
     3. 은하의 후퇴 — 허블이 알아낸 것
        멀리 있는 은하일수록 더 빠르게 멀어진다 (속도 ∝ 거리)
     --------------------------------------------------------- */
  var GALAXIES = [
    { name: "은하 A", d: 1 },
    { name: "은하 B", d: 2 },
    { name: "은하 C", d: 3 },
    { name: "은하 D", d: 5 },
    { name: "은하 E", d: 8 }
  ];

  /* 상댓값 속도 = 거리 × (배율 − 1) — 풍선과 완전히 같은 식이다 */
  function recessionSpeed(d, scale) { return d * (scale - 1); }

  global.Universe = {
    STICKERS: STICKERS, BASE_POS: BASE_POS, STAGES: STAGES, GALAXIES: GALAXIES,
    clamp: clamp,
    baseDist: baseDist, distAt: distAt, growth: growth, allPairs: allPairs,
    recessionFrom: recessionFrom, fartherIsFaster: fartherIsFaster,
    recessionSpeed: recessionSpeed
  };
})(window);
