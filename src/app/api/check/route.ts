import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Mimic the exact headers from a real browser request to bypass 403 checks
    // AWS ELB / Cloudflare often checks these specific headers
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'max-age=0',
      'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none', // Changed to none or same-origin often helps since we are "direct"
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      // Sometimes an empty referer or google referer helps
      'Referer': 'https://www.google.com/', 
    };

    const response = await fetch('https://growtopiagame.com/', {
      headers: headers,
      cache: 'no-store',
      redirect: 'follow', // Ensure we follow redirects if any
    });

    const status = response.status;
    
    // Check if we actually got the content or if it's a "soft" block that returns 200 but shows a captcha
    // For now, trust the status code mainly.
    // If it's 403, we know it's blocked.
    
    let state = 'UNKNOWN';
    if (status === 200) state = 'SUCCESS';
    else if (status === 403) state = 'FORBIDDEN'; // Still forbidden even with headers?
    else if (status >= 500) state = 'ERROR';
    
    return NextResponse.json({
      status,
      state,
      ok: response.ok,
      timestamp: new Date().toISOString(),
      // headers_sent: headers // debug info
    }, { status: 200 });

  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json({
      status: 500,
      state: 'ERROR',
      ok: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
