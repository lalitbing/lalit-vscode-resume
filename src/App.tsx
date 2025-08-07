import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

type SectionId = 'home' | 'about' | 'experience' | 'projects' | 'skills' | 'education' | 'training' | 'contact';

type Section = {
  id: SectionId;
  title: string;
  filePath: string;
};

type OpenTab = {
  id: SectionId;
  title: string;
};

type Resume = {
  basics: {
    name: string;
    label: string;
    summary?: string;
    location?: { country?: string };
    profiles?: Array<{ network: string; username?: string; url?: string | null }>;
  };
  skills: Array<{ name: string; keywords: string[] }>;
  work: Array<{
    name: string;
    position: string;
    startDate: string;
    endDate: string | null;
    highlights: string[];
  }>;
  projects: Array<{
    name: string;
    year?: number;
    summary?: string;
    technologies?: string[];
    url?: string | null;
  }>;
  education: Array<{
    institution: string;
    studyType?: string;
    area?: string;
    startDate?: string;
    endDate?: string;
    score?: string;
  }>;
  certificates: Array<{ name: string; issuer?: string; date?: string }>;
  interests?: string[];
  meta?: Record<string, unknown>;
};

const SECTIONS: Section[] = [
  { id: 'home', title: 'Home', filePath: 'home.md' },
  { id: 'about', title: 'About', filePath: 'about.md' },
  { id: 'experience', title: 'Experience', filePath: 'experience.ts' },
  { id: 'projects', title: 'Projects', filePath: 'projects.json' },
  { id: 'skills', title: 'Skills', filePath: 'skills.ts' },
  { id: 'education', title: 'Education', filePath: 'education.md' },
  { id: 'training', title: 'Training & Certs', filePath: 'training.md' },
  { id: 'contact', title: 'Contact', filePath: 'contact.tsx' },
];

