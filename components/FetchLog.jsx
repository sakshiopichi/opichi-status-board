'use client';
import { useRef, useEffect } from 'react';
import clsx from 'clsx';

export default function FetchLog({ logs, onClear }) {
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  return (
    <div className="bg-white border border-black/10 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.06]">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Real-time fetch log</p>
        <button onClick={onClear}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100">
          Clear
        </button>
      </div>
      <div className="font-mono text-xs max-h-80 overflow-y-auto p-3 space-y-0.5">
        {logs.length === 0 && <p className="text-gray-400 italic px-1">Waiting for first fetch…</p>}
        {logs.map((log, i) => (
          <div key={i} className="flex gap-3 py-0.5">
            <span className="text-gray-300 flex-shrink-0">{log.time}</span>
            <span className={clsx(
              log.type === 'ok'   && 'text-green-700',
              log.type === 'err'  && 'text-red-600',
              log.type === 'info' && 'text-blue-600',
              log.type === 'plain'&& 'text-gray-500',
            )}>{log.msg}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
