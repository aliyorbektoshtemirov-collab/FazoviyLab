// functions/api/logs.ts
// Cloudflare Pages Function — /api/logs
// GET  -> D1 bazasidan saqlangan tajriba natijalarini o'qib qaytaradi
// POST -> Foydalanuvchi natijasini (masalan, hisoblangan hajm/yuza, reaksiya
//         progressi, sayyora tezligi va h.k.) D1 bazasiga yozadi
//
// Bu fayl Cloudflare Pages tomonidan avtomatik ravishda "/api/logs" marshrutiga
// bog'lanadi (fayl asosidagi routing). Diqqat: bu faylni to'g'ridan-to'g'ri
// `npm run build` (Vite) jarayoni type-check qilmaydi — Cloudflare uning o'z
// esbuild asosidagi quruvchisi orqali deploy vaqtida kompilyatsiya qilinadi.

/// <reference types="@cloudflare/workers-types" />

interface Env {
  DB: D1Database;
}

interface ExperimentLogRow {
  id: number;
  student_name: string;
  subject_id: string;
  simulation_id: string;
  simulation_title: string;
  result_summary: string;
  created_at: string;
}

interface CreateLogPayload {
  studentName?: string;
  subjectId: string;
  simulationId: string;
  simulationTitle: string;
  resultSummary: Record<string, string | number | boolean>;
}

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function isValidPayload(body: unknown): body is CreateLogPayload {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.subjectId === 'string' &&
    b.subjectId.length > 0 &&
    typeof b.simulationId === 'string' &&
    b.simulationId.length > 0 &&
    typeof b.simulationTitle === 'string' &&
    b.simulationTitle.length > 0 &&
    typeof b.resultSummary === 'object' &&
    b.resultSummary !== null
  );
}

// GET /api/logs?simulationId=math-geometry-volume&limit=20
export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const simulationId = url.searchParams.get('simulationId');
    const limitParam = parseInt(url.searchParams.get('limit') ?? '30', 10);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 30;

    const query = simulationId
      ? context.env.DB.prepare(
          'SELECT * FROM experiment_logs WHERE simulation_id = ?1 ORDER BY created_at DESC LIMIT ?2',
        ).bind(simulationId, limit)
      : context.env.DB.prepare('SELECT * FROM experiment_logs ORDER BY created_at DESC LIMIT ?1').bind(
          limit,
        );

    const { results } = await query.all<ExperimentLogRow>();

    return jsonResponse({
      ok: true,
      count: results.length,
      logs: results.map((row) => ({
        id: row.id,
        studentName: row.student_name,
        subjectId: row.subject_id,
        simulationId: row.simulation_id,
        simulationTitle: row.simulation_title,
        resultSummary: safeParseJson(row.result_summary),
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    console.error('GET /api/logs xatolik:', error);
    return jsonResponse({ ok: false, error: "Natijalarni o'qishda xatolik yuz berdi." }, 500);
  }
};

// POST /api/logs  { studentName, subjectId, simulationId, simulationTitle, resultSummary }
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = await context.request.json().catch(() => null);

    if (!isValidPayload(body)) {
      return jsonResponse(
        { ok: false, error: "Noto'g'ri so'rov: subjectId, simulationId, simulationTitle va resultSummary majburiy." },
        400,
      );
    }

    const studentName = (body.studentName ?? 'Mehmon').toString().slice(0, 80) || 'Mehmon';
    const resultSummaryText = JSON.stringify(body.resultSummary).slice(0, 4000);

    const insert = await context.env.DB.prepare(
      `INSERT INTO experiment_logs (student_name, subject_id, simulation_id, simulation_title, result_summary)
       VALUES (?1, ?2, ?3, ?4, ?5)
       RETURNING *`,
    )
      .bind(studentName, body.subjectId, body.simulationId, body.simulationTitle, resultSummaryText)
      .first<ExperimentLogRow>();

    if (!insert) {
      return jsonResponse({ ok: false, error: 'Yozuv yaratilmadi.' }, 500);
    }

    return jsonResponse(
      {
        ok: true,
        log: {
          id: insert.id,
          studentName: insert.student_name,
          subjectId: insert.subject_id,
          simulationId: insert.simulation_id,
          simulationTitle: insert.simulation_title,
          resultSummary: safeParseJson(insert.result_summary),
          createdAt: insert.created_at,
        },
      },
      201,
    );
  } catch (error) {
    console.error('POST /api/logs xatolik:', error);
    return jsonResponse({ ok: false, error: 'Natijani saqlashda xatolik yuz berdi.' }, 500);
  }
};

function safeParseJson(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}
