import Link from "next/link";
import type { ReactNode } from "react";
import s from "./landing.module.css";
import { HeroTerrain } from "./hero-terrain";
import { LandingScroll } from "./landing-scroll";

// Markup and copy follow openspec/changes/landing-scroll-story/ui/index.html (approved v2 drawing).

const contactEmail = process.env.PRIVACY_CONTACT_EMAIL;
// Inlined at build time (see Dockerfile build args); without it the CTA falls back to e-mail.
const waitlistHref = process.env.NEXT_PUBLIC_WAITLIST_URL || (contactEmail ? `mailto:${contactEmail}` : "#tham-gia");
const ext = waitlistHref.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {};

const RIDGE = "M0 330 L120 300 L210 310 L320 240 L400 260 L520 170 L600 195 L700 120 L780 140 L880 70 L940 90 L1040 30 L1120 55 L1200 40";
const WAVE = "M0 120 L30 114 L60 126 L90 112 L120 128 L150 116 L180 124 L210 110 L240 128 L270 118 L300 122 L310 140 L330 168 L350 176 L362 18 L372 190 L384 40 L396 170 L408 80 L420 150 L432 105 L444 130 L456 118 L470 121 L800 121";

function Eyebrow({ n, name, center }: { n: string; name: string; center?: boolean }) {
  return (
    <div className={`${s.mono} ${s.eyebrowRow} ${center ? s.center : ""}`}>
      <span className={s.k}>CHƯƠNG {n}</span>
      <span className={s.dash} />
      <span>{name}</span>
    </div>
  );
}

function WatchCase({ children }: { children: ReactNode }) {
  return (
    <>
      <rect x="92" y="0" width="96" height="80" rx="12" fill="var(--watch-strap)" />
      <rect x="92" y="260" width="96" height="80" rx="12" fill="var(--watch-strap)" />
      {[16, 30, 310, 324].map((y) => <line key={y} x1="104" y1={y} x2="176" y2={y} stroke="var(--watch-groove)" strokeWidth="3" />)}
      <rect x="246" y="136" width="16" height="24" rx="3" fill="var(--accent)" />
      <rect x="246" y="182" width="16" height="24" rx="3" fill="var(--border-4)" />
      <rect x="18" y="150" width="14" height="40" rx="3" fill="var(--border-4)" />
      <circle cx="140" cy="170" r="114" fill="var(--watch-body)" stroke="var(--watch-bezel)" strokeWidth="2" />
      <circle cx="140" cy="170" r="101" fill="none" stroke="var(--panel)" strokeWidth="16" />
      <circle cx="140" cy="170" r="101" fill="none" stroke="var(--watch-tick)" strokeWidth="6" strokeDasharray="1.2 9.377" />
      <circle cx="140" cy="170" r="86" fill="var(--watch-face)" />
      {children}
    </>
  );
}

const mono = (t: string) => ({ className: s.mono, children: t });

