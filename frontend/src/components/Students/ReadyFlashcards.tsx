import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import fullDeck from "../../data/ready_flashcards_full.json"; // <-- adjust path if needed

// ===== Types =====
export type Category = "Laws" | "Basics" | "Service" | "Cocktails" | "Shots";
export interface FlashCard {
  id: string;
  category: Category | string; // JSON may be plain strings; we'll narrow at runtime
  q: string;
  a: string;
}

// Narrow unknown categories to our union if possible
function toCategory(c: string): Category | string {
  const known: Category[] = ["Laws", "Basics", "Service", "Cocktails", "Shots"];
  return (known as string[]).includes(c) ? (c as Category) : c;
}

// Build categories from the JSON so everything shows up
const dynamicCategories = Array.from(new Set(fullDeck.map((c) => toCategory(c.category as string)))) as (Category | string)[];
const categories: (Category | "All" | string)[] = ["All", ...dynamicCategories];

// Small helper
function classNames(...s: (string | false | null | undefined)[]) {
  return s.filter(Boolean).join(" ");
}

export default function ReadyFlashcards() {
  // Use your uploaded JSON as the deck
  const deck: FlashCard[] = fullDeck as FlashCard[];

  const [cat, setCat] = useState<Category | "All" | string>("All");
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const filtered = useMemo(() => {
    const list = deck.filter((c) => (cat === "All" ? true : toCategory(c.category as string) === cat));
    return list;
  }, [deck, cat]);

  useEffect(() => {
    setIndex(0);
    setFlipped(false);
  }, [cat]);

  const current = filtered[index];

  const goPrev = () => {
    setFlipped(false);
    setIndex((i) => Math.max(0, i - 1));
  };
  const goNext = () => {
    setFlipped(false);
    setIndex((i) => Math.min(filtered.length - 1, i + 1));
  };

  // Keyboard support
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setFlipped((f) => !f);
      }
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [filtered.length]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-2 text-2xl font-bold text-slate-900">Study Cards</h1>
        <p className="mb-5 text-sm text-slate-600">Tap the card (or press Space/Enter) to flip. Use ←/→ to navigate.</p>

        {/* Category chips built from JSON */}
        <div className="mb-6 flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={String(c)}
              onClick={() => setCat(c)}
              className={classNames(
                "rounded-full border px-3 py-1.5 text-sm",
                cat === c
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 bg-white text-slate-800 hover:border-slate-400"
              )}
            >
              {String(c)}
            </button>
          ))}
        </div>

        <div className="flex flex-col items-center">
          {current ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id + String(flipped)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="w-full max-w-2xl"
              >
                {/* Clean, sturdy card */}
                <div
                  ref={cardRef}
                  tabIndex={0}
                  onClick={() => setFlipped((f) => !f)}
                  className="relative mb-6 w-full cursor-pointer select-none rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-2xl outline-none"
                  aria-label="Flashcard; click to reveal/hide answer"
                  role="button"
                >
                  {/* Header */}
                  <div className="mb-4 flex items-center justify-between">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
                      {String(toCategory(current.category as string))}
                    </span>
                    <span className="text-xs text-slate-500">
                      Card {index + 1} / {filtered.length}
                    </span>
                  </div>

                  {/* Q/A */}
                  {!flipped ? (
                    <>
                      <h2 className="text-2xl font-semibold leading-snug text-slate-900">{current.q}</h2>
                      <p className="mt-3 text-xs text-slate-500">(Click to show answer)</p>
                    </>
                  ) : (
                    <>
                      <h2 className="text-xl font-medium text-slate-900">{current.a}</h2>
                      <p className="mt-3 text-xs text-slate-500">(Click to hide answer)</p>
                    </>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="w-full max-w-2xl rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600 shadow-sm">
              No cards match your filter.
            </div>
          )}

          {/* Prev/Next */}
          <div className="flex w-full max-w-2xl items-center justify-between">
            <button
              onClick={goPrev}
              disabled={index === 0}
              className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm hover:border-slate-400 disabled:opacity-40"
            >
              <ChevronLeft size={18} /> Prev
            </button>
            <span className="text-sm text-slate-600">{filtered.length ? index + 1 : 0} / {filtered.length}</span>
            <button
              onClick={goNext}
              disabled={index >= filtered.length - 1}
              className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm hover:border-slate-400 disabled:opacity-40"
            >
              Next <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
