import React, { useState } from 'react';
import { Bold, Italic, Code, Link, List, Quote, Sparkles, Eye, Edit3, ShieldAlert, Clock, Tag } from 'lucide-react';
import { AttachmentUploader } from './AttachmentUploader';
import clsx from 'clsx';

export function IssueComposer({
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
  estimatedSLA
}) {
  const [activeTab, setActiveTab] = useState('write'); // 'write' or 'preview'
  const [aiSummary, setAiSummary] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const insertMarkdown = (syntax) => {
    if (activeTab !== 'write') return;
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
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + replacement.length, start + replacement.length);
    }, 10);
  };

  const handleAiAssist = () => {
    if (!description.trim()) {
      alert("Please write something in the description first for AI to analyze!");
      return;
    }
    setAiLoading(true);
    setTimeout(() => {
      setAiSummary({
        summary: `The issue reports a platform failure related to ${subject || 'the specified service'}. Impact is localized but requires immediate attention due to the SLA.`,
        fixes: [
          "Check api transaction logs in Datadog.",
          "Verify if tenant config has valid authorization token.",
          "Inspect cache keys for Cold Storage latency."
        ]
      });
      setAiLoading(false);
    }, 1200);
  };

  const getEstimateTime = () => {
    if (priority === 'critical') return "30 mins";
    if (priority === 'high') return "2 hours";
    if (priority === 'medium') return "12 hours";
    return "1 day";
  };

  return (
    <div className="col-span-12 lg:col-span-5 bg-[#0d0e12] border border-white/5 rounded-2xl p-6 overflow-y-auto custom-scrollbar flex flex-col max-h-[calc(92vh-178px)] gap-6">
      
      {/* Subject & Badges Header */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className={clsx(
              "text-[10px] font-bold px-2 py-0.5 rounded border tracking-wider uppercase",
              priority === 'critical' ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
              priority === 'high' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
              "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
            )}>
              Priority: {priority}
            </span>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-white/5 uppercase font-medium">
              Severity: {severity}
            </span>
          </div>
          
          <div className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
            <Clock size={11} /> Est: {getEstimateTime()}
          </div>
        </div>

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

      {/* Editor Main Area */}
      <div className="flex-1 flex flex-col min-h-[500px] border border-white/10 rounded-xl overflow-hidden bg-black/40">
        {/* Editor Toolbar Header */}
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
                { icon: <Code size={13} />, action: 'code', label: 'Code Block' },
                { icon: <Link size={13} />, action: 'link', label: 'Insert Link' },
                { icon: <List size={13} />, action: 'list', label: 'Bullet List' },
                { icon: <Quote size={13} />, action: 'quote', label: 'Blockquote' },
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

          <div>
            <button
              type="button"
              onClick={handleAiAssist}
              disabled={aiLoading}
              className="text-[10px] font-semibold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-1 rounded border border-indigo-500/20 flex items-center gap-1 transition-all disabled:opacity-50"
            >
              <Sparkles size={11} className={clsx(aiLoading && "animate-spin")} />
              {aiLoading ? "Analyzing..." : "AI Assist"}
            </button>
          </div>
        </div>

        {/* Text Area vs Preview Screen */}
        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar flex flex-col bg-white/[0.01]">
          {activeTab === 'write' ? (
            <textarea
              id="composer-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a detailed description of the incident... Use Markdown formatting."
              className="w-full flex-1 bg-transparent text-slate-300 text-xs focus:outline-none resize-none font-mono placeholder:text-slate-600 min-h-[300px]"
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

        {/* Editor Info Footer */}
        <div className="h-8 px-4 border-t border-white/5 bg-[#12141a]/50 flex items-center justify-between text-[10px] text-slate-500 shrink-0">
          <span>Markdown Enabled</span>
          <span className="font-mono">
            {description.split(/\s+/).filter(t => t).length} words | {description.length} chars
          </span>
        </div>
      </div>

      {/* AI Assistant Output Card */}
      {aiSummary && (
        <div className="bg-indigo-500/[0.03] border border-indigo-500/20 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <h5 className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={12} /> AI Issue Summary
            </h5>
            <button 
              type="button" 
              onClick={() => setAiSummary(null)} 
              className="text-slate-500 hover:text-slate-300"
            >
              <X size={12} />
            </button>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">{aiSummary.summary}</p>
          <div className="space-y-1">
            <p className="text-[9px] font-bold text-slate-400 uppercase">Suggested Fixes</p>
            {aiSummary.fixes.map((fix, i) => (
              <p key={i} className="text-[10px] text-indigo-200/90 flex items-start gap-1">
                <span className="text-indigo-400 font-bold shrink-0">•</span> {fix}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Tags Input */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
          <Tag size={12} /> Tags (comma separated)
        </label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="e.g. billing_api, l2_triage, auth_failure"
          className="w-full bg-white/[0.02] border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/80 transition-all h-10"
        />
      </div>

      {/* Attachment Section */}
      <AttachmentUploader files={files} setFiles={setFiles} />

    </div>
  );
}
