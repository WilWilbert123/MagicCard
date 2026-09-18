import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/require-auth';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const employeeId = formData.get('employeeId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const auth = await requireAuth();
    const authUser = auth.authenticated ? auth.user : null;

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || 'image/png';
    const fileName = `photo_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    const admin = createAdminSupabaseClient();
    let publicUrl = '';

    // Try uploading to Supabase Storage bucket 'card-assets'
    try {
      const { data, error } = await admin.storage
        .from('card-assets')
        .upload(`photos/${fileName}`, buffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (!error && data?.path) {
        const { data: pubUrlData } = admin.storage
          .from('card-assets')
          .getPublicUrl(`photos/${fileName}`);

        if (pubUrlData?.publicUrl) {
          publicUrl = pubUrlData.publicUrl;
        }
      }
    } catch (sErr) {
      console.warn('Supabase storage upload fallback to data URL:', sErr);
    }

    // Fallback to Data URL if Supabase storage is not configured locally
    if (!publicUrl) {
      const base64 = buffer.toString('base64');
      publicUrl = `data:${mimeType};base64,${base64}`;
    }

    // Log to public.employee_photos if employeeId is passed
    if (employeeId) {
      try {
        await admin
          .from('employee_photos')
          .update({ is_active: false })
          .eq('employee_id', employeeId);

        await admin.from('employee_photos').insert({
          employee_id: employeeId,
          storage_path: publicUrl,
          file_name: fileName,
          file_size_bytes: file.size || buffer.length,
          mime_type: mimeType,
          is_active: true,
          uploaded_by: authUser?.id || null,
        });
      } catch (dbErr) {
        console.warn('Could not insert employee_photos audit record:', dbErr);
      }
    }

    return NextResponse.json({ url: publicUrl, fileName });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 });
  }
}

