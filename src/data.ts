import type { Category, Entry } from './types'

export const seedCategories: Category[] = [
  {
    id: 'concepts',
    name: '개념',
    description: '핵심 개념 모음',
  },
  {
    id: 'ai',
    name: 'AI/ML',
    description: 'AI 관련 용어',
  },
  {
    id: 'design',
    name: '디자인',
    description: 'UX/UI 패턴',
  },
  {
    id: 'productivity',
    name: '생산성',
    description: '습관과 워크플로우',
  },
  {
    id: 'web',
    name: '웹',
    description: '웹 기술 스택',
  },
]

export const seedEntries: Entry[] = [
  {
    id: 'embedding',
    title: '벡터 임베딩 (Vector embedding)',
    summary: '텍스트나 이미지를 고정 길이 벡터로 표현하는 방법.',
    content:
      '자연어 문서나 이미지를 연속적인 벡터 공간으로 투영해 유사도를 계산할 수 있도록 만든 표현. 검색, 추천, 군집화에서 핵심적인 표현 방식으로 사용된다.',
    imageUrl: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=800&q=80',
    youtubeUrl: 'https://www.youtube.com/watch?v=8Oog7TXHvFY',
    youtubeTitle: 'Vector Embeddings Explained',
    source: 'Mikolov, T. et al. (2013). Efficient Estimation of Word Representations in Vector Space. arXiv:1301.3781',
    tags: ['nlp', 'representation'],
    categories: ['ai', 'concepts'],
    createdAt: '2024-11-10T10:00:00Z',
    updatedAt: '2024-12-01T10:00:00Z',
  },
  {
    id: 'edge-function',
    title: '엣지 함수 (Edge function)',
    summary: '사용자 가까운 엣지에서 실행되는 서버리스 함수.',
    content:
      'CDN 엣지 노드에 배포되어 지리적으로 가까운 위치에서 실행되는 함수. 지연 시간을 줄이고 지역별 맞춤 응답을 제공할 수 있다.',
    source: 'Akamai (2023). EdgeWorkers Technical Overview. Akamai Technologies.',
    tags: ['serverless', 'latency'],
    categories: ['web', 'concepts'],
    createdAt: '2024-10-05T12:00:00Z',
    updatedAt: '2024-12-02T08:00:00Z',
  },
  {
    id: 'feynman',
    title: '파인만 테크닉 (Feynman technique)',
    summary: '개념을 직접 설명하며 이해도를 높이는 학습 방법.',
    content:
      '모르는 사람에게 설명하듯 개념을 써보고, 빈틈을 찾아 단순하게 다시 표현하는 반복 학습법. 복잡한 개념을 내재화하는 데 효과적이다.',
    source: 'Lehrer, J. (2012). The Feynman Technique. The New Yorker.',
    tags: ['learning', 'explanation'],
    categories: ['productivity'],
    createdAt: '2024-09-01T09:00:00Z',
    updatedAt: '2024-11-20T09:00:00Z',
  },
  {
    id: 'progressive-disclosure',
    title: '점진적 공개 (Progressive disclosure)',
    summary: '필요한 순간에만 정보를 점진적으로 보여주는 UX 원칙.',
    content:
      '사용자 부담을 줄이기 위해 기본 정보만 먼저 노출하고, 더 깊은 정보는 사용자의 액션에 따라 점진적으로 제공한다. 온보딩, 설정 화면 등에 자주 사용된다.',
    source: 'Nielsen, J. (2006). Progressive Disclosure. Nielsen Norman Group.',
    tags: ['ux', 'information architecture'],
    categories: ['design'],
    createdAt: '2024-12-15T14:00:00Z',
    updatedAt: '2024-12-18T14:00:00Z',
  },
  {
    id: 'design-token',
    title: '디자인 토큰 (Design token)',
    summary: '디자인 시스템에서 재사용되는 속성을 코드로 관리하는 단위.',
    content:
      '색상, 타이포그래피, 간격 등의 스타일 값을 플랫폼 중립적인 토큰으로 정의해 일관성을 유지하고 변경을 쉽게 만든다.',
    source: 'W3C Design Tokens Community Group (2023). Design Tokens Format Module Level 1. Editor’s Draft.',
    tags: ['design system', 'style'],
    categories: ['design', 'web'],
    createdAt: '2024-12-20T09:00:00Z',
    updatedAt: '2024-12-22T09:00:00Z',
  },
]

export function searchEntries(entries: Entry[], query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return entries.filter((entry) => entry.title.toLowerCase().includes(q))
}

export function toRecent(entries: Entry[], key: keyof Entry, limit = 5) {
  return [...entries]
    .filter((entry) => Boolean(entry[key]))
    .sort((a, b) => (b[key] as string).localeCompare(a[key] as string))
    .slice(0, limit)
}
