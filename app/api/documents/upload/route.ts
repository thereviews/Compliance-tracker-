import { NextResponse } from 'next/server';
import { getAuthClient } from '@/lib/supabase';
import { ai, documentExtractionSchema } from '@/lib/gemini';

export async function POST(req: Request) {
  let step = 'starting';

  try {
    // 1. Authenticate
    step = 'authenticating';

    const supabase = getAuthClient(
      req.headers.get('Authorization')
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          details: authError?.message || 'No user found',
          step,
        },
        { status: 401 }
      );
    }

    // 2. Read form data
    step = 'reading form data';

    const formData = await req.formData();

    const file = formData.get('file') as File;
    let vendorId = formData.get('vendorId') as string | null;
    const newVendorName =
      formData.get('newVendorName') as string | null;

    if (!file) {
      return NextResponse.json(
        {
          error: 'File is required',
          step,
        },
        { status: 400 }
      );
    }

    // 3. Read file
    step = 'reading file';

    const fileBuffer = await file.arrayBuffer();

    const filePath = `${user.id}/${Date.now()}_${file.name}`;

    // 4. Upload to Supabase Storage
    step = 'uploading to Supabase Storage';

    const { error: uploadError } = await supabase.storage
      .from('compliance-files')
      .upload(filePath, fileBuffer, {
        contentType: file.type || 'application/pdf',
      });

    if (uploadError) {
      throw new Error(
        `Supabase Storage: ${uploadError.message}`
      );
    }

    // 5. Prepare Gemini request
    step = 'preparing Gemini request';

    const base64File = Buffer.from(fileBuffer).toString(
      'base64'
    );

    // 6. Gemini extraction
    step = 'calling Gemini';

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: file.type || 'application/pdf',
                data: base64File,
              },
            },
            {
              text: 'Extract structured compliance metadata from this document.',
            },
          ],
        },
      ],
      config: {
        systemInstruction:
          'You are a backend legal and procurement document parser. Extract structured compliance metadata from this PDF. Return strictly valid JSON.',
        responseMimeType: 'application/json',
        responseSchema: documentExtractionSchema,
      },
    });

    // 7. Parse Gemini result
    step = 'parsing Gemini response';

    const extraction = JSON.parse(response.text());

    // 8. Vendor handling
    step = 'processing vendor';

    if (!vendorId) {
      const vName =
        newVendorName ||
        extraction.vendor_name ||
        'Unknown Vendor';

      const { data: existingVendor, error: existingError } =
        await supabase
          .from('vendors')
          .select('id')
          .eq('name', vName)
          .eq('user_id', user.id)
          .single();

      if (existingVendor) {
        vendorId = existingVendor.id;
      } else if (
        existingError &&
        existingError.code !== 'PGRST116'
      ) {
        throw new Error(
          `Vendor lookup failed: ${existingError.message}`
        );
      } else {
        const {
          data: newVendor,
          error: vendorError,
        } = await supabase
          .from('vendors')
          .insert({
            name: vName,
            user_id: user.id,
          })
          .select('id')
          .single();

        if (vendorError) {
          throw new Error(
            `Vendor creation failed: ${vendorError.message}`
          );
        }

        vendorId = newVendor.id;
      }
    }

    // 9. Insert document
    step = 'saving document to database';

    const {
      data: newDocument,
      error: docError,
    } = await supabase
      .from('compliance_documents')
      .insert({
        user_id: user.id,
        vendor_id: vendorId,
        file_path: filePath,
        document_type: extraction.document_type,
        effective_date: extraction.effective_date,
        expiration_date: extraction.expiration_date,
        auto_renewal: extraction.auto_renewal,
        notice_period_days: extraction.notice_period_days,
        financial_value: extraction.financial_value,
        compliance_summary: extraction.compliance_summary,
        status: 'Active',
      })
      .select()
      .single();

    if (docError) {
      throw new Error(
        `Document DB insert failed: ${docError.message}`
      );
    }

    // 10. Success
    return NextResponse.json({
      success: true,
      data: newDocument,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(
      `DOCUMENT UPLOAD ERROR at step "${step}":`,
      message
    );

    return NextResponse.json(
      {
        error: 'Upload failed',
        details: message,
        step,
      },
      { status: 500 }
    );
  }
}
