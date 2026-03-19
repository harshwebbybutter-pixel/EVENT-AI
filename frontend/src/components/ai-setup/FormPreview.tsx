// src/components/ai-setup/FormPreview.tsx
import { RegistrationForm } from "@/lib/types";

export function FormPreview({ form }: { form: RegistrationForm }) {
  const fields = form.schema.pages[0]?.fields || [];
  
  return (
    <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold text-[#1B4F72]">Registration Form</h3>
        <button className="text-sm text-[#F5A623] font-semibold hover:underline">Edit</button>
      </div>
      <p className="text-sm text-gray-500 mb-3">{fields.length} Fields Configured</p>
      <ul className="space-y-2">
        {fields.map((field) => (
          <li key={field.field_id} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 p-2 rounded">
            <span className="w-4 text-center">{field.ai_generated ? "✨" : "•"}</span>
            <span className="font-medium">{field.label}</span>
            <span className="text-xs text-gray-400 ml-auto bg-gray-200 px-2 py-1 rounded capitalize">{field.type}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}