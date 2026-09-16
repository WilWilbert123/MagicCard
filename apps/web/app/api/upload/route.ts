import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || 'image/png';
    const fileName = `logo_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    // Try uploading to Supabase Storage bucket 'card-assets' or 'logos'
    try {
      const admin = createAdminSupabaseClient();
      const { data, error } = await admin.storage
        .from('card-assets')
        .upload(`logos/${fileName}`, buffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (!error && data?.path) {
        const { data: pubUrlData } = admin.storage
          .from('card-assets')
          .getPublicUrl(`logos/${fileName}`);

        if (pubUrlData?.publicUrl) {
          return NextResponse.json({ url: pubUrlData.publicUrl, fileName });
        }
      }
    } catch (sErr) {
      console.warn('Supabase storage upload fallback to data URL:', sErr);
    }

    // Fallback to optimized Data URL if Supabase storage bucket is not configured locally
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;
    return NextResponse.json({ url: dataUrl, fileName });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 });
  }
}
