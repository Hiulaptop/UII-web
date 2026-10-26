"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

// Scroll behaviour of the approved drawing (ui/index.html v2), which reproduces the Ridgeline reference math:
// chapter progress is 0 when the section top hits 60% of the viewport and 1 when its bottom does.

const NAMES = ["MỞ ĐẦU", "ĐI MỘT MÌNH", "TRƯỢT", "IM LẶNG", "TÍN HIỆU", "TRỞ VỀ"];
const N = 20;
const RAW = [
  "> CÓ THỂ ĐÃ NGÃ      05:14:52",
  "> KHÔNG PHẢN HỒI     20 GIÂY",
  "> VỊ TRÍ             21.0285° N 105.8542° E",
  "> ĐỘ CHÍNH XÁC       ±25 M",
  "> NHỊP TIM           118 BPM",
  "> HÀNG ĐỢI           CHỜ SÓNG → GỬI",
  "> TRẠNG THÁI         MÁY CHỦ ĐÃ NHẬN",
];
const CHIPS = ["NGƯỜI THÂN · EMAIL", "VÒNG TRÒN · WEB", "THẺ SOS · QR"];
const PTS: [number, number][] = [[0, 330], [120, 300], [210, 310], [320, 240], [400, 260], [520, 170], [600, 195], [700, 120], [780, 140], [880, 70], [940, 90], [1040, 30], [1120, 55], [1200, 40]];
const TOTAL = RAW.reduce((n, l) => n + l.length, 0);

const c = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const $ = (id: string) => document.getElementById(id);

function ch1(t: number) {
  const tx = Math.min(t * 1040, 1040);
  let y = 330;
  for (let k = 0; k < PTS.length - 1; k++) {
    const [x0, y0] = PTS[k], [x1, y1] = PTS[k + 1];
    if (tx >= x0 && tx <= x1) { y = y0 + ((tx - x0) / (x1 - x0)) * (y1 - y0); break; }
  }
  $("lp-ridge")?.style.setProperty("stroke-dashoffset", (1 - t).toFixed(4));
  for (const id of ["lp-mk1", "lp-mk2"]) { $(id)?.setAttribute("cx", tx.toFixed(1)); $(id)?.setAttribute("cy", y.toFixed(1)); }
  const km = $("lp-km"), hr = $("lp-hr");
  if (km) km.textContent = (t * 12).toFixed(1).replace(".", ",");
  if (hr) hr.textContent = String(Math.round(96 + t * 46));
}

function ch2(t: number) {
  document.querySelectorAll<HTMLElement>("#lp-tumble span").forEach((el, i) => {
    const d = c((t - 0.18 - i * 0.07) / 0.45);
    el.style.transform = `translateY(${(d * d * 170).toFixed(1)}px) rotate(${(d * (i % 2 ? 22 : -16)).toFixed(1)}deg)`;
    el.style.opacity = (1 - d * 0.72).toFixed(3);
  });
  $("lp-wave")?.style.setProperty("stroke-dashoffset", (1 - c(t * 1.6)).toFixed(4));
  document.querySelectorAll<HTMLElement | SVGElement>(".lp-flag").forEach((f) => { f.style.opacity = t > 0.38 ? "1" : "0"; });
}

function ch3(t: number) {
  const secs = Math.max(0, Math.round(N * (1 - t)));
  $("lp-ring")?.style.setProperty("stroke-dashoffset", t.toFixed(4));
  const sEl = $("lp-secs"), msg = $("lp-watchMsg");
  if (sEl) sEl.textContent = String(secs);
  if (msg) msg.textContent = secs === 0 ? "ĐANG GỬI CẢNH BÁO" : "BẠN ỔN CHỨ?";
}

