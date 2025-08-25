import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shuffle,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  Layers,
} from "lucide-react";

// ================= Types =================
interface FlashCard {
  id: string;
  category: "Laws" | "Basics" | "Service" | "Cocktails" | "Shots";
  q: string;
  a: string;
}

// ================= Deck (preloaded) =================
const DEFAULT_CARDS: FlashCard[] = [
  // --- trim for brevity; keep your full list here ---
  { id: "law-1", category: "Laws", q: "Legal drinking age in Florida?", a: "21 years old." },
  { id: "basics-1", category: "Basics", q: "Free-pour count → ounces (4,6,8)?", a: "4-count ≈ 1 oz; 6-count ≈ 1.5 oz; 8-count ≈ 2 oz." },
  { id: "ct-1", category: "Cocktails", q: "Cuba Libre – recipe & glass?", a: "1.5 oz Rum; fill Coke. Glass: Highball." },
  // ...rest of your cards...
];

// ================= Helpers =================
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ================= Component =================
export default function ReadyFlashcards() {
  const [deck, setDeck] = useState<FlashCard[]>(DEFAULT_CARDS);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("All");
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return deck.filter(
      (c) =>
        (filter === "All" || c.category === filter) &&
        (term === "" || c.q.toLowerCase().includes(term) || c.a.toLowerCase().includes(term))
    );
  }, [deck, query, filter]);

  const total = filtered.length;
  const current = filtered[index] ?? null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " ") { e.preventDefault(); setFlipped((f) => !f); }
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, filtered]);

  const next = () => {
    setFlipped(false);
    setIndex((i) => (i + 1) % Math.max(1, total));
  };
  const prev = () => {
    setFlipped(false);
    setIndex((i) => (i - 1 + Math.max(1, total)) % Math.max(1, total));
  };

  const shuffleDeck = () => {
    setIndex(0);
    setFlipped(false);
    setDeck((d) => shuffle(d));
  };

  const resetSession = () => {
    setKnown({});
    setIndex(0);
    setFlipped(false);
  };

  const markKnown = (val: boolean) => {
    if (!current) return;
    setKnown((k) => ({ ...k, [current.id]: val }));
    next();
  };

  const knownCount = useMemo(() => Object.values(known).filter(Boolean).length, [known]);

  return (
    <div className="min-h-screen w-full bg-neutral-900 text-white p-8">
      {/* Header */}
      <div className="mx-auto max-w-5xl mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Layers className="h-7 w-7 text-red-500" />
          <h1 className="text-3xl font-extrabold tracking-tight">Flashcards Study Tool</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={shuffleDeck}
            className="inline-flex items-center gap-2 rounded-2xl bg-red-600 text-white px-3 py-2 shadow hover:bg-red-700"
          >
            <Shuffle className="h-4 w-4" /> Shuffle
          </button>
          <button
            onClick={resetSession}
            className="inline-flex items-center gap-2 rounded-2xl bg-neutral-800 text-white px-3 py-2 shadow hover:bg-black"
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="mx-auto max-w-5xl mb-5 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="col-span-1 flex gap-2">
          {(["All", "Laws", "Basics", "Service", "Cocktails", "Shots"] as const).map((c) => (
            <button
              key={c}
              onClick={() => { setFilter(c); setIndex(0); setFlipped(false); }}
              className={`px-3 py-2 rounded-xl text-sm border shadow-sm ${
                filter === c ? "bg-red-600 text-white border-red-600" : "bg-white text-neutral-900 hover:bg-neutral-100"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="md:col-span-2">
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setIndex(0); setFlipped(false); }}
              placeholder="Search question or answer…"
              className="w-full pl-10 pr-3 py-2 rounded-xl border shadow-sm bg-white text-neutral-900 outline-none focus:ring-2 focus:ring-red-500"
            />
          </label>
        </div>
      </div>

      {/* Card */}
      <div className="mx-auto max-w-3xl">
        {total === 0 ? (
          <div className="p-10 text-center bg-white text-neutral-900 rounded-2xl shadow">
            No cards match your filters. Try a different category or clear search.
          </div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={current?.id + String(flipped)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              <div className="bg-white text-neutral-900 rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden">
                <div className="bg-red-600 text-white px-4 py-2 text-sm font-semibold">
                  {current?.category}
                </div>
                <motion.div
                  onClick={() => setFlipped((f) => !f)}
                  className="relative cursor-pointer select-none px-8 py-10 min-h-[240px] flex items-center justify-center text-center"
                  style={{ perspective: 1000 }}
                >
                  <motion.div
                    initial={false}
                    animate={{ rotateY: flipped ? 180 : 0 }}
                    transition={{ duration: 0.35 }}
                    className="w-full"
                    style={{ transformStyle: "preserve-3d" }}
                  >
                    <div className="absolute inset-0 backface-hidden flex items-center justify-center">
                      <div className="text-xl font-semibold leading-relaxed">
                        {current?.q}
                      </div>
                    </div>
                    <div className="absolute inset-0 rotate-y-180 backface-hidden flex items-center justify-center">
                      <div className="text-lg leading-relaxed">
                        <span className="font-semibold">Answer:</span> {current?.a}
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Actions */}
      <div className="mx-auto max-w-3xl mt-6 flex items-center justify-between">
        <button
          onClick={prev}
          className="inline-flex items-center gap-2 rounded-2xl bg-white text-neutral-900 px-4 py-2 shadow border hover:bg-neutral-100"
        >
          <ChevronLeft className="h-4 w-4" /> Prev
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => markKnown(false)}
            className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 text-white px-4 py-2 shadow hover:bg-rose-700"
          >
            <XCircle className="h-4 w-4" /> Review
          </button>
          <button
            onClick={() => markKnown(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 text-white px-4 py-2 shadow hover:bg-emerald-700"
          >
            <CheckCircle2 className="h-4 w-4" /> Known
          </button>
        </div>
        <button
          onClick={next}
          className="inline-flex items-center gap-2 rounded-2xl bg-white text-neutral-900 px-4 py-2 shadow border hover:bg-neutral-100"
        >
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Progress */}
      <div className="mx-auto max-w-5xl mb-3 flex items-center justify-between text-sm text-neutral-300">
        <span>Cards: <b>{total}</b> | Known: <b>{knownCount}</b></span>
      </div>
      <div className="mx-auto max-w-5xl h-2 bg-neutral-800 rounded-full overflow-hidden mb-6">
        <div className="h-full bg-red-600" style={{ width: `${total ? ((index + 1) / total) * 100 : 0}%` }} />
      </div>

      {/* Footer tip */}
      <div className="mx-auto max-w-3xl text-center mt-6 text-sm text-neutral-300">
        Tip: Press <b>Space</b> to flip. Use <b>←/→</b> to navigate.
      </div>
    </div>
  );
}

/* Add to global CSS:
.backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
.rotate-y-180 { transform: rotateY(180deg); }
*/
