import { NextResponse } from 'next/server';
import { getAuthClient } from '@/lib/supabase';
import { ai, documentExtractionSchema } from '@/lib/gemini';

export async function POST(req: Request) {
  try {
    const supabase = getAuthClient(req.headers.get('Authorization'));
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file') as File;
    let vendorId = formData.get('vendorId') as string | null;
    const newVendorName = formData.get('newVendorName') as string | null;

    if (!file) return NextResponse.json({ error: 'File is required' }, { status: 400 });

    // 1. Upload to Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const filePath = `${user.id}/${Date.now()}_${file.name}`;
    
    const { error: uploadError } = await supabase.storage
      .from('compliance-files')
      .upload(filePath, fileBuffer, { contentType: file.type });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    // 2. Process with Gemini
    const base64File = Buffer.from(fileBuffer).toString('base64');
    
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType: file.type, data: base64File } },
          { text: "Extract structured compliance metadata from this document." }
        ]
      }],
      config: {
        systemInstruction: "You are a backend legal and procurement document parser. Extract structured compliance metadata from this PDF. Return strictly valid JSON.",
        responseMimeType: "application/json",
        responseSchema: documentExtractionSchema,
      }
    });

    const extraction = JSON.parse(response.text()) as any;

    // 3. Database Operations
    if (!vendorId) {
      const vName = newVendorName || extraction.vendor_name || 'Unknown Vendor';
      
      const { data: existingVendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('name', vName)
        .eq('user_id', user.id)
        .single();

      if (existingVendor) {
        vendorId = existingVendor.id;
      } else {
        const { data: newVendor, error: vendorError } = await supabase
          .from('vendors')
          .insert({ name: vName, user_id: user.id })
          .select('id')
          .single();
          
        if (vendorError) throw new Error(`Vendor creation failed: ${vendorError.message}`);
        vendorId = newVendor.id;
      }
    }

    const { data: newDocument, error: docError } = await supabase
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
        status: 'Active'
      })
      .select()
      .single();

    if (docError) throw new Error(`Document DB insert failed: ${docError.message}`);

    return NextResponse.json({ success: true, data: newDocument });
  } catch (error: any) {
    return NextResponse.json({ error: 'Upload failed', details: error.message }, { status: 500 });
  }
}

