// src/components/ai-setup/TicketPreview.tsx
import { useState } from "react";
import { Ticket } from "@/lib/types";

const formatPrice = (price: number) =>
  price === 0 ? "FREE" : `₹${price.toLocaleString("en-IN")}`;

export function TicketPreview({ tickets, onUpdate }: { tickets: Ticket[], onUpdate?: (t: Ticket[]) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTickets, setEditedTickets] = useState<Ticket[]>(tickets);

  const handleSave = () => {
    setIsEditing(false);
    if (onUpdate) onUpdate(editedTickets);
  };

  const updateTicket = (index: number, field: keyof Ticket, value: string | number) => {
    const newTickets = [...editedTickets];
    newTickets[index] = { ...newTickets[index], [field]: value };
    setEditedTickets(newTickets);
  };

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-[#F5A623]"></div>

      <div className="flex justify-between items-start mb-4 mt-2">
        <h3 className="text-xl font-bold text-[#1B4F72]">Tickets ({editedTickets.length})</h3>
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

      <div className="space-y-3">
        {editedTickets.map((ticket, idx) => (
          <div key={idx} className="p-3 border border-gray-100 bg-gray-50 rounded-lg flex justify-between items-center gap-4">
            {!isEditing ? (
              <>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{ticket.name}</p>
                  <p className="text-xs text-gray-500 capitalize">
                    {ticket.user_type} • {ticket.ai_rationale?.substring(0, 40)}...
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[#1B4F72] text-lg">{formatPrice(ticket.price)}</p>
                </div>
              </>
            ) : (
              <>
                <div className="flex-1">
                  <input
                    type="text"
                    value={ticket.name}
                    onChange={(e) => updateTicket(idx, "name", e.target.value)}
                    className="w-full p-1 border rounded text-sm mb-1 text-gray-900 font-medium focus:ring-1 focus:ring-[#F5A623] outline-none"
                  />
                </div>
                <div className="w-32 flex items-center gap-1">
                  <span className="text-gray-500 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    value={ticket.price}
                    onChange={(e) => updateTicket(idx, "price", parseFloat(e.target.value) || 0)}
                    className="w-full p-1 border rounded text-sm text-gray-900 font-bold focus:ring-1 focus:ring-[#F5A623] outline-none"
                  />
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
