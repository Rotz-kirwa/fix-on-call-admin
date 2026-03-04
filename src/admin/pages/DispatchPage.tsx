import { MapPinned } from "lucide-react";

const DispatchPage = () => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="font-bold text-slate-900 mb-2">Dispatch</h2>
      <p className="text-sm text-slate-600 mb-4">
        This module now uses live request controls from the Requests page. No local seeded dispatch queue is used.
      </p>
      <div className="relative h-[420px] overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800">
        <iframe
          title="Nairobi dispatch map"
          src="https://maps.google.com/maps?q=-1.286389,36.817223&z=12&output=embed"
          className="absolute inset-0 w-full h-full opacity-85"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <div className="absolute bottom-3 left-3 text-xs rounded-lg border border-slate-300 bg-white/90 px-2 py-1 text-slate-800">
          <MapPinned className="w-3 h-3 inline mr-1" />
          Live Nairobi view
        </div>
      </div>
    </div>
  );
};

export default DispatchPage;