function App() {
  const [leftOpenTabs, setLeftOpenTabs] = useState<OpenTab[]>([{ id: 'home', title: 'Home' }]);
  const [leftActiveTabId, setLeftActiveTabId] = useState<SectionId>('home');
  const [rightOpenTabs, setRightOpenTabs] = useState<OpenTab[]>([]);
  const [rightActiveTabId, setRightActiveTabId] = useState<SectionId | null>(null);
  const [query, setQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  type ContextMenuState = null | {
    x: number;
    y: number;
    type: 'tab';
    tabId: SectionId;
    group: 'left' | 'right';
  };
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [splitRatio, setSplitRatio] = useState(0.5);
  const [dragOffsetPx, setDragOffsetPx] = useState<number | null>(null);

  const [resume, setResume] = useState<Resume | null>(null);
  const [resumeLoading, setResumeLoading] = useState<boolean>(true);

  const filteredSections = useMemo(() => {
    if (!query.trim()) return SECTIONS;
    const q = query.toLowerCase();
    return SECTIONS.filter((s) => s.title.toLowerCase().includes(q) || s.filePath.toLowerCase().includes(q));
  }, [query]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setContextMenu(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    async function load() {
      setResumeLoading(true);
      const primary = 'https://raw.githubusercontent.com/lalitbing/LalitBing/main/details.json';
      const fallback = '/resume.json';
      try {
        const res = await fetch(primary, { cache: 'no-store' });
        if (!res.ok) throw new Error('primary fetch failed');
        const data: Resume = await res.json();
        setResume(data);
      } catch {
        try {
          const res2 = await fetch(fallback, { cache: 'no-store' });
          if (!res2.ok) throw new Error('fallback fetch failed');
          const data2: Resume = await res2.json();
          setResume(data2);
        } catch {
          setResume(null);
        }
      } finally {
        setResumeLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!isResizing || !contentRef.current) return;
      const rect = contentRef.current.getBoundingClientRect();
      const offset = dragOffsetPx ?? 0;
      const rawX = e.clientX - rect.left - offset;
      const clampedX = Math.min(Math.max(rawX, 100), rect.width - 100);
      const ratio = clampedX / rect.width;
      setSplitRatio(Math.min(Math.max(ratio, 0.2), 0.8));
    }
    function onUp() {
      setIsResizing(false);
      setDragOffsetPx(null);
    }
    if (isResizing) {
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      const prevCursor = document.body.style.cursor;
      const prevSelect = document.body.style.userSelect as string;
      document.body.style.cursor = 'col-resize';
      (document.body.style as any).userSelect = 'none';
      return () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.body.style.cursor = prevCursor || '';
        (document.body.style as any).userSelect = prevSelect || '';
      };
    }
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [isResizing]);

  useEffect(() => {
    if (!contextMenu) return;
    const closeMenu = () => setContextMenu(null);
    document.addEventListener('click', closeMenu);
    document.addEventListener('scroll', closeMenu, true);
    window.addEventListener('resize', closeMenu);
    return () => {
      document.removeEventListener('click', closeMenu);
      document.removeEventListener('scroll', closeMenu, true);
      window.removeEventListener('resize', closeMenu);
    };
  }, [contextMenu]);

  function TabContextMenu({
    x,
    y,
    onClose,
    onCloseTab,
    onCloseOthers,
    onCloseRight,
    onCloseAll,
    onSplitLeft,
    onSplitRight,
    showSplit,
  }: {
    x: number;
    y: number;
    onClose: () => void;
    onCloseTab: () => void;
    onCloseOthers: () => void;
    onCloseRight: () => void;
    onCloseAll: () => void;
    onSplitLeft: () => void;
    onSplitRight: () => void;
    showSplit: boolean;
  }) {
    const style: React.CSSProperties = {
      left: Math.min(x, window.innerWidth - 200),
      top: Math.min(y, window.innerHeight - 160),
    };
    return (
      <div className="fixed z-[9999]" style={style} role="menu">
        <div
          className="rounded-lg shadow-2xl py-1"
          style={{
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.06) 100%)',
            backdropFilter: 'blur(14px) saturate(140%)',
            WebkitBackdropFilter: 'blur(14px) saturate(140%)',
            border: '1px solid rgba(255,255,255,0.18)',
            boxShadow:
              '0 10px 30px rgba(0,0,0,0.45), inset 0 1px rgba(255,255,255,0.08), 0 0 0 0.5px rgba(255,255,255,0.06)',
            width: 160,
          }}
        >
          <button
            onClick={() => {
              onCloseTab();
              onClose();
            }}
            className="w-full text-left px-3 py-1.5 text-[13px] text-white/90 hover:bg-white/15"
            role="menuitem"
          >
            Close
          </button>
          <button
            onClick={() => {
              onCloseOthers();
              onClose();
            }}
            className="w-full text-left px-3 py-1.5 text-[13px] text-white/90 hover:bg-white/15"
            role="menuitem"
          >
            Close Others
          </button>
          <button
            onClick={() => {
              onCloseRight();
              onClose();
            }}
            className="w-full text-left px-3 py-1.5 text-[13px] text-white/90 hover:bg-white/15"
            role="menuitem"
          >
            Close to the Right
          </button>
          <button
            onClick={() => {
              onCloseAll();
              onClose();
            }}
            className="w-full text-left px-3 py-1.5 text-[13px] text-white/90 hover:bg-white/15"
            role="menuitem"
          >
            Close All
          </button>
          {showSplit && (
            <>
              <div className="my-1 h-px bg-white/15" />
              <button
                onClick={() => {
                  onSplitLeft();
                  onClose();
                }}
                className="w-full text-left px-3 py-1.5 text-[13px] text-white/90 hover:bg-white/15"
                role="menuitem"
              >
                Split Left
              </button>
              <button
                onClick={() => {
                  onSplitRight();
                  onClose();
                }}
                className="w-full text-left px-3 py-1.5 text-[13px] text-white/90 hover:bg-white/15"
                role="menuitem"
              >
                Split Right
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  function handleTabDragStart(index: number, e: React.DragEvent<HTMLDivElement>) {
    setDragIndex(index);
    setDragOverIndex(index);
    try {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', leftOpenTabs[index].id);
    } catch {}
  }

  function handleTabDragOver(index: number, e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (dragOverIndex !== index) setDragOverIndex(index);
  }

  function handleTabDrop(index: number, e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (dragIndex === null) return;
    if (index === dragIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const next = [...leftOpenTabs];
    const [moved] = next.splice(dragIndex, 1);
    const insertIndex = dragIndex < index ? index - 1 : index;
    next.splice(insertIndex, 0, moved);
    setLeftOpenTabs(next);
    setDragIndex(null);
    setDragOverIndex(null);
  }

  function handleTabDragEnd() {
    setDragIndex(null);
    setDragOverIndex(null);
  }

  function closeOthers(tabId: SectionId) {
    setLeftOpenTabs((prev) => prev.filter((t) => t.id === tabId));
    setLeftActiveTabId(tabId);
  }

  function closeToRight(tabId: SectionId) {
    setLeftOpenTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === tabId);
      if (idx === -1) return prev;
      return prev.slice(0, idx + 1);
    });
    setLeftActiveTabId(tabId);
  }

  function closeAllTabs() {
    setLeftOpenTabs([{ id: 'home', title: 'Home' }]);
    setLeftActiveTabId('home');
    setRightOpenTabs([]);
    setRightActiveTabId(null);
  }

  function splitTab(tabId: SectionId, direction: 'left' | 'right', fromGroup: 'left' | 'right') {
    const section = SECTIONS.find((s) => s.id === tabId);
    if (!section) return;
    if (direction === 'right') {
      // Move to right group
      setRightOpenTabs((prev) => (prev.some((t) => t.id === tabId) ? prev : [...prev, { id: tabId, title: section.title }]));
      setRightActiveTabId(tabId);
      if (fromGroup === 'left') {
        setLeftOpenTabs((prev) => prev.filter((t) => t.id !== tabId));
        // adjust active if needed
        if (leftActiveTabId === tabId) setLeftActiveTabId(leftOpenTabs.find((t) => t.id !== tabId)?.id ?? 'home');
      }
    } else {
      // Move to left group
      setLeftOpenTabs((prev) => (prev.some((t) => t.id === tabId) ? prev : [...prev, { id: tabId, title: section.title }]));
      setLeftActiveTabId(tabId);
      if (fromGroup === 'right') {
        setRightOpenTabs((prev) => prev.filter((t) => t.id !== tabId));
        if (rightActiveTabId === tabId) setRightActiveTabId(rightOpenTabs.find((t) => t.id !== tabId)?.id ?? null);
      }
    }
  }

  function FileIcon({ filePath, className, size = 18 }: { filePath: string; className?: string; size?: number }) {
    const name = filePath.toLowerCase();
    const ext = name.split('.').pop() || '';

    function Svg({ children }: { children: any }) {
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
          {children}
        </svg>
      );
    }

    // React (tsx)
    if (ext === 'tsx' || name.endsWith('.jsx')) {
      return (
        <Svg>
          <circle cx="8" cy="8" r="2" fill="#00d8ff" />
          <g stroke="#00d8ff" strokeWidth="1" fill="none">
            <ellipse cx="8" cy="8" rx="6" ry="2.5" />
            <ellipse cx="8" cy="8" rx="6" ry="2.5" transform="rotate(60 8 8)" />
            <ellipse cx="8" cy="8" rx="6" ry="2.5" transform="rotate(120 8 8)" />
          </g>
        </Svg>
      );
    }

    // TypeScript (.ts)
    if (ext === 'ts') {
      return (
        <Svg>
          <rect x="1" y="2" width="14" height="12" rx="2" fill="#2f74c0" />
          <text x="8" y="11" textAnchor="middle" fontSize="7" fontWeight="700" fill="#fff" fontFamily="Inter, system-ui, sans-serif">
            TS
          </text>
        </Svg>
      );
    }

    // Vite config
    if (name === 'vite.config.ts' || name === 'vite.config.js') {
      return (
        <Svg>
          <path d="M2 3l6 10 6-10z" fill="#ffcc66" />
          <path d="M2.5 3.2L8 12 13.5 3.2" stroke="#7c4dff" strokeWidth="1.3" fill="none" />
        </Svg>
      );
    }

    // HTML
    if (ext === 'html') {
      return (
        <Svg>
          <path d="M2 2h12l-1 11-5 1-5-1z" fill="#e54d26" />
          <path d="M8 3v9" stroke="#fff" strokeWidth="1" />
          <path d="M5 5h3m0 0h3M5 8h6M5 11h6" stroke="#fff" strokeWidth="1" />
        </Svg>
      );
    }

    // CSS
    if (ext === 'css') {
      return (
        <Svg>
          <rect x="1" y="2" width="14" height="12" rx="2" fill="#8a5cf6" />
          <text x="8" y="11" textAnchor="middle" fontSize="6.5" fontWeight="800" fill="#fff" fontFamily="Inter, system-ui, sans-serif">
            CSS
          </text>
        </Svg>
      );
    }

    // ESLint config
    if (name.includes('eslint') && (ext === 'js' || ext === 'cjs' || ext === 'mjs')) {
      return (
        <Svg>
          <polygon points="8,2 12.9,5 12.9,11 8,14 3.1,11 3.1,5" fill="#4b32c3" />
          <text x="8" y="10.5" textAnchor="middle" fontSize="6" fontWeight="700" fill="#fff" fontFamily="Inter, system-ui, sans-serif">
            ES
          </text>
        </Svg>
      );
    }

    // NPM (package.json, package-lock.json)
    if (name === 'package.json' || name === 'package-lock.json') {
      return (
        <Svg>
          <rect x="1" y="3" width="14" height="10" rx="2" fill="#cb3837" />
          <text x="8" y="10.5" textAnchor="middle" fontSize="6" fontWeight="800" fill="#fff" fontFamily="Inter, system-ui, sans-serif">
            npm
          </text>
        </Svg>
      );
    }

    // TSConfig
    if (name.startsWith('tsconfig') && ext === 'json') {
      return (
        <Svg>
          <rect x="1" y="2" width="14" height="12" rx="2" fill="#2f74c0" />
          <text x="8" y="10.5" textAnchor="middle" fontSize="6.5" fontWeight="800" fill="#fff" fontFamily="Inter, system-ui, sans-serif">
            TS
          </text>
          <circle cx="12.5" cy="4.5" r="2" stroke="#fff" strokeWidth="1" fill="none" />
          <circle cx="12.5" cy="4.5" r="1" fill="#fff" />
        </Svg>
      );
    }

    // Git ignore
    if (name === '.gitignore') {
      return (
        <Svg>
          <rect x="2" y="3" width="12" height="10" rx="2" fill="#f05133" />
          <path d="M5 6l6 4M11 6l-6 4" stroke="#fff" strokeWidth="1.2" />
        </Svg>
      );
    }

    // README / Markdown
    if (ext === 'md') {
      return (
        <Svg>
          <rect x="2" y="2" width="12" height="12" rx="2" fill="#ffcc66" />
          <path d="M4 4h8M4 7h8M4 10h5" stroke="#3b2e1a" strokeWidth="1" />
        </Svg>
      );
    }

    // JSON (generic)
    if (ext === 'json') {
      return (
        <Svg>
          <rect x="1" y="2" width="14" height="12" rx="2" fill="#f29f3a" />
          <text x="8" y="11" textAnchor="middle" fontSize="7" fontWeight="800" fill="#0b1220" fontFamily="Inter, system-ui, sans-serif">{`{}`}</text>
        </Svg>
      );
    }

    // Default: show extension label
    return (
      <Svg>
        <rect x="1" y="2" width="14" height="12" rx="2" fill="#7f8c98" />
        <text
          x="8"
          y="11"
          textAnchor="middle"
          fontSize={ext.length > 3 ? 5.5 : 6.5}
          fontWeight="800"
          fill="#0b1220"
          fontFamily="Inter, system-ui, sans-serif"
        >
          {ext.toUpperCase()}
        </text>
      </Svg>
    );
  }

  function openSection(section: Section, target: 'left' | 'right' = 'left') {
    if (target === 'left') {
      setLeftOpenTabs((prev) => {
        if (prev.some((t) => t.id === section.id)) return prev;
        return [...prev, { id: section.id, title: section.title }];
      });
      setLeftActiveTabId(section.id);
    } else {
      setRightOpenTabs((prev) => {
        if (prev.some((t) => t.id === section.id)) return prev;
        return [...prev, { id: section.id, title: section.title }];
      });
      setRightActiveTabId(section.id);
    }
  }

  function closeTab(tabId: SectionId, group: 'left' | 'right' = 'left') {
    const setOpen = group === 'left' ? setLeftOpenTabs : setRightOpenTabs;
    const setActive = group === 'left' ? setLeftActiveTabId : setRightActiveTabId;
    const activeId = group === 'left' ? leftActiveTabId : rightActiveTabId;
    setOpen((prev) => {
      const idx = prev.findIndex((t) => t.id === tabId);
      if (idx === -1) return prev;
      const next = prev.filter((t) => t.id !== tabId);
      if (activeId === tabId) {
        const fallback = next[idx - 1] || next[idx] || undefined;
        setActive(fallback ? fallback.id : (group === 'left' ? 'home' : (next[0]?.id ?? null)) as any);
        if (!fallback) {
          return group === 'left' ? [{ id: 'home', title: 'Home' }] : [];
        }
      }
      return next.length ? next : group === 'left' ? [{ id: 'home', title: 'Home' }] : [];
    });
  }

  function Editor({ lines }: { lines: string[] }) {
    const [hoveredLine, setHoveredLine] = useState<number | null>(null);
    return (
      <div className="h-full w-full min-w-0 overflow-y-auto overflow-x-hidden bg-[#1d2433] font-mono text-[13px]">
        <div className="w-full">
          {lines.map((line, idx) => {
            const isHovered = hoveredLine === idx;
            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredLine(idx)}
                onMouseLeave={() => setHoveredLine(null)}
                className={
                  'grid grid-cols-[56px_1fr] items-start py-1 leading-5 border-b border-transparent ' +
                  (isHovered ? 'bg-[#2f3b54] border-l-2 border-l-[#ffcc66]' : '')
                }
              >
                <div className={'select-none pr-3 pl-2 pt-0.5 text-right ' + (isHovered ? 'text-[#d7dce2]' : 'text-[#6679a4]')}>{idx + 1}</div>
                <div className="whitespace-pre-wrap break-words px-3 text-[#d7dce2]">{line.length ? line : ' '}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function getSectionLines(id: SectionId): string[] {
    // Helper formatters for resume-backed rendering
    const fmtDate = (d?: string | null) => (d ? d : 'Present');
    const linesFromResume = (section: SectionId): string[] | null => {
      if (!resume) return null;
      switch (section) {
        case 'home': {
          const name = resume.basics?.name ?? 'Lalit Sharma';
          const label = resume.basics?.label ?? 'Software Engineer';
          const summary = resume.basics?.summary ?? '';
          const out: string[] = [`# ${name}`, label, '', summary].filter(Boolean) as string[];
          return out;
        }
        case 'about': {
          const summary = resume.basics?.summary ?? '';
          const out: string[] = ['# About', '', summary].filter(Boolean) as string[];
          return out;
        }
        case 'experience': {
          const out: string[] = ['# Work Experience', ''];
          resume.work?.forEach((w) => {
            out.push(`${w.position} — ${w.name} (${w.startDate} – ${fmtDate(w.endDate)})`);
            (w.highlights || []).forEach((h) => out.push(`• ${h}`));
            out.push('');
          });
          return out;
        }
        case 'projects': {
          const out: string[] = ['# Projects', ''];
          resume.projects?.forEach((p) => {
            const tech = p.technologies && p.technologies.length ? ` — ${p.technologies.join(', ')}` : '';
            const yr = p.year ? ` (${p.year})` : '';
            out.push(`${p.name}${yr} — ${p.summary ?? ''}${tech}`.trim());
          });
          return out;
        }
        case 'skills': {
          const out: string[] = ['# Skills', ''];
          resume.skills?.forEach((s) => out.push(`${s.name}: ${s.keywords.join(', ')}`));
          return out;
        }
        case 'education': {
          const out: string[] = ['# Education', ''];
          resume.education?.forEach((e) => {
            const meta: string[] = [];
            if (e.startDate || e.endDate) meta.push(`${e.startDate ?? ''} – ${e.endDate ?? ''}`.trim());
            if (e.score) meta.push(e.score);
            const metaStr = meta.length ? ` (${meta.join(' — ')})` : '';
            out.push(`${e.studyType ? e.studyType + ' | ' : ''}${e.area ?? ''} — ${e.institution}${metaStr}`.trim());
          });
          return out;
        }
        case 'training': {
          const out: string[] = ['# Training & Certifications', ''];
          resume.certificates?.forEach((c) => {
            const issuer = c.issuer ? ` — ${c.issuer}` : '';
            const date = c.date ? ` (${c.date})` : '';
            out.push(`${c.name}${issuer}${date}`);
          });
          return out;
        }
        case 'contact': {
          const out: string[] = ['# Contact', ''];
          const profiles = resume.basics?.profiles ?? [];
          profiles.forEach((p) => {
            const prefix = p.network;
            const value = p.url ?? p.username ?? '';
            out.push(`${prefix}: ${value}`);
          });
          return out;
        }
        default:
          return null;
      }
    };

    const resumeLines = linesFromResume(id);
    if (resumeLines) return resumeLines;

    // Fallback to static copy if resume not loaded
    switch (id) {
      case 'home':
        return [
          '# Lalit Sharma',
          'Software Engineer',
          '',
          'Detail‑oriented, organized and meticulous. Works at fast pace to meet tight deadlines.',
          'Enthusiastic team player ready to contribute to company success by achieving targets.',
        ];
      case 'about':
        return [
          '# About',
          '',
          'Full‑stack engineer focused on React, TypeScript, Node.js and modern tooling.',
          'Experience leading migration of legacy UI to modern React with performance gains,',
          'building Micro‑Frontend Architecture, and enforcing authentication/authorization and',
          'accessibility (WCAG). Strong interest in DX, testing, and scalable UI systems.',
        ];
      case 'experience':
        return [
          '# Work Experience',
          '',
          'Software Engineer — Magic EdTech (07/2022 – Present)',
          '• Led migration of old UI to modern React app with ~75% improvement in performance.',
          '• Created and worked on Micro‑Frontend Architecture.',
          '• Built complex React applications using ReactJS, TypeScript and StencilJS.',
          '• Integrated authentication with live validation and encryption; used OAuth 2.0 for SocialSignOn.',
          '• Built reusable web components in StencilJS; maintained a Storybook library.',
          '• Implemented TailwindCSS styling and WCAG‑compliant accessible UI.',
          '• Implemented responsive design and UI test cases across browsers.',
          '• Collaborated with Backend and UI/UX teams to deliver features.',
          '',
          'Project Engineer — Wipro Limited (03/2021 – 06/2022)',
          '• Delivered user‑facing features using ReactJS and reusable components.',
          '• Built reusable web methods/solutions used across business domains.',
          '• Designed responsive pages with HTML5, CSS3, JavaScript and ReactJS per W3C standards.',
          '• Managed firewall over internal network; provisioned/denied access to servers/apps.',
          '• Completed client requests under SLA.',
        ];
      case 'projects':
        return [
          '# Projects',
          '',
          'Comfy Sloth (2022) — E‑commerce store replica; product filters, categories, deep React integration.',
          'Backroads (2021) — Travel‑based responsive site using HTML, CSS and Vanilla JS.',
          'Static Website Hosting & Cross Account Access (2019) — Hosted on AWS with cross‑account access.',
          'Floppy Dude (2018) — Game built from scratch in Java (Flappy‑bird inspired).',
          'Box Moving Mechanism (2017) — Final year project in Mechanical Engineering.',
        ];
      case 'skills':
        return [
          '# Skills',
          '',
          'Web: HTML, CSS, JavaScript, TypeScript, TailwindCSS',
          'Frontend: React JS, StencilJS, Redux, Hooks, Routers',
          'Backend: Node.js',
          'Core: Data Structures, OOPs',
          'Languages: Java, C/C++',
          'Cloud: AWS',
        ];
      case 'education':
        return [
          '# Education',
          '',
          'B.Tech | Computer Science — Ajay Kumar Garg Engineering College (08/2017 – 08/2020) — 69%',
          'Diploma | Mechanical Engineering — Aryabhat Institute of Technology (08/2014 – 05/2017) — 64%',
          'Secondary | Class X — Army Public School Dhaula Kuan (04/2013 – 03/2014) — CGPA 7.8',
        ];
      case 'training':
        return [
          '# Training & Certifications',
          '',
          'Full Stack Web Development — MERN Stack (07/2023)',
          'JavaScript, HTML & CSS — Udemy (2020)',
          'Amazon Web Services — Udemy (2019)',
          'Core Java — CodeKamp (2018)',
          'C and C++ Programming — Aptech (2017)',
        ];
      case 'contact':
        return [
          '# Contact',
          '',
          'Email:   lalitdev9013@gmail.com',
          'Phone:   +91 8130417929',
          'LinkedIn: linkedin.com/in/lalitbing',
          'GitHub:  github.com/lalitbing',
        ];
      default:
        return [];
    }
  }

  function renderEditorContent(id: SectionId) {
    const lines = getSectionLines(id);
    if (resumeLoading && id === 'home') {
      return <Editor lines={[`# Loading…`, '', 'Fetching resume data…']} />;
    }
    return <Editor lines={lines} />;
  }

  return (
    <div className="h-full bg-[#171c28] text-[#d7dce2] font-[system-ui] flex flex-col">
      {/* Top bar with Command Palette like search (Halcyon) */}
      <div className="h-10 border-b border-[#2f3b54] grid grid-cols-[1fr_auto_1fr] items-center px-3 gap-3 bg-[#171c28]">
        <div className="text-[#d7dce2] text-sm font-medium">Lalit Sharma</div>
        <div className="w-full max-w-lg justify-self-center relative">
          <div className="flex items-center gap-2 bg-[#2f3b54] rounded px-2 py-1 focus-within:ring-1 focus-within:ring-[#ffcc66]/70">
            <span className="text-[#8695b7] text-xs">⌘K</span>
            <input
              ref={searchInputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setQuery('');
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const first = filteredSections[0];
                  if (first) {
                    openSection(first);
                    setQuery('');
                  }
                }
              }}
              placeholder="Search files..."
              className="bg-transparent outline-none text-sm w-full placeholder:text-[#8695b7] text-[#d7dce2]"
            />
          </div>
          {query.trim() && (
            <div className="absolute left-0 right-0 mt-1 z-50 bg-[#1d2433] border border-[#2f3b54] rounded shadow-lg">
              <ul className="max-h-72 overflow-auto py-1">
                {filteredSections.length ? (
                  filteredSections.map((s) => (
                    <li key={s.id}>
                      <button
                        onClick={() => {
                          openSection(s);
                          setQuery('');
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-[#2f3b54] text-[#d7dce2] flex items-center gap-2"
                      >
                        <FileIcon filePath={s.filePath} size={16} />
                        <div className="flex flex-col leading-tight">
                          <div className="text-[13px]">{s.filePath}</div>
                          <div className="text-[11px] text-[#8695b7]">{s.title}</div>
                        </div>
                      </button>
                    </li>
                  ))
                ) : (
                  <li className="px-3 py-2 text-[#8695b7] text-sm">No results</li>
                )}
              </ul>
            </div>
          )}
        </div>
        <div />
      </div>

      {/* Main layout */}
      <div className="flex-1 flex" ref={contentRef}>
        {/* Side bar */}
        <aside className="w-64 border-r border-[#2f3b54] bg-[#171c28]">
          <div className="px-3 py-2 text-xs uppercase tracking-wide text-[#8695b7]">Explorer</div>
          <ul className="px-2 pb-4 space-y-1">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => openSection(s)}
                  className={
                    'w-full text-left flex items-center gap-2 px-2 py-1 rounded ' +
                    (leftActiveTabId === s.id || rightActiveTabId === s.id ? 'bg-[#2f3b54] text-[#d7dce2]' : 'hover:bg-[#1d2433] text-[#a2aabc]')
                  }
                >
                  <FileIcon filePath={s.filePath} className="shrink-0" size={18} />
                  <span className={(leftActiveTabId === s.id || rightActiveTabId === s.id) ? 'text-[#d7dce2]' : 'text-[#a2aabc]'}>{s.filePath}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Editor area: two groups (left, right if present) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left group */}
          <div className="flex flex-col border-r border-[#2f3b54]" style={{ width: rightOpenTabs.length ? `${splitRatio * 100}%` : '100%' }}>
            <div className="h-9 border-b border-[#2f3b54] bg-[#171c28] flex items-stretch overflow-x-auto">
              {leftOpenTabs.map((tab, index) => {
              const sec = SECTIONS.find((s) => s.id === tab.id);
              return (
                <div
                  key={tab.id}
                  className={
                    'flex items-center gap-2 px-3 text-sm border-r border-[#2f3b54] select-none cursor-pointer ' +
                    (leftActiveTabId === tab.id ? 'bg-[#1d2433] text-[#d7dce2] border-b-2 border-b-[#ffcc66]' : 'text-[#8695b7] hover:bg-[#1d2433]')
                  }
                  onClick={() => setLeftActiveTabId(tab.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setContextMenu({ x: e.clientX, y: e.clientY, type: 'tab', tabId: tab.id, group: 'left' });
                  }}
                  draggable
                  onDragStart={(e) => handleTabDragStart(index, e)}
                  onDragOver={(e) => handleTabDragOver(index, e)}
                  onDrop={(e) => handleTabDrop(index, e)}
                  onDragEnd={handleTabDragEnd}
                  role="button"
                  data-tab-id={tab.id}
                  style={dragOverIndex === index && dragIndex !== null && dragIndex !== index ? { boxShadow: 'inset -2px 0 0 #ffcc66' } : undefined}
                >
                  {sec ? <FileIcon filePath={sec.filePath} size={16} /> : null}
                  <span>{tab.title}</span>
                   <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.id, 'left');
                    }}
                    className={leftActiveTabId === tab.id ? 'text-[#8695b7] hover:text-[#d7dce2]' : 'text-[#6679a4] hover:text-[#a2aabc]'}
                    aria-label={`Close ${tab.title}`}
                  >
                    ×
                   </button>
                </div>
              );
              })}
            </div>
            <div className="flex-1 min-w-0 bg-[#1d2433]">{leftActiveTabId ? renderEditorContent(leftActiveTabId) : null}</div>
          </div>

          {/* Resizer */}
          {rightOpenTabs.length ? (
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                setIsResizing(true);
                if (contentRef.current) {
                  const rect = contentRef.current.getBoundingClientRect();
                  const currentSplitterX = rect.left + splitRatio * rect.width;
                  setDragOffsetPx(e.clientX - currentSplitterX);
                }
              }}
              className="w-1.5 cursor-col-resize bg-transparent hover:bg-white/10"
            />
          ) : null}

          {/* Right group */}
          <div className="flex flex-col" style={{ width: rightOpenTabs.length ? `${(1 - splitRatio) * 100}%` : 0, display: rightOpenTabs.length ? 'flex' : 'none' }}>
            <div className="h-9 border-b border-[#2f3b54] bg-[#171c28] flex items-stretch overflow-x-auto">
              {rightOpenTabs.map((tab) => {
                const sec = SECTIONS.find((s) => s.id === tab.id);
                return (
                  <div
                    key={tab.id}
                    className={
                      'flex items-center gap-2 px-3 text-sm border-r border-[#2f3b54] select-none cursor-pointer ' +
                      (rightActiveTabId === tab.id ? 'bg-[#1d2433] text-[#d7dce2] border-b-2 border-b-[#ffcc66]' : 'text-[#8695b7] hover:bg-[#1d2433]')
                    }
                    onClick={() => setRightActiveTabId(tab.id)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setContextMenu({ x: e.clientX, y: e.clientY, type: 'tab', tabId: tab.id, group: 'right' });
                    }}
                    role="button"
                    data-tab-id={tab.id}
                  >
                    {sec ? <FileIcon filePath={sec.filePath} size={16} /> : null}
                    <span>{tab.title}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.id, 'right');
                    }}
                    className={rightActiveTabId === tab.id ? 'text-[#8695b7] hover:text-[#d7dce2]' : 'text-[#6679a4] hover:text-[#a2aabc]'}
                    aria-label={`Close ${tab.title}`}
                  >
                    ×
        </button>
                  </div>
                );
              })}
            </div>
            <div className="flex-1 min-w-0 bg-[#1d2433]">{rightActiveTabId ? renderEditorContent(rightActiveTabId) : null}</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="h-9 border-t border-[#2f3b54] bg-[#171c28] flex items-center justify-center text-[12px] text-[#8695b7] select-none">
        <span className="mr-1">Developed with</span>
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden className="mx-1">
          <path d="M12.1 21.35l-1.1-.98C5.14 15.36 2 12.5 2 8.9 2 6.1 4.2 4 6.9 4c1.6 0 3.17.76 4.1 1.96C12.93 4.76 14.5 4 16.1 4 18.8 4 21 6.1 21 8.9c0 3.6-3.14 6.46-8.99 11.47l-1.91 1.68z" fill="#ef6b73"/>
        </svg>
        <span className="mr-1">by Lalit. Inspired by most used Code Editor.</span>
      </footer>
      {/* Context Menu */}
      {contextMenu && contextMenu.type === 'tab' && (
        <TabContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onCloseTab={() => closeTab(contextMenu.tabId, contextMenu.group)}
          onCloseOthers={() => closeOthers(contextMenu.tabId)}
          onCloseRight={() => closeToRight(contextMenu.tabId)}
          onCloseAll={closeAllTabs}
          onSplitLeft={() => splitTab(contextMenu.tabId, 'left', contextMenu.group)}
          onSplitRight={() => splitTab(contextMenu.tabId, 'right', contextMenu.group)}
          showSplit={(contextMenu.group === 'left' ? leftOpenTabs.length : rightOpenTabs.length) >= 2}
        />
      )}
    </div>
  );
}

export default App;
