#!/usr/bin/env node

import https from 'https';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const RAW_DATABASE_ID = process.env.NOTION_DATABASE_ID;
const RAW_BOOKS_DATABASE_ID = process.env.NOTION_BOOKS_DATABASE_ID;

const DATABASE_ID = RAW_DATABASE_ID && RAW_DATABASE_ID.includes('-')
  ? RAW_DATABASE_ID
  : RAW_DATABASE_ID
      ? `${RAW_DATABASE_ID.slice(0, 8)}-${RAW_DATABASE_ID.slice(8, 12)}-${RAW_DATABASE_ID.slice(12, 16)}-${RAW_DATABASE_ID.slice(16, 20)}-${RAW_DATABASE_ID.slice(20)}`
      : '';

const BOOKS_DATABASE_ID = RAW_BOOKS_DATABASE_ID && RAW_BOOKS_DATABASE_ID.includes('-')
  ? RAW_BOOKS_DATABASE_ID
  : RAW_BOOKS_DATABASE_ID
      ? `${RAW_BOOKS_DATABASE_ID.slice(0, 8)}-${RAW_BOOKS_DATABASE_ID.slice(8, 12)}-${RAW_BOOKS_DATABASE_ID.slice(12, 16)}-${RAW_BOOKS_DATABASE_ID.slice(16, 20)}-${RAW_BOOKS_DATABASE_ID.slice(20)}`
      : '';

if (!NOTION_TOKEN || !DATABASE_ID) {
  console.error('❌ .env.local에 NOTION_TOKEN과 NOTION_DATABASE_ID를 설정하세요.');
  process.exit(1);
}

async function fetchNotionDatabase(dbId) {
  const options = {
    hostname: 'api.notion.com',
    port: 443,
    path: `/v1/databases/${dbId}/query`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify({}));
    req.end();
  });
}

// 공통 helper 함수들
const getTextValue = (prop) => {
  if (!prop) return '';
  if (prop.type === 'title' && prop.title) {
    return prop.title.map(b => b.plain_text).join('');
  }
  if (prop.type === 'rich_text' && prop.rich_text) {
    return prop.rich_text.map(b => b.plain_text).join('');
  }
  return '';
};

const getUrlValue = (prop) => {
  if (!prop) return '';
  // URL 타입
  if (prop.type === 'url') {
    return prop.url || '';
  }
  // Files 타입 (Notion 파일 업로드)
  if (prop.type === 'files' && prop.files && prop.files.length > 0) {
    const file = prop.files[0];
    if (file.type === 'external') {
      return file.external?.url || '';
    }
    if (file.type === 'file') {
      return file.file?.url || '';
    }
  }
  return '';
};

const getMultiSelectValue = (prop) => {
  return prop?.multi_select?.map(item => item.name) || [];
};

const getNumberValue = (prop) => {
  return prop?.number || null;
};

const getSelectValue = (prop) => {
  return prop?.select?.name || null;
};

function extractProperties(page) {
  const props = page.properties;

  return {
    id: page.id.replace(/-/g, ''),
    title: getTextValue(props.title || props.Title),
    summary: getTextValue(props.summary || props.Summary),
    content: getTextValue(props.content || props.Content),
    imageUrl: getUrlValue(props.imageUrl || props.Image),
    youtubeUrl: getUrlValue(props.youtubeUrl || props.YouTube),
    linkUrl: getUrlValue(props.linkUrl || props.Link),
    source: getTextValue(props.source || props.Source),
    categories: getMultiSelectValue(props.categories || props.Categories),
    createdAt: page.created_time,
    updatedAt: page.last_edited_time,
  };
}

function extractBookProperties(page) {
  const props = page.properties;

  return {
    id: page.id.replace(/-/g, ''),
    title: getTextValue(props.title || props.Title),
    summary: getTextValue(props.summary || props.Summary),
    content: getTextValue(props.content || props.Content),
    imageUrl: getUrlValue(props.imageUrl || props.Image),
    youtubeUrl: getUrlValue(props.youtubeUrl || props.YouTube),
    linkUrl: getUrlValue(props.linkUrl || props.Link),
    source: getTextValue(props.source || props.Source),
    categories: getMultiSelectValue(props.categories || props.Categories),
    year: getNumberValue(props.year || props.Year),
    state: getSelectValue(props.state || props.State),
    rating: getNumberValue(props.rating || props.star || props.Star),
    createdAt: page.created_time,
    updatedAt: page.last_edited_time,
  };
}

async function main() {
  try {
    console.log('📚 노션 데이터베이스에서 데이터 가져오는 중...');
    
    // 백과사전 데이터 가져오기
    console.log('  📖 백과사전 ID:', DATABASE_ID);
    const entriesResponse = await fetchNotionDatabase(DATABASE_ID);

    if (entriesResponse.object === 'error') {
      console.error('❌ 백과사전 API 오류:', entriesResponse.message);
      process.exit(1);
    }

    const entries = entriesResponse.results
      .map(extractProperties)
      .filter(entry => entry.title);

    console.log(`  ✅ 백과사전: ${entries.length}개 항목`);

    // 도서사전 데이터 가져오기
    let books = [];
    if (BOOKS_DATABASE_ID) {
      console.log('  📕 도서사전 ID:', BOOKS_DATABASE_ID);
      const booksResponse = await fetchNotionDatabase(BOOKS_DATABASE_ID);

      if (booksResponse.object === 'error') {
        console.warn('⚠️  도서사전 API 오류 (무시함):', booksResponse.message);
      } else {
        books = booksResponse.results
          .map(extractBookProperties)
          .filter(book => book.title);
        console.log(`  ✅ 도서사전: ${books.length}개 항목`);
      }
    } else {
      console.log('  ⓘ 도서사전 ID가 설정되지 않았습니다.');
    }

    const data = {
      entries,
      books,
      lastFetch: new Date().toISOString(),
    };

    fs.writeFileSync(
      'src/data.json',
      JSON.stringify(data, null, 2)
    );

    console.log(`✅ 완료! 총 ${entries.length + books.length}개 항목을 src/data.json으로 저장했습니다.`);
  } catch (error) {
    console.error('❌ 오류:', error.message);
    process.exit(1);
  }
}

main();
