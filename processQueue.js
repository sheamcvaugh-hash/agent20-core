import { createClient } from '@supabase/supabase-js';
import { summarizeText, extractTags } from './core-logic.js';
import { sendToNotion } from './notion.js';
import { sendToDiscord } from './discord.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function processNextEntry() {
  const { data: entries, error: fetchError } = await supabase
    .from('agent20_queue')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1);

  if (fetchError) throw fetchError;
  if (!entries.length) {
    console.log('📭 No entries to process');
    return;
  }

  const entry = entries[0];

  // Mark as processing
  await supabase.from('agent20_queue')
    .update({ status: 'processing' })
    .eq('id', entry.id);

  try {
    const summary = await summarizeText(entry.raw_text);
    const tags = await extractTags(summary);

    await sendToNotion({
      summary,
      tags,
      raw: entry.raw_text,
      metadata: entry.metadata,
    });

    await sendToDiscord({
      summary,
      tags,
      source: entry.source,
    });

    await supabase.from('agent20_queue')
      .update({ status: 'complete', summary, tags })
      .eq('id', entry.id);

    console.log('✅ Processed entry:', entry.id);
  } catch (err) {
    console.error('❌ Processing error:', err.message);

    await supabase.from('agent20_queue')
      .update({ status: 'failed' })
      .eq('id', entry.id);
  }
}
