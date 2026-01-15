export type Category = {
  id: string
  name: string
  description?: string
}

export type Entry = {
  id: string
  title: string
  summary: string
  content: string
  imageUrl?: string
  youtubeUrl?: string
  youtubeTitle?: string
  linkUrl?: string
  source?: string
  tags: string[]
  categories: string[]
  createdAt: string
  updatedAt: string
  viewedAt?: string
}

export type Book = Entry & {
  year: number
  state: 'unread' | 'reading' | 'completed'
  rating?: number
}
