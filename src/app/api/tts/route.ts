import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const text = request.nextUrl.searchParams.get('text');
  const lang = request.nextUrl.searchParams.get('lang') || 'am';

  if (!text) {
    return NextResponse.json({ error: 'Text required' }, { status: 400 });
  }

  try {
    // Use Google Translate TTS (supports Amharic)
    const encodedText = encodeURIComponent(text);
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=${lang}&client=tw-ob`;

    const response = await fetch(ttsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://translate.google.com/',
      },
    });

    if (!response.ok) {
      throw new Error('TTS request failed');
    }

    const audioBuffer = await response.arrayBuffer();
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('TTS error:', error);
    return NextResponse.json({ error: 'TTS failed' }, { status: 500 });
  }
}