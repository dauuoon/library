import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { seedCategories, seedEntries, searchEntries } from './data'
import notionData from './data.json'
import type { Category, Entry, Book } from './types'

type NotionBook = Omit<Partial<Book>, 'rating' | 'mediaType' | 'state'> & {
  rating?: number | null
  mediaType?: string | null
  state?: string | null
}

type NotionData = { entries?: Partial<Entry>[]; books?: NotionBook[]; commons?: Partial<Entry>[] }

function buildCategoriesFromEntries(items: (Entry | Book)[], base: Category[] = []) {
  const baseMap = new Map(base.map((cat) => [cat.id, cat]))
  const additional = new Set<string>()

  items.forEach((item) => {
    item.categories.forEach((cat) => {
      if (typeof cat === 'string' && !baseMap.has(cat)) additional.add(cat)
    })
  })

  const additionalCategories = Array.from(additional).map((name) => ({ id: name, name, description: undefined }))
  return [...baseMap.values(), ...additionalCategories]
}

function fixText(value?: string): string {
  if (!value) return ''
  try {
    let s = value.normalize('NFC')
    // zero-width / BOM / replacement chars
    s = s.replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    s = s.replace(/\uFFFD+/g, '')
    // smart quotes, dashes, ellipsis
    s = s
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/…/g, '...')
      .replace(/–|—/g, '-')
    return s
  } catch {
    return value
  }
}

function normalizeEntry(input: Partial<Entry>): Entry {
  const now = new Date().toISOString()
  return {
    id: input.id ?? slugify(input.title ?? 'entry'),
    title: fixText(input.title) || '제목 미정',
    summary: fixText(input.summary),
    content: fixText(input.content),
    imageUrl: input.imageUrl,
    youtubeUrl: input.youtubeUrl,
    youtubeTitle: input.youtubeTitle,
    linkUrl: input.linkUrl,
    source: input.source ? fixText(input.source) : input.source,
    tags: input.tags ?? [],
    categories: input.categories ?? [],
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? input.createdAt ?? now,
    viewedAt: input.viewedAt,
  }
}

function normalizeBook(input: NotionBook): Book {
  const normalizeState = (state?: string | null): Book['state'] => {
    if (!state) return 'unread'
    const raw = state.toString().trim().toLowerCase()
    if (['읽기전', '읽기 전', 'unread', '미독', 'not started'].includes(raw)) return 'unread'
    if (['읽는중', '읽는 중', 'reading', '진행중', 'in progress'].includes(raw)) return 'reading'
    if (['완료', '완독', 'completed', 'done', 'finished'].includes(raw)) return 'completed'
    return 'unread'
  }

  const now = new Date().toISOString()
  return {
    id: input.id ?? slugify(input.title ?? 'book'),
    title: fixText(input.title) || '제목 미정',
    summary: fixText(input.summary),
    content: fixText(input.content),
    imageUrl: input.imageUrl,
    youtubeUrl: input.youtubeUrl,
    youtubeTitle: input.youtubeTitle,
    linkUrl: input.linkUrl,
    source: input.source ? fixText(input.source) : input.source,
    tags: input.tags ?? [],
    categories: input.categories ?? [],
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? input.createdAt ?? now,
    viewedAt: input.viewedAt,
    year: input.year ?? new Date().getFullYear(),
    state: normalizeState(input.state),
    rating: input.rating == null ? undefined : Number(input.rating),
    mediaType: input.mediaType ? fixText(input.mediaType) : undefined,
  }
}