function ch4(t: number) {
  const term = $("lp-term"), chips = $("lp-chips");
  if (!term || !chips) return;
  const shown = Math.floor(c(t * 1.25) * TOTAL);
  let acc = 0, caretSet = false;
  const lines: { text: string; caret: boolean; last: boolean }[] = [];
  RAW.forEach((l, i) => {
    const n = Math.max(0, Math.min(l.length, shown - acc));
    acc += l.length;
    const caret = !caretSet && n !== l.length;
    if (caret) caretSet = true;
    if (n > 0 || caret) lines.push({ text: l.slice(0, n), caret, last: i === RAW.length - 1 });
  });
  if (!caretSet && lines.length) lines[lines.length - 1].caret = true;
  term.replaceChildren(...lines.map((ln) => {
    const div = document.createElement("div");
    div.className = term.dataset.line ?? "";
    div.style.color = ln.last ? "var(--accent)" : "var(--text)";
    div.textContent = ln.text;
    if (ln.caret) { const sp = document.createElement("span"); sp.className = "caret"; sp.textContent = "▌"; div.append(sp); }
    return div;
  }));
  chips.replaceChildren(...CHIPS.map((label, i) => {
    const on = t > 0.62 + i * 0.1;
    const div = document.createElement("div");
    div.className = `${chips.dataset.chip ?? ""} ${on ? chips.dataset.chipOn ?? "" : ""}`;
    const dot = document.createElement("span");
    dot.className = chips.dataset.chipDot ?? "";
    div.append(dot, label);
    return div;
  }));
}

export function LandingScroll() {
  useGSAP(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { ch1(1); ch2(0.46); ch3(0.7); ch4(1); return; }

    const lenis = new Lenis();
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'));
    const onAnchor = (e: MouseEvent) => {
      const href = (e.currentTarget as HTMLAnchorElement).getAttribute("href");
      const target = href && href.length > 1 ? document.querySelector<HTMLElement>(href) : null;
      if (target) { e.preventDefault(); lenis.scrollTo(target, { offset: -64 }); }
    };
    anchors.forEach((a) => a.addEventListener("click", onAnchor));

    const prog = $("lp-prog"), chNum = $("lp-chNum"), chName = $("lp-chName");
    ScrollTrigger.create({ start: 0, end: "max", onUpdate: (st) => { if (prog) prog.style.width = `${(st.progress * 100).toFixed(1)}%`; } });
    document.querySelectorAll<HTMLElement>("[data-ch]").forEach((sec) => {
      const i = Number(sec.dataset.ch);
      ScrollTrigger.create({ trigger: sec, start: "top 50%", end: "bottom 50%", onToggle: (st) => {
        if (st.isActive && chNum && chName) { chNum.textContent = `0${i}`; chName.textContent = NAMES[i]; }
      } });
    });

    document.querySelectorAll<HTMLElement>(".lp-reveal").forEach((el) => {
      gsap.fromTo(el, { opacity: 0, y: 48 }, { opacity: 1, y: 0, ease: "none", scrollTrigger: { trigger: el.parentElement, start: "top 95%", end: "top 50%", scrub: true } });
    });

    const hero = $("mo-dau");
    if (hero) {
      const end = () => `+=${hero.offsetHeight * 0.8}`;
      gsap.to("#lp-heroH1", { letterSpacing: "0.13em", y: -140, opacity: 0.15, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end, scrub: true } });
      gsap.to("#lp-heroWatch", { y: -60, rotate: -12, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end, scrub: true } });
      hero.addEventListener("mousemove", (e) => {
        const mx = (e.clientX / window.innerWidth) * 2 - 1;
        gsap.to("#lp-ridgeBack", { x: mx * -16, duration: 0.6 });
        gsap.to("#lp-ridgeFront", { x: mx * -34, duration: 0.6 });
        gsap.to("#lp-heroWatch", { x: mx * 24, duration: 0.6 });
      });
    }

    ([[1, ch1], [2, ch2], [3, ch3], [4, ch4]] as const).forEach(([n, fn]) => {
      ScrollTrigger.create({ trigger: `#chuong-${n}`, start: "top 60%", end: "bottom 60%", onUpdate: (st) => fn(st.progress), onRefresh: (st) => fn(st.progress) });
    });
    ch1(0); ch2(0); ch3(0); ch4(0);

    return () => {
      anchors.forEach((a) => a.removeEventListener("click", onAnchor));
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  });

  return null;
}
