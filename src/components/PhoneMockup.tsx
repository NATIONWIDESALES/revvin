import { motion } from "framer-motion";
import { Signal, Wifi, Battery, Bell, Home, Thermometer, Car, ChevronRight, DollarSign } from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

// iOS system font stack
const iosFont = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif";

const StatusBar = () => (
  <div className="flex items-center justify-between px-4 pt-[14px]" style={{ fontFamily: iosFont }}>
    <span className="text-[13px] font-semibold text-black">9:41</span>
    <div className="flex items-center gap-1">
      <Signal className="h-[12px] w-[12px] text-black" />
      <Wifi className="h-[12px] w-[12px] text-black" />
      <Battery className="h-[12px] w-[12px] text-black" />
    </div>
  </div>
);

const HomeIndicator = () => (
  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[134px] h-[5px] rounded-full bg-black/20" />
);

const RevvinLogo = () => (
  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-white text-sm font-bold">
    R
  </div>
);

// Business Screen Content
const BusinessScreen = () => (
  <div className="flex flex-col h-full bg-white" style={{ fontFamily: iosFont }}>
    <StatusBar />
    
    {/* App Header */}
    <div className="flex items-center justify-between px-4 py-2 mt-4">
      <div className="flex items-center gap-2">
        <RevvinLogo />
        <span className="text-[15px] font-bold text-black">Revvin</span>
      </div>
      <div className="relative">
        <Bell className="h-4 w-4 text-primary" />
        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full flex items-center justify-center">
          <span className="text-[9px] text-white font-bold">3</span>
        </div>
      </div>
    </div>

    {/* Green Banner */}
    <div className="mx-4 mt-2 p-3 rounded-xl flex items-center justify-between" style={{ backgroundColor: '#F0FAF4' }}>
      <div className="flex items-center gap-2">
        <div className="relative">
          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
        </div>
        <span className="text-[12px] font-semibold text-primary">3 new leads today</span>
      </div>
      <ChevronRight className="h-3 w-3 text-primary" />
    </div>

    {/* Section Heading */}
    <div className="px-4 mt-3">
      <h2 className="text-[16px] font-bold text-black">Incoming Leads</h2>
      <p className="text-[11px] text-gray-500 mt-0.5">Tap to review and claim</p>
    </div>

    {/* Lead Cards */}
    <div className="flex-1 px-4 mt-4 space-y-3 overflow-hidden">
      {/* Card 1 */}
      <div className="bg-white rounded-xl p-3 relative" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div className="absolute top-3 right-3 px-2 py-0.5 rounded text-[10px] font-bold text-white bg-primary">NEW</div>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Home className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-black">Residential Roofing</p>
            <p className="text-[12px] text-gray-500 mt-0.5">Sarah M. — referred by James K.</p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <span className="text-[14px] font-bold text-primary">$500 payout</span>
          <button className="px-4 py-1.5 rounded-lg bg-primary text-white text-[12px] font-semibold">Review</button>
        </div>
      </div>

      {/* Card 2 */}
      <div className="bg-white rounded-xl p-3 relative" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div className="absolute top-3 right-3 px-2 py-0.5 rounded text-[10px] font-bold text-white bg-primary">NEW</div>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Thermometer className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-black">HVAC Installation</p>
            <p className="text-[12px] text-gray-500 mt-0.5">Mike T. — referred by Dana R.</p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <span className="text-[14px] font-bold text-primary">$350 payout</span>
          <button className="px-4 py-1.5 rounded-lg bg-primary text-white text-[12px] font-semibold">Review</button>
        </div>
      </div>

      {/* Card 3 */}
      <div className="bg-white rounded-xl p-3 relative" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div className="absolute top-3 right-3 px-2 py-0.5 rounded text-[10px] font-bold text-gray-500 bg-gray-200">PENDING</div>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
            <Car className="h-5 w-5 text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-black">Auto Detailing</p>
            <p className="text-[12px] text-gray-500 mt-0.5">Chris L. — referred by Alex P.</p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <span className="text-[14px] font-bold text-gray-400">$150 payout</span>
          <button className="px-4 py-1.5 rounded-lg bg-gray-200 text-gray-500 text-[12px] font-semibold">Reviewing</button>
        </div>
      </div>
    </div>

    <HomeIndicator />
  </div>
);

