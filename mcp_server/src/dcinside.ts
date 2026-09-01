/**
 * DC Inside Gallery Scraper Module for MCP Server (Dark Theme & Full Authors)
 * ---------------------------------------------------------------------------
 * Fetches latest posts from any DC Inside gallery (e.g. denim, fashion_new1)
 * with title, body, embedded images, comment authors, and comments in a Dark Theme
 * collapsible Markdown format.
 */

const USER_AGENT =
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

export interface DcComment {
  nick: string;
  date: string;
  text: string;
}

export interface DcPost {
  id: string;
  title: string;
  author: string;
  time: string;
  views: string;
  commentsCount: number;
  body: string;
  images: string[];
  comments: DcComment[];
  url: string;
}

/**
 * Fetch latest posts from a DC Inside gallery and return formatted collapsible markdown.
 */
export async function fetchDcInsideGallery(
  galleryId = "denim",
  limit = 10,
): Promise<string> {
  const cleanGalleryId = galleryId.trim().toLowerCase();
  const safeLimit = Math.max(1, Math.min(limit, 30));
  const listUrl = `https://m.dcinside.com/board/${cleanGalleryId}`;

  const listResp = await fetch(listUrl, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(8000),
  });

  if (!listResp.ok) {
    return `⚠️ 디시인사이드 [${cleanGalleryId}] 갤러리 접근 실패: HTTP ${listResp.status}`;
  }

  const listHtml = await listResp.text();

  // Extract non-pinned post IDs
  const postIds: string[] = [];
  const idRegex = new RegExp(
    `href=["']https://m\\.dcinside\\.com/board/${cleanGalleryId}/(\\d+)["']`,
    "g",
  );
  let match: RegExpExecArray | null;

  while ((match = idRegex.exec(listHtml)) !== null) {
    const pid = match[1];
    if (!postIds.includes(pid) && pid !== "77915") {
      postIds.push(pid);
    }
  }

  const targetIds = postIds.slice(0, safeLimit);
  if (targetIds.length === 0) {
    return `⚠️ [${cleanGalleryId}] 갤러리에서 게시글을 찾을 수 없습니다. (갤러리 ID를 확인해 주세요)`;
  }

  const posts: DcPost[] = [];

  for (const pid of targetIds) {
    const postUrl = `https://m.dcinside.com/board/${cleanGalleryId}/${pid}`;
    try {
      const pResp = await fetch(postUrl, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(6000),
      });

      if (!pResp.ok) continue;
      const pHtml = await pResp.text();

      // 1. Title
      let title = "";
      const titleMatch = pHtml.match(/<title>(.*?)<\/title>/);
      if (titleMatch) {
        title = titleMatch[1]
          .replace(new RegExp(`\\s*-\\s*.*갤러리.*$`), "")
          .trim();
      }

      // 2. Author
      let author = "익명";
      const authorMatch = pHtml.match(
        /<span class="author"><span[^>]*>([^<]+)<\/span>/,
      );
      if (authorMatch) author = authorMatch[1].trim();

      // 3. Views
      let views = "-";
      const viewsMatch = pHtml.match(/<span>조회\s*(\d+)<\/span>/);
      if (viewsMatch) views = viewsMatch[1];

      // 4. Body Content
      let body = "";
      const descMatch = pHtml.match(
        /<meta\s+name="description"\s+content="([^"]+)"/,
      );
      if (descMatch) {
        body = descMatch[1]
          .replace(/\s*-\s*dc official App/g, "")
          .replace(/\s*-\s*dc App/g, "")
          .trim();
      }

      // 5. Images
      const images: string[] = [];
      const ogImgMatch = pHtml.match(
        /<meta\s+property="og:image"\s+content="([^"]+)"/,
      );
      if (ogImgMatch && ogImgMatch[1].includes("viewimage")) {
        images.push(ogImgMatch[1]);
      }

      const originalImgRegex = /data-original=["']([^"']+)["']/g;
      let origMatch: RegExpExecArray | null;
      while ((origMatch = originalImgRegex.exec(pHtml)) !== null) {
        const iUrl = origMatch[1].replace(/&amp;/g, "&");
        if (iUrl.includes("viewimage") && !images.includes(iUrl)) {
          images.push(iUrl);
        }
      }

      // 6. Comments with Author & Date
      const comments: DcComment[] = [];
      const csrfMatch = pHtml.match(/name="csrf-token"\s+content="([^"]+)"/);
      if (csrfMatch) {
        const csrf = csrfMatch[1];
        const commentUrl = "https://m.dcinside.com/ajax/response-comment";
        const bodyParams = new URLSearchParams({
          id: cleanGalleryId,
          no: pid,
          cpage: "1",
          csort: "default",
        });

        try {
          const cResp = await fetch(commentUrl, {
            method: "POST",
            headers: {
              "User-Agent": USER_AGENT,
              Referer: postUrl,
              "X-CSRF-TOKEN": csrf,
              "X-Requested-With": "XMLHttpRequest",
              "Content-Type":
                "application/x-www-form-urlencoded; charset=UTF-8",
            },
            body: bodyParams.toString(),
            signal: AbortSignal.timeout(5000),
          });

          if (cResp.ok) {
            const cHtml = await cResp.text();
            const commentItemsRegex = /<li class="comment[^"]*"[\s\S]*?<\/li>/g;
            let itemMatch: RegExpExecArray | null;

            while ((itemMatch = commentItemsRegex.exec(cHtml)) !== null) {
              const itemHtml = itemMatch[0];
              const nickMatch = itemHtml.match(/class="nick"[^>]*>([^<]+)</);
              const ipMatch = itemHtml.match(/class="ip"[^>]*>([^<]+)</);
              const dateMatch = itemHtml.match(/class="date"[^>]*>([^<]+)</);
              const txtMatch = itemHtml.match(/class="txt"[^>]*>([\s\S]*?)<\/p>/);

              let nick = nickMatch ? nickMatch[1].trim() : "ㅇㅇ";
              if (ipMatch) {
                nick += ` ${ipMatch[1].trim()}`;
              }
              const date = dateMatch ? dateMatch[1].trim() : "";
              const text = txtMatch
                ? txtMatch[1].replace(/<[^>]+>/g, "").trim()
                : "";

              if (text) {
                comments.push({ nick, date, text });
              }
            }
          }
        } catch {
          // ignore comment timeout
        }
      }

      posts.push({
        id: pid,
        title: title || `게시글 #${pid}`,
        author,
        time: new Date().toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        views,
        commentsCount: comments.length,
        body: body || "(본문 텍스트 없음 / 이미지 게시글)",
        images,
        comments,
        url: postUrl,
      });

      // Brief delay to be polite to server
      await new Promise((resolve) => setTimeout(resolve, 150));
    } catch {
      // ignore single post error
    }
  }

  // Format as Collapsible Dark Theme Markdown with <details> and <summary>
  return formatPostsToDarkThemeMarkdown(cleanGalleryId, posts);
}

