import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, MicOff, Settings, Book, Check, X, BookOpen, ToggleLeft, ToggleRight, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import * as kjv from 'es-kjv';

const verseLookup = Object.entries(kjv.verses).map(([ref, text]) => ({
  ref,
  text: (text as string).replace(/^#\s*/, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
}));

const allVerseKeys = Object.keys(kjv.verses);

const canonicalBooks = [
  'Genesis',         'Exodus',         'Leviticus',     'Numbers',
  'Deuteronomy',     'Joshua',         'Judges',        'Ruth',
  '1 Samuel',        '2 Samuel',       '1 Kings',       '2 Kings',
  '1 Chronicles',    '2 Chronicles',   'Ezra',          'Nehemiah',
  'Esther',          'Job',            'Psalms',        'Proverbs',
  'Ecclesiastes',    "Solomon's Song", 'Isaiah',        'Jeremiah',
  'Lamentations',    'Ezekiel',        'Daniel',        'Hosea',
  'Joel',            'Amos',           'Obadiah',       'Jonah',
  'Micah',           'Nahum',          'Habakkuk',      'Zephaniah',
  'Haggai',          'Zechariah',      'Malachi',       'Matthew',
  'Mark',            'Luke',           'John',          'Acts',
  'Romans',          '1 Corinthians',  '2 Corinthians', 'Galatians',
  'Ephesians',       'Philippians',    'Colossians',    '1 Thessalonians',
  '2 Thessalonians', '1 Timothy',      '2 Timothy',     'Titus',
  'Philemon',        'Hebrews',        'James',         '1 Peter',
  '2 Peter',         '1 John',         '2 John',        '3 John',
  'Jude',            'Revelation'
];

function getCanonicalBook(bookParam: string) {
    const book = bookParam.toLowerCase();
    if (book.includes('first samuel')) return '1 Samuel';
    if (book.includes('second samuel')) return '2 Samuel';
    if (book.includes('first kings')) return '1 Kings';
    if (book.includes('second kings')) return '2 Kings';
    if (book.includes('first chronicles')) return '1 Chronicles';
    if (book.includes('second chronicles')) return '2 Chronicles';
    if (book === 'psalm') return 'Psalms';
    if (book === 'song of songs' || book === 'song of solomon' || book === "solomon's song") return "Solomon's Song";
    if (book.includes('first corinthians')) return '1 Corinthians';
    if (book.includes('second corinthians')) return '2 Corinthians';
    if (book.includes('first thessalonians')) return '1 Thessalonians';
    if (book.includes('second thessalonians')) return '2 Thessalonians';
    if (book.includes('first timothy')) return '1 Timothy';
    if (book.includes('second timothy')) return '2 Timothy';
    if (book.includes('first peter')) return '1 Peter';
    if (book.includes('second peter')) return '2 Peter';
    if (book.includes('first john')) return '1 John';
    if (book.includes('second john')) return '2 John';
    if (book.includes('third john')) return '3 John';
    return canonicalBooks.find(b => b.toLowerCase() === book) || bookParam;
}

const books = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth",
  "1 Samuel", "First Samuel", "2 Samuel", "Second Samuel", "1 Kings", "First Kings", "2 Kings", "Second Kings",
  "1 Chronicles", "First Chronicles", "2 Chronicles", "Second Chronicles", "Ezra", "Nehemiah", "Esther", "Job",
  "Psalms", "Psalm", "Proverbs", "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations",
  "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk",
  "Zephaniah", "Haggai", "Zechariah", "Malachi",
  "Matthew", "Mark", "Luke", "John", "Acts", "Romans",
  "1 Corinthians", "First Corinthians", "2 Corinthians", "Second Corinthians", "Galatians", "Ephesians",
  "Philippians", "Colossians", "1 Thessalonians", "First Thessalonians", "2 Thessalonians", "Second Thessalonians",
  "1 Timothy", "First Timothy", "2 Timothy", "Second Timothy", "Titus", "Philemon", "Hebrews", "James",
  "1 Peter", "First Peter", "2 Peter", "Second Peter", "1 John", "First John", "2 John", "Second John",
  "3 John", "Third John", "Jude", "Revelation", "Song of Songs"
].sort((a, b) => b.length - a.length);