export function LandingPage() {
  return (
    <div className={s.root}>
      <LandingScroll />
      <header className={s.header}>
        <div className={s.headerInner}>
          <a href="#mo-dau" className={`${s.disp} ${s.wordmark}`}>
            <svg aria-hidden width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinejoin="round"><path d="M2 20 L9 7 L13 13 L16 9 L22 20 Z" /></svg>
            Seize Guard
          </a>
          <div className={`${s.mono} ${s.chapter}`}>
            <div className={s.chapterRow}><span>CH <span id="lp-chNum">00</span> / 05</span><span id="lp-chName" className={s.chapterName}>MỞ ĐẦU</span></div>
            <div className={s.progTrack}><div id="lp-prog" className={s.prog} /></div>
          </div>
          <nav aria-label="Điều hướng chính" className={s.nav}>
            <a href="#chuong-1">Câu chuyện</a>
            <a href="#thong-so">Thông số</a>
            <a href="#tham-gia" className={s.cta}>Tham gia beta</a>
          </nav>
        </div>
      </header>

      <main>
        <section id="mo-dau" data-ch="0" className={s.hero}>
          <HeroTerrain className={s.terrain} />
          <svg id="lp-ridgeBack" aria-hidden viewBox="0 0 1440 400" preserveAspectRatio="none" className={s.ridge} style={{ height: 360 }}><path d="M0 400 L0 250 L140 190 L260 230 L420 120 L520 170 L660 60 L760 130 L900 80 L1040 170 L1180 110 L1300 180 L1440 140 L1440 400 Z" fill="var(--ridge-back)" /></svg>
          <svg id="lp-ridgeFront" aria-hidden viewBox="0 0 1440 400" preserveAspectRatio="none" className={s.ridge} style={{ height: 260 }}><path d="M0 400 L0 320 L180 260 L300 300 L460 220 L600 280 L760 200 L900 270 L1080 230 L1240 300 L1440 250 L1440 400 Z" fill="var(--ridge-front)" stroke="var(--border-2)" strokeWidth="1.5" /></svg>
          <div aria-hidden className={`${s.mono} ${s.coord} ${s.coordL}`}>21.0285° N</div>
          <div aria-hidden className={`${s.mono} ${s.coord} ${s.coordR}`}>105.8542° E</div>

          <div className={s.heroInner}>
            <div className={s.heroText}>
              <div className={`${s.mono} ${s.heroMeta}`}><span className={s.accent}>● BETA</span><span>WEAR OS 5+</span><span>05:12 SÁNG</span><span>ĐƯỜNG MÒN</span></div>
              <h1 id="lp-heroH1" className={`${s.disp} ${s.heroH1}`}>Không ai<br />thấy<br /><span className={s.accent}>bạn ngã.</span></h1>
              <p className={s.heroP}>Seize Guard là ứng dụng cho đồng hồ Wear OS. Khi nghi bạn đã ngã, đồng hồ hỏi bạn có ổn không. Nếu bạn không trả lời, nó gửi cảnh báo và vị trí cho người thân.</p>
              <div className={s.btnRow}>
                <a href="#chuong-1" className={s.btnLight}>Bắt đầu câu chuyện <span className={s.cue}>↓</span></a>
                <a href="#tham-gia" className={s.btnGhost}>Tham gia beta</a>
              </div>
            </div>
            <div id="lp-heroWatch" className={s.heroWatch}>
              <svg role="img" aria-label="Đồng hồ Wear OS chạy Seize Guard, đang theo dõi" viewBox="0 0 280 340" className={s.watchSvg}>
                <WatchCase>
                  <text x="140" y="138" textAnchor="middle" {...mono("NHỊP TIM")} fontSize="10" fill="var(--text-muted)" letterSpacing="2" />
                  <text x="140" y="186" textAnchor="middle" className={s.disp} fontSize="52" fill="var(--text)">96</text>
                  <text x="140" y="206" textAnchor="middle" {...mono("BPM · ĐANG THEO DÕI")} fontSize="10" fill="var(--accent)" letterSpacing="1.5" />
                  <line x1="104" y1="222" x2="176" y2="222" stroke="var(--border)" strokeWidth="1" />
                  <text x="140" y="238" textAnchor="middle" {...mono("SEIZE GUARD · BETA")} fontSize="9" fill="var(--text-muted)" letterSpacing="1" />
                </WatchCase>
              </svg>
            </div>
          </div>

          <div className={s.heroBar}>
            <div className={`${s.mono} ${s.heroBarInner}`}>
              <span>SEIZE GUARD GIỚI THIỆU</span><span>MỘT CÂU CHUYỆN 5 CHƯƠNG</span>
              <span style={{ color: "var(--text)" }}>CUỘN ĐỂ BẮT ĐẦU <span className={s.cue}>↓</span></span>
            </div>
          </div>
        </section>

        <section id="chuong-1" data-ch="1" className={`${s.sec} ${s.sec1}`}>
          <div className={`${s.wrap} lp-reveal`}>
            <div style={{ marginBottom: 36 }}><Eyebrow n="01" name="ĐI MỘT MÌNH" /></div>
            <div className={s.split}>
              <h2 className={`${s.disp} ${s.h2Big}`}>5 giờ sáng.<br />Một mình<br />trên đường mòn.</h2>
              <p className={`${s.body18} ${s.pSide}`}>Không ai đi cùng, điện thoại nằm trong balo, sóng chập chờn ở đoạn rừng. Nếu có chuyện, sẽ không ai ở đó để gọi giúp. Thứ duy nhất còn theo dõi bạn là chiếc đồng hồ trên cổ tay.</p>
            </div>
            <div className={s.panel}>
              <div className={`${s.mono} ${s.stats}`}>
                <div className={s.stat}><span>QUÃNG ĐƯỜNG</span><span className={`${s.disp} ${s.statV}`}><span id="lp-km">0,0</span> <span className={s.statU}>KM</span></span></div>
                <div className={s.stat}><span>NHỊP TIM</span><span className={`${s.disp} ${s.statV}`}><span id="lp-hr">96</span> <span className={s.statU}>BPM</span></span></div>
                <div className={s.stat}><span>TRẠNG THÁI</span><span className={`${s.disp} ${s.statV}`}>ỔN</span></div>
              </div>
              <svg role="img" aria-label="Đường mòn, vị trí người chạy di chuyển theo cuộn trang" viewBox="0 0 1200 360" className={s.svgFull}>
                {[90, 180, 270].map((y) => <line key={y} x1="0" y1={y} x2="1200" y2={y} stroke="var(--grid)" strokeDasharray="4 8" />)}
                <path d={`${RIDGE} L1200 360 L0 360 Z`} fill="var(--olive)" fillOpacity="0.18" />
                <path d={RIDGE} fill="none" stroke="var(--border-3)" strokeWidth="2" />
                <path id="lp-ridge" d={RIDGE} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinejoin="round" pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: 0 }} />
                <circle id="lp-mk1" cx="1040" cy="30" r="18" fill="none" stroke="var(--accent)" strokeOpacity="0.4" />
                <circle id="lp-mk2" cx="1040" cy="30" r="7" fill="var(--accent)" />
                <text x="1040" y="18" textAnchor="middle" {...mono("ĐỈNH ĐỒI · 12 KM")} fontSize="12" fill="var(--text-muted)" letterSpacing="2" />
                <text x="8" y="352" {...mono("XUẤT PHÁT · 0 KM")} fontSize="12" fill="var(--text-muted)" letterSpacing="2" />
              </svg>
            </div>
          </div>
        </section>

        <section id="chuong-2" data-ch="2" className={`${s.sec} ${s.alt}`}>
          <div className={`${s.wrap} lp-reveal`}>
            <div style={{ marginBottom: 12 }}><Eyebrow n="02" name="TRƯỢT" /></div>
            <h2 id="lp-tumble" className={`${s.disp} ${s.tumble}`} aria-label="Trượt">
              {["T", "R", "Ư", "Ợ", "T"].map((ch, i) => <span key={i} aria-hidden className={i === 3 ? s.accent : undefined}>{ch}</span>)}
            </h2>
            <div className={s.split} style={{ marginTop: 40, gap: "24px 64px" }}>
              <h3 className={`${s.disp} ${s.h3Big}`}>Cơ thể rơi.<br />Đồng hồ nhận ra.</h3>
              <p className={s.body18} style={{ flex: "0 1 440px" }}>Một rễ cây. Một đoạn dốc trơn. Đồng hồ liên tục đọc chuyển động và nhịp tim của bạn. Khi chuyển động giống một cú ngã, nó rung mạnh và hỏi bạn trước khi báo. Tính năng đang ở giai đoạn beta, có thể bỏ sót hoặc báo nhầm.</p>
            </div>
            <div className={s.plot}>
              <div className={`${s.mono} ${s.plotHead}`}><span>GIA TỐC · TRỤC TỔNG HỢP · MINH HỌA</span><span><span className={s.accent}>●</span> 50 LẦN/GIÂY</span></div>
              <div style={{ position: "relative" }}>
                <svg role="img" aria-label="Biểu đồ gia tốc minh họa: chạy đều, rơi, va chạm mạnh, rồi bất động" viewBox="0 0 800 200" preserveAspectRatio="none" style={{ width: "100%", height: 220, display: "block" }}>
                  <line x1="0" y1="121" x2="800" y2="121" stroke="var(--grid)" strokeDasharray="3 6" />
                  <path d={WAVE} fill="none" stroke="var(--border-3)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                  <path id="lp-wave" d={WAVE} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: 0 }} />
                  <line className="lp-flag" x1="362" y1="0" x2="362" y2="200" stroke="var(--text)" strokeDasharray="2 4" vectorEffect="non-scaling-stroke" style={{ opacity: 1 }} />
                </svg>
                <div className={`${s.mono} ${s.flagTag} lp-flag`} style={{ opacity: 1 }}>CÓ THỂ ĐÃ NGÃ</div>
              </div>
              <div className={`${s.mono} ${s.plotAxis}`}>
                <span style={{ left: 0 }}>CHẠY</span><span style={{ left: "37%" }}>RƠI</span><span style={{ left: "47%" }}>VA CHẠM</span><span style={{ left: "64%" }}>BẤT ĐỘNG</span>
              </div>
            </div>
            <div className={s.cards}>
              <div className={s.card}>
                <svg aria-hidden width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="var(--accent)" strokeWidth="1.8"><path d="M16 4 L16 28 M4 22 L16 16 L28 22 M16 16 L16 4" /><circle cx="16" cy="16" r="3" /></svg>
                <span className={`${s.mono} ${s.cardN}`}>01</span>
                <h4>Gia tốc kế</h4>
                <p>Đọc chuyển động 50 lần mỗi giây để nhận ra cú rơi và lực va chạm.</p>
              </div>
              <div className={s.card}>
                <svg aria-hidden width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="var(--accent)" strokeWidth="1.8"><path d="M16 27 C 6 20, 3 14, 6 9 C 9 5, 14 6, 16 10 C 18 6, 23 5, 26 9 C 29 14, 26 20, 16 27 Z" /><path d="M7 16 L12 16 L14 12 L17 20 L19 16 L25 16" /></svg>
                <span className={`${s.mono} ${s.cardN}`}>02</span>
                <h4>Nhịp tim</h4>
                <p>Theo dõi nhịp tim trong lúc giám sát, gửi kèm cảnh báo cho người thân.</p>
              </div>
              <div className={s.card}>
                <svg aria-hidden width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="var(--accent)" strokeWidth="1.8"><circle cx="16" cy="16" r="11" /><path d="M16 9 L16 16 L21 19" /></svg>
                <span className={`${s.mono} ${s.cardN}`}>03</span>
                <h4>Luôn hỏi trước</h4>
                <p>Không gửi gì khi bạn bấm “Tôi ổn”. Bạn có 20 giây để huỷ một báo nhầm.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="chuong-3" data-ch="3" className={s.sec}>
          <div className={`${s.wrap} ${s.row} lp-reveal`}>
            <div className={s.col}>
              <Eyebrow n="03" name="IM LẶNG" />
              <h2 className={`${s.disp} ${s.h2Silence}`}>Rồi<br />im lặng.</h2>
              <p className={`${s.body18} ${s.pMax}`}>Ngay khi nghi bạn ngã, đồng hồ rung mạnh và hỏi “Bạn ổn chứ?”. Chạm “Tôi ổn” để huỷ, không có gì được gửi đi. Nếu không có phản hồi sau 20 giây, cảnh báo được gửi cho người thân.</p>
              <div className={`${s.mono} ${s.tags}`}><span>RUNG CẢNH BÁO</span><span>HỎI TRƯỚC KHI GỬI</span><span>TỰ GỬI SAU 20 GIÂY</span></div>
            </div>
            <div className={s.watchCol}>
              <svg role="img" aria-label="Màn hình đồng hồ hỏi Bạn ổn chứ, đếm ngược trước khi gửi cảnh báo" viewBox="0 0 280 340" className={s.watchSvgLg}>
                <path className={s.buzz} d="M18 120 Q0 170 18 220" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
                <path className={s.buzz} d="M262 120 Q280 170 262 220" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
                <rect x="92" y="0" width="96" height="80" rx="12" fill="var(--watch-strap)" />
                <rect x="92" y="260" width="96" height="80" rx="12" fill="var(--watch-strap)" />
                <circle cx="140" cy="170" r="110" fill="var(--watch-body)" stroke="var(--watch-bezel)" strokeWidth="2" />
                <circle cx="140" cy="170" r="98" fill="none" stroke="var(--panel)" strokeWidth="14" />
                <circle cx="140" cy="170" r="88" fill="var(--watch-face)" />
                <circle cx="140" cy="170" r="76" fill="none" stroke="var(--ring-track)" strokeWidth="6" />
                <circle id="lp-ring" cx="140" cy="170" r="76" fill="none" stroke="var(--accent)" strokeWidth="6" strokeLinecap="round" pathLength={1} transform="rotate(-90 140 170)" style={{ strokeDasharray: 1, strokeDashoffset: 0.7 }} />
                <text id="lp-watchMsg" x="140" y="140" textAnchor="middle" className={s.mono} fontSize="10" fill="var(--text)" letterSpacing="1.5">BẠN ỔN CHỨ?</text>
                <text id="lp-secs" x="140" y="196" textAnchor="middle" className={s.disp} fontSize="62" fill="var(--accent)">6</text>
                <text x="140" y="216" textAnchor="middle" {...mono("GIÂY")} fontSize="9" fill="var(--text-muted)" letterSpacing="2" />
              </svg>
              <div className={s.btnPair}>
                <button type="button" className={s.btnOk}>Tôi ổn</button>
                <button type="button" className={s.btnSos}>Gửi SOS ngay</button>
              </div>
            </div>
          </div>
        </section>

        <section id="chuong-4" data-ch="4" className={`${s.sec} ${s.alt}`}>
          <div className={`${s.wrap} ${s.row} lp-reveal`}>
            <div className={s.col}>
              <Eyebrow n="04" name="TÍN HIỆU" />
              <h2 className={`${s.disp} ${s.h2Big}`} style={{ flex: "none" }}>Vị trí của bạn<br />tới người thân<br />trước cuộc gọi.</h2>
              <p className={`${s.body18} ${s.pMax}`}>Đồng hồ gửi cảnh báo kèm vị trí quanh thời điểm sự cố và nhịp tim tới những người trong vòng tròn của bạn, qua email và web. Mất sóng, cảnh báo nằm trong hàng đợi và tự gửi lại khi có sóng.</p>
              <p className={`${s.mono} ${s.channel}`}>KÊNH: MẠNG DI ĐỘNG / WI-FI · CẦN CÓ SÓNG VÀO MỘT LÚC NÀO ĐÓ</p>
            </div>
            <div className={s.termWrap}>
              <div aria-hidden className={s.pulses}>
                <div className={s.pulse} /><div className={`${s.pulse} ${s.d2}`} /><div className={`${s.pulse} ${s.d3}`} />
                <div className={s.pulseDot} />
              </div>
              <div className={s.term}>
                <div className={`${s.mono} ${s.termHead}`}><span>SG://SOS</span><span className={s.accent}>● ĐANG GỬI</span></div>
                <div id="lp-term" className={`${s.mono} ${s.termBody}`} data-line={s.termLine} />
              </div>
              <div id="lp-chips" className={s.chips} data-chip={`${s.mono} ${s.chip}`} data-chip-on={s.chipOn} data-chip-dot={s.chipDot} />
            </div>
          </div>
        </section>

        <section id="tham-gia" data-ch="5" className={s.secEnd}>
          <div className={`${s.wrap} lp-reveal`}>
            <Eyebrow n="05" name="TRỞ VỀ" center />
            <h2 className={`${s.disp} ${s.h2End}`}>Chạy xa hơn.<br /><span className={s.accent}>Có người biết.</span></h2>
            <div className={s.watchEnd}>
              <svg role="img" aria-label="Đồng hồ chạy Seize Guard ở chế độ đang theo dõi" viewBox="0 0 280 340" className={s.watchSvgEnd}>
                <WatchCase>
                  <text x="140" y="136" textAnchor="middle" {...mono("● ĐANG THEO DÕI")} fontSize="10" fill="var(--accent)" letterSpacing="2" />
                  <text x="140" y="186" textAnchor="middle" className={s.disp} fontSize="56" fill="var(--text)">05:42</text>
                  <line x1="104" y1="204" x2="176" y2="204" stroke="var(--border)" strokeWidth="1" />
                  <text x="140" y="222" textAnchor="middle" {...mono("NT 72 · MỌI THỨ ỔN")} fontSize="9" fill="var(--text-muted)" letterSpacing="1" />
                </WatchCase>
              </svg>
            </div>
            <p className={`${s.body18} ${s.pCenter}`}>Seize Guard không giúp bạn chạy nhanh hơn. Nó giúp bạn yên tâm chạy tiếp, vì nếu điều tệ nhất xảy ra, người thân sẽ biết. Ứng dụng không thay thế dịch vụ cứu hộ (115), thiết bị vệ tinh hay đi theo nhóm.</p>

            <div id="thong-so" className={s.specs}>
              <div className={`${s.mono} ${s.specsLabel}`}>THÔNG SỐ</div>
              <div className={s.specGrid}>
                {[["YÊU CẦU", "Wear OS 5+"], ["ĐÃ THỬ TRÊN", "Giả lập"], ["THỜI LƯỢNG PIN", "Đang đo"], ["GIÁ", "Miễn phí beta"]].map(([k, v]) => (
                  <div key={k} className={s.spec}><span className={`${s.mono} ${s.specK}`}>{k}</span><span className={`${s.disp} ${s.specV}`}>{v}</span></div>
                ))}
              </div>
              <p className={`${s.mono} ${s.notes}`}>VỊ TRÍ CHỈ ĐỌC KHI CÓ SỰ CỐ · DỮ LIỆU SỨC KHỎE CHỈ THU SAU KHI BẠN ĐỒNG Ý · XUẤT VÀ XOÁ BẤT CỨ LÚC NÀO · BẢN ĐỒ TỰ VẬN HÀNH · CŨNG DÀNH CHO NGƯỜI CÓ TIỀN SỬ CO GIẬT</p>
            </div>

            <div className={s.ctaBox}>
              <div className={s.ctaL}>
                <h3 className={`${s.disp} ${s.ctaH}`}>Tham gia beta</h3>
                <p className={s.ctaP}>Giá <strong>miễn phí</strong> trong giai đoạn beta. Cần đồng hồ <strong>Wear OS 5 trở lên</strong>.</p>
              </div>
              <div className={s.ctaR}>
                <span className={`${s.mono} ${s.specK}`}>ĐĂNG KÝ QUA BIỂU MẪU</span>
                <a href={waitlistHref} className={s.ctaBtn} {...ext}>Tham gia danh sách chờ ↗</a>
                <span className={s.ctaNote}>Chúng tôi chỉ gửi email khi bản beta sẵn sàng cho đồng hồ của bạn.</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className={s.footer}>
        <div className={`${s.wrap} ${s.footerInner}`}>
          <div className={`${s.mono} ${s.credits}`}>
            <span>ĐẠO DIỄN <b>BẠN</b></span><span>BỐI CẢNH <b>ĐƯỜNG MÒN</b></span><span>ÂM THANH <b>IM LẶNG</b></span><span>NGƯỜI NGHE <b className={s.accent}>NGƯỜI THÂN</b></span>
          </div>
          <div className={`${s.disp} ${s.footMark}`}>Seize Guard</div>
          <div className={s.footLinks}>
            <span>© 2026 Seize Guard</span>
            <Link href="/privacy">Chính sách quyền riêng tư</Link>
            {contactEmail && <a href={`mailto:${contactEmail}`}>Liên hệ</a>}
            <Link href="/login">Đăng nhập</Link>
          </div>
          <p className={s.disclaimer}>Bản beta. Ứng dụng hỗ trợ cảnh báo, không thay thế thiết bị y tế, dịch vụ cứu hộ hay chẩn đoán của bác sĩ. Trong tình huống khẩn cấp, hãy gọi 115.</p>
        </div>
      </footer>
    </div>
  );
}
