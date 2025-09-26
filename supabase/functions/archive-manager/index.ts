import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid auth token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action } = await req.json();

    console.log('Archive manager request:', { action });

    if (action === 'create_archive') {
      const { documentId, policyId, fileData } = await req.json();

      // Get document and policy information
      const { data: document, error: docError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .eq('uploaded_by', user.id)
        .single();

      if (docError || !document) {
        throw new Error('Document not found or access denied');
      }

      const { data: policy, error: policyError } = await supabase
        .from('archive_policies')
        .select('*')
        .eq('id', policyId)
        .eq('created_by', user.id)
        .single();

      if (policyError || !policy) {
        throw new Error('Archive policy not found or access denied');
      }

      // Generate document hash
      const encoder = new TextEncoder();
      const data = encoder.encode(fileData);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = new Uint8Array(hashBuffer);
      const originalHash = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');

      // Simulate compression and generate archived hash
      const compressedData = fileData; // In production, implement actual compression
      const compressedBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(compressedData));
      const compressedHashArray = new Uint8Array(compressedBuffer);
      const archivedHash = Array.from(compressedHashArray).map(b => b.toString(16).padStart(2, '0')).join('');

      // Calculate retention expiry
      const retentionExpiry = new Date();
      retentionExpiry.setMonth(retentionExpiry.getMonth() + policy.retention_period_months);

      // Generate archive path
      const archivePath = `/archives/${user.id}/${new Date().getFullYear()}/${documentId}_${Date.now()}.archive`;

      // Create timestamp info
      const timestampInfo = {
        archived_at: new Date().toISOString(),
        hash_algorithm: 'SHA-256',
        original_hash: originalHash,
        archived_hash: archivedHash,
        retention_policy: policy.name,
        legal_requirement: policy.legal_requirement
      };

      // Create archive record
      const { data: archive, error: archiveError } = await supabase
        .from('document_archives')
        .insert({
          document_id: documentId,
          archive_policy_id: policyId,
          original_hash: originalHash,
          archived_hash: archivedHash,
          timestamp_info: timestampInfo,
          retention_expires_at: retentionExpiry.toISOString(),
          archive_path: archivePath,
          file_size: data.length,
          compression_ratio: 1.0, // No compression in this example
          archived_by: user.id,
          ...(policy.auto_seal_enabled && { sealed_at: new Date().toISOString() })
        })
        .select()
        .single();

      if (archiveError) {
        console.error('Error creating archive:', archiveError);
        throw new Error('Failed to create archive');
      }

      console.log('Archive created successfully:', archive.id);

      return new Response(JSON.stringify({
        success: true,
        archive: archive,
        timestamp_info: timestampInfo
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'seal_archive') {
      const { archiveId } = await req.json();

      // Get archive record
      const { data: archive, error: fetchError } = await supabase
        .from('document_archives')
        .select(`
          *,
          documents!inner(uploaded_by)
        `)
        .eq('id', archiveId)
        .eq('documents.uploaded_by', user.id)
        .single();

      if (fetchError || !archive) {
        throw new Error('Archive not found or access denied');
      }

      if (archive.sealed_at) {
        throw new Error('Archive is already sealed');
      }

      // Seal the archive
      const { data: sealedArchive, error: sealError } = await supabase
        .from('document_archives')
        .update({
          sealed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', archiveId)
        .select()
        .single();

      if (sealError) {
        console.error('Error sealing archive:', sealError);
        throw new Error('Failed to seal archive');
      }

      console.log('Archive sealed successfully:', sealedArchive.id);

      return new Response(JSON.stringify({
        success: true,
        archive: sealedArchive,
        sealed_at: sealedArchive.sealed_at
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'auto_seal_expired') {
      // Get policies with auto-seal enabled
      const { data: policies, error: policiesError } = await supabase
        .from('archive_policies')
        .select('id, retention_period_months')
        .eq('auto_seal_enabled', true);

      if (policiesError) {
        console.error('Error fetching auto-seal policies:', policiesError);
        throw new Error('Failed to fetch auto-seal policies');
      }

      let processedCount = 0;

      for (const policy of policies) {
        // Calculate auto-seal date (e.g., 30 days before retention expiry)
        const autoSealDate = new Date();
        autoSealDate.setMonth(autoSealDate.getMonth() + policy.retention_period_months);
        autoSealDate.setDate(autoSealDate.getDate() - 30); // 30 days before expiry

        // Get archives that need auto-sealing
        const { data: archivesToSeal, error: archivesError } = await supabase
          .from('document_archives')
          .select('id')
          .eq('archive_policy_id', policy.id)
          .is('sealed_at', null)
          .lte('created_at', autoSealDate.toISOString());

        if (archivesError) {
          console.error('Error fetching archives to seal:', archivesError);
          continue;
        }

        // Seal archives
        for (const archive of archivesToSeal) {
          const { error: sealError } = await supabase
            .from('document_archives')
            .update({
              sealed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', archive.id);

          if (!sealError) {
            processedCount++;
          }
        }
      }

      console.log('Auto-seal completed:', { processedCount });

      return new Response(JSON.stringify({
        success: true,
        processedCount
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in archive-manager function:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});