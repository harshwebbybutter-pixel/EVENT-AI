// src/components/ai-setup/PublishButton.tsx
export function PublishButton({ onClick, isPublishing }: { onClick: () => void, isPublishing: boolean }) {
  return (
    <div className="flex justify-center pt-6 pb-12">
      <button 
        onClick={onClick}
        disabled={isPublishing}
        className="px-10 py-4 bg-[#F5A623] text-white rounded-xl font-bold text-lg hover:bg-[#d98f1b] shadow-lg disabled:opacity-50 transition-all flex items-center gap-2"
      >
        {isPublishing ? "Saving to Database..." : "Looks Good, Save & Publish 🚀"}
      </button>
    </div>
  );
}