import { motion } from 'framer-motion';
import { AIME_VISUALS, getAssetUrl } from '@/lib/assets';

export function ConceptSection() {
  return (
    <section className="w-full py-32 md:py-48 bg-background relative overflow-hidden flex items-center justify-center">
      {/* Abstract blurred background element */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-foreground/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="space-y-12"
        >
          <div className="w-16 h-[1px] bg-foreground/30 mx-auto" />
          
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-display font-light text-foreground leading-tight text-balance">
            Choisissez un sujet, <br />
            <span className="italic text-foreground/60">puis avancez une question à la fois.</span>
          </h2>
          
          <p className="text-foreground/50 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            AIME vous aide à organiser votre projet et à trouver les bonnes personnes et les bons lieux. Choisissez un sujet, puis répondez à une question à la fois.
          </p>
          
          <div className="w-16 h-[1px] bg-foreground/30 mx-auto" />
        </motion.div>
      </div>
      
      {/* Decorative side images (Parallax effect if we wanted, but static absolute for now) */}
      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1.5 }}
        className="absolute left-[-10%] top-[20%] w-[30vw] h-[40vh] overflow-hidden bg-cover bg-center rounded-3xl -rotate-6"
        style={{ backgroundImage: `url(${getAssetUrl(AIME_VISUALS.concept.leftImage)})` }}
      ><div className="absolute inset-0 bg-background/85" /></motion.div>
      
      <motion.div 
        initial={{ opacity: 0, x: 50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1.5, delay: 0.2 }}
        className="absolute right-[-10%] bottom-[10%] w-[25vw] h-[45vh] overflow-hidden bg-cover bg-center rounded-3xl rotate-3"
        style={{ backgroundImage: `url(${getAssetUrl(AIME_VISUALS.concept.rightImage)})` }}
      ><div className="absolute inset-0 bg-background/85" /></motion.div>
    </section>
  );
}
