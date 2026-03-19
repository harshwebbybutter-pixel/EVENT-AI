// src/components/ai-setup/EventPreview.tsx
import { useState } from "react";
import { Event } from "@/lib/types";

// We add an onUpdate prop so the card can send data back to the main page
export function EventPreview({ event, onUpdate }: { event: Event, onUpdate?: (e: Event) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedEvent, setEditedEvent] = useState<Event>(event);

  const handleSave = () => {
    setIsEditing(false);
    if (onUpdate) onUpdate(editedEvent); // Send updated data back up!
  };

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm relative overflow-hidden">
      {/* Decorative top border */}
      <div className="absolute top-0 left-0 w-full h-1 bg-[#1B4F72]"></div>

      <div className="flex justify-between items-start mb-4 mt-2">
        <h3 className="text-xl font-bold text-[#1B4F72]">Event Details</h3>
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
        <div className="space-y-4 text-gray-700">
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Event Name</p>
            <p className="font-semibold text-gray-900 text-lg">{editedEvent.name}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Dates</p>
              <p className="font-medium text-gray-900">{editedEvent.start_date} <span className="text-gray-400 text-sm mx-1">to</span> {editedEvent.end_date}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Location</p>
              <p className="font-medium text-gray-900">{editedEvent.city}, {editedEvent.country}</p>
            </div>
          </div>
        </div>
      ) : (
        // EDIT MODE
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Event Name</label>
            <input 
              type="text" 
              value={editedEvent.name}
              onChange={(e) => setEditedEvent({...editedEvent, name: e.target.value})}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-[#F5A623] outline-none text-gray-900"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Start Date</label>
              <input 
                type="date" 
                value={editedEvent.start_date}
                onChange={(e) => setEditedEvent({...editedEvent, start_date: e.target.value})}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-[#F5A623] outline-none text-gray-900"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">City</label>
              <input 
                type="text" 
                value={editedEvent.city}
                onChange={(e) => setEditedEvent({...editedEvent, city: e.target.value})}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-[#F5A623] outline-none text-gray-900"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}