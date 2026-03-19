// src/components/ai-setup/EmailPreview.tsx
import { useState } from "react";
import { ConfirmationEmail } from "@/lib/types";

export function EmailPreview({ email, onUpdate }: { email: ConfirmationEmail, onUpdate?: (e: ConfirmationEmail) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedEmail, setEditedEmail] = useState<ConfirmationEmail>(email);

  const handleSave = () => {
    setIsEditing(false);
    if (onUpdate) onUpdate(editedEmail);
  };

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm relative overflow-hidden flex flex-col h-full">
      <div className="absolute top-0 left-0 w-full h-1 bg-[#1B4F72]"></div>
      
      <div className="flex justify-between items-start mb-4 mt-2">
        <h3 className="text-xl font-bold text-[#1B4F72]">Welcome Email</h3>
        {!isEditing ? (
          <button onClick={() => setIsEditing(true)} className="text-sm px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 text-[#1B4F72] font-semibold transition-colors">
            ✏️ Edit
          </button>
        ) : (
          <button onClick={handleSave} className="text-sm px-3 py-1 bg-green-100 rounded hover:bg-green-200 text-green-800 font-bold transition-colors">
            💾 Save
          </button>
        )}
      </div>

      {!isEditing ? (
        // VIEW MODE
        <>
          <div className="mb-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Subject</p>
            <p className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded border border-gray-100">{editedEmail.subject}</p>
          </div>
          <div className="flex-1 mt-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Body Preview</p>
            <div 
              className="text-sm text-gray-700 bg-gray-50 p-3 rounded h-32 overflow-y-auto border border-gray-100"
              dangerouslySetInnerHTML={{ __html: editedEmail.body_html }} 
            />
          </div>
        </>
      ) : (
        // EDIT MODE
        <div className="flex flex-col flex-1 space-y-3">
          <div>
            <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Subject</label>
            <input 
              type="text" 
              value={editedEmail.subject}
              onChange={(e) => setEditedEmail({...editedEmail, subject: e.target.value})}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-[#F5A623] outline-none text-gray-900 text-sm"
            />
          </div>
          <div className="flex-1 flex flex-col">
            <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Body HTML</label>
            <textarea 
              value={editedEmail.body_html}
              onChange={(e) => setEditedEmail({...editedEmail, body_html: e.target.value})}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-[#F5A623] outline-none text-gray-900 text-sm flex-1 resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}