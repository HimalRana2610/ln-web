"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

const CODE_BLOCK_CLASS =
  "my-4 overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm text-slate-100";

interface MarkdownViewProps {
  markdown: string;
  className?: string;
}

/**
 * Renders generated notes.
 *
 * Headings use **Kalam**, the handwriting face from the old app — it is a small
 * detail that carries most of the product's character, and its absence is
 * immediately noticeable.
 *
 * Mermaid blocks are rendered lazily: the library is ~500 kB, so importing it
 * eagerly would slow every page for the many notes that contain no diagram.
 */
export function MarkdownView({ markdown, className }: MarkdownViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!container.querySelector("pre.mermaid")) return;

    let cancelled = false;

    void (async () => {
      const mermaid = (await import("mermaid")).default;
      if (cancelled) return;

      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "default",
      });

      // Every diagram is parsed before any is rendered. `mermaid.run` reacts to
      // a syntax error by replacing the block with its own "Syntax error in
      // text" graphic, which is worse than showing nothing useful — the model
      // does occasionally emit invalid Mermaid, and a student reading the note
      // can still learn something from the source text but nothing from a red
      // error box. Invalid blocks therefore fall back to a plain code block.
      const blocks = Array.from(container.querySelectorAll("pre.mermaid"));
      const valid: Element[] = [];

      for (const block of blocks) {
        const parsed = await mermaid
          .parse(block.textContent ?? "", { suppressErrors: true })
          .catch(() => false);
        if (cancelled) return;

        if (parsed) {
          valid.push(block);
        } else {
          block.className = CODE_BLOCK_CLASS;
        }
      }

      if (!valid.length) return;

      try {
        await mermaid.run({ nodes: valid as HTMLElement[] });
      } catch {
        // Rendering can still fail for reasons parsing cannot catch. The block
        // stays as it is rather than taking the note down with it.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [markdown]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "prose-headings:font-handwriting max-w-none",
        "text-slate-800 dark:text-slate-200",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="font-handwriting mt-8 mb-4 text-3xl font-bold text-slate-900 first:mt-0 dark:text-white">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="font-handwriting mt-7 mb-3 border-b border-slate-200 pb-1 text-2xl font-bold text-slate-900 dark:border-slate-800 dark:text-white">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="font-handwriting mt-5 mb-2 text-xl font-semibold text-slate-900 dark:text-white">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="my-3 leading-relaxed">{children}</p>,
          ul: ({ children }) => (
            <ul className="my-3 list-disc space-y-1 pl-6">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-3 list-decimal space-y-1 pl-6">{children}</ol>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-4 border-l-4 border-blue-500 bg-blue-50 py-2 pl-4 text-slate-700 dark:bg-blue-950/40 dark:text-slate-300">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline underline-offset-2 dark:text-blue-400"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            // Wide tables scroll inside their own box rather than making the
            // whole page scroll sideways.
            <div className="my-4 overflow-x-auto">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-slate-300 bg-slate-100 px-3 py-2 text-left font-semibold dark:border-slate-700 dark:bg-slate-800">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-slate-300 px-3 py-2 dark:border-slate-700">
              {children}
            </td>
          ),
          code: ({ className: codeClassName, children }) => {
            const language = /language-(\w+)/.exec(codeClassName ?? "")?.[1];

            // Mermaid is handed to the renderer above rather than syntax
            // highlighted.
            if (language === "mermaid") {
              return (
                <pre className="mermaid my-4 flex justify-center overflow-x-auto rounded-lg bg-slate-50 p-4 dark:bg-slate-900">
                  {String(children)}
                </pre>
              );
            }

            if (!language) {
              return (
                <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.9em] dark:bg-slate-800">
                  {children}
                </code>
              );
            }

            return (
              <pre className={CODE_BLOCK_CLASS}>
                <code>{children}</code>
              </pre>
            );
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
