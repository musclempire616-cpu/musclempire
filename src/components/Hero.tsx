import { motion, useScroll, useTransform, useMotionValue } from "framer-motion";
import heroBg from "@/assets/images/hero-bg.png";

export default function Hero() {
  const { scrollY } = useScroll();
  const fadeOut = useTransform(scrollY, [0, 360], [1, 0]);
  const slideUp = useTransform(scrollY, [0, 360], [0, -28]);

  /* mouse follow for CTA glow */
  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  const goto = (id: string) => {
    const el = document.querySelector(id);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 76, behavior: "smooth" });
  };

  return (
    <section id="home" className="relative min-h-[100dvh] overflow-hidden bg-[#0B0B0B]">

      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 z-10"
          style={{ background:"linear-gradient(to right,rgba(11,11,11,0.85) 0%,rgba(11,11,11,0.35) 50%,rgba(11,11,11,0.10) 100%)" }}/>
        <div className="absolute inset-0 z-10"
          style={{ background:"linear-gradient(to top,rgba(11,11,11,1) 0%,transparent 55%)" }}/>
        <img src={heroBg} alt="Muscle Empire" fetchPriority="high"
          className="absolute inset-0 w-full h-full object-cover object-center"/>
      </div>
      <div className="absolute bottom-0 left-0 w-[340px] h-[170px] pointer-events-none z-[5]"
        style={{ background:"radial-gradient(ellipse,rgba(232,168,32,0.07) 0%,transparent 70%)" }}/>

      {/* Content */}
      <motion.div className="relative z-20 w-full min-h-[100dvh] flex flex-col"
        style={{ opacity:fadeOut, y:slideUp }}>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[38%_62%]
                        max-w-[1440px] mx-auto w-full
                        px-5 sm:px-8 md:px-10 lg:px-14
                        pt-[100px] sm:pt-[112px] pb-10
                        gap-y-10 lg:gap-y-0">

          {/* LEFT — bottom aligned */}
          <div className="order-2 lg:order-1 flex flex-col justify-end gap-5 lg:pr-8 lg:pb-14">
            <motion.div initial={{ opacity:0,y:14 }} animate={{ opacity:1,y:0 }}
              transition={{ delay:0.3, duration:0.6, ease:[0.16,1,0.3,1] }}
              className="inline-flex items-center gap-2 self-start px-4 py-1.5 rounded-full border border-white/[0.12] backdrop-blur-md"
              style={{ background:"rgba(255,255,255,0.06)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#E8A820] animate-pulse"/>
              <span className="text-[#E8A820] text-[11px] font-bold uppercase tracking-[0.18em]">
                Ghatkopar's elite arena
              </span>
            </motion.div>

            <motion.p initial={{ opacity:0,y:14 }} animate={{ opacity:1,y:0 }}
              transition={{ delay:0.4, duration:0.65, ease:[0.16,1,0.3,1] }}
              className="text-white/72 leading-[1.7] max-w-[290px]"
              style={{ fontSize:"clamp(0.86rem,1.6vw,0.97rem)" }}>
              A space built for{" "}
              <span className="text-white font-semibold">serious training</span>,{" "}
              <span className="text-white font-semibold">real transformation</span>, and a community that pushes each other to rise higher every single day.
            </motion.p>

            <motion.div initial={{ opacity:0,y:16,scale:0.96 }} animate={{ opacity:1,y:0,scale:1 }}
              transition={{ delay:0.5, duration:0.65, ease:[0.16,1,0.3,1] }}
              whileHover={{ y:-3, scale:1.02 }}
              className="self-start rounded-[32px] px-5 py-3 flex items-center gap-3 cursor-default"
              style={{
                background:"rgba(255,255,255,0.07)",
                backdropFilter:"blur(18px)", WebkitBackdropFilter:"blur(18px)",
                border:"1px solid rgba(255,255,255,0.13)",
                boxShadow:"0 6px 24px rgba(0,0,0,0.28)",
              }}>
              <div>
                <p className="text-white font-black text-[0.9rem] leading-tight">5k+ Members</p>
                <div className="flex gap-0.5 mt-0.5">
                  {Array.from({length:5}).map((_,i)=>(
                    <svg key={i} width="11" height="11" viewBox="0 0 24 24" fill="#E8A820">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          {/* RIGHT — headline with varied sizes + CTA at bottom */}
          <div className="order-1 lg:order-2 flex flex-col justify-end gap-8 lg:pb-10 overflow-hidden">
            <motion.div
              initial={{ opacity:0,y:32 }} animate={{ opacity:1,y:0 }}
              transition={{ delay:0.08, duration:0.9, ease:[0.16,1,0.3,1] }}
              className="font-display font-black uppercase text-left leading-[1.05] w-full"
              /* Clamp: min 2rem ensures "TRANSFORM" fits on narrowest mobile (320px) */
              style={{ letterSpacing:"-0.02em" }}
            >
              {/* TRANSFORM — hard cap so it never overflows */}
              <div className="text-white overflow-hidden" style={{ fontSize:"clamp(2.2rem,6vw,4.5rem)", lineHeight:1.05 }}>
                Transform
              </div>
              {/* YOUR BODY. — gold */}
              <div style={{
                fontSize:"clamp(2rem,5.5vw,3.9rem)", lineHeight:1.05,
                background:"linear-gradient(135deg,#E8A820,#FF9500)",
                WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
              }}>
                your body.
              </div>
              {/* ELEVATE */}
              <div className="text-white mt-2" style={{ fontSize:"clamp(2.1rem,5.8vw,4.2rem)", lineHeight:1.05 }}>
                Elevate
              </div>
              {/* YOUR LIFE. */}
              <div style={{ fontSize:"clamp(1.8rem,5vw,3.6rem)", lineHeight:1.05, color:"rgba(255,255,255,0.68)" }}>
                your life.
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

    </section>
  );
}
