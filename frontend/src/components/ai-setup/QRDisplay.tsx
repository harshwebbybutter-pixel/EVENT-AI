// src/components/ai-setup/QRDisplay.tsx
export function QRDisplay({ link, onReset }: { link: any, onReset: () => void }) {
  return (
    <div className="max-w-2xl mx-auto bg-white p-10 rounded-2xl shadow-xl border border-gray-100 text-center animate-in zoom-in duration-500">
      <div className="text-5xl mb-4">🎉</div>
      <h2 className="text-3xl font-bold text-[#1B4F72] mb-2">Event Published!</h2>
      <p className="text-gray-600 mb-8">Your event is live and ready to accept registrations.</p>
      
      <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-8 inline-block">
        <img src={link.qr_code_url} alt="Registration QR Code" className="w-48 h-48 mx-auto mb-4 bg-white p-2 rounded-lg shadow-sm" />
        <p className="font-mono text-sm text-gray-500 mb-2">Short Code: {link.short_code}</p>
        <a href={link.url} target="_blank" rel="noreferrer" className="text-[#F5A623] font-bold hover:underline break-all">
          {link.url}
        </a>
      </div>

      <div>
        <button onClick={onReset} className="px-6 py-3 border-2 border-[#1B4F72] text-[#1B4F72] rounded-lg font-bold hover:bg-gray-50 transition-colors">
          Create Another Event
        </button>
      </div>
    </div>
  );
}