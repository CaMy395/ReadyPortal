import React from "react";
import {Download} from "lucide-react";
import ReadyFlashcards from "./ReadyFlashcards";

// Student-first view (hide admin tools like Import/Export)
const STUDENT_MODE = true;

export default function FlashcardsPage() {
  return (
    <div className="min-h-screen bg-neutral-900 text-white">
      <div className="mx-auto max-w-5xl px-6 pt-6 pb-3 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ready Bartender — Study & Review</h1>

        <div className="flex items-center gap-2">
          {/* Download (forces save) */}
          <a
            href="/Ready_Bartender_Study_Guide_Complete.pdf"
            download
            className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-3 py-2 text-white shadow hover:bg-red-700"
          >
            <Download className="h-4 w-4" />
            Download Study Guide (PDF)  
          </a>
 / 
          {/* Optional: open in new tab (preview in browser) */}
          <a
            href="/study-guides/Ready-Bartender-Study-Guide.pdf"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 text-white shadow border border-white/20 hover:bg-white/20"
          >
             View
          </a>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 pb-8">
        <ReadyFlashcards />
      </div>
    </div>
  );
}
