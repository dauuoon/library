#!/usr/bin/env node

import https from 'https';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const RAW_DATABASE_ID = process.env.NOTION_DATABASE_ID;
const DATABASE_ID = RAW_DATABASE_ID && RAW_DATABASE_ID.includes('-')
  ? RAW_DATABASE_ID
  : RAW_DATABASE_ID
      ? `${RAW_DATABASE_ID.slice(0, 8)}-${RAW_DATABASE_ID.slice(8, 12)}-${RAW_DATABASE_ID.slice(12, 16)}-${RAW_DATABASE_ID.slice(16, 20)}-${RAW_DATABASE_ID.slice(20)}`
      : '';

if (!NOTION_TOKEN || !DATABASE_ID) {
  console.error('❌ .env.local에 NOTION_TOKEN과 NOTION_DATABASE_ID를 설정하세요.');
  process.exit(1);
}

async function fetchNotionDatabase() {
  const options = {
    hostname: 'api.notion.com',
    port: 443,
    path: `/v1/databases/${DATABASE_ID}/query`,
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

function extractProperties(page) {
  const props = page.properties;
  
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
    return prop?.url || '';
  };

  const getMultiSelectValue = (prop) => {
    return prop?.multi_select?.map(item => item.name) || [];
  };

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

async function main() {
  try {
    console.log('📚 노션 데이터베이스에서 데이터 가져오는 중...');
    console.log('  사용 ID:', DATABASE_ID);
    const response = await fetchNotionDatabase();

    if (response.object === 'error') {
      console.error('❌ 노션 API 오류:', response.message);
      process.exit(1);
    }

    const entries = response.results
      .map(extractProperties)
      .filter(entry => entry.title); // 제목이 있는 항목만

    const data = {
      entries,
      lastFetch: new Date().toISOString(),
    };

    fs.writeFileSync(
      'src/data.json',
      JSON.stringify(data, null, 2)
    );

    console.log(`✅ 성공! ${entries.length}개 항목을 src/data.json으로 저장했습니다.`);
  } catch (error) {
    console.error('❌ 오류:', error.message);
    process.exit(1);
  }
}

main();
