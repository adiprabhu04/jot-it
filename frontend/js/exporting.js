import { toast } from './util.js';
import { state } from './state.js';

// Export features: PDF / CSV (extracted verbatim).
    function exportAsCSV() {
        const notes = state.notes;
        if (!notes.length) { toast('No notes to export', 'info'); return; }

        const headers = ['Title', 'Content', 'Category', 'Pinned', 'Created', 'Updated'];
        const rows = notes.map(n => [
            `"${(n.title || '').replace(/"/g, '""')}"`,
            `"${(n.content || '').replace(/"/g, '""')}"`,
            `"${n.category || 'General'}"`,
            n.isPinned ? 'Yes' : 'No',
            new Date(n.createdAt).toLocaleDateString(),
            new Date(n.updatedAt).toLocaleDateString()
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `jotit-notes-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast('Notes exported as CSV', 'success');
    }

    function exportAsPDF() {
        const notes = state.notes;
        if (!notes.length) { toast('No notes to export', 'info'); return; }

        const categoryColors = {
            'Personal': '#818CF8',
            'Work': '#4ADE80',
            'Ideas': '#C084FC',
            'General': '#888888'
        };

        const notesHTML = notes.map(n => `
            <div class="note">
                <div class="note-header">
                    <h2>${n.title || 'Untitled'}</h2>
                    <span class="badge" style="background:${categoryColors[n.category] || '#888'}22;
                        color:${categoryColors[n.category] || '#888'};
                        border:1px solid ${categoryColors[n.category] || '#888'}">
                        ${n.category || 'General'}
                    </span>
                    ${n.isPinned ? '<span class="pinned-badge">Pinned</span>' : ''}
                </div>
                <p class="content">${(n.content || '').replace(/\n/g, '<br>')}</p>
                <div class="note-footer">
                    <span>${new Date(n.updatedAt).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'long', day: 'numeric'
                    })}</span>
                </div>
                ${n.imageData ? `<img src="${n.imageData}" class="scan-img">` : ''}
            </div>
        `).join('');

        const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Jot It — My Notes</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, sans-serif;
    background: #fff; color: #0a0a0a; padding: 40px; }
  h1 { font-size: 28px; font-weight: 600; margin-bottom: 8px;
    letter-spacing: -0.5px; }
  .subtitle { font-size: 14px; color: #888; margin-bottom: 40px; }
  .note { border: 1px solid #eee; border-radius: 12px;
    padding: 20px 24px; margin-bottom: 20px; break-inside: avoid; }
  .note-header { display: flex; align-items: center; gap: 10px;
    margin-bottom: 10px; flex-wrap: wrap; }
  .note-header h2 { font-size: 16px; font-weight: 600; flex: 1; }
  .badge { font-size: 11px; font-weight: 500; padding: 3px 10px;
    border-radius: 20px; }
  .pinned-badge { font-size: 11px; padding: 3px 10px;
    border-radius: 20px; background: #EEF0FF; color: #5B6EF5;
    border: 1px solid #5B6EF5; }
  .content { font-size: 14px; color: #444; line-height: 1.7;
    margin-bottom: 12px; }
  .note-footer { font-size: 12px; color: #aaa; }
  .scan-img { max-width: 200px; border-radius: 8px;
    margin-top: 12px; border: 1px solid #eee; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
<h1>Jot It</h1>
<p class="subtitle">Exported on ${new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric' })}
    · ${notes.length} note${notes.length !== 1 ? 's' : ''}</p>
${notesHTML}
</body>
</html>`;

        const win = window.open('', '_blank');
        win.document.write(html);
        win.document.close();
        win.focus();
        setTimeout(() => { win.print(); }, 500);
        toast('Opening print dialog...', 'info');
    }

    function exportNoteAsPDF(noteId) {
        const note = state.notes.find(n => n.id === noteId);
        if (!note) return;
        const categoryColors = {
            'Personal': '#6C8EF5', 'Work': '#3DD68C',
            'Ideas': '#F5A623', 'General': '#6B7280'
        };
        const color = note.color || categoryColors[note.category] || '#6B7280';
        const html = `<!DOCTYPE html><html><head>
            <meta charset="UTF-8">
            <title>${note.title || 'Note'}</title>
            <style>
                body { font-family: Inter, sans-serif; max-width: 600px;
                    margin: 40px auto; color: #0A0A0A; }
                h1 { font-size: 24px; font-weight: 700; border-left: 4px solid ${color};
                    padding-left: 12px; margin-bottom: 8px; }
                .meta { font-size: 12px; color: #888; margin-bottom: 16px; }
                .summary { font-style: italic; color: #555; border-left: 3px solid #5B6EF5;
                    padding: 8px 12px; background: #f5f5ff; border-radius: 4px;
                    margin-bottom: 16px; font-size: 13px; }
                .content { font-size: 15px; line-height: 1.7; }
                img { max-width: 100%; border-radius: 8px; margin-top: 16px; }
            </style></head><body>
            <h1>${note.title || 'Untitled'}</h1>
            <div class="meta">${note.category || 'General'} · ${new Date(note.updatedAt).toLocaleDateString('en-US', {year:'numeric', month:'long', day:'numeric'})}</div>
            ${note.summary ? `<div class="summary">${note.summary}</div>` : ''}
            <div class="content">${note.content || ''}</div>
            ${note.imageData ? `<img src="${note.imageData}">` : ''}
        </body></html>`;
        const win = window.open('', '_blank');
        win.document.write(html);
        win.document.close();
        setTimeout(() => win.print(), 500);
    }

    function exportNoteAsCSV(noteId) {
        const note = state.notes.find(n => n.id === noteId);
        if (!note) return;
        const plain = (note.content || '').replace(/<[^>]*>/g, '');
        const csv = ['Title,Content,Category,Tags,Created,Updated',
            `"${(note.title||'').replace(/"/g,'""')}","${plain.replace(/"/g,'""')}",` +
            `"${note.category||'General'}","${note.tags||''}",` +
            `"${new Date(note.createdAt).toLocaleDateString()}",` +
            `"${new Date(note.updatedAt).toLocaleDateString()}"`
        ].join('\n');
        const blob = new Blob([csv], {type:'text/csv'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${note.title || 'note'}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

export { exportAsCSV, exportAsPDF, exportNoteAsPDF, exportNoteAsCSV };
