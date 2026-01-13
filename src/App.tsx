import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { seedCategories, seedEntries, searchEntries } from './data'
import notionData from './data.json'
import type { Category, Entry } from './types'

type NotionData = { entries?: Partial<Entry>[] }

function normalizeEntry(input: Partial<Entry>): Entry {
  const now = new Date().toISOString()
  return {
    id: input.id ?? slugify(input.title ?? 'entry'),
    title: input.title ?? '제목 미정',
    summary: input.summary ?? '',
    content: input.content ?? '',
    imageUrl: input.imageUrl,
    youtubeUrl: input.youtubeUrl,
    youtubeTitle: input.youtubeTitle,
    linkUrl: input.linkUrl,
    source: input.source,
    tags: input.tags ?? [],
    categories: input.categories ?? [],
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? input.createdAt ?? now,
    viewedAt: input.viewedAt,
  }
}

function App() {
  const [entries] = useState<Entry[]>(() => {
    const fileEntries = (notionData as NotionData).entries ?? []
    const normalized = fileEntries.map(normalizeEntry)
    return normalized.length ? normalized : seedEntries
  })
  
  const [categories] = useState<Category[]>(() => {
    const fileEntries = (notionData as NotionData).entries ?? []
    const notionCategoryNames = new Set<string>()
    fileEntries.forEach((entry) => {
      entry.categories?.forEach((cat) => {
        if (typeof cat === 'string') notionCategoryNames.add(cat)
      })
    })
    
    const newCategories = Array.from(notionCategoryNames).map((name) => ({
      id: name,
      name,
    }))
    
    return [...seedCategories, ...newCategories]
  })
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showCategories, setShowCategories] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [showQuiz, setShowQuiz] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 2000)
      return () => clearTimeout(timer)
    }
  }, [toastMessage])

  const categoryCounts = useMemo(() => {
    const counts: { [key: string]: number } = {}
    categories.forEach((cat) => {
      counts[cat.id] = entries.filter((entry) =>
        entry.categories.includes(cat.id)
      ).length
    })
    return counts
  }, [entries, categories])

  const filtered = useMemo(() => {
    const base = query.trim() ? searchEntries(entries, query) : entries
    const result = selectedCategory
      ? base.filter((entry) => entry.categories.includes(selectedCategory))
      : base
    return result.sort((a, b) => {
      const consonantA = getInitialConsonant(a.title)
      const consonantB = getInitialConsonant(b.title)
      if (consonantA === consonantB) {
        return a.title.localeCompare(b.title, 'ko')
      }
      return CONSONANTS.indexOf(consonantA) - CONSONANTS.indexOf(consonantB)
    })
  }, [entries, query, selectedCategory])

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }


  return (
    <div className="shell">
      <section className="search-dock">
        <div className="search-row">
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="단어명으로 검색하세요"
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
        </div>
        {showCategories && (
          <div className="chips dropdown">
            <button
              className={!selectedCategory ? 'chip active' : 'chip'}
              onClick={() => setSelectedCategory(null)}
            >
              전체({entries.length})
            </button>
            {categories.map((cat) => (
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
      </section>

      <section className="panel list-panel">
        <EntryList
          entries={filtered}
          categories={categories}
          expandedId={expandedId}
          onSelectCategory={(id) => {
            setSelectedCategory(id)
            setShowCategories(true)
          }}
          onToggle={toggleExpand}
          onCopy={() => setToastMessage('복사되었습니다!')}
        />
      </section>

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
                className="menu-item active"
                onClick={() => setShowMenu(false)}
              >
                백과사전
              </button>
              <button 
                className="menu-item"
                onClick={() => {
                  setShowMenu(false);
                  setToastMessage('도서사전은 준비중입니다!')
                }}
              >
                도서사전
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
        <button
          className="fab primary"
          aria-label="퀴즈 게임"
          onClick={() => setShowQuiz(true)}
        >
          <span className="material-symbols-outlined">playing_cards</span>
        </button>
      </div>
      
      {toastMessage && <div className="toast">{toastMessage}</div>}
      
      {showQuiz && <QuizModal entries={entries} categories={categories} onClose={() => setShowQuiz(false)} />}
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
  entries: Entry[]
  categories: Category[]
  expandedId: string | null
  onSelectCategory: (id: string) => void
  onToggle: (id: string) => void
  onCopy: () => void
}) {
  if (!entries.length) return <p className="hint">결과가 없습니다. 단어를 추가해보세요.</p>
  
  const grouped: { [key: string]: Entry[] } = {}
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
  entry: Entry
  categories: Category[]
  entries: Entry[]
  expanded: boolean
  onSelectCategory: (id: string) => void
  onToggle: (id: string) => void
  onCopy: () => void
  onLinkClick: (targetId: string) => void
}) {
  return (
    <div className={expanded ? 'entry-row open' : 'entry-row'} data-consonant={getInitialConsonant(entry.title)} id={`entry-${entry.id}`}>
      <button className="accordion" onClick={() => onToggle(entry.id)}>
        <div className="accordion-title">
          <div>
            <div className="title-row">
              <h3>{entry.title}</h3>
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
          </div>
        </div>
        <span className="accordion-icon" aria-label="toggle">
          {expanded ? '−' : '+'}
        </span>
      </button>
      <div className="entry-body" aria-hidden={!expanded}>
        <div className="meta-row">
          <div className="meta-chips">
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
        {entry.imageUrl && (
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
        {entry.source && (
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

export default App
