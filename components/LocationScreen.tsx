
import React, { useState, useMemo } from 'react';
import { 
  MapPin, 
  X, 
  Plus, 
  Check, 
  ArrowLeft,
  Search,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ALL_LOCATIONS = [
  "Agonda Beach", "Airport Taxi Counter", "Amboli Falls", "Anjuna Beach", "Anjuna Flea Market", "Apollo Victor Hospital (Margao)", "Arpora Nightlife Zone", "Arossim Beach", "Arossim Quiet Resorts", "Arvalem Falls", "Ashwem Beach", "Assagao Luxury Villas", "Axis Bank (Panjim, Porvorim, Margao)", "Baga Beach", "Baga Nightlife Zone", "Baga Water Sports Hub", "Bank of Baroda (Panjim, Margao, Vasco)", "Bambolim Beach", "Betalbatim Beach", "Betalbatim Beach Hotels", "Betim Ferry Point", "Big Bazaar Complex (Vasco)", "Bicholim", "Bogmalo Beach", "Bondla Wildlife Sanctuary", "Butterfly Beach", "Butterfly Conservatory of Goa", "Cab de Rama Beach", "Cab de Rama Fort (Canacona)", "Calangute Beach", "Calangute Tourist Hub", "Calangute Water Sports Zone", "Calangute-Baga Hotel Belt", "Calangute-Baga Stretch", "Canara Bank (Panjim, Margao)", "Canacona", "Canacona Railway Station", "Candolim Beach", "Candolim Water Activities", "Candolim-Sinquerim Hotel Zone", "Candolim-Sinquerim Belt", "Cansaulim Beach", "Cansaulim Airport Proximity Hotels", "Carmel College for Women (Nuvem)", "Caranzalem", "Caranzalem Beach", "Castle Rock Railway Station", "Cavelossim Beach", "Cavelossim Luxury Zone", "Cazaulim Industrial Area", "Chapora Beach", "Chapora Fort (Vagator)", "Chaudi", "Chorao Island", "Church of St. Cajetan (Old Goa)", "Church of St. Francis of Assisi (Old Goa)", "City Centre Mall (Margao)", "Colva Beach", "Colva-Benaulim Resort Belt", "Colva-Benaulim Stretch", "Corjuem Fort", "Corlim", "Corlim Industrial Estate", "Cortalim", "Cortalim Industrial Area", "Cotigao Wildlife Sanctuary", "Curchorem", "Curchorem Bus Stand", "Curtorim", "DMart (Porvorim, Margao)", "Dabolim Airport", "Divar Island", "Divine Mercy Hospital (Panjim)", "Don Bosco High School (Panjim)", "Dona Paula Beach", "Dona Paula Scenic Viewpoint", "Dr. Salim Ali Bird Sanctuary", "Dudhsagar Falls", "Dudhsagar Falls Entry Point", "Eagle House (Old Goa)", "ELCOT IT Park (Panjim)", "Eye Care Center (Panjim)", "Federal Bank (Panjim, Margao)", "Fire Station (Panjim, Margao, Vasco)", "Fontainhas (Latin Quarter)", "Fort Aguada (Sinquerim)", "Fr. Agnel School (Verna)", "Galgibaga Beach", "Galgibaga Turtle Beach", "GCA Business Hub (Panjim)", "Goa College of Engineering (Farmagudi)", "Goa College of Music (Panjim)", "Goa College of Pharmacy (Panjim)", "Goa International Airport (Dabolim)", "Goa Legislative Assembly (Porvorim)", "Goa Medical College (Bambolim)", "Goa Medical College Hospital (Bambolim)", "Goa University (Taleigao)", "Government College of Arts & Science (Khandola)", "Healthway Hospital (Vasco)", "Hilltop Flea Market (Vagator)", "Hollant Beach", "Holy Spirit Hospital (Margao)", "Hosmat Hospital (Panjim)", "ICICI Bank (Panjim, Margao, Vasco)", "IDBI Bank (Panjim, Vasco)", "Income Tax Office (Panjim)", "Indian Institute of Hotel Management (Porvorim)", "Ingo's Saturday Night Market", "Kakolem Beach (Tiger Beach)", "Karmali Railway Station (Old Goa)", "Keri Beach", "Kotak Mahindra Bank (Panjim, Margao)", "Kundaim Industrial Estate", "Kuskem Falls", "Lifeline Hospital (Panjim)", "Loutolim Industrial Area", "Mackie's Night Bazaar (Arpora)", "Madgaon Railway Station (Margao)", "Madgaon/Margao", "Mahatma Gandhi Market (Panjim)", "Majorda Beach", "Majorda Family Resorts", "Malim Jetty", "Mall De Goa (Porvorim)", "Manohar International Airport (Mopa)", "Mapusa", "Mapusa Bus Stand", "Mapusa Commercial Hub", "Mapusa Friday Market", "Margao Bus Stand", "Margao Commercial District", "Margao Commercial Hub", "Margao Municipal Market", "Marina Hospital (Dona Paula)", "Merces", "Miramar Beach", "Mobor Beach", "Mobor Water Sports Center", "Mobor-Canacona Hotel Strip", "Mollem National Park", "Morjim Beach", "Morjim-Ashwem Resort Strip", "Mount Mary Convent High School (Chinchinim)", "Nagoa", "Nanuz Fort", "National Institute of Technology Goa (Farmagudi)", "Navelim", "Netravali Bubble Lake", "Nehru Hospital (Margao)", "Nerul", "Nerul Riverside Hotels", "Old Goa", "Old Goa Ferry Point", "Orlim", "Ozran Beach (Little Vagator)", "Ozran Hotel Area", "Palolem Beach", "Palolem Kayaking Zone", "Palolem-Patnem Eco-Resort Area", "Panaji/Panjim - Capital", "Panjim Bus Stand (Kadamba)", "Panjim Business District", "Panjim Main Market", "Panjim Taxi Stand", "Panjim Ferry Point (to Chorao)", "Parvatibai Chowgule College (Margao)", "Passport Office (Panjim)", "Patnem Beach", "Patnem Yoga Zone", "Pernem", "Pernem Railway Station", "Pilerne", "Pilerne Industrial Estate", "Ponda", "Ponda Bus Stand", "Ponda Commercial Hub", "Ponda Fort", "Ponda Spice Plantations", "Police Headquarters (Panjim)", "Pole Pole Beach", "Porvorim", "Porvorim IT Park", "Post Office (Main - Panjim, Margao)", "Punjab National Bank (Panjim, Margao)", "Quepem", "Quepem Heritage Town", "Raia", "Railway Station Taxi Counters", "Raj Bhavan (Panjim)", "Reis Magos Fort (Bardez)", "Reliance Mall (Margao)", "Ribander Ferry Point", "Rosary College (Navelim)", "RT Office (Panjim, Margao, Vasco)", "Salim Ali Bird Sanctuary (Chorao Island)", "Sancoale Industrial Zone", "Sanquelim", "Sanvordem", "Sanvordem Railway Station", "Saturday Night Market (Arpora)", "Secretariat (Panjim)", "Se Cathedral (Old Goa)", "Sernabatim Beach", "Sernabatim Beach Hotels", "Sharada Mandir School (Miramar)", "Shoppers Stop (Porvorim)", "Siolim", "Siolim Boutique Hotels", "Sinquerim Beach", "Sinquerim Parasailing Zone", "Society of Jesus Church (Old Goa)", "Spice Plantation Tour Centers", "St. Cruz", "St. Estevam Island", "St. Xavier's College (Mapusa)", "State Bank of India (Panjim, Margao, Vasco)", "Taleigao", "Terekhol Fort (Keri)", "Tibetan Market (Anjuna)", "Valpoi", "Valpoi Bus Stand", "Vanxim Island", "Varca Beach", "Varca-Cavelossim Luxury Zone", "Vasco da Gama", "Vasco Bus Stand", "Vasco Commercial Center", "Vasco da Gama Railway Station", "Velsao Beach", "Victor Hospital (Margao)", "Vidya Prabodhini Parivar School (Porvorim)", "Wockhardt Hospital (Margao)"
];

interface LocationScreenProps {
  onComplete: (locations: string[]) => void;
  onBack: () => void;
}

const LocationScreen: React.FC<LocationScreenProps> = ({ onComplete, onBack }) => {
  const [selectedLocations, setSelectedLocations] = useState<string[]>([
    "Dabolim Airport",
    "Calangute Beach",
    "Baga Beach"
  ]);

  const handleComplete = () => {
    onComplete(selectedLocations);
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const filteredLocations = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return ALL_LOCATIONS.filter(loc => 
      loc.toLowerCase().includes(searchQuery.toLowerCase()) && 
      !selectedLocations.includes(loc) &&
      loc !== "Panjim"
    ).slice(0, 6);
  }, [searchQuery, selectedLocations]);

  const addLocation = (loc: string) => {
    if (!selectedLocations.includes(loc)) {
      setSelectedLocations([...selectedLocations, loc]);
    }
    setSearchQuery('');
    setIsDropdownOpen(false);
  };

  const removeLocation = (loc: string) => {
    setSelectedLocations(selectedLocations.filter(item => item !== loc));
  };

  return (
    <div className="min-h-screen bg-[#D3D2EC] flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] w-full max-w-[680px] overflow-hidden p-8 md:p-12">
        
        {/* Progress Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-[#6360DF] rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xs">G</span>
            </div>
            <span className="text-xl font-bold text-[#151a3c]">GaadiZai</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-[10px] font-bold text-[#6360DF] tracking-widest uppercase">
              Step 3 of 3
            </span>
            <div className="flex space-x-1.5">
              <div className="w-6 h-1 bg-[#d1d0eb] rounded-full"></div>
              <div className="w-6 h-1 bg-[#d1d0eb] rounded-full"></div>
              <div className="w-6 h-1 bg-[#6360DF] rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Title Section */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-[#151a3c] mb-2 tracking-tight">Where do you operate?</h1>
          <p className="text-[#6c7e96] text-sm leading-relaxed">
            Select the additional service areas for your fleet pickup and drops.
          </p>
        </div>

        {/* Primary Base Location */}
        <div className="mb-8">
          <label className="text-[10px] font-bold text-[#6c7e96] tracking-widest uppercase mb-3 block">
            Primary Base Location
          </label>
          <div className="bg-[#f8fafc] border border-[#f1f5f9] rounded-2xl p-4 md:p-5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-[#6360DF]/10 p-2 rounded-lg">
                <MapPin size={18} className="text-[#6360DF]" />
              </div>
              <span className="font-bold text-[#151a3c] text-base">Panjim</span>
            </div>
            <span className="bg-[#EEEDFA] text-[#6360DF] text-[10px] font-bold tracking-widest px-3 py-1 rounded-md uppercase">
              Default
            </span>
          </div>
        </div>

        {/* Operational Service Areas */}
        <div className="mb-10 relative">
          <label className="text-[10px] font-bold text-[#6c7e96] tracking-widest uppercase mb-3 block">
            Operational Service Areas
          </label>
          
          <div className="bg-white border border-[#d1d0eb] rounded-2xl p-3 min-h-[140px] focus-within:ring-2 focus-within:ring-[#6360DF]/10 focus-within:border-[#6360DF] transition-all">
            {/* Tags Container */}
            <div className="flex flex-wrap gap-2 p-1">
              <AnimatePresence>
                {selectedLocations.map((loc) => (
                  <motion.div
                    key={loc}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="bg-[#EEEDFA] text-[#6360DF] px-4 py-2 rounded-xl flex items-center space-x-2 text-sm font-semibold"
                  >
                    <span>{loc}</span>
                    <button 
                      onClick={() => removeLocation(loc)}
                      className="hover:bg-[#6360DF]/10 rounded-full p-0.5 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {/* Search Input */}
              <div className="flex-1 min-w-[150px] relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  placeholder="Search and add locations..."
                  className="w-full py-2 px-2 text-[#151a3c] placeholder:text-[#cbd5e1] outline-none bg-transparent"
                />
              </div>
            </div>
          </div>

          {/* Suggestions Dropdown */}
          <AnimatePresence>
            {isDropdownOpen && searchQuery.trim().length > 0 && filteredLocations.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-20 left-0 right-0 mt-2 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-[#f1f5f9] overflow-hidden max-h-[300px] overflow-y-auto"
              >
                {filteredLocations.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => addLocation(loc)}
                    className="w-full text-left px-6 py-4 hover:bg-[#f8fafc] transition-colors flex items-center justify-between group border-b border-[#f8fafc] last:border-0"
                  >
                    <div className="flex items-center space-x-3">
                      <MapPin size={16} className="text-[#cbd5e1] group-hover:text-[#6360DF]" />
                      <span className="text-[#151a3c] font-medium">{loc}</span>
                    </div>
                    <Plus size={18} className="text-[#6360DF] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Static list suggestion items (like in image) */}
          <div className="mt-4 border border-[#f1f5f9] rounded-2xl overflow-hidden divide-y divide-[#f8fafc]">
             {["Manohar International Airport (Mopa)", "Madgaon Railway Station", "Candolim Beach"].map(loc => (
                <div key={loc} className="px-6 py-4 flex items-center justify-between">
                   <span className="text-sm font-medium text-[#6c7e96]">{loc}</span>
                   <button 
                     onClick={() => addLocation(loc)}
                     className={`p-1 rounded-full ${selectedLocations.includes(loc) ? 'text-[#6360DF] bg-[#EEEDFA]' : 'text-[#cbd5e1] hover:text-[#6360DF]'}`}
                   >
                     {selectedLocations.includes(loc) ? <Check size={16} /> : <Plus size={18} />}
                   </button>
                </div>
             ))}
             <div className="px-6 py-4 flex items-center justify-between bg-[#f8fafc] border-l-2 border-[#6360DF]">
                <span className="text-sm font-semibold text-[#6360DF]">Anjuna Beach</span>
                <CheckCircle2 size={18} className="text-[#6360DF]" />
             </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-[#f1f5f9]">
          <button 
            onClick={onBack}
            className="flex items-center space-x-2 text-[#6c7e96] text-sm font-bold hover:text-[#151a3c] transition-colors"
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>
          <button 
            onClick={handleComplete}
            className="bg-[#6360DF] hover:bg-[#5451d0] text-white font-bold py-4 px-10 rounded-2xl shadow-[0_6px_20px_rgba(99,96,223,0.3)] transition-all active:scale-[0.98] flex items-center space-x-3 group"
          >
            <span className="text-base tracking-wide">Complete Setup</span>
            <Check size={20} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationScreen;
