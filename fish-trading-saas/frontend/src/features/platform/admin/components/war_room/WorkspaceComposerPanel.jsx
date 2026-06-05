import React, { useState } from 'react';
import { Bold, Italic, Code, Link, List, Quote, Sparkles, Eye, Edit3, Shield, User, Clock, CheckCircle2, AlertTriangle, ShieldCheck, X } from 'lucide-react';
import { AttachmentUploader } from './AttachmentUploader';
import clsx from 'clsx';

export function WorkspaceComposerPanel({
  mode, // 'create' | 'view' | 'edit' | 'escalate' | 'resolve'
  subject,
  setSubject,
  description,
  setDescription,
  applyTemplate,
  priority,
  severity,
  tags,
  setTags,
  files,
  setFiles,
  ticket,
  onSendMessage
}) {
  const [activeTab, setActiveTab] = useState('write');
  const [replyText, setReplyText] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [replyLoading, setReplyLoading] = useState(false);

  const isEditOrCreate = mode === 'create' || mode === 'edit';

  const insertMarkdown = (syntax) => {
    const textarea = document.getElementById('composer-textarea');
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    
    let replacement = '';
    if (syntax === 'bold') replacement = `**${selected || 'bold text'}**`;
    else if (syntax === 'italic') replacement = `*${selected || 'italic text'}*`;
    else if (syntax === 'code') replacement = `\`\`\`\n${selected || 'code block'}\n\`\`\``;
    else if (syntax === 'link') replacement = `[${selected || 'link text'}](url)`;
    else if (syntax === 'list') replacement = `\n- ${selected || 'list item'}`;
    else if (syntax === 'quote') replacement = `\n> ${selected || 'quote'}`;

    const newText = text.substring(0, start) + replacement + text.substring(end);
    setDescription(newText);
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || replyLoading) return;
    setReplyLoading(true);
    try {
      await onSendMessage(ticket.id, replyText, isInternal);
      setReplyText("");
    } finally {
      setReplyLoading(false);
    }
  };

  if (!isEditOrCreate && ticket) {
    // VIEW / DISPLAY MODE
    return (
      <div className="col-span-12 lg:col-span-5 bg-[#0d0e12] border border-white/5 rounded-2xl p-6 overflow-y-auto custom-scrollbar flex flex-col max-h-[calc(92vh-178px)] gap-6">
        
        {/* Subject & Description Card */}
        <div className="space-y-4">
          <div className="border-b border-white/5 pb-3">
            <span className="text-[10px] text-slate-500 font-mono block">SUBJECT</span>
            <h2 className="text-base font-bold text-slate-100 mt-1 leading-snug">{ticket.subject}</h2>
          </div>
          
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-mono block">DESCRIPTION</span>
            <div className="bg-black/30 border border-white/5 rounded-xl p-4 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
              {ticket.description || "No description provided."}
            </div>
          </div>
        </div>

        {/* Activity Timeline / Messages Feed */}
        <div className="flex-1 flex flex-col min-h-[320px] gap-3">
          <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">Activity & Discussion</span>
          
          <div className="flex-1 bg-black/20 border border-white/5 rounded-xl p-4 overflow-y-auto custom-scrollbar space-y-4 max-h-[360px]">
            {ticket.messages && ticket.messages.length > 0 ? (
              ticket.messages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={clsx(
                    "p-3 rounded-lg border text-xs space-y-1.5 transition-all max-w-[90%]",
                    msg.is_internal 
                      ? "bg-amber-500/[0.03] border-amber-500/20 text-amber-200/90 ml-auto" 
                      : "bg-white/[0.02] border-white/5 text-slate-300 mr-auto"
                  )}
                >
                  <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-1">
                    <span className="font-bold flex items-center gap-1">
                      {msg.is_internal ? <Shield size={11} className="text-amber-500" /> : <User size={11} className="text-slate-400" />}
                      {msg.author_name}
                      {msg.is_internal && <span className="text-[8px] bg-amber-500/10 text-amber-400 px-1 rounded uppercase tracking-wider font-semibold">Team Note</span>}
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="leading-relaxed font-sans">{msg.content}</p>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-600">
                <Clock className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-xs">No activity logged. Send a reply below to begin.</p>
              </div>
            )}
          </div>
        </div>

        {/* Live Quick Reply Composer Box */}
        <div className="bg-[#12141a] border border-white/5 rounded-xl p-3.5 space-y-3 shrink-0">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">Reply Composer</span>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                className="rounded border-white/10 bg-black/20 text-amber-500 focus:ring-amber-500"
              />
              <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1 uppercase tracking-wider">
                <Shield size={10} /> Internal Note
              </span>
            </label>
          </div>
          
          <div className="flex gap-2">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && replyText.trim()) {
                  e.preventDefault();
                  handleSendReply();
                }
              }}
              placeholder={isInternal ? "Write an internal team note..." : "Write a response to the client..."}
              className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none h-14 custom-scrollbar"
            />
            <button
              type="button"
              onClick={handleSendReply}
              disabled={!replyText.trim() || replyLoading}
              className={clsx(
                "px-4 text-xs font-bold rounded-lg transition-colors flex items-center justify-center shrink-0 h-14",
                isInternal
                  ? "bg-amber-600 hover:bg-amber-500 text-white disabled:bg-slate-800 disabled:text-slate-500"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white disabled:bg-slate-800 disabled:text-slate-500"
              )}
            >
              {replyLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Send"}
            </button>
          </div>
        </div>

      </div>
    );
  }

  // CREATE OR EDIT FORM MODE
  return (
    <div className="col-span-12 lg:col-span-5 bg-[#0d0e12] border border-white/5 rounded-2xl p-6 overflow-y-auto custom-scrollbar flex flex-col max-h-[calc(92vh-178px)] gap-6">
      
      {/* Estimated info badge header */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded border tracking-wider bg-indigo-500/10 text-indigo-400 border-indigo-500/20 uppercase">
            Priority: {priority}
          </span>
          <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-white/5 uppercase font-medium">
            Severity: {severity}
          </span>
        </div>
        <div className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
          <Clock size={11} /> Response SLA: {priority === 'critical' ? '30m' : priority === 'high' ? '2h' : '12h'}
        </div>
      </div>

      {/* Subject Input */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-300">Issue Subject <span className="text-rose-500">*</span></label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Brief, descriptive title summarizing the issue..."
          className="w-full bg-white/[0.02] border border-white/10 rounded-lg px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/80 font-medium placeholder:text-slate-600 transition-all h-12"
        />
      </div>

      {/* Template Quick Selection */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Load Template</label>
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: 'Technical', type: 'technical' },
            { label: 'Billing', type: 'billing' },
            { label: 'Voice AI', type: 'voice' },
            { label: 'Security', type: 'security' },
            { label: 'Inventory', type: 'inventory' },
            { label: 'Payment', type: 'payment' },
            { label: 'API Failure', type: 'api_failure' }
          ].map(tpl => (
            <button
              key={tpl.type}
              type="button"
              onClick={() => applyTemplate(tpl.type)}
              className="text-[10px] font-medium px-2.5 py-1 bg-white/5 border border-white/10 rounded-md text-slate-300 hover:bg-white/15 hover:text-white transition-colors"
            >
              {tpl.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rich Markdown Area */}
      <div className="flex-1 flex flex-col min-h-[460px] border border-white/10 rounded-xl overflow-hidden bg-black/40">
        <div className="h-11 px-4 border-b border-white/5 bg-[#12141a] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('write')}
              className={clsx(
                "text-xs px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors font-medium",
                activeTab === 'write' ? "bg-white/10 text-white" : "text-slate-400 hover:text-slate-200"
              )}
            >
              <Edit3 size={13} /> Write
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={clsx(
                "text-xs px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors font-medium",
                activeTab === 'preview' ? "bg-white/10 text-white" : "text-slate-400 hover:text-slate-200"
              )}
            >
              <Eye size={13} /> Preview
            </button>
          </div>

          {activeTab === 'write' && (
            <div className="flex items-center gap-2 border-l border-white/5 pl-3">
              {[
                { icon: <Bold size={13} />, action: 'bold', label: 'Bold' },
                { icon: <Italic size={13} />, action: 'italic', label: 'Italic' },
                { icon: <Code size={13} />, action: 'code', label: 'Code' },
                { icon: <Link size={13} />, action: 'link', label: 'Link' },
                { icon: <List size={13} />, action: 'list', label: 'List' },
                { icon: <Quote size={13} />, action: 'quote', label: 'Quote' },
              ].map((btn, i) => (
                <button
                  key={i}
                  type="button"
                  title={btn.label}
                  onClick={() => insertMarkdown(btn.action)}
                  className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded transition-colors"
                >
                  {btn.icon}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar flex flex-col bg-white/[0.01]">
          {activeTab === 'write' ? (
            <textarea
              id="composer-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a detailed description of the incident... Use Markdown formatting."
              className="w-full flex-1 bg-transparent text-slate-300 text-xs focus:outline-none resize-none font-mono placeholder:text-slate-600 min-h-[220px]"
            />
          ) : (
            <div className="w-full flex-1 text-slate-300 text-xs font-sans whitespace-pre-wrap leading-relaxed select-text prose prose-invert">
              {description ? (
                description.split('\n').map((line, idx) => {
                  if (line.startsWith('### ')) return <h3 key={idx} className="text-sm font-bold text-white mt-3 mb-1.5">{line.substring(4)}</h3>;
                  if (line.startsWith('## ')) return <h2 key={idx} className="text-base font-bold text-white mt-4 mb-2">{line.substring(3)}</h2>;
                  if (line.startsWith('- ')) return <li key={idx} className="ml-4 list-disc">{line.substring(2)}</li>;
                  if (line.startsWith('> ')) return <blockquote key={idx} className="border-l-2 border-slate-600 pl-3 italic text-slate-400 my-2">{line.substring(2)}</blockquote>;
                  return <p key={idx} className="mb-2">{line}</p>;
                })
              ) : (
                <p className="text-slate-600 italic">Nothing to preview yet. Start typing in the Write tab.</p>
              )}
            </div>
          )}
        </div>

        <div className="h-8 px-4 border-t border-white/5 bg-[#12141a]/50 flex items-center justify-between text-[10px] text-slate-500 shrink-0">
          <span>Markdown Enabled</span>
          <span className="font-mono">
            {description.split(/\s+/).filter(t => t).length} words | {description.length} chars
          </span>
        </div>
      </div>

      {/* Tags Input */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Tags (comma separated)</label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="e.g. billing_api, l2_triage, auth_failure"
          className="w-full bg-white/[0.02] border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/80 transition-all h-10"
        />
      </div>

      {/* Attachments Section */}
      <AttachmentUploader files={files} setFiles={setFiles} />

    </div>
  );
}
