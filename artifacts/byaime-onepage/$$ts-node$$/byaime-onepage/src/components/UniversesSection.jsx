import { motion } from 'framer-motion';
import { getAssetUrl } from '@/lib/assets';
import { useAppStore } from '@/store/use-app-store';
import { cn } from '@/lib/utils';
const UNIVERSES = [
    { id: 'service', name: 'Service', image: 'visual-service-DXmeWatY.jpg' },
    { id: 'venue', name: 'Lieux', image: 'visual-venue-kJsZKZPp.jpg' },
    { id: 'food', name: 'Gastronomie', image: 'visual-food-BYGwGQGu.jpg' },
    { id: 'photo', name: 'Image', image: 'visual-photo-C-yKtlRN.jpg' },
    { id: 'beaute', name: 'Beauté', image: 'visual-beaute-DJ6SEguK.jpg' },
    { id: 'patrimoine', name: 'Patrimoine', image: 'visual-patrimoine-DHVLBfVK.jpg' },
    { id: 'hotel', name: 'Hôtellerie', image: 'visual-hotel-C8zQiMK2.jpg' },
    { id: 'people', name: 'Réseau', image: 'visual-people-Dc5ifsnr.jpg' },
    { id: 'institution', name: 'Institution', image: 'visual-institution-CuVWMxit.jpg' },
    { id: 'music', name: 'Musique', image: 'visual-music-BWv1eToA.jpg' },
    { id: 'event', name: 'Événement', image: 'visual-event-D_L9Q-iW.jpg' },
    { id: 'scene', name: 'Scène', image: 'visual-scene-CMVk_6wW.jpg' },
];
export function UniversesSection() {
    const { selectedUniverse, setSelectedUniverse } = useAppStore();
    return (<section id="universes" className="w-full py-32 bg-background relative z-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <h2 className="text-sm font-medium tracking-[0.2em] text-foreground/50 uppercase mb-4">
              Les univers
            </h2>
            <h3 className="text-4xl md:text-5xl font-display font-light text-foreground text-balance">
              Douze mondes,<br />un seul calendrier.
            </h3>
          </div>
          <div className="max-w-md text-foreground/60 text-sm md:text-base leading-relaxed">
            Chaque univers est une porte d'entrée vers des possibilités infinies. 
            Sélectionnez celui qui résonne avec votre projet pour commencer à tisser des liens.
          </div>
        </div>

        {/* Desktop Grid / Mobile Horizontal Scroll */}
        <div className="flex md:grid md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-x-auto md:overflow-visible pb-8 hide-scrollbar snap-x snap-mandatory">
          {UNIVERSES.map((universe, i) => {
            const isSelected = selectedUniverse === universe.name;
            return (<motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.6, delay: i * 0.05 }} key={universe.id} onClick={() => setSelectedUniverse(isSelected ? '' : universe.name)} className={cn("group relative min-w-[280px] md:min-w-0 h-[400px] rounded-xl overflow-hidden cursor-pointer snap-center flex-shrink-0 border transition-all duration-500", isSelected ? "border-border" : "border-foreground/10 hover:border-foreground/30")}>
                {/* Image Background */}
                <div className={cn("absolute inset-0 bg-cover bg-center transition-transform duration-1000", isSelected ? "scale-105" : "group-hover:scale-105")} style={{ backgroundImage: `url(${getAssetUrl(`images/${universe.image}`)})` }}/>
                
                {/* Overlays */}
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/25 transition-colors duration-500"/>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"/>
                
                {/* Content */}
                <div className="absolute inset-0 p-6 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-medium tracking-widest text-white/75">
                      0{i + 1}
                    </span>
                    <div className={cn("w-6 h-6 rounded-full border flex items-center justify-center transition-colors", isSelected ? "border-white bg-white text-black" : "border-white/35 text-transparent")}>
                      {isSelected && (<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>)}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-2xl font-display text-white group-hover:translate-x-2 transition-transform duration-300">
                      {universe.name}
                    </h4>
                  </div>
                </div>
              </motion.div>);
        })}
        </div>
      </div>
    </section>);
}
//# sourceMappingURL=UniversesSection.jsx.map