import React, { useState } from "react";
import { DashboardNote } from "../types";
import { 
  Pin, Plus, Check, Trash2, Calendar, Tag, Search, 
  X, AlertCircle, Edit2, CheckSquare, Square, PinOff
} from "lucide-react";

interface NotesWidgetProps {
  notes: DashboardNote[];
  onAddNote: (note: Omit<DashboardNote, "id" | "createdAt">) => void;
  onUpdateNote: (id: string, updates: Partial<DashboardNote>) => void;
  onDeleteNote: (id: string) => void;
  onClose?: () => void;
}

export default function NotesWidget({
  notes,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onClose
}: NotesWidgetProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [isAdding, setIsAdding] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<DashboardNote["category"]>("General");
  const [reminderDate, setReminderDate] = useState("");
  const [isPinned, setIsPinned] = useState(false);

  const resetForm = () => {
    setTitle("");
    setContent("");
    setCategory("General");
    setReminderDate("");
    setIsPinned(false);
    setIsAdding(false);
    setEditingNoteId(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (editingNoteId) {
      onUpdateNote(editingNoteId, {
        title,
        content,
        category,
        reminderDate: reminderDate || undefined,
        isPinned
      });
    } else {
      onAddNote({
        title,
        content,
        category,
        reminderDate: reminderDate || undefined,
        isPinned,
        isCompleted: false
      });
    }
    resetForm();
  };

  const startEdit = (note: DashboardNote) => {
    setEditingNoteId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setCategory(note.category);
    setReminderDate(note.reminderDate || "");
    setIsPinned(note.isPinned);
    setIsAdding(true);
  };

  // Filter & Search Logic
  const filteredNotes = notes.filter(note => {
    const matchesSearch = 
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === "All" || note.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Sort: Pinned first, then incomplete, then creation date desc
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    if (a.isCompleted && !b.isCompleted) return 1;
    if (!a.isCompleted && b.isCompleted) return -1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const categories: Array<DashboardNote["category"] | "All"> = ["All", "General", "Follow-up", "Order", "Billing"];

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "Urgent":
      case "Follow-up":
        return "border-l-rose-500 bg-rose-500/10 text-rose-700";
      case "Order":
        return "border-l-primary bg-primary/10 text-primary-dark";
      case "Billing":
        return "border-l-primary-dark bg-primary-dark/10 text-primary-dark";
      default:
        return "border-l-amber-500 bg-amber-500/10 text-amber-700";
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden text-xs">
      {/* Header */}
      <div className="p-3 bg-card-soft/40 border-b border-border-sand/30 flex items-center justify-between rounded-t-2xl">
        <div className="flex items-center gap-2">
          <span className="text-base">📌</span>
          <h3 className="font-bold text-charcoal text-sm tracking-tight font-display">Notes & Reminders</h3>
          <span className="px-2 py-0.5 bg-primary/15 text-primary-dark rounded-full text-[10px] font-bold">
            {notes.filter(n => !n.isCompleted).length} active
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!isAdding && (
            <button 
              onClick={() => setIsAdding(true)} 
              className="flex items-center gap-1 px-2.5 py-1 bg-primary text-card-soft rounded-lg font-bold hover:bg-primary-dark transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Note
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="p-1 text-stone hover:text-charcoal">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Adding/Editing Form View */}
      {isAdding ? (
        <form onSubmit={handleSave} className="p-4 border-b border-border-sand/30 bg-card-soft/20 space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="font-bold text-charcoal">{editingNoteId ? "Modify Memo" : "Create New Memo"}</h4>
            <button 
              type="button" 
              onClick={resetForm} 
              className="text-stone hover:text-charcoal font-semibold"
            >
              Cancel
            </button>
          </div>
          
          <div className="space-y-2">
            <div>
              <label className="block text-[10px] font-bold text-stone uppercase mb-0.5">Title</label>
              <input 
                type="text" 
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g., Deliver steel batch" 
                className="w-full px-2.5 py-1.5 border border-border-sand rounded-lg focus:outline-none focus:ring-1 focus:ring-primary bg-card-soft/70 font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone uppercase mb-0.5">Details / Content</label>
              <textarea 
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Enter additional details, phone numbers, task criteria..." 
                className="w-full h-16 px-2.5 py-1.5 border border-border-sand rounded-lg focus:outline-none focus:ring-1 focus:ring-primary bg-card-soft/70 resize-none font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-stone uppercase mb-0.5">Category</label>
                <select 
                  value={category}
                  onChange={e => setCategory(e.target.value as any)}
                  className="w-full px-2 py-1 border border-border-sand rounded-lg bg-card-soft/70 focus:ring-primary"
                >
                  <option value="General">General (Amber)</option>
                  <option value="Follow-up">Follow-up / Urgent (Rose)</option>
                  <option value="Order">Order / Stock (Matcha)</option>
                  <option value="Billing">Billing (Dark Matcha)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone uppercase mb-0.5">Reminder Date</label>
                <input 
                  type="date" 
                  value={reminderDate}
                  onChange={e => setReminderDate(e.target.value)}
                  className="w-full px-2 py-1 border border-border-sand rounded-lg bg-card-soft/70 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input 
                type="checkbox" 
                id="isPinned" 
                checked={isPinned}
                onChange={e => setIsPinned(e.target.checked)}
                className="rounded border-border-sand text-primary focus:ring-primary"
              />
              <label htmlFor="isPinned" className="text-charcoal font-semibold cursor-pointer select-none">
                Pin to top of Dashboard Widget
              </label>
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full py-1.5 bg-primary hover:bg-primary-dark text-card-soft font-bold rounded-lg shadow-sm"
          >
            {editingNoteId ? "Apply Changes" : "Save Note"}
          </button>
        </form>
      ) : (
        /* Filters and Search Search */
        <div className="p-2 border-b border-border-sand/30 bg-card-soft/10 flex flex-col gap-1.5">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone/60" />
            <input 
              type="text" 
              placeholder="Search memo list..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1 bg-card-soft/40 border border-border-sand rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          {/* Categories Tab */}
          <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap border ${
                  activeCategory === cat 
                    ? "bg-primary text-card-soft border-primary" 
                    : "bg-card-soft/50 text-stone border-border-sand hover:bg-card-soft/80"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[300px] md:max-h-[400px]">
        {sortedNotes.length === 0 ? (
          <div className="text-center py-8 text-stone flex flex-col items-center justify-center gap-1">
            <AlertCircle className="w-5 h-5 text-stone/40" />
            <p className="font-semibold">No active notes found</p>
            <p className="text-[10px]">Create a note to keep track of reminders.</p>
          </div>
        ) : (
          sortedNotes.map(note => (
            <div 
              key={note.id} 
              className={`p-3 bg-card-soft/30 border border-border-sand/30 rounded-xl border-l-4 shadow-sm relative transition-all hover:bg-card-soft/50 ${
                note.isCompleted ? "opacity-60 grayscale" : ""
              } ${getCategoryColor(note.category)}`}
            >
              {/* Note actions (hover or always shown for quick tap) */}
              <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-card-soft/95 px-1 py-0.5 rounded shadow-sm opacity-90 border border-border-sand/40">
                <button 
                  onClick={() => onUpdateNote(note.id, { isPinned: !note.isPinned })}
                  className="text-stone hover:text-primary-dark"
                  title={note.isPinned ? "Unpin Memo" : "Pin Memo"}
                >
                  {note.isPinned ? <PinOff className="w-3.5 h-3.5 text-primary fill-primary/20" /> : <Pin className="w-3.5 h-3.5" />}
                </button>
                <button 
                  onClick={() => startEdit(note)}
                  className="text-stone hover:text-primary-dark"
                  title="Modify Memo"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => onDeleteNote(note.id)}
                  className="text-stone hover:text-rose-600"
                  title="Purge Note"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Note Header Title */}
              <div className="flex items-start gap-1.5 pr-20">
                <button 
                  onClick={() => onUpdateNote(note.id, { isCompleted: !note.isCompleted })}
                  className="text-stone hover:text-primary mt-0.5 flex-shrink-0"
                >
                  {note.isCompleted ? (
                    <CheckSquare className="w-4 h-4 text-primary" />
                  ) : (
                    <Square className="w-4 h-4 text-stone" />
                  )}
                </button>
                <div className="flex-1">
                  <p className={`font-bold leading-tight ${note.isCompleted ? "line-through text-stone" : "text-charcoal"}`}>
                    {note.title}
                  </p>
                  <p className="text-stone mt-1 whitespace-pre-wrap leading-relaxed font-medium">{note.content}</p>
                </div>
              </div>

              {/* Note Meta Footer */}
              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border-sand/30 text-[9px] text-stone">
                <span className="font-extrabold tracking-wider uppercase">{note.category}</span>
                {note.reminderDate && (
                  <span className="flex items-center gap-1 text-stone bg-card-soft/60 border border-border-sand/20 px-1.5 py-0.5 rounded font-bold">
                    <Calendar className="w-3 h-3 text-primary" /> {new Date(note.reminderDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