/**
 * Formats parsed posts into a nested collapsible accordion markdown with Dark Theme styles.
 */
function formatPostsToDarkThemeMarkdown(
  galleryId: string,
  posts: DcPost[],
): string {
  const lines: string[] = [
    `# 갤러리 실시간 최신글 리포트: [${galleryId}] (총 ${posts.length}건)`,
    `*수집 기준: ${new Date().toLocaleString("ko-KR")}*\n`,
    "> 💡 **안내**: 각 게시글의 **[제목]을 클릭**하면 본문과 이미지가 아래로 펼쳐지며, **[댓글]을 클릭**하면 작성자와 실시간 댓글이 추가로 펼쳐집니다.\n",
    "---\n",
  ];

  posts.forEach((post, index) => {
    const num = index + 1;
    lines.push("<details>");
    lines.push(
      `<summary style="cursor: pointer; padding: 8px 4px; font-size: 15px; color: #f8fafc;"><strong>[${num}] ${escapeHtml(post.title)}</strong> <span style="color: #94a3b8; font-size: 13px;">(작성자: ${escapeHtml(post.author)} | 댓글: ${post.commentsCount}개)</span></summary>`,
    );
    lines.push("\n<br/>\n");
    // Dark Theme Container (#1e293b with subtle border and accent bar)
    lines.push(
      '<div style="padding: 16px; margin-top: 6px; background-color: #1e293b; color: #f8fafc; border: 1px solid #334155; border-left: 4px solid #38bdf8; border-radius: 8px; line-height: 1.6;">',
    );
    lines.push(`\n<strong style="color: #38bdf8;">📝 본문 내용</strong>\n`);
    lines.push(`<p style="color: #e2e8f0; margin-top: 6px;">${escapeHtml(post.body)}</p>\n`);

    // Render embedded images if available
    if (post.images.length > 0) {
      lines.push(`\n<strong style="color: #38bdf8;">🖼️ 첨부 이미지 (${post.images.length}개)</strong>\n`);
      post.images.forEach((imgUrl, i) => {
        lines.push(
          `<p><img src="${imgUrl}" referrerpolicy="no-referrer" style="max-width: 100%; max-height: 420px; border-radius: 8px; border: 1px solid #475569; margin: 8px 0;" alt="첨부 이미지 ${i + 1}" /><br/><a href="${imgUrl}" target="_blank" rel="noreferrer" style="font-size: 12px; color: #38bdf8; text-decoration: none;">[🔗 이미지 원본 열기]</a></p>`,
        );
      });
    }

    // Nested collapsible comments in dark container (#0f172a)
    lines.push("\n<br/>\n");
    lines.push(
      '<details style="background-color: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 12px; margin-top: 10px;">',
    );
    if (post.comments.length > 0) {
      lines.push(
        `<summary style="cursor: pointer; font-weight: 600; color: #38bdf8;">💬 <strong>댓글 (${post.comments.length}개) 펼쳐보기</strong></summary>`,
      );
      lines.push('\n<br/>\n<ul style="padding-left: 4px; margin: 0; list-style: none;">');
      post.comments.forEach((c) => {
        lines.push(
          `  <li style="padding: 6px 0; border-bottom: 1px solid #1e293b; font-size: 13.5px;">` +
            `<span style="color: #38bdf8; font-weight: bold;">👤 ${escapeHtml(c.nick)}</span> ` +
            `<span style="color: #64748b; font-size: 11.5px; margin-left: 6px;">${escapeHtml(c.date)}</span><br/>` +
            `<span style="color: #cbd5e1; display: inline-block; margin-top: 2px;">${escapeHtml(c.text)}</span>` +
            `</li>`,
        );
      });
      lines.push("</ul>\n");
    } else {
      lines.push(
        `<summary style="cursor: pointer; font-weight: 600; color: #94a3b8;">💬 <strong>댓글 (0개)</strong></summary>`,
      );
      lines.push('\n<p style="color: #64748b; font-size: 13px; margin-top: 8px;">등록된 댓글이 없습니다.</p>\n');
    }
    lines.push("</details>\n");

    lines.push(
      `\n<p style="margin-top: 14px; font-size: 12px;"><a href="${post.url}" target="_blank" rel="noreferrer" style="color: #38bdf8; text-decoration: none;">🔗 디시인사이드 원문 링크 이동 ↗</a></p>`,
    );
    lines.push("</div>\n");
    lines.push("</details>\n");
    lines.push("<br/>\n");
  });

  return lines.join("\n");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