const stripLeadingQuoteMarks = (text: string) =>
  text
    .replace(/^["“”']+/, '')
    .replace(/["“”']+$/, '')
    .trim()

function App() {
  const [entries] = useState<Entry[]>(() => {
    const fileEntries = (notionData as NotionData).entries ?? []
    const normalized = fileEntries.map(normalizeEntry)
    return normalized.length ? normalized : seedEntries
  })

  const [commons] = useState<Entry[]>(() => {
    const fileCommons = (notionData as NotionData).commons ?? []
    const normalized = fileCommons.map(normalizeEntry)
    return normalized
  })

  const [books] = useState<Book[]>(() => {
    const fileBooks = (notionData as NotionData).books ?? []
    const normalized = fileBooks.map(normalizeBook)
    return normalized
  })

  const pureBooks = useMemo(
    () => books.filter((book) => {
      const type = book.mediaType?.trim()
      return !type || type === '도서'
    }),
    [books],
  )

  const moviesList = useMemo(
    () => books.filter((book) => {
      const type = book.mediaType?.trim()
      return type && type !== '도서'
    }),
    [books],
  )

  const encyclopediaCategories = useMemo(() => buildCategoriesFromEntries(entries, seedCategories), [entries])
  const commonsCategories = useMemo(() => buildCategoriesFromEntries(commons), [commons])
  const bookCategories = useMemo(() => buildCategoriesFromEntries(pureBooks), [pureBooks])
  const movieCategories = useMemo(() => buildCategoriesFromEntries(moviesList), [moviesList])
  
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showCategories, setShowCategories] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [showQuiz, setShowQuiz] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [currentView, setCurrentView] = useState<'encyclopedia' | 'commons' | 'books' | 'movies' | 'stats'>('encyclopedia')
  const [randomQuote, setRandomQuote] = useState<{ book: string; paragraph: string } | null>(null)
  const [clickCounts, setClickCounts] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(localStorage.getItem('clickCounts_v1') || '{}')
    } catch {
      return {}
    }
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    try {
      localStorage.setItem('clickCounts_v1', JSON.stringify(clickCounts))
    } catch {}
  }, [clickCounts])

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 2000)
      return () => clearTimeout(timer)
    }
  }, [toastMessage])

  useEffect(() => {
    // 도서사전일 때 랜덤 문단 선택
    if (currentView === 'books' && pureBooks.length > 0) {
      const randomBook = pureBooks[Math.floor(Math.random() * pureBooks.length)]
      if (randomBook?.content) {
        const paragraphs = randomBook.content
          .split('\n\n')
          .map(p => p.trim())
          .map(stripLeadingQuoteMarks)
          .filter(p => p.startsWith('✏️'))
        if (paragraphs.length > 0) {
          const randomParagraph = paragraphs[Math.floor(Math.random() * paragraphs.length)]
          setRandomQuote({ book: randomBook.title, paragraph: stripLeadingQuoteMarks(randomParagraph) })
          return
        }
      }
      setRandomQuote(null)
    } else {
      setRandomQuote(null)
    }
  }, [currentView, pureBooks])

  const currentData = useMemo(() => {
    if (currentView === 'commons') return commons
    if (currentView === 'books') return pureBooks
    if (currentView === 'movies') return moviesList
    return entries
  }, [currentView, entries, commons, pureBooks, moviesList])

  const currentCategories = useMemo(() => {
    if (currentView === 'commons') return commonsCategories
    if (currentView === 'books') return bookCategories
    if (currentView === 'movies') return movieCategories
    return encyclopediaCategories
  }, [currentView, commonsCategories, bookCategories, movieCategories, encyclopediaCategories])

  const categoryCounts = useMemo(() => {
    const counts: { [key: string]: number } = {}
    currentCategories.forEach((cat) => {
      counts[cat.id] = currentData.filter((item) =>
        item.categories.includes(cat.id)
      ).length
    })
    return counts
  }, [currentData, currentCategories])

  const filtered = useMemo(() => {
    const base = query.trim() ? searchEntries(currentData, query) : currentData
    const result = selectedCategory
      ? base.filter((item) => item.categories.includes(selectedCategory))
      : base
    return result.sort((a, b) => {
      const consonantA = getInitialConsonant(a.title)
      const consonantB = getInitialConsonant(b.title)
      if (consonantA === consonantB) {
        return a.title.localeCompare(b.title, 'ko')
      }
      return CONSONANTS.indexOf(consonantA) - CONSONANTS.indexOf(consonantB)
    })
  }, [currentData, query, selectedCategory])

  const bookStats = useMemo(() => {
    const yearCounts: { [year: number]: number } = {}
    pureBooks.forEach(book => {
      if (book.year) {
        yearCounts[book.year] = (yearCounts[book.year] || 0) + 1
      }
    })
    return Object.entries(yearCounts)
      .map(([year, count]) => ({ year: parseInt(year), count }))
      .sort((a, b) => b.year - a.year)
  }, [pureBooks])

  const movieStats = useMemo(() => {
    const yearCounts: { [year: number]: number } = {}
    moviesList.forEach(item => {
      if (item.year) {
        yearCounts[item.year] = (yearCounts[item.year] || 0) + 1
      }
    })
    return Object.entries(yearCounts)
      .map(([year, count]) => ({ year: parseInt(year), count }))
      .sort((a, b) => b.year - a.year)
  }, [moviesList])

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => {
      const next = prev === id ? null : id
      if (next === id) {
        setClickCounts((prevCounts) => ({ ...prevCounts, [id]: (prevCounts[id] || 0) + 1 }))
      }
      return next
    })
  }


  return (
    <div className="shell">
      <section className="search-dock">
        <div className="search-row">
          {currentView === 'stats' ? (
            <>
              <div className="stats-title">통계</div>
              <div className="search-actions">
                <button
                  className="ghost icon"
                  aria-label="전체메뉴"
                  onClick={() => setShowMenu((v) => !v)}
                  title="전체메뉴"
                >
                  <span className="material-symbols-outlined">menu</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <SearchBar
                value={query}
                onChange={setQuery}
                placeholder={
                  currentView === 'books'
                    ? '도서명으로 검색하세요'
                    : currentView === 'movies'
                      ? '영화·시리즈명으로 검색하세요'
                      : currentView === 'commons'
                          ? '이론 단어로 검색하세요'
                          : '단어명으로 검색하세요'

                }
              />
              <div className="search-actions">
                <button
                  className="ghost icon"
                  aria-label="필터"
                  onClick={() => setShowCategories((v) => !v)}
                  title="필터"
                >
                  <span className="material-symbols-outlined">tune</span>
                </button>
                <button
                  className="ghost icon"
                  aria-label="전체메뉴"
                  onClick={() => setShowMenu((v) => !v)}
                  title="전체메뉴"
                >
                  <span className="material-symbols-outlined">menu</span>
                </button>
              </div>
            </>
          )}
        </div>
        {currentView !== 'stats' && showCategories && (
          <div className="chips dropdown">
            <button
              className={!selectedCategory ? 'chip active' : 'chip'}
              onClick={() => setSelectedCategory(null)}
            >
              전체({currentData.length})
            </button>
            {currentCategories.map((cat) => (
              <button
                key={cat.id}
                className={selectedCategory === cat.id ? 'chip active' : 'chip'}
                onClick={() => setSelectedCategory(cat.id)}
                title={cat.description}
              >
                {cat.name}({categoryCounts[cat.id] || 0})
              </button>
            ))}
          </div>
        )}

        {currentView !== 'stats' && currentView !== 'books' && currentView !== 'movies' && (
          <div className="consonants-row">
            {CONSONANTS.map((consonant) => (
              <button
                key={consonant}
                className="consonant-btn"
                onClick={() => {
                  const element = document.querySelector(`[data-consonant="${consonant}"]`)
                  element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
              >
                {consonant}
              </button>
            ))}
          </div>
        )}
      </section>

      {currentView === 'books' && bookStats.length > 0 && (
        <div className="book-stats">
          <div className="stats-grid">
            {bookStats.map(({ year, count }) => (
              <div key={year} className="stat-item">
                <span className="stat-year">{year}년</span>
                <span className="stat-badge">{count}</span>
              </div>
            ))}
          </div>
          {randomQuote && (
            <div className="random-quote">
              <p className="quote-text">{randomQuote.paragraph}</p>
              <p className="quote-book">-{randomQuote.book}-</p>
            </div>
          )}
        </div>
      )}

      {currentView === 'movies' && movieStats.length > 0 && (
        <div className="book-stats">
          <div className="stats-grid">
            {movieStats.map(({ year, count }) => (
              <div key={year} className="stat-item">
                <span className="stat-year">{year}년</span>
                <span className="stat-badge">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {currentView === 'stats' ? (
        <StatsPanel
          entries={entries}
          commons={commons}
          books={pureBooks}
          movies={moviesList}
          encyclopediaCategories={encyclopediaCategories}
          commonsCategories={commonsCategories}
          bookCategories={bookCategories}
          movieCategories={movieCategories}
          clickCounts={clickCounts}
        />
      ) : (
        <section className="panel list-panel">
          <EntryList
            entries={filtered}
            categories={currentCategories}
            expandedId={expandedId}
            onSelectCategory={(id) => {
              setSelectedCategory(id)
              setShowCategories(true)
            }}
            onToggle={toggleExpand}
            onCopy={() => setToastMessage('복사되었습니다!')}
          />
        </section>
      )}

      {showMenu && (
        <div className="menu-overlay" onClick={() => setShowMenu(false)}>
          <div className="menu-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="menu-header">
              <button className="icon-button" onClick={() => setShowMenu(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <nav className="menu-nav">
              <button 
                className={`menu-item ${currentView === 'encyclopedia' ? 'active' : ''}`}
                onClick={() => {
                  setCurrentView('encyclopedia')
                  setShowMenu(false)
                  setSelectedCategory(null)
                  setExpandedId(null)
                }}
              >
                전문사전
              </button>
              <button 
                className={`menu-item ${currentView === 'commons' ? 'active' : ''}`}
                onClick={() => {
                  setCurrentView('commons')
                  setShowMenu(false)
                  setSelectedCategory(null)
                  setExpandedId(null)
                }}
              >
                이론사전
              </button>
              <div className="menu-divider" />
              <button 
                className={`menu-item ${currentView === 'books' ? 'active' : ''}`}
                onClick={() => {
                  setCurrentView('books')
                  setShowMenu(false)
                  setSelectedCategory(null)
                  setExpandedId(null)
                }}
              >
                도서사전
              </button>
              <button 
                className={`menu-item ${currentView === 'movies' ? 'active' : ''}`}
                onClick={() => {
                  setCurrentView('movies')
                  setShowMenu(false)
                  setSelectedCategory(null)
                  setExpandedId(null)
                }}
              >
                영화·시리즈사전
              </button>
              <div className="menu-divider" />
              <button 
                className={`menu-item ${currentView === 'stats' ? 'active' : ''}`}
                onClick={() => {
                  setCurrentView('stats')
                  setShowMenu(false)
                  setSelectedCategory(null)
                  setExpandedId(null)
                }}
              >
                통계
              </button>
            </nav>
          </div>
        </div>
      )}

      <div className="fab-stack">
        <button
          className="fab ghost"
          aria-label="테마 전환"
          onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
        >
          <span className="material-symbols-outlined">{theme === 'light' ? 'light_mode' : 'dark_mode'}</span>
        </button>
        {(currentView === 'encyclopedia' || currentView === 'commons') && (
          <button
            className="fab primary"
            aria-label="퀴즈 게임"
            onClick={() => setShowQuiz(true)}
          >
            <span className="material-symbols-outlined">playing_cards</span>
          </button>
        )}
      </div>
      
      {toastMessage && <div className="toast">{toastMessage}</div>}
      
      {showQuiz && <QuizModal 
        entries={currentView === 'commons' ? commons : entries} 
        categories={currentView === 'commons' ? commonsCategories : encyclopediaCategories} 
        onClose={() => setShowQuiz(false)} 
      />}
    </div>
  )
}

function EntryList({
  entries,
  categories,
  expandedId,
  onSelectCategory,
  onToggle,
  onCopy,
}: {
  entries: (Entry | Book)[]
  categories: Category[]
  expandedId: string | null
  onSelectCategory: (id: string) => void
  onToggle: (id: string) => void
  onCopy: () => void
}) {
  if (!entries.length) return <p className="hint">결과가 없습니다. 단어를 추가해보세요.</p>
  
  const grouped: { [key: string]: (Entry | Book)[] } = {}
  entries.forEach((entry) => {
    const consonant = getInitialConsonant(entry.title)
    if (!grouped[consonant]) grouped[consonant] = []
    grouped[consonant].push(entry)
  })
  
  const sortedConsonants = CONSONANTS.filter((c) => grouped[c])
  
  return (
    <div className="entry-list">
      {sortedConsonants.map((consonant) => (
        <div key={consonant}>
          <div className="consonant-divider">{consonant}</div>
          {grouped[consonant].map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              categories={categories}
              entries={entries}
              expanded={expandedId === entry.id}
              onSelectCategory={onSelectCategory}
              onToggle={onToggle}
              onCopy={onCopy}
              onLinkClick={(targetId) => {
                onToggle(targetId)
                setTimeout(() => {
                  document.getElementById(`entry-${targetId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }, 100)
              }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function EntryRow({
  entry,
  categories,
  entries,
  expanded,
  onSelectCategory,
  onToggle,
  onCopy,
  onLinkClick,
}: {
  entry: Entry | Book
  categories: Category[]
  entries: (Entry | Book)[]
  expanded: boolean
  onSelectCategory: (id: string) => void
  onToggle: (id: string) => void
  onCopy: () => void
  onLinkClick: (targetId: string) => void
}) {
  const isBook = 'year' in entry && 'state' in entry
  const book = isBook ? (entry as Book) : null
  
  const getStateLabel = (state: string) => {
    switch(state) {
      case 'unread': return '읽기 전'
      case 'reading': return '읽는 중'
      case 'completed': return '완료'
      default: return ''
    }
  }
  
  const getStateColor = (state: string) => {
    switch(state) {
      case 'unread': return '#9CA3AF'
      case 'reading': return '#F59E0B'
      case 'completed': return '#10B981'
      default: return '#9CA3AF'
    }
  }
  
  return (
    <div className={`${expanded ? 'entry-row open' : 'entry-row'} ${isBook ? 'book' : ''}`} data-consonant={getInitialConsonant(entry.title)} id={`entry-${entry.id}`}>
      <button className="accordion" onClick={() => onToggle(entry.id)}>
        <div className="accordion-title">
          {isBook && (
            <div className="book-cover-thumbnail">
              {book?.imageUrl && (
                <img 
                  src={book.imageUrl} 
                  alt={book.title}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                  }}
                />
              )}
            </div>
          )}
          <div>
            <div className="title-row">
              <h3>{entry.title}</h3>
              {isBook && book && (
                <>
                  <span 
                    className="book-state-dot" 
                    style={{backgroundColor: getStateColor(book.state)}}
                    aria-label={getStateLabel(book.state)}
                  />
                </>
              )}
              <button
                className="copy-icon-btn"
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  const text = `${entry.title}\n${entry.summary}\n${entry.content}`
                  navigator.clipboard.writeText(text)
                  onCopy()
                }}
                title="복사"
              >
                <span className="material-symbols-outlined">content_copy</span>
              </button>
            </div>
            <p className="summary" title={entry.summary}>
              {entry.summary}
            </p>
            {isBook && book?.source && (
              <p className="book-author-preview">저자: {book.source}</p>
            )}
            {isBook && book?.rating && (
              <p className="book-rating-preview">⭐️ {book.rating.toFixed(1)}</p>
            )}
          </div>
        </div>
        <span className="accordion-icon" aria-label="toggle">
          {expanded ? '−' : '+'}
        </span>
      </button>
      <div className="entry-body" aria-hidden={!expanded}>
        <div className="meta-row">
          <div className="meta-chips">
            {isBook && book?.year && (
              <span className="chip year-chip">{book.year}년</span>
            )}
            {isBook && book?.mediaType && (
              <span className="chip ghost-chip media-type-chip">{book.mediaType}</span>
            )}
            {entry.categories.map((catId) => {
              const cat = categories.find((c) => c.id === catId)
              if (!cat) return null
              return (
                <button
                  key={cat.id}
                  className="chip ghost-chip"
                  type="button"
                  onClick={() => onSelectCategory(cat.id)}
                >
                  {cat.name}
                </button>
              )
            })}
          </div>
        </div>
        {entry.content && <ContentRenderer content={entry.content} entries={entries} onLinkClick={onLinkClick} />}
        {entry.imageUrl && !isBook && (
          <div className="media-card">
            <img 
              src={entry.imageUrl} 
              alt={entry.title}
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
              }}
            />
          </div>
        )}
        {entry.youtubeUrl && (
          <a
            className="media-link"
            href={entry.youtubeUrl}
            target="_blank"
            rel="noreferrer"
          >
            #1 [유튜브] 영상 보기 ↗
          </a>
        )}
        {entry.linkUrl && (
          <a
            className="media-link article-link"
            href={entry.linkUrl}
            target="_blank"
            rel="noreferrer"
          >
            #2 [링크] 글 보기 ↗
          </a>
        )}
        {entry.source && !isBook && (
          <p className="source-ref">
            출처:{' '}
            {entry.source.match(/^https?:\/\//i) ? (
              <a href={entry.source} target="_blank" rel="noreferrer">
                {entry.source}
              </a>
            ) : (
              entry.source
            )}
          </p>
        )}
      </div>
    </div>
  )
}

function ContentRenderer({ content, entries, onLinkClick }: { content: string; entries: Entry[]; onLinkClick: (targetId: string) => void }) {
  const paragraphs = content.split('\n\n').filter(p => p.trim())
  
  const renderParagraph = (text: string) => {
    const linkPattern = /\[\[([^\]]+)\]\]/g
    const parts: (string | React.ReactNode)[] = []
    let lastIndex = 0
    let match
    
    while ((match = linkPattern.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index))
      }
      
      const linkText = match[1]
      const targetEntry = entries.find(e => e.title === linkText || e.title.includes(linkText))
      
      if (targetEntry) {
        parts.push(
          <button
            key={match.index}
            className="inline-link"
            onClick={() => onLinkClick(targetEntry.id)}
          >
            {linkText}
          </button>
        )
      } else {
        parts.push(linkText)
      }
      
      lastIndex = match.index + match[0].length
    }
    
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex))
    }
    
    return parts.length > 0 ? parts : [text]
  }
  
  return (
    <div className="content-text">
      {paragraphs.map((para, idx) => (
        <p key={idx}>{renderParagraph(para)}</p>
      ))}
    </div>
  )
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
      .slice(0, 48) || 'entry'
  )
}

const CONSONANTS = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']

function getInitialConsonant(text: string): string {
  if (!text) return 'ㅇ'
  
  // · (가운뎃점) 뒤의 텍스트가 있으면 우선 사용 (예: DNS · 디엔에스)
  let targetText = text
  if (text.includes('·')) {
    const parts = text.split('·')
    if (parts[1]) {
      targetText = parts[1].trim()
    }
  }
  
  // 괄호 안의 내용 제거 및 앞뒤 공백 제거
  const cleanText = targetText.replace(/\([^)]*\)/g, '').trim()
  if (!cleanText) return 'ㅇ'
  
  const char = cleanText[0]
  const code = char.charCodeAt(0)
  
  // 한글 음절 범위
  if (code >= 0xac00 && code <= 0xd7a3) {
    const consonantIndex = Math.floor((code - 0xac00) / 588)
    const fullConsonants = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']
    const consonant = fullConsonants[consonantIndex] || 'ㅇ'
    // 쌍자음을 기본 자음으로 변환
    const mapping: { [key: string]: string } = { 'ㄲ': 'ㄱ', 'ㄸ': 'ㄷ', 'ㅃ': 'ㅂ', 'ㅆ': 'ㅅ', 'ㅉ': 'ㅈ' }
    return mapping[consonant] || consonant
  }
  
  // 영문자인 경우 알파벳을 한글 초성으로 매핑
  if (/^[A-Za-z]$/.test(char)) {
    const upper = char.toUpperCase()
    // A-D → ㄱ, E-H → ㄷ, I-L → ㅁ, M-P → ㅂ, Q-T → ㅅ, U-Z → ㅇ
    if (upper <= 'D') return 'ㄱ'
    if (upper <= 'H') return 'ㄷ'
    if (upper <= 'L') return 'ㅁ'
    if (upper <= 'P') return 'ㅂ'
    if (upper <= 'T') return 'ㅅ'
    return 'ㅇ'
  }
  
  return 'ㅇ'
}

function SearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <div className="search-bar">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? '검색어 입력'}
      />
    </div>
  )
}

function QuizModal({ entries, categories, onClose }: { entries: Entry[]; categories: Category[]; onClose: () => void }) {
  const [mode, setMode] = useState<'pick-word' | 'pick-meaning' | null>(null)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [quizCount, setQuizCount] = useState<number | null>(null)
  const [quizData, setQuizData] = useState<Entry[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [answered, setAnswered] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [choiceOptions, setChoiceOptions] = useState<string[]>([])
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null)

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const startQuiz = (count: number) => {
    // 선택된 카테고리로 필터링
    let filteredEntries = entries
    if (selectedCategories.length > 0) {
      filteredEntries = entries.filter(entry => 
        entry.categories.some(cat => selectedCategories.includes(cat))
      )
    }
    
    const shuffled = [...filteredEntries].sort(() => Math.random() - 0.5).slice(0, count)
    setQuizData(shuffled)
    setQuizCount(count)
    setCurrentIdx(0)
    setScore(0)
    generateChoices(shuffled, 0, mode!)
  }

  const generateChoices = (data: Entry[], idx: number, quizMode: 'pick-word' | 'pick-meaning') => {
    const current = data[idx]
    if (!current) return

    if (quizMode === 'pick-meaning') {
      const correctAnswer = current.summary
      const wrongAnswers = data
        .filter((_, i) => i !== idx)
        .slice(0, 3)
        .map((e) => e.summary)

      const allChoices = [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5)
      setChoiceOptions(allChoices)
    }
  }

  const normalizeForComparison = (str: string) => {
    return str.replace(/\s/g, '').toLowerCase()
  }

  const checkAnswer = () => {
    const current = quizData[currentIdx]
    if (!current) return

    let correct = false
    if (mode === 'pick-word') {
      const titleParts = current.title.split('(')
      const korean = titleParts[0]?.trim() || ''
      const english = titleParts[1]?.replace(')', '').trim() || ''
      const answer = userAnswer.trim()
      
      // 띄어쓰기 제거, 대소문자 무시하여 정규화
      const normalizedAnswer = normalizeForComparison(answer)
      const normalizedKorean = normalizeForComparison(korean)
      const normalizedEnglish = normalizeForComparison(english)
      const normalizedTitle = normalizeForComparison(current.title)
      
      // 정규화된 값과 비교
      correct = 
        normalizedAnswer === normalizedKorean ||
        normalizedAnswer === normalizedEnglish ||
        normalizedAnswer === normalizedTitle
    } else if (mode === 'pick-meaning') {
      correct = selectedChoice === current.summary
    }

    setIsCorrect(correct)
    setAnswered(true)
    if (correct) setScore((prev) => prev + 1)
  }

  const nextQuestion = () => {
    if (currentIdx < quizData.length - 1) {
      setCurrentIdx((prev) => prev + 1)
      setUserAnswer('')
      setSelectedChoice(null)
      setAnswered(false)
      setIsCorrect(false)
      generateChoices(quizData, currentIdx + 1, mode!)
    } else {
      // 마지막 문제 이후 결과 화면으로
      setCurrentIdx((prev) => prev + 1)
    }
  }

  if (!mode) {
    return (
      <div className="quiz-overlay">
        <div className="quiz-modal">
          <button className="quiz-close" onClick={onClose}>✕</button>
          <h2>퀴즈 게임을 선택하세요</h2>
          <div className="quiz-buttons">
            <button className="quiz-btn" onClick={() => setMode('pick-meaning')}>
              단어 맞추기
            </button>
            <button className="quiz-btn" onClick={() => setMode('pick-word')}>
              설명 맞추기
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (selectedCategories.length === 0 && mode) {
    return (
      <div className="quiz-overlay">
        <div className="quiz-modal">
          <button className="quiz-close" onClick={onClose}>✕</button>
          <h2>출제 범위를 선택하세요</h2>
          <p className="quiz-hint">여러 카테고리를 선택할 수 있습니다</p>
          <div className="quiz-category-grid">
            {categories.map((cat) => {
              const count = entries.filter(entry => entry.categories.includes(cat.id)).length
              const isSelected = selectedCategories.includes(cat.id)
              return (
                <button
                  key={cat.id}
                  className={`quiz-category-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => toggleCategory(cat.id)}
                >
                  {cat.name} ({count})
                </button>
              )
            })}
          </div>
          <button 
            className="quiz-btn quiz-btn-all" 
            onClick={() => setSelectedCategories(categories.map(c => c.id))}
          >
            전체 선택
          </button>
        </div>
      </div>
    )
  }

  if (!quizCount) {
    const availableEntries = entries.filter(entry => 
      entry.categories.some(cat => selectedCategories.includes(cat))
    )
    
    return (
      <div className="quiz-overlay">
        <div className="quiz-modal">
          <button className="quiz-close" onClick={onClose}>✕</button>
          <h2>퀴즈 갯수를 선택하세요</h2>
          <p className="quiz-hint">선택 범위: {availableEntries.length}개 단어</p>
          <div className="quiz-buttons">
            <button className="quiz-btn" onClick={() => startQuiz(5)} disabled={availableEntries.length < 5}>
              5개
            </button>
            <button className="quiz-btn" onClick={() => startQuiz(10)} disabled={availableEntries.length < 10}>
              10개
            </button>
            <button className="quiz-btn" onClick={() => startQuiz(25)} disabled={availableEntries.length < 25}>
              25개
            </button>
            <button className="quiz-btn" onClick={() => startQuiz(50)} disabled={availableEntries.length < 50}>
              50개
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (quizData.length === 0) return null

  // currentIdx가 quizData.length 이상이면 퀴즈 완료
  const isFinished = currentIdx >= quizData.length
  const current = isFinished ? null : quizData[currentIdx]

  return (
    <div className="quiz-overlay">
      <div className="quiz-modal">
        <button className="quiz-close" onClick={onClose}>✕</button>
        {isFinished ? (
          <div className="quiz-result">
            <h2>퀴즈 완료!</h2>
            <p className="score">
              {score} / {quizData.length} 맞췄습니다!
            </p>
            <button className="quiz-btn" onClick={() => onClose()}>
              완료
            </button>
          </div>
        ) : (
          <div className="quiz-question">
            <p className="progress">
              {currentIdx + 1} / {quizData.length}
            </p>
            <h3>
              {mode === 'pick-word'
                ? current?.summary
                : current?.title}
            </h3>
            {mode === 'pick-word' ? (
              <>
                <input
                  type="text"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="답을 입력하세요"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (!answered) checkAnswer()
                      else nextQuestion()
                    }
                  }}
                  disabled={answered}
                />
                {answered && (
                  <div className={`answer-feedback ${isCorrect ? 'correct' : 'incorrect'}`}>
                    {isCorrect ? (
                      <p>✓ 맞습니다!</p>
                    ) : (
                      <p>✗ 틀렸습니다. 정답은 "{current?.title}"입니다.</p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="quiz-choice-buttons">
                  {choiceOptions.map((choice) => (
                    <button
                      key={choice}
                      className={`
                        ${selectedChoice === choice ? 'selected' : ''}
                        ${answered && choice === current?.summary ? 'correct' : ''}
                        ${answered && selectedChoice === choice && !isCorrect ? 'incorrect' : ''}
                      `.trim()}
                      onClick={() => !answered && setSelectedChoice(choice)}
                      disabled={answered}
                    >
                      {choice}
                    </button>
                  ))}
                </div>
                {answered && (
                  <div className={`answer-feedback ${isCorrect ? 'correct' : 'incorrect'}`}>
                    {isCorrect ? (
                      <p>✓ 맞습니다!</p>
                    ) : (
                      <p>✗ 틀렸습니다.</p>
                    )}
                  </div>
                )}
              </>
            )}
            <button
              className="quiz-btn"
              onClick={answered ? nextQuestion : checkAnswer}
              disabled={mode === 'pick-meaning' && selectedChoice === null && !answered}
            >
              {answered ? '다음' : '제출'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function StatsPanel({
  entries,
  commons,
  books,
  movies,
  encyclopediaCategories,
  commonsCategories,
  bookCategories,
  movieCategories,
  clickCounts,
}: {
  entries: Entry[]
  commons: Entry[]
  books: Book[]
  movies: Book[]
  encyclopediaCategories: Category[]
  commonsCategories: Category[]
  bookCategories: Category[]
  movieCategories: Category[]
  clickCounts: Record<string, number>
}) {
  const [section, setSection] = useState<'books' | 'movies' | 'encyclopedia' | 'commons'>('books')

  const categoryContext = useMemo(() => {
    const sourceItems = section === 'books' ? books : section === 'movies' ? movies : section === 'commons' ? commons : entries
    const sourceCategories = section === 'books'
      ? bookCategories
      : section === 'movies'
        ? movieCategories
        : section === 'commons'
          ? commonsCategories
          : encyclopediaCategories

    const counts: Record<string, number> = {}
    sourceCategories.forEach((cat) => {
      counts[cat.id] = sourceItems.filter((item) => item.categories.includes(cat.id)).length
    })

    return { items: sourceItems, categories: sourceCategories, counts }
  }, [section, books, movies, commons, entries, bookCategories, movieCategories, commonsCategories, encyclopediaCategories])

  const isLibrarySection = section === 'books' || section === 'movies'

  const yearStats = useMemo(() => {
    if (!isLibrarySection) return [] as { year: number; count: number }[]
    const source = section === 'books' ? books : movies
    const map: Record<number, number> = {}
    source.forEach((item) => {
      if (item.year) {
        map[item.year] = (map[item.year] || 0) + 1
      }
    })
    return Object.entries(map)
      .map(([year, count]) => ({ year: Number(year), count: count as number }))
      .sort((a, b) => b.year - a.year)
  }, [section, isLibrarySection, books, movies])

  const clickRanking = useMemo(() => {
    if (isLibrarySection) return [] as { id: string; count: number; title: string }[]
    const dataset = section === 'commons' ? commons : entries
    const ids = new Set(dataset.map((item) => item.id))
    return Object.entries(clickCounts)
      .filter(([id]) => ids.has(id))
      .sort((a, b) => (b[1] || 0) - (a[1] || 0))
      .slice(0, 20)
      .map(([id, count]) => ({ id, count, title: (dataset.find((item) => item.id === id)?.title) || id }))
  }, [isLibrarySection, section, commons, entries, clickCounts])

  const adjustColor = (hex: string, amount: number) => {
    let color = hex.replace('#', '')
    if (color.length === 3) {
      color = color.split('').map((c) => c + c).join('')
    }
    const num = parseInt(color, 16)
    let r = (num >> 16) & 0xff
    let g = (num >> 8) & 0xff
    let b = num & 0xff

    if (amount >= 0) {
      r = Math.round(r + (255 - r) * amount)
      g = Math.round(g + (255 - g) * amount)
      b = Math.round(b + (255 - b) * amount)
    } else {
      const factor = 1 + amount
      r = Math.round(r * factor)
      g = Math.round(g * factor)
      b = Math.round(b * factor)
    }

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  }

  const categoryPieData = useMemo(() => {
    if (!isLibrarySection) {
      return { segments: [] as { name: string; count: number; colors: { from: string; to: string } }[], total: 0 }
    }

    const segments = categoryContext.categories
      .map((cat) => ({ name: cat.name, id: cat.id, count: categoryContext.counts[cat.id] || 0 }))
      .filter((segment) => segment.count > 0)
      .sort((a, b) => b.count - a.count)

    const total = segments.reduce((sum, segment) => sum + segment.count, 0)
    const palette = ['#A3D5FF', '#C7F2A4', '#FFD6A5', '#FFADB0', '#D7BDE2', '#B2DFDB', '#F9E2AE', '#C5CAE9', '#B3E5FC', '#F8BBD0', '#DCEDC8', '#FFE0B2']

    return {
      segments: segments.map((segment, idx) => {
        const base = palette[idx % palette.length]
        return {
          name: segment.name,
          count: segment.count,
          colors: {
            from: adjustColor(base, 0.35),
            to: adjustColor(base, -0.2),
          },
        }
      }),
      total,
    }
  }, [isLibrarySection, categoryContext])

  const pieGradient = useMemo(() => {
    if (categoryPieData.total === 0) return 'conic-gradient(from -90deg, #e5e7eb 0 100%)'
    let start = 0
    const parts: string[] = []
    categoryPieData.segments.forEach((seg) => {
      const pct = (seg.count / categoryPieData.total) * 100
      const end = start + pct
      parts.push(`${seg.colors.from} ${start}%`)
      parts.push(`${seg.colors.to} ${end}%`)
      start = end
    })
    return `conic-gradient(from -90deg, ${parts.join(',')})`
  }, [categoryPieData])

  const [hovered, setHovered] = useState<number | null>(null)
  const [activeSegIdx, setActiveSegIdx] = useState<number | null>(null)

  useEffect(() => {
    setHovered(null)
    setActiveSegIdx(null)
  }, [section])

  const updateSegmentByPointer = (clientX: number, clientY: number, pieEl: HTMLDivElement) => {
    const rect = pieEl.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = clientX - cx
    const dy = clientY - cy
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI
    let deg = angle < 0 ? angle + 360 : angle
    deg = (deg + 90) % 360
    let acc = 0
    let found: number | null = null
    categoryPieData.segments.forEach((seg, idx) => {
      const pct = (seg.count / categoryPieData.total) * 100
      const start = (acc / 100) * 360
      const end = ((acc + pct) / 100) * 360
      if (deg >= start && deg < end) {
        found = idx
      }
      acc += pct
    })
    return found
  }

  const handlePieMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isLibrarySection) return
    const pie = e.currentTarget
    const found = updateSegmentByPointer(e.clientX, e.clientY, pie)
    setHovered(found)
  }

  const handlePieClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isLibrarySection) return
    const pie = e.currentTarget
    const found = updateSegmentByPointer(e.clientX, e.clientY, pie)
    setActiveSegIdx(found)
  }

  return (
    <section className="panel list-panel">
      <div className="stats-header">
        <div className="stats-tabs">
          <button className={`chip ${section === 'books' ? 'active' : ''}`} onClick={() => setSection('books')}>도서사전</button>
          <button className={`chip ${section === 'movies' ? 'active' : ''}`} onClick={() => setSection('movies')}>영화·시리즈사전</button>
          <button className={`chip ${section === 'encyclopedia' ? 'active' : ''}`} onClick={() => setSection('encyclopedia')}>전문사전</button>
          <button className={`chip ${section === 'commons' ? 'active' : ''}`} onClick={() => setSection('commons')}>이론사전</button>
        </div>
      </div>

      {isLibrarySection ? (
        <div className="stats-sections">
          <div className="stats-card">
            <h3>{section === 'movies' ? '주제별 작품 수' : '주제별 권 수'}</h3>
            {categoryPieData.segments.length === 0 ? (
              <p className="hint small">데이터가 없습니다.</p>
            ) : (
              <div className="pie-chart" style={{ justifyContent: 'center' }}>
                <div
                  className="pie"
                  style={{ background: pieGradient }}
                  onMouseMove={handlePieMouseMove}
                  onMouseLeave={() => setHovered(null)}
                  onClick={handlePieClick}
                  title={(activeSegIdx ?? hovered) != null ? `${categoryPieData.segments[(activeSegIdx ?? hovered)!].name} (${categoryPieData.segments[(activeSegIdx ?? hovered)!].count})` : '카테고리 분포'}
                >
                  {(activeSegIdx ?? hovered) != null && (
                    <div className="pie-center-label">
                      <div className="pie-center-name">{categoryPieData.segments[(activeSegIdx ?? hovered)!].name}</div>
                      <div className="pie-center-count">{categoryPieData.segments[(activeSegIdx ?? hovered)!].count}</div>
                    </div>
                  )}
                </div>
                <ul className="legend">
                  {categoryPieData.segments.map((seg, idx) => (
                    <li key={seg.name} className="legend-item">
                      <button
                        className={`legend-swatch-btn ${(activeSegIdx ?? hovered) === idx ? 'active' : ''}`}
                        style={{ backgroundImage: `linear-gradient(135deg, ${seg.colors.from}, ${seg.colors.to})` }}
                        onClick={() => setActiveSegIdx(idx)}
                        onMouseEnter={() => setHovered(idx)}
                        onMouseLeave={() => setHovered(null)}
                        type="button"
                        title={`${seg.name} (${seg.count})`}
                      />
                      <span>{seg.name} ({seg.count})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="stats-card">
            <h3>{section === 'movies' ? '년도별 작품 수' : '년도별 권 수'}</h3>
            {yearStats.length === 0 ? (
              <p className="hint small">데이터가 없습니다.</p>
            ) : (
              <div className="bar-chart">
                <div className="bar-area">
                  {(() => {
                    const maxCount = Math.max(...yearStats.map((s) => s.count)) || 1
                    const latestYear = Math.max(...yearStats.map((s) => s.year))
                    return yearStats.map(({ year, count }) => {
                      const percentage = Math.round((count / maxCount) * 100)
                      const isLatest = year === latestYear
                      const unit = section === 'movies' ? '편' : '권'
                      return (
                        <div key={year} className="bar-col" title={`${year}년 ${count}${unit}`}>
                          <div className="bar-count">{count}</div>
                          <div className={`bar ${isLatest ? 'latest' : ''}`} style={{ height: `${percentage}%` }} />
                          <div className="bar-label">{year}</div>
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="stats-sections">
          <div className="stats-card">
            <h3>클릭 수 상위 항목</h3>
            <div className="stats-grid">
              {clickRanking.length === 0 && <p className="hint small">아직 클릭 데이터가 없습니다. 항목을 열어 보면서 데이터가 쌓입니다.</p>}
              {clickRanking.map((row, idx) => {
                const max = clickRanking[0]?.count || 1
                const pct = Math.round((row.count / max) * 100)
                return (
                  <div key={row.id} className="stat-item">
                    <span className="stat-year">{idx + 1}. {row.title}</span>
                    <div className="stat-bar-container">
                      <div className="stat-bar" style={{ width: `${pct}%` }}>
                        <span className="stat-count">{row.count}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default App
