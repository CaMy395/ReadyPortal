import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, Download, Layers, RotateCcw, Search, Shuffle, Sparkles, Star } from "lucide-react";
import fullDeck from "../../data/ready_flashcards_full.json";

const barGuideUrl = "/Ready_Bartender_Study_Guide_Complete.pdf";

export interface FlashCard { id: string; category: string; q: string; a: string; pages?: number[]; }
const deck: FlashCard[] = fullDeck;
const categories = ["All topics", ...Array.from(new Set(deck.map(card => card.category)))];
const storageKey = () => `ready-study-v2:${localStorage.getItem('userId') || 'guest'}`;
function readProgress() {
  try {
    const data = JSON.parse(localStorage.getItem(storageKey()) || '{}');
    return { starred: Array.isArray(data.starred) ? data.starred : [], known: Array.isArray(data.known) ? data.known : [] };
  } catch { return { starred: [], known: [] }; }
}
function shuffled<T,>(list: T[]): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
  return copy;
}
export default function ReadyFlashcards() {
  const [mode, setMode] = useState('cards');
  const [category, setCategory] = useState('All topics');
  const [starredOnly, setStarredOnly] = useState(false);
  const [progress, setProgress] = useState(readProgress);
  const [order, setOrder] = useState(deck.map(card => card.id));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [search, setSearch] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [score, setScore] = useState({ correct: 0, answered: 0 });
  const [finished, setFinished] = useState(false);
  const [saveError, setSaveError] = useState(false);
  useEffect(() => {
    try { localStorage.setItem(storageKey(), JSON.stringify(progress)); setSaveError(false); }
    catch { setSaveError(true); }
  }, [progress]);
  const filtered = useMemo(() => {
    const byId = new Map(deck.map(card => [card.id, card]));
    return order.map(id => byId.get(id)!).filter(card => (category === 'All topics' || card.category === category) && (!starredOnly || progress.starred.includes(card.id)));
  }, [order, category, starredOnly, progress.starred]);
  const current = filtered[Math.min(index, Math.max(0, filtered.length - 1))];
  const knownCount = filtered.filter(card => progress.known.includes(card.id)).length;
  const choices = useMemo(() => current ? shuffled([current.a, ...shuffled(Array.from(new Set(deck.filter(card => card.a !== current.a).map(card => card.a)))).slice(0, 3)]) : [], [current]);
  const resetSession = () => { setIndex(0); setFlipped(false); setAnswer(null); setScore({ correct: 0, answered: 0 }); setFinished(false); };
  const navigate = (step: number) => { setIndex(i => Math.max(0, Math.min(filtered.length - 1, i + step))); setFlipped(false); setAnswer(null); };
  const toggleStar = (id: string) => {
    setProgress(p => ({ ...p, starred: p.starred.includes(id) ? p.starred.filter(value => value !== id) : [...p.starred, id] }));
    if (starredOnly) resetSession();
  };
  const mark = (known: boolean) => {
    if (!current) return;
    setProgress(p => ({ ...p, known: known ? Array.from(new Set([...p.known, current.id])) : p.known.filter(id => id !== current.id) }));
    if (index < filtered.length - 1) navigate(1); else setFinished(true);
  };
  const choose = (choice: string) => {
    if (answer !== null || !current) return;
    setAnswer(choice);
    setScore(s => ({ answered: s.answered + 1, correct: s.correct + Number(choice === current.a) }));
  };
  const terms = filtered.filter(card => `${card.q} ${card.a}`.toLowerCase().includes(search.toLowerCase()));
  return <main className="study-workspace">
    <div className="study-shell">
      <div className="study-breadcrumb"><a href="/student/dashboard">My classroom</a><ChevronRight size={14} /><span>Study set</span></div>
      <header className="study-header">
        <div><div className="study-eyebrow">READY BARTENDING / STUDENT LIBRARY</div><h1>A little practice.<br /><span>A lot more confidence.</span></h1><p>Bartending, responsible service, and certification prep from your updated 53-page guide.</p></div>
        <a className="study-download" href={barGuideUrl} download="Ready_Bartender_Guide_Complete.pdf"><Download size={17} /> Bar guide <span>PDF</span></a>
      </header>
      <div className="study-set-meta"><span className="study-avatar">R</span><strong>Ready Bartending</strong><span className="study-meta-dot">·</span><span>{deck.length} terms</span><span className="study-meta-dot">·</span><span>{categories.length - 1} topics</span></div>
      <div className="study-layout">
        <section className="study-main" aria-label="Study activities">
          <div className="study-modes" aria-label="Study mode">
            {[{ id: 'cards', name: 'Flashcards', icon: Layers, detail: 'Get familiar' }, { id: 'learn', name: 'Practice', icon: Sparkles, detail: 'Test yourself' }, { id: 'terms', name: 'All terms', icon: BookOpen, detail: 'See the full set' }].map(item => <button key={item.id} aria-pressed={mode === item.id} className={mode === item.id ? 'is-active' : ''} onClick={() => { setMode(item.id); resetSession(); }}><item.icon size={21} /><span><strong>{item.name}</strong><small>{item.detail}</small></span></button>)}
          </div>
          <div className="study-toolbar"><label className="study-topic">Topic <select value={category} onChange={e => { setCategory(e.target.value); resetSession(); }}>{categories.map(value => <option key={value}>{value}</option>)}</select></label><button className={`study-star-filter ${starredOnly ? 'is-active' : ''}`} aria-pressed={starredOnly} onClick={() => { setStarredOnly(value => !value); resetSession(); }}><Star size={16} /> Starred {progress.starred.length > 0 && <span>{progress.starred.length}</span>}</button></div>
          {!current ? <div className="study-empty"><Star size={32} /><h2>No starred cards here yet</h2><p>Star the terms you want to come back to, then study them together.</p><button className="study-primary" onClick={() => { setStarredOnly(false); resetSession(); }}>Show all cards</button></div> : mode === 'terms' ? <section className="study-terms">
            <label className="study-search"><Search size={18} /><input aria-label="Search terms" placeholder="Search terms and definitions" value={search} onChange={e => setSearch(e.target.value)} /></label>
            <div className="study-list-title"><h2>Terms in this set</h2><span>{terms.length} terms</span></div>
            {terms.map(card => <article className="study-term" key={card.id}><div><small>{card.category}</small><h3>{card.q}</h3></div><p>{card.a}</p><button className="study-icon" aria-label={`${progress.starred.includes(card.id) ? 'Unstar' : 'Star'} ${card.q}`} aria-pressed={progress.starred.includes(card.id)} onClick={() => toggleStar(card.id)}><Star size={19} fill={progress.starred.includes(card.id) ? 'currentColor' : 'none'} /></button></article>)}
            {!terms.length && <p className="study-empty">No matching terms. Try a different search.</p>}
          </section> : finished ? <section className="study-finished"><span className="study-finish-icon"><Check size={30} /></span><div className="study-eyebrow">SESSION COMPLETE</div><h2>Look at you, making progress.</h2><p>{mode === 'learn' ? `${score.correct} of ${score.answered} answers correct. A little repetition goes a long way.` : `You reviewed ${filtered.length} cards. Keep going until it feels second nature.`}</p><button className="study-primary" onClick={resetSession}><RotateCcw size={17} /> Study again</button><button className="study-secondary" onClick={() => { setMode('terms'); resetSession(); }}>Review all terms</button></section> : <>
            <div className={`study-card ${mode === 'learn' ? 'study-practice-card' : ''}`}>
              <div className="study-card-top"><span>{current.category}</span><button className="study-icon" aria-label={progress.starred.includes(current.id) ? 'Unstar this card' : 'Star this card'} aria-pressed={progress.starred.includes(current.id)} onClick={() => toggleStar(current.id)}><Star size={21} fill={progress.starred.includes(current.id) ? 'currentColor' : 'none'} /></button></div>
              {mode === 'cards' ? <button className="study-card-face" aria-label={flipped ? 'Show question' : 'Show answer'} onClick={() => setFlipped(value => !value)} onKeyDown={e => { if (e.key === 'ArrowRight') { e.preventDefault(); navigate(1); } if (e.key === 'ArrowLeft') { e.preventDefault(); navigate(-1); } }}><span className="study-side-label">{flipped ? 'THE ANSWER' : 'THINK IT THROUGH'}</span><span className={`study-card-text ${flipped ? 'is-answer' : ''}`} key={`${current.id}-${flipped}`}>{flipped ? current.a : current.q}</span><span className="study-flip-hint"><RotateCcw size={14} /> {flipped ? 'Click to see question' : 'Click to reveal answer'}</span></button> : <div className="study-question"><span className="study-side-label">CHOOSE THE BEST ANSWER</span><h2>{current.q}</h2><div className="study-choices">{choices.map((choice, i) => <button key={choice} disabled={answer !== null} className={answer !== null && choice === current.a ? 'is-correct' : answer === choice ? 'is-incorrect' : ''} onClick={() => choose(choice)}><span>{i + 1}</span>{choice}{answer !== null && choice === current.a && <Check size={18} />}</button>)}</div>{answer !== null && <div className="study-feedback" role="status"><strong>{answer === current.a ? 'That’s right. Nicely done!' : 'Keep practicing. The correct answer is highlighted.'}</strong><button className="study-primary" onClick={() => index === filtered.length - 1 ? setFinished(true) : navigate(1)}>{index === filtered.length - 1 ? 'See results' : 'Next question'}<ArrowRight size={17} /></button></div>}</div>}
            </div>
            {mode === 'cards' && <div className="study-rating"><button disabled={!flipped} onClick={() => mark(false)}><RotateCcw size={16} /> Still learning</button><button disabled={!flipped} onClick={() => mark(true)}><Check size={17} /> Got it</button></div>}
            <div className="study-controls"><button className="study-icon" aria-label="Shuffle cards" title="Shuffle cards" onClick={() => { setOrder(shuffled(order)); resetSession(); }}><Shuffle size={19} /></button><div className="study-pagination">{mode === 'cards' && <button className="study-circle" aria-label="Previous card" disabled={index === 0} onClick={() => navigate(-1)}><ArrowLeft size={19} /></button>}<span aria-live="polite">{Math.min(index + 1, filtered.length)} <span>/ {filtered.length}</span></span>{mode === 'cards' && <button className="study-circle" aria-label="Next card" disabled={index >= filtered.length - 1} onClick={() => navigate(1)}><ArrowRight size={19} /></button>}</div><button className="study-icon" aria-label="Restart session" title="Restart session" onClick={resetSession}><RotateCcw size={19} /></button></div>
            <div className="study-session-track"><span style={{ width: `${((index + 1) / filtered.length) * 100}%` }} /></div>
            <p className="study-keyboard">{mode === 'cards' ? 'Make it yours: star tricky cards. Space to flip, arrow keys to move when the card is focused.' : 'No pressure. Every question is another chance to learn.'}</p>
            {!!current.pages?.length && <p className="study-source">Review in the guide: {current.pages.map((page, i) => <React.Fragment key={page}>{i > 0 && ', '}<a href={`${barGuideUrl}#page=${page}`} target="_blank" rel="noreferrer">page {page}</a></React.Fragment>)}</p>}
          </>}
        </section>
        <aside className="study-sidebar"><div className="study-progress-panel"><div className="study-eyebrow">YOUR PROGRESS</div><h2>A little better<br />every session.</h2><div className="study-progress-number">{filtered.length ? Math.round(knownCount / filtered.length * 100) : 0}<span>%</span></div><div className="study-mastery-track"><span style={{ width: `${filtered.length ? knownCount / filtered.length * 100 : 0}%` }} /></div><div className="study-progress-row"><span><i className="study-dot-known" />Got it</span><strong>{knownCount}</strong></div><div className="study-progress-row"><span><i />Still learning</span><strong>{filtered.length - knownCount}</strong></div><p>Flip a flashcard, then mark what you know. Your progress stays saved on this device.</p>{saveError && <p role="alert">Progress can’t be saved in this browser right now.</p>}</div><div className="study-tip"><Sparkles size={21} /><h3>Small sessions. Big difference.</h3><p>Try one topic at a time. Say the answer out loud before you flip the card.</p></div><a className="study-guide-link" href={barGuideUrl} target="_blank" rel="noreferrer"><BookOpen size={19} /><span>Updated course reference<strong>Open the bar guide</strong></span><ArrowRight size={17} /></a></aside>
      </div>
      <footer className="study-footer"><span>READY TO LEARN. READY TO BARTEND.</span><span>Your next great shift starts here.</span></footer>
    </div>
  </main>;
}
