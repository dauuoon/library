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
  source?: string
  tags: string[]
  categories: string[]
  createdAt: string
  updatedAt: string
  viewedAt?: string
}