// Referrer Screen Content
const ReferrerScreen = () => (
  <div className="flex flex-col h-full bg-white" style={{ fontFamily: iosFont }}>
    <StatusBar />
    
    {/* App Header */}
    <div className="flex items-center justify-between px-4 py-3 mt-[46px]">
      <div className="flex items-center gap-2">
        <RevvinLogo />
        <span className="text-[17px] font-bold text-black">Revvin</span>
      </div>
      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
        <span className="text-[12px] text-white font-bold">JK</span>
      </div>
    </div>

    {/* Hero Earnings Block */}
    <div className="px-4 mt-6 text-center">
      <p className="text-[13px] font-medium text-gray-500">Total Earned</p>
      <p className="text-[42px] font-extrabold text-[#111111] mt-1">$2,340</p>
      <div className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full text-[12px] font-semibold text-primary" style={{ backgroundColor: '#DCFCE7' }}>
        <span>↑</span>
        <span>$500 this week</span>
      </div>
    </div>

    {/* Action Buttons */}
    <div className="flex gap-2 px-4 mt-6">
      <button className="flex-1 py-3 rounded-xl bg-primary text-white text-[14px] font-semibold">Withdraw</button>
      <button className="flex-1 py-3 rounded-xl border-2 border-primary text-primary text-[14px] font-semibold">Share Link</button>
    </div>

    {/* Recent Payouts Section */}
    <div className="px-4 mt-6">
      <h3 className="text-[16px] font-bold text-black">Recent Payouts</h3>
    </div>

    {/* Transaction Rows */}
    <div className="px-4 mt-3 space-y-0">
      {[
        { name: "Peak Roofing Co.", time: "Closed · 2 min ago", amount: "+$500" },
        { name: "Metro Insurance", time: "Closed · 1 day ago", amount: "+$450" },
        { name: "Sunrise HVAC", time: "Closed · 3 days ago", amount: "+$350" },
      ].map((tx, i) => (
        <div key={i} className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-b-0">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-black">{tx.name}</p>
            <p className="text-[12px] text-gray-500">{tx.time}</p>
          </div>
          <span className="text-[14px] font-bold text-primary">{tx.amount}</span>
        </div>
      ))}
    </div>

    {/* Progress Card */}
    <div className="mx-4 mt-4 p-4 rounded-xl" style={{ backgroundColor: '#F0FAF4' }}>
      <p className="text-[14px] font-bold text-black">6 referrals closed this month</p>
      <div className="mt-2 h-2 bg-primary/20 rounded-full overflow-hidden">
        <div className="h-full w-[60%] bg-primary rounded-full" />
      </div>
      <p className="text-[12px] text-gray-500 mt-2">4 more to hit your $500 bonus</p>
    </div>

    <div className="flex-1" />
    <HomeIndicator />
  </div>
);

// Phone Frame Component
interface PhoneFrameProps {
  children: React.ReactNode;
  rotation: number;
  zIndex: number;
  offsetX: number;
}

const PhoneFrame = ({ children, rotation, zIndex, offsetX }: PhoneFrameProps) => (
  <motion.div
    initial={{ opacity: 0, y: 60 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.9, ease }}
    className="relative"
    style={{
      width: 320,
      height: 693,
      transform: `rotate(${rotation}deg) translateX(${offsetX}px)`,
      zIndex,
    }}
  >
    {/* Outer Shell */}
    <div
      className="absolute inset-0"
      style={{
        backgroundColor: '#1A1A1A',
        borderRadius: 52,
        boxShadow: '0 32px 80px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.10)',
      }}
    >
      {/* Chamfer highlight */}
      <div
        className="absolute top-0 left-0 right-0"
        style={{
          height: 200,
          borderTopLeftRadius: 52,
          borderTopRightRadius: 52,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%)',
          pointerEvents: 'none',
        }}
      />

      {/* Side buttons - Left (volume) */}
      <div className="absolute -left-[2px] top-[140px] w-[3px] h-[32px] rounded-l-sm" style={{ backgroundColor: '#2A2A2A' }} />
      <div className="absolute -left-[2px] top-[180px] w-[3px] h-[32px] rounded-l-sm" style={{ backgroundColor: '#2A2A2A' }} />
      
      {/* Side button - Right (power) */}
      <div className="absolute -right-[2px] top-[160px] w-[3px] h-[48px] rounded-r-sm" style={{ backgroundColor: '#2A2A2A' }} />
    </div>

    {/* Screen Area */}
    <div
      className="absolute overflow-hidden bg-white"
      style={{
        top: 10,
        left: 10,
        right: 10,
        bottom: 10,
        borderRadius: 42,
      }}
    >
      {/* Dynamic Island */}
      <div
        className="absolute left-1/2 -translate-x-1/2 bg-black"
        style={{
          top: 12,
          width: 126,
          height: 34,
          borderRadius: 20,
          zIndex: 10,
        }}
      />

      {/* Screen Content */}
      <div className="absolute inset-0">
        {children}
      </div>
    </div>
  </motion.div>
);

// Main Component
interface PhoneMockupProps {
  variant: "business" | "referrer";
}

const PhoneMockup = ({ variant }: PhoneMockupProps) => {
  const isBusinessPhone = variant === "business";
  
  return (
    <PhoneFrame
      rotation={isBusinessPhone ? -4 : 4}
      zIndex={isBusinessPhone ? 10 : 5}
      offsetX={isBusinessPhone ? 12 : -12}
    >
      {isBusinessPhone ? <BusinessScreen /> : <ReferrerScreen />}
    </PhoneFrame>
  );
};

export default PhoneMockup;
