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
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [showQuiz, setShowQuiz] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 2000)
      return () => clearTimeout(timer)
    }
  }, [toastMessage])

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
              aria-label="카테고리 보기"
              onClick={() => setShowCategories((v) => !v)}
            >
              ☰
            </button>
          </div>
        </div>
        {showCategories && (
          <div className="chips dropdown">
            <button
              className={!selectedCategory ? 'chip active' : 'chip'}
              onClick={() => setSelectedCategory(null)}
            >
              전체
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={selectedCategory === cat.id ? 'chip active' : 'chip'}
                onClick={() => setSelectedCategory(cat.id)}
                title={cat.description}
              >
                {cat.name}
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
      
      {showQuiz && <QuizModal entries={entries} onClose={() => setShowQuiz(false)} />}
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
            <img src={entry.imageUrl} alt={entry.title} />
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
  const char = text[0]
  const code = char.charCodeAt(0)
  
  if (code >= 0xac00 && code <= 0xd7a3) {
    const offset = (code - 0xac00) / 28 / 21
    const consonantIndex = Math.floor(offset)
    const consonants = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']
    return consonants[consonantIndex] || 'ㅇ'
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

function QuizModal({ entries, onClose }: { entries: Entry[]; onClose: () => void }) {
  const [mode, setMode] = useState<'pick-word' | 'pick-meaning' | null>(null)
  const [quizData, setQuizData] = useState<Entry[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [answered, setAnswered] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [choiceOptions, setChoiceOptions] = useState<string[]>([])
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null)

  const startQuiz = (selectedMode: 'pick-word' | 'pick-meaning') => {
    const shuffled = [...entries].sort(() => Math.random() - 0.5).slice(0, 5)
    setQuizData(shuffled)
    setMode(selectedMode)
    setCurrentIdx(0)
    setScore(0)
    generateChoices(shuffled, 0, selectedMode)
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

  const checkAnswer = () => {
    const current = quizData[currentIdx]
    if (!current) return

    let correct = false
    if (mode === 'pick-word') {
      const titleParts = current.title.split('(')
      const korean = titleParts[0]?.trim() || ''
      const english = titleParts[1]?.replace(')', '').trim() || ''
      const answer = userAnswer.trim()
      correct = answer === korean || answer === english || answer === current.title
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
    }
  }

  if (!mode) {
    return (
      <div className="quiz-overlay">
        <div className="quiz-modal">
          <button className="quiz-close" onClick={onClose}>✕</button>
          <h2>퀴즈 게임을 선택하세요</h2>
          <div className="quiz-buttons">
            <button className="quiz-btn" onClick={() => startQuiz('pick-word')}>
              설명을 읽고 단어 맞추기
            </button>
            <button className="quiz-btn" onClick={() => startQuiz('pick-meaning')}>
              단어를 읽고 설명 맞추기
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (quizData.length === 0) return null

  const current = quizData[currentIdx]
  const isFinished = currentIdx === quizData.length - 1 && answered

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
                ? current.summary
                : current.title}
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
                      <p>✗ 틀렸습니다. 정답은 "{current.title}"입니다.</p>
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
                        ${answered && choice === current.summary ? 'correct' : ''}
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
