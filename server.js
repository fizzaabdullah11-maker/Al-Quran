const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const rootDirectory = __dirname;
const database = new DatabaseSync(path.join(rootDirectory, 'backend', 'data', 'quran.db'), { readOnly: true });
const port = Number(process.env.PORT) || 8000;

const publicFiles = new Set(['index.html', 'admin.html', 'styles.css', 'script.js', 'admin.js']);
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(payload));
}

function sendStaticFile(response, requestedFile) {
  const fileName = requestedFile === '/' ? 'index.html' : requestedFile.replace(/^\//, '');
  if (!publicFiles.has(fileName)) {
    sendJson(response, 404, { error: 'Not found' });
    return;
  }

  const filePath = path.join(rootDirectory, fileName);
  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendJson(response, 500, { error: 'Unable to load application file.' });
      return;
    }
    response.writeHead(200, { 'Content-Type': mimeTypes[path.extname(fileName)] || 'application/octet-stream' });
    response.end(content);
  });
}

function getSurahList() {
  return database.prepare(
    `SELECT id, name_arabic, transliteration, translation_ur, revelation_type, total_verses
     FROM surahs ORDER BY id`,
  ).all();
}

function getSurah(id) {
  const surah = database.prepare('SELECT * FROM surahs WHERE id = ?').get(id);
  if (!surah) return null;

  const ayahs = database.prepare(
    `SELECT id, ayah_number, text_arabic, text_urdu
     FROM ayahs WHERE surah_id = ? ORDER BY ayah_number`,
  ).all(id);

  return { ...surah, ayahs };
}

function searchAyahs(query) {
  return database.prepare(
    `SELECT ayahs.id, ayahs.surah_id, ayahs.ayah_number, ayahs.text_arabic, ayahs.text_urdu,
            surahs.transliteration
     FROM ayahs_fts
     JOIN ayahs ON ayahs.id = ayahs_fts.rowid
     JOIN surahs ON surahs.id = ayahs.surah_id
     WHERE ayahs_fts MATCH ?
     LIMIT 50`,
  ).all(query);
}

const server = http.createServer((request, response) => {
  if (request.method !== 'GET') {
    sendJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(url.pathname);

  try {
    if (pathname === '/api/health') {
      sendJson(response, 200, { status: 'ok' });
      return;
    }
    if (pathname === '/api/surahs') {
      sendJson(response, 200, getSurahList());
      return;
    }
    if (pathname === '/api/search') {
      const query = url.searchParams.get('q')?.trim();
      if (!query) {
        sendJson(response, 400, { error: 'A search query is required.' });
        return;
      }
      sendJson(response, 200, searchAyahs(query));
      return;
    }

    const match = pathname.match(/^\/api\/surahs\/(\d+)$/);
    if (match) {
      const surah = getSurah(Number(match[1]));
      if (!surah) {
        sendJson(response, 404, { error: 'Surah not found.' });
        return;
      }
      sendJson(response, 200, surah);
      return;
    }

    sendStaticFile(response, pathname);
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { error: 'The Qur’an database could not be read.' });
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Qur’an app running at http://localhost:${port}`);
});
