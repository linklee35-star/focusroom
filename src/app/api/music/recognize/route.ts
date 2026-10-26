import { NextRequest, NextResponse } from "next/server";

// 网易云音乐 API 代理：搜索歌曲 → 详情拿封面 → 歌词
// 服务端直连（绕过浏览器 CORS 限制）

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const NETEASE_HEADERS = {
  "User-Agent": UA,
  Referer: "https://music.163.com",
};

interface NeteaseSong {
  id: number;
  name: string;
  artists?: { name: string }[];
  album?: { name?: string };
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q) {
    return NextResponse.json({ error: "missing query 'q'" }, { status: 400 });
  }

  try {
    // 1. 搜索
    const searchUrl = `https://music.163.com/api/search/get/web?s=${encodeURIComponent(
      q
    )}&type=1&limit=3`;
    const searchRes = await fetch(searchUrl, { headers: NETEASE_HEADERS, cache: "no-store" });
    if (!searchRes.ok) throw new Error(`search failed: ${searchRes.status}`);
    const searchData = await searchRes.json();
    const songs: NeteaseSong[] = searchData?.result?.songs ?? [];
    if (songs.length === 0) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const best = songs[0];
    const songId = best.id;

    // 2. 详情（封面）
    let coverUrl = "";
    try {
      const detailUrl = `https://music.163.com/api/song/detail?ids=%5B${songId}%5D`;
      const detailRes = await fetch(detailUrl, { headers: NETEASE_HEADERS, cache: "no-store" });
      if (detailRes.ok) {
        const detailData = await detailRes.json();
        coverUrl = detailData?.songs?.[0]?.album?.picUrl ?? "";
      }
    } catch {
      /* cover optional */
    }

    // 3. 歌词
    let lyric = "";
    try {
      const lyricUrl = `https://music.163.com/api/song/lyric?id=${songId}&lv=1&kv=1&tv=-1`;
      const lyricRes = await fetch(lyricUrl, { headers: NETEASE_HEADERS, cache: "no-store" });
      if (lyricRes.ok) {
        const lyricData = await lyricRes.json();
        lyric = lyricData?.lrc?.lyric ?? "";
      }
    } catch {
      /* lyric optional */
    }

    return NextResponse.json({
      name: best.name,
      artist: (best.artists ?? []).map((a) => a.name).join(", "),
      album: best.album?.name ?? "",
      coverUrl,
      lyric,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "recognition failed", detail: String(err) },
      { status: 500 }
    );
  }
}
