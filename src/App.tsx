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
  const [categories] = useState<Category[]>(seedCategories)
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showCategories, setShowCategories] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const filtered = useMemo(() => {
    const base = query.trim() ? searchEntries(entries, query) : entries
    return selectedCategory
      ? base.filter((entry) => entry.categories.includes(selectedCategory))
      : base
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
        />
      </section>

      <div className="fab-stack">
        <button
          className="fab ghost"
          aria-label="테마 전환"
          onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
        >
          {theme === 'light' ? '🌑' : '☀︎'}
        </button>
      </div>
    </div>
  )
}

function EntryList({
  entries,
  categories,
  expandedId,
  onSelectCategory,
  onToggle,
}: {
  entries: Entry[]
  categories: Category[]
  expandedId: string | null
  onSelectCategory: (id: string) => void
  onToggle: (id: string) => void
}) {
  if (!entries.length) return <p className="hint">결과가 없습니다. 단어를 추가해보세요.</p>
  return (
    <div className="entry-list">
      {entries.map((entry) => (
        <EntryRow
          key={entry.id}
          entry={entry}
          categories={categories}
          expanded={expandedId === entry.id}
          onSelectCategory={onSelectCategory}
          onToggle={onToggle}
        />
      ))}
    </div>
  )
}

function EntryRow({
  entry,
  categories,
  expanded,
  onSelectCategory,
  onToggle,
}: {
  entry: Entry
  categories: Category[]
  expanded: boolean
  onSelectCategory: (id: string) => void
  onToggle: (id: string) => void
}) {
  return (
    <div className={expanded ? 'entry-row open' : 'entry-row'}>
      <button className="accordion" onClick={() => onToggle(entry.id)}>
        <div className="accordion-title">
          <div>
            <h3>{entry.title}</h3>
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
        <p className="content-text">{entry.content}</p>
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

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
      .slice(0, 48) || 'entry'
  )
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

export default App
