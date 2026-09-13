"use client";

import { useState, useTransition } from "react";

import { deletePost } from "@/app/(app)/classroom/[classroomId]/post-actions";
import { Attachment } from "@/components/post/attachment";
import { LocalTime } from "@/components/post/local-time";
import { PostComposer } from "@/components/post/post-composer";
import { Button } from "@/components/ui/button";
import type { Post } from "@/lib/api/types";
import { cn } from "@/lib/utils";

interface PostFeedProps {
  classroomId: string;
  kind: "announcement" | "material";
  initialPosts: Post[];
  canManage: boolean;
}

const COPY = {
  announcement: {
    heading: "Announcements",
    action: "New announcement",
    empty: "No announcements yet.",
  },
  material: {
    heading: "Materials",
    action: "Upload material",
    empty:
      "No materials yet. Slides, handouts and readings shared here can be downloaded by everyone in the class.",
  },
} as const;

/** Announcements and materials: a newest-first list, teachers post and delete. */
export function PostFeed({ classroomId, kind, initialPosts, canManage }: PostFeedProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [syncedFrom, setSyncedFrom] = useState(initialPosts);
  const [composing, setComposing] = useState(false);
  const copy = COPY[kind];

  // Adopt a fresh server render after an action revalidates — see NoteList.
  if (syncedFrom !== initialPosts) {
    setSyncedFrom(initialPosts);
    setPosts(initialPosts);
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{copy.heading}</h2>
        {canManage && (
          <Button size="sm" onClick={() => setComposing(true)}>
            {copy.action}
          </Button>
        )}
      </div>

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-14 text-center dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">{copy.empty}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              classroomId={classroomId}
              canManage={canManage}
              onDeleted={(id) => setPosts((current) => current.filter((p) => p.id !== id))}
            />
          ))}
        </ul>
      )}

      {canManage && (
        <PostComposer
          classroomId={classroomId}
          kind={kind}
          open={composing}
          onClose={() => setComposing(false)}
          onCreated={(post) => setPosts((current) => [post, ...current])}
        />
      )}
    </>
  );
}

function PostCard({
  post,
  classroomId,
  canManage,
  onDeleted,
}: {
  post: Post;
  classroomId: string;
  canManage: boolean;
  onDeleted: (id: string) => void;
}) {
  const [isPending, startTransition] = useTransition();

  function remove() {
    const warning = post.asset
      ? `Delete "${post.title}" and its file? This cannot be undone.`
      : `Delete "${post.title}"? This cannot be undone.`;
    if (!window.confirm(warning)) return;

    startTransition(async () => {
      const result = await deletePost(classroomId, post.id);
      if (result.ok) onDeleted(post.id);
      else window.alert(result.error);
    });
  }

  return (
    <li
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900",
        isPending && "pointer-events-none opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-medium text-slate-900 dark:text-white">{post.title}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {post.author_name} · <LocalTime iso={post.created_at} />
          </p>
        </div>
        {canManage && (
          <Button variant="ghost" size="sm" onClick={remove} isLoading={isPending}>
            Delete
          </Button>
        )}
      </div>

      {post.description && (
        <p className="mt-3 text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-300">
          {post.description}
        </p>
      )}

      {post.asset && <Attachment asset={post.asset} className="mt-3" />}
    </li>
  );
}