const booksPattern = books.join('|');
// Matches e.g. "John 3", "John 3:16", "John chapter 3", "John chapter 3 verse 16", "John 3 16", "John chapter 3 and verse 16", "Book of John chapter 3"
const regexPattern = new RegExp(`\\b(?:the\\s+)?(?:book\\s+of\\s+)?(${booksPattern})\\s*(?:chapter\\s+)?(\\d+)(?:[.:,\\s]*(?:and\\s+)?(?:verses?\\s+)?(\\d+))?\\b`, 'gi');

export interface BibleReference {
  book: string;
  chapter: number;
  verse?: number;
  rawStr: string;
  formattedStr: string;
  verseText?: string;
  id: string;
  timestamp: Date;
}

export function searchVerseByText(transcript: string, formatString: string = 'Book Chapter:Verse', isManual: boolean = false): BibleReference[] {
  const words = transcript.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  
  const minWords = isManual ? 1 : 4;
  if (words.length < minWords) return [];

  const phrases = [];
  // From longest phrase down to minWords phrase
  for (let len = words.length; len >= minWords; len--) {
    for (let i = 0; i <= words.length - len; i++) {
        phrases.push(words.slice(i, i + len).join(' '));
    }
  }

  for (const phrase of phrases) {
     const matches = verseLookup.filter(v => v.text.includes(phrase));
     // if matches count is 1-3 (or manual), we found a very likely match
     if (matches.length > 0 && (isManual || matches.length <= 3)) {
        return matches.slice(0, 20).map(m => {
           const refMatch = m.ref.match(/(.+?)\s+(\d+):(\d+)/);
           if (!refMatch) return null;
           const book = refMatch[1];
           const chapter = parseInt(refMatch[2], 10);
           const verse = parseInt(refMatch[3], 10);
           
           let formattedStr = formatString
              .replace(/Book/gi, book)
              .replace(/Chapter/gi, chapter.toString())
              .replace(/Verse/gi, verse.toString());

           let verseText = undefined;
           const key = `${book} ${chapter}:${verse}`;
           if (kjv.verses[key]) {
               verseText = kjv.verses[key].replace(/^#\s*/, '').trim();
           }

           return {
              book, chapter, verse,
              rawStr: `... ${phrase} ...`,
              formattedStr: formattedStr,
              verseText: verseText,
              id: Math.random().toString(36).substring(7),
              timestamp: new Date()
           };
        }).filter(Boolean) as BibleReference[];
     }
  }
  return [];
}

const getBibleHubLink = (book: string, chapter: number, verse?: number) => {
  let b = book.toLowerCase().replace(/\s+/g, '_');
  if (b === "solomon's_song" || b === "song_of_solomon" || b === "song_of_songs") b = "songs";
  return `https://biblehub.com/interlinear/${b}/${chapter}${verse ? `-${verse}` : ''}.htm`;
};

export function extractBibleReferences(text: string, formatString: string = 'Book Chapter:Verse', isManual: boolean = false): BibleReference[] {
  const matches: BibleReference[] = [];
  let match;
  regexPattern.lastIndex = 0; // Reset just in case
  
  // First, check regex
  while ((match = regexPattern.exec(text)) !== null) {
    const originalBookStr = match[1];
    const book = getCanonicalBook(originalBookStr);
    const chapter = parseInt(match[2], 10);
    const verse = match[3] ? parseInt(match[3], 10) : undefined;

    let formattedStr = formatString
      .replace(/Book/gi, book)
      .replace(/Chapter/gi, chapter.toString());
      
    if (verse !== undefined) {
      formattedStr = formattedStr.replace(/Verse/gi, verse.toString());
    } else {
      formattedStr = formattedStr.replace(/Verse/gi, '');
      formattedStr = formattedStr.replace(/[\s:,]+$/, '');
      formattedStr = formattedStr.replace(/verse\s*$/i, '').trim();
    }

    let verseText = undefined;
    if (verse !== undefined) {
        const key = `${book} ${chapter}:${verse}`;
        if (kjv.verses[key]) {
            verseText = kjv.verses[key].replace(/^#\s*/, '').trim();
        }
    }

    matches.push({
      book,
      chapter,
      verse,
      rawStr: match[0],
      formattedStr,
      verseText,
      id: Math.random().toString(36).substring(7),
      timestamp: new Date()
    });
  }
  
  // If no regex match, perform full-text fallback search
  if (matches.length === 0) {
    const textMatches = searchVerseByText(text, formatString, isManual);
    if (textMatches.length > 0) {
      matches.push(...textMatches);
    }
  }
  
  return matches;
}

export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [semiAuto, setSemiAuto] = useState(true);
  const [formatString, setFormatString] = useState('Book Chapter:Verse');
  const [bibleVersion, setBibleVersion] = useState('kjv');
  const [manualInput, setManualInput] = useState('');
  const [fetchedVerseText, setFetchedVerseText] = useState<string | null>(null);
  const [isLoadingVerse, setIsLoadingVerse] = useState(false);

  const [transcripts, setTranscripts] = useState<{text: string, isFinal: boolean, id: string}[]>([]);
  const [suggestions, setSuggestions] = useState<BibleReference[]>([]);
  const [activeReference, setActiveReference] = useState<BibleReference | null>(null);
  const [popupReference, setPopupReference] = useState<BibleReference | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef(isRecording);
  const semiAutoRef = useRef(semiAuto);
  const formatStringRef = useRef(formatString);

  // Keep refs in sync
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    semiAutoRef.current = semiAuto;
  }, [semiAuto]);

  useEffect(() => {
    formatStringRef.current = formatString;
  }, [formatString]);

  useEffect(() => {
    if (popupReference) {
      if (bibleVersion === 'kjv') {
         setFetchedVerseText(popupReference.verseText || null);
      } else {
         setIsLoadingVerse(true);
         setFetchedVerseText(null);
         
         const cBook = getCanonicalBook(popupReference.book);
         // bolls.life uses 1-66 index
         const bookIndex = canonicalBooks.indexOf(cBook) + 1;
         
          if (bookIndex > 0) {
           fetch(`https://bolls.life/get-text/${bibleVersion}/${bookIndex}/${popupReference.chapter}/`)
             .then(res => res.json())
             .then(data => {
               const stripHtml = (html: string) => {
                  const doc = new DOMParser().parseFromString(html, 'text/html');
                  return doc.body.textContent || "";
               };
               if (Array.isArray(data)) {
                 if (popupReference.verse !== undefined) {
                   const vText = data.find((v: any) => v.verse === popupReference.verse);
                   if (vText) {
                     setFetchedVerseText(stripHtml(vText.text));
                   } else {
                     setFetchedVerseText("Verse not found in this translation.");
                   }
                 } else {
                   // Give whole chapter combined
                   setFetchedVerseText(stripHtml(data.map((v: any) => `${v.verse} ${v.text}`).join(' ')));
                 }
               } else {
                 setFetchedVerseText("Could not fetch verse translation.");
               }
               setIsLoadingVerse(false);
             })
             .catch(() => {
               setFetchedVerseText("Error fetching verse translation.");
               setIsLoadingVerse(false);
             });
         } else {
           setFetchedVerseText("Unsupported book.");
           setIsLoadingVerse(false);
         }
      }
    }
  }, [popupReference, bibleVersion]);

  const handleManualSearch = () => {
    if (!manualInput.trim()) return;
    const refs = extractBibleReferences(manualInput, formatStringRef.current, true);
    if (refs.length > 0) {
       setSuggestions(prev => [...refs, ...prev].slice(0, 20));
       const newRef = refs[0];
       setActiveReference(newRef);
       setPopupReference(newRef);
       setManualInput('');
    } else {
       alert("No verses found matching that text.");
    }
  };

  const handleNavigate = (direction: 'prev' | 'next', unit: 'verse' | 'chapter') => {
    if (!popupReference || popupReference.verse === undefined) return;
    
    const key = `${popupReference.book} ${popupReference.chapter}:${popupReference.verse}`;
    const currentIndex = allVerseKeys.indexOf(key);
    
    if (currentIndex === -1) return;
    
    let targetIndex = currentIndex;
    
    if (unit === 'verse') {
      targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    } else if (unit === 'chapter') {
      const currentChapterPrefix = `${popupReference.book} ${popupReference.chapter}:`;
      if (direction === 'next') {
        let i = currentIndex;
        while (i < allVerseKeys.length && allVerseKeys[i].startsWith(currentChapterPrefix)) {
          i++;
        }
        targetIndex = i;
      } else {
        let i = currentIndex;
        while (i >= 0 && allVerseKeys[i].startsWith(currentChapterPrefix)) {
          i--;
        }
        if (i >= 0) {
          const prevChapterPrefix = allVerseKeys[i].split(':')[0] + ':';
          while (i >= 0 && allVerseKeys[i].startsWith(prevChapterPrefix)) {
             i--;
          }
          targetIndex = i + 1;
        } else {
          targetIndex = -1;
        }
      }
    }

    if (targetIndex >= 0 && targetIndex < allVerseKeys.length) {
      const targetKey = allVerseKeys[targetIndex];
      const match = targetKey.match(/(.+?)\s+(\d+):(\d+)/);
      if (match) {
        const book = match[1];
        const chapter = parseInt(match[2], 10);
        const verse = parseInt(match[3], 10);
        
        let formattedStr = formatString
          .replace(/Book/gi, book)
          .replace(/Chapter/gi, chapter.toString())
          .replace(/Verse/gi, verse.toString());

        let verseText = undefined;
        if (kjv.verses[targetKey as keyof typeof kjv.verses]) {
            verseText = kjv.verses[targetKey as keyof typeof kjv.verses].replace(/^#\s*/, '').trim();
        }

        const newRef: BibleReference = {
          book, chapter, verse,
          rawStr: 'Navigated',
          formattedStr,
          verseText,
          id: Math.random().toString(36).substring(7),
          timestamp: new Date()
        };
        setPopupReference(newRef);
        setActiveReference(newRef);
      }
    }
  };

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Speech Recognition API is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onstart = () => {
      setIsRecording(true);
    };

    recognitionRef.current.onend = () => {
      // If we are supposed to be recording, restart it (sometimes it auto-stops)
      if (isRecordingRef.current) {
        try {
          recognitionRef.current?.start();
        } catch (e) {
          console.error("Failed to restart recognition", e);
        }
      } else {
        setIsRecording(false);
      }
    };

    recognitionRef.current.onresult = (event: any) => {
      let finalTranscriptChunk = '';
      let interimTranscriptChunk = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscriptChunk += event.results[i][0].transcript + ' ';
        } else {
          interimTranscriptChunk += event.results[i][0].transcript;
        }
      }

      if (finalTranscriptChunk.trim().length > 0) {
        const refs = extractBibleReferences(finalTranscriptChunk, formatStringRef.current);
        
        setTranscripts(prev => [...prev, { text: finalTranscriptChunk, isFinal: true, id: Math.random().toString() }]);

        if (refs.length > 0) {
          // If semi-auto is true, add to suggestions
          if (semiAutoRef.current) {
            setSuggestions(prev => [...refs, ...prev].slice(0, 20)); // Keep last 20
          } else {
            // If semi-auto is false, immediately display the last found reference
            const newRef = refs[refs.length - 1];
            setActiveReference(newRef);
            setPopupReference(newRef);
          }
        }
      }
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      isRecordingRef.current = false;
      recognitionRef.current?.stop();
    } else {
      isRecordingRef.current = true;
      try {
        recognitionRef.current?.start();
      } catch(e) {
        console.error(e);
      }
    }
  }, [isRecording]);

  const removeSuggestion = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSuggestions(prev => prev.filter(s => s.id !== id));
  };

  const clearTranscripts = () => {
    setTranscripts([]);
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden text-slate-900 font-sans">
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded shrink-0 overflow-hidden">
            <img src="https://assets.cdn.filesafe.space/YfqUFoMBzlgLyjx0TAyr/media/69f1463cdfacb1bd314d0a15.png" alt="OIT Bible Software Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">OIT Bible Software</h1>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600">Translation:</span>
            <select 
              value={bibleVersion} 
              onChange={e => setBibleVersion(e.target.value)}
              className="text-sm bg-slate-50 border border-slate-200 text-slate-700 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:bg-white transition-colors"
            >
              <option value="kjv">KJV</option>
              <option value="NLT">NLT</option>
              <option value="ESV">ESV</option>
              <option value="MSG">MSG</option>
              <option value="AMP">AMP</option>
              <option value="NIV">NIV</option>
            </select>
          </div>

          <div className="h-6 w-px bg-slate-200"></div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600">Format:</span>
            <select 
              value={formatString} 
              onChange={e => setFormatString(e.target.value)}
              className="text-sm bg-slate-50 border border-slate-200 text-slate-700 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:bg-white transition-colors"
            >
              <option value="Book Chapter:Verse">John 3:16</option>
              <option value="Book, Chapter, Verse">John, 3, 16</option>
              <option value="Book Ch Chapter Vs Verse">John Ch 3 Vs 16</option>
              <option value="Book Chapter, verse Verse">John 3, verse 16</option>
              <option value="Book Chapter">John 3 (No Verse)</option>
            </select>
          </div>

          <div className="h-6 w-px bg-slate-200"></div>

          <button
            onClick={toggleRecording}
            className={`flex items-center gap-2 px-3 py-1 rounded-full border focus:outline-none transition-colors ${
              isRecording 
                ? 'bg-green-50 text-green-700 border-green-200' 
                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
            }`}
          >
            {isRecording ? <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> : <MicOff className="w-3 h-3" />}
            <span className="text-xs font-semibold uppercase tracking-wider">{isRecording ? 'Live Listening' : 'Paused'}</span>
          </button>
          
          <div className="h-6 w-px bg-slate-200"></div>
          
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600" title={semiAuto ? "Requires click to display" : "Immediate display"}>Semi-Auto Mode</span>
            <button 
              onClick={() => setSemiAuto(!semiAuto)}
              className={`w-12 h-6 rounded-full relative transition-colors focus:outline-none ${semiAuto ? 'bg-blue-600' : 'bg-slate-300'}`}
              title={semiAuto ? "Disable Semi-Auto (Immediate display)" : "Enable Semi-Auto (Requires click to display)"}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${semiAuto ? 'right-1' : 'left-1'}`}></span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar: Live Transcript */}
        <section className="w-[400px] border-r border-slate-200 bg-white flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
             <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Voice Stream</h2>
             {transcripts.length > 0 && (
               <button onClick={clearTranscripts} className="text-xs text-slate-400 hover:text-slate-600 focus:outline-none transition-colors">
                 Clear
               </button>
             )}
          </div>
          
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            {!isRecording && transcripts.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                <Mic className="w-8 h-8 opacity-40" />
                <p className="text-sm text-center">Click "Paused" above to begin transcribing speech.</p>
              </div>
            )}
            
            <div className="space-y-4">
              {transcripts.map((t) => (
                <p key={t.id} className="text-slate-800 text-lg leading-relaxed font-medium">
                  {t.text}
                </p>
              ))}
              {isRecording && (
                <div className="h-8 w-1 bg-blue-500 rounded-full animate-pulse"></div>
              )}
            </div>
          </div>
        </section>

        {/* Right Area: Inspector & Suggestions */}
        <section className="flex-1 flex flex-col bg-slate-50 min-w-0">
          
          <div className="p-8 flex-1 grid grid-cols-2 gap-8 overflow-hidden">
            
            {/* Suggestions Queue */}
            <div className="space-y-6 overflow-y-auto pr-2 pb-8">
              <div className="bg-white p-2 md:p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                <Search className="w-5 h-5 text-slate-400 shrink-0 ml-2" />
                <input 
                  type="text" 
                  placeholder="Manual lookup (e.g. John 3:16) or extract from phrase"
                  className="flex-1 bg-transparent border-none text-sm focus:outline-none focus:ring-0 text-slate-800"
                  value={manualInput}
                  onChange={e => setManualInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleManualSearch();
                  }}
                />
                <button 
                  onClick={handleManualSearch} 
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-blue-700 transition-colors"
                >
                  Find
                </button>
              </div>

              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center justify-between">
                <span>Suggestions Queue</span>
                {semiAuto && <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full normal-case font-bold">Click to display</span>}
              </h2>
              
              {suggestions.length === 0 ? (
                <div className="flex items-center justify-center text-slate-400 text-sm h-32 border border-slate-200 border-dashed rounded-xl">
                  Waiting for verses...
                </div>
              ) : (
                <div className="space-y-4">
                  {suggestions.map((suggestion, index) => (
                    <div 
                      key={suggestion.id}
                      onClick={() => {
                        setActiveReference(suggestion);
                        setPopupReference(suggestion);
                      }}
                      className={`bg-white p-5 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-blue-400 transition-all group relative ${activeReference?.id === suggestion.id ? 'ring-2 ring-blue-500 ring-offset-2 border-blue-400' : ''} ${index > 5 ? 'opacity-60 grayscale-[0.5]' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        {index === 0 ? (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold uppercase">Newly Detected</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold uppercase">Queued</span>
                        )}
                        <span className="text-xs text-slate-400">{suggestion.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</span>
                      </div>
                      <h3 className="text-2xl font-bold text-slate-800">
                        {suggestion.formattedStr}
                      </h3>
                      <p className="text-sm text-slate-500 mt-2 line-clamp-2 italic text-ellipsis whitespace-normal">"{suggestion.rawStr}"</p>
                      <div className="mt-4 pt-4 border-t border-slate-50 flex gap-4 text-xs font-mono text-slate-500">
                        <span>BOOK: {suggestion.book.toUpperCase()}</span>
                        <span>CH: {suggestion.chapter.toString().padStart(2, '0')}</span>
                        {suggestion.verse && <span>VS: {suggestion.verse.toString().padStart(2, '0')}</span>}
                      </div>

                      <button 
                        onClick={(e) => removeSuggestion(suggestion.id, e)}
                        className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Dismiss"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Inspector Panel */}
            <div className="bg-slate-800 rounded-2xl p-8 text-white flex flex-col h-full overflow-hidden">
              <div className="flex justify-between items-center mb-8 shrink-0">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">System Variables</h2>
                {activeReference && (
                  <button onClick={() => setActiveReference(null)} className="text-xs font-semibold px-3 py-1 border border-slate-600 rounded hover:bg-slate-700 focus:outline-none transition-colors">Clear Vars</button>
                )}
              </div>

              {activeReference ? (
                <div className="space-y-8 flex-1 overflow-y-auto pr-2 pb-4">
                  <div>
                    <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Target Book</label>
                    <div className="text-4xl font-light text-blue-400">{activeReference.book}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Chapter</label>
                      <div className="text-5xl font-mono">{activeReference.chapter.toString().padStart(2, '0')}</div>
                    </div>
                    {activeReference.verse && (
                    <div>
                      <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Verse</label>
                      <div className="text-5xl font-mono text-blue-400 underline underline-offset-8 decoration-2">{activeReference.verse.toString().padStart(2, '0')}</div>
                    </div>
                    )}
                  </div>
                  <div className="pt-8 border-t border-slate-700 mt-auto">
                    <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Formatted Output</label>
                    <div className="text-2xl font-bold text-white mb-6">
                      {activeReference.formattedStr}
                    </div>
                    <label className="block text-slate-500 text-[10px] font-bold uppercase mb-4">Recognition Pattern Source</label>
                    <div className="bg-slate-900/50 p-4 rounded-lg font-mono text-xs text-green-400 break-all">
                      "{activeReference.rawStr}"
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500/50 pb-16">
                   <BookOpen className="w-16 h-16 mb-4 opacity-40" />
                   <p className="text-lg text-slate-400">No variable bound</p>
                   <p className="text-sm mt-2 text-center max-w-[250px]">
                     {semiAuto 
                       ? "Select a verse from the queue to populate system variables." 
                       : "Speak a bible reference to populate system variables."}
                   </p>
                </div>
              )}
            </div>

          </div>

          {/* Footer Status Bar */}
          <footer className="h-12 border-t border-slate-200 bg-white px-8 flex items-center justify-between text-xs text-slate-500 shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-blue-500' : 'bg-slate-300'}`}></span>
                <span>WebSpeech Engine: {isRecording ? 'Active' : 'Standby'}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span>Suggestions Stored: {suggestions.length}</span>
              <span className="px-2 py-0.5 bg-slate-100 rounded">JS Context: Browser Speech API</span>
            </div>
          </footer>
        </section>

      </main>

      {/* Pop-up Verse Modal */}
      {popupReference && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setPopupReference(null)}>
          <div 
            className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 max-w-5xl w-full text-center relative animate-in zoom-in-90 duration-300 ease-out flex flex-col md:flex-row items-center justify-between gap-8" 
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setPopupReference(null)} 
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors focus:outline-none"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="flex flex-col gap-2 order-2 md:order-1 items-center">
              <button onClick={() => handleNavigate('prev', 'chapter')} className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all" title="Previous Chapter">
                <ChevronsLeft className="w-8 h-8" />
              </button>
              <button onClick={() => handleNavigate('prev', 'verse')} className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all" title="Previous Verse">
                <ChevronLeft className="w-8 h-8" />
              </button>
            </div>

            <div className="flex-1 order-1 md:order-2 w-full">
              <BookOpen className="w-12 h-12 text-blue-500 mx-auto mb-6 opacity-80" />
              
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-8">
                {popupReference.formattedStr}
              </h2>
              
              <p className="text-2xl md:text-4xl font-medium text-slate-700 leading-relaxed font-serif italic text-balance mb-8 min-h-[100px] flex items-center justify-center">
                {isLoadingVerse ? (
                  <span className="opacity-50 blur-sm block animate-pulse">Loading translation...</span>
                ) : (
                  `"${fetchedVerseText || 'Verse text could not be loaded or entire chapter was selected.'}"`
                )}
              </p>
              
              <div className="flex items-center justify-center gap-4 mt-6">
                <div className="inline-block px-4 py-2 bg-slate-100 rounded-full text-slate-500 text-sm font-medium uppercase tracking-wider">
                  {bibleVersion === 'kjv' ? 'King James Version (KJV)' : `${bibleVersion.toUpperCase()} Translation`}
                </div>
                
                <a 
                  href={getBibleHubLink(popupReference.book, popupReference.chapter, popupReference.verse)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-full text-sm font-bold uppercase tracking-wider transition-colors"
                >
                  View Strong's Concordance
                </a>
              </div>
            </div>

            <div className="flex flex-col gap-2 order-3 items-center">
              <button onClick={() => handleNavigate('next', 'chapter')} className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all" title="Next Chapter">
                <ChevronsRight className="w-8 h-8" />
              </button>
              <button onClick={() => handleNavigate('next', 'verse')} className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all" title="Next Verse">
                <ChevronRight className="w-8 h-8" />
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
