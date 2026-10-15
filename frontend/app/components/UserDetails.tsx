"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getInitials } from "@/lib";
import { supabase } from "@/lib/supabase/supabaseClient";
import { useChatStore, type MessageRecord } from "@/lib/store/chatStore";
import { StarredMessages } from "@/components/StarredMessages";

import {
  ArrowLeft,
  Ban,
  Calendar,
  ChevronRight,
  CircleMinus,
  Download,
  FileText,
  Folders,
  Image as ImageIcon,
  Link2,
  Loader2,
  Mail,
  Music,
  Phone,
  Star,
  Trash,
  Users,
  Video,
  X,
} from "lucide-react";

type GalleryTab = "media" | "docs" | "links";

export type UserDetailsData = {
  id: string;
  name: string;
  username: string | null;
  email: string | null;
  phoneNumber: string | null;
  avatarUrl: string | null;
  bio: string | null;
  connectedSince: string | null;
  online: boolean;
  mediaCount?: number | null;
  starredCount?: number | null;
  commonGroupsCount?: number | null;
};

type UserDetailsProps = {
  user: UserDetailsData;
  onClose: () => void;
};

interface GalleryAttachment {
  id: string;
  message_id: string;
  conversation_id: string;
  uploaded_by: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

interface GalleryLink {
  id: string;
  url: string;
  created_at: string;
}

interface GalleryData {
  media: GalleryAttachment[];
  docs: GalleryAttachment[];
  links: GalleryLink[];
  counts: {
    media: number;
    docs: number;
    links: number;
  };
}

const EMPTY_MESSAGES: MessageRecord[] = [];

const EMPTY_GALLERY: GalleryData = {
  media: [],
  docs: [],
  links: [],
  counts: { media: 0, docs: 0, links: 0 },
};

const formatConnectedDate = (value: string | null) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatSharedDate = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export const UserDetails = ({ user, onClose }: UserDetailsProps) => {
  const [showGallery, setShowGallery] = useState(false);
  const [activeGalleryTab, setActiveGalleryTab] = useState<GalleryTab>("media");
  const [galleryData, setGalleryData] = useState<GalleryData>(EMPTY_GALLERY);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryError, setGalleryError] = useState("");
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<string | null>(null);
  
  const [showStarred, setShowStarred] = useState(false);
  const [starredCount, setStarredCount] = useState<number | null>(null);

  const lastMessageIdRef = useRef<string | null | undefined>(undefined);

  const latestMessageId = useChatStore((state) => {
    const conversationMessages = state.messages[user.id] ?? EMPTY_MESSAGES;
    return conversationMessages[conversationMessages.length - 1]?.id ?? null;
  });

  const loadGallery = useCallback(async () => {
    setGalleryLoading(true);
    setGalleryError("");

    try {
      const response = await fetch(
        `/api/messages/gallery?userId=${encodeURIComponent(user.id)}`,
        { cache: "no-store" },
      );
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to load shared items.");
      }

      setGalleryData({
        media: Array.isArray(data.media) ? data.media : [],
        docs: Array.isArray(data.docs) ? data.docs : [],
        links: Array.isArray(data.links) ? data.links : [],
        counts: {
          media: Number(data.counts?.media ?? 0),
          docs: Number(data.counts?.docs ?? 0),
          links: Number(data.counts?.links ?? 0),
        },
      });
    } catch (error) {
      setGalleryError(
        error instanceof Error ? error.message : "Failed to load shared items.",
      );
    } finally {
      setGalleryLoading(false);
    }
  }, [user.id]);

  const loadStarredCount = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/messages/starred?userId=${encodeURIComponent(user.id)}`,
        { cache: "no-store" },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to load starred count.");
      }

      setStarredCount(Number(data.count ?? 0));
    } catch (error) {
      console.error("Failed to load starred message count:", error);
      setStarredCount(null);
    }
  }, [user.id]);

  useEffect(() => {
    void loadStarredCount();

    const handleStarredChange = () => {
      void loadStarredCount();
    };

    window.addEventListener("webchat:starred-changed", handleStarredChange);

    return () => {
      window.removeEventListener(
        "webchat:starred-changed",
        handleStarredChange,
      );
    };
  }, [loadStarredCount]);

  useEffect(() => {
    void loadGallery();
  }, [loadGallery]);

  useEffect(() => {
    if (lastMessageIdRef.current === undefined) {
      lastMessageIdRef.current = latestMessageId;
      return;
    }

    if (latestMessageId && latestMessageId !== lastMessageIdRef.current) {
      lastMessageIdRef.current = latestMessageId;
      void loadGallery();
    }
  }, [latestMessageId, loadGallery]);

  useEffect(() => {
    let cancelled = false;

    const loadSignedUrls = async () => {
      const entries = await Promise.all(
        galleryData.media.map(async (attachment) => {
          const { data, error } = await supabase.storage
            .from("chat-media")
            .createSignedUrl(attachment.storage_path, 60 * 60);

          if (error || !data?.signedUrl) {
            console.error("Create gallery preview URL error:", error);
            return null;
          }

          return [attachment.id, data.signedUrl] as const;
        }),
      );

      if (!cancelled) {
        const nextUrls: Record<string, string> = {};
        for (const entry of entries) {
          if (entry) nextUrls[entry[0]] = entry[1];
        }
        setSignedUrls(nextUrls);
      }
    };

    void loadSignedUrls();

    return () => {
      cancelled = true;
    };
  }, [galleryData.media]);

  const downloadAttachment = async (attachment: GalleryAttachment) => {
    setDownloadingAttachmentId(attachment.id);

    try {
      const { data, error } = await supabase.storage
        .from("chat-media")
        .createSignedUrl(attachment.storage_path, 60, {
          download: attachment.file_name,
        });

      if (error || !data?.signedUrl) {
        throw new Error(error?.message ?? "Failed to prepare download.");
      }

      const link = document.createElement("a");
      link.href = data.signedUrl;
      link.download = attachment.file_name;
      link.rel = "noopener noreferrer";
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      setGalleryError(
        error instanceof Error ? error.message : "Failed to download file.",
      );
    } finally {
      setDownloadingAttachmentId(null);
    }
  };

  const totalSharedItems = galleryData.counts.media + galleryData.counts.docs + galleryData.counts.links;

  const renderGalleryContent = () => {
    if (galleryLoading) {
      return (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
          <Loader2 size={16} className="animate-spin" />
          Loading shared items...
        </div>
      );
    }

    if (galleryError) {
      return (
        <div className="flex flex-col items-center gap-3 px-3 py-10 text-center">
          <p className="text-sm text-red-300">{galleryError}</p>
          <button
            type="button"
            onClick={() => void loadGallery()}
            className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-200 hover:bg-white/5"
          >
            Try again
          </button>
        </div>
      );
    }

    if (activeGalleryTab === "media") {
      if (galleryData.media.length === 0) {
        return <p className="px-3 py-10 text-center text-sm text-gray-500">No media shared yet.</p>;
      }

      return (
        <div className="grid grid-cols-2 gap-2">
          {galleryData.media.map((attachment) => {
            const url = signedUrls[attachment.id];
            const mimeType = attachment.mime_type.toLowerCase();

            return (
              <div
                key={attachment.id}
                className="min-w-0 overflow-hidden rounded-lg border border-gray-800 bg-[#0d1927]"
              >
                <div className="flex aspect-square items-center justify-center overflow-hidden bg-black/20">
                  {mimeType.startsWith("image/") ? (
                    url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-full w-full items-center justify-center"
                        aria-label={`Open ${attachment.file_name}`}
                      >
                        <img
                          src={url}
                          alt={attachment.file_name}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      </a>
                    ) : (
                      <ImageIcon size={32} className="text-purple-400" />
                    )
                  ) : mimeType.startsWith("video/") ? (
                    url ? (
                      <video
                        src={url}
                        controls
                        preload="metadata"
                        className="max-h-full max-w-full"
                      />
                    ) : (
                      <Video size={32} className="text-pink-400" />
                    )
                  ) : url ? (
                    <audio src={url} controls preload="metadata" className="w-full p-1" />
                  ) : (
                    <Music size={32} className="text-orange-400" />
                  )}
                </div>
                <div className="flex min-w-0 items-center gap-1 px-2 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-gray-200" title={attachment.file_name}>
                      {attachment.file_name}
                    </p>
                    <p className="mt-1 text-[10px] text-gray-500">
                      {formatFileSize(attachment.size_bytes)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void downloadAttachment(attachment)}
                    disabled={downloadingAttachmentId === attachment.id}
                    aria-label={`Download ${attachment.file_name}`}
                    title="Download"
                    className="shrink-0 rounded-full p-1.5 text-gray-400 hover:bg-white/10 hover:text-cyan-300 disabled:opacity-50"
                  >
                    {downloadingAttachmentId === attachment.id ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Download size={15} />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (activeGalleryTab === "docs") {
      if (galleryData.docs.length === 0) {
        return <p className="px-3 py-10 text-center text-sm text-gray-500">No documents shared yet.</p>;
      }

      return (
        <div className="flex flex-col gap-2">
          {galleryData.docs.map((attachment) => (
            <div
              key={attachment.id}
              className="flex min-w-0 items-center gap-3 rounded-lg border border-gray-800 bg-[#0d1927] p-3"
            >
              <FileText size={22} className="shrink-0 text-blue-400" />
              <div className="min-w-0 flex-1">
                <p className="break-all text-xs text-gray-200">{attachment.file_name}</p>
                <p className="mt-1 text-[10px] text-gray-500">
                  {formatFileSize(attachment.size_bytes)} · {formatSharedDate(attachment.created_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void downloadAttachment(attachment)}
                disabled={downloadingAttachmentId === attachment.id}
                aria-label={`Download ${attachment.file_name}`}
                title="Download"
                className="shrink-0 rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-cyan-300 disabled:opacity-50"
              >
                {downloadingAttachmentId === attachment.id ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Download size={16} />
                )}
              </button>
            </div>
          ))}
        </div>
      );
    }

    if (galleryData.links.length === 0) {
      return <p className="px-3 py-10 text-center text-sm text-gray-500">No links shared yet.</p>;
    }

    return (
      <div className="flex flex-col gap-2">
        {galleryData.links.map((item) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-w-0 items-start gap-3 rounded-lg border border-gray-800 bg-[#0d1927] p-3 transition hover:bg-white/5"
          >
            <Link2 size={20} className="mt-0.5 shrink-0 text-cyan-400" />
            <span className="min-w-0 flex-1">
              <span className="block break-all text-xs text-cyan-300">{item.url}</span>
              <span className="mt-1 block text-[10px] text-gray-500">
                {formatSharedDate(item.created_at)}
              </span>
            </span>
          </a>
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-screen w-80 shrink-0 flex-col border-l-2 border-gray-800 bg-slate-900 text-white">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-800 p-4">
        {showGallery || showStarred ? (
          <>
            <button
              type="button"
              onClick={() => {
                setShowGallery(false);
                setShowStarred(false);
              }}
              aria-label="Back to user info"
              className="rounded-full p-1 text-gray-300 transition hover:bg-white/5 hover:text-cyan-300"
            >
              <ArrowLeft size={21} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-medium">
                {showGallery ? "Media, Docs and Links" : "Starred Messages"}
              </p>
              <p className="text-xs text-gray-500">
                {showGallery
                  ? `${totalSharedItems} shared items`
                  : `${starredCount ?? 0} starred messages`}
              </p>
            </div>
          </>
        ) : (
          <p className="text-xl">User Info</p>
        )}
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-full p-1 transition hover:bg-white/5 hover:text-cyan-500"
          aria-label="Close user details"
        >
          <X size={22} strokeWidth={2} />
        </button>
      </div>

      {showGallery ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="grid grid-cols-3 gap-1 border-b border-gray-800 p-2">
            {([
              { id: "media", label: "Media", count: galleryData.counts.media },
              { id: "docs", label: "Docs", count: galleryData.counts.docs },
              { id: "links", label: "Links", count: galleryData.counts.links },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveGalleryTab(tab.id)}
                aria-pressed={activeGalleryTab === tab.id}
                className={`rounded-lg px-1 py-2 text-xs transition ${
                  activeGalleryTab === tab.id
                    ? "bg-cyan-500/15 text-cyan-300"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                {tab.label} <span className="ml-1">{tab.count}</span>
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3 [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-700">
            {renderGalleryContent()}
          </div>
        </div>
      ) : showStarred ? (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <StarredMessages
            conversationUserId={user.id}
            embedded
            onMessageSelected={() => {
              setShowStarred(false);
              onClose();
            }}
          />
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:[background:linear-gradient(to_bottom,#9f20e3,#3B82F6,#00D2D3)]">
          <div className="flex flex-col items-center justify-center">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#9f20e3] via-[#3B82F6] to-[#00D2D3] text-3xl font-semibold text-white">
                {getInitials(user.name)}
              </div>
            )}
            <p className="mt-2 text-lg font-semibold text-white">{user.name}</p>
            {user.username && <p className="text-sm text-gray-400">@{user.username}</p>}
            <div className="mt-1 flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${user.online ? "bg-green-400" : "bg-gray-500"}`} />
              <p className={`text-sm ${user.online ? "text-green-400" : "text-gray-400"}`}>
                {user.online ? "Online" : "Offline"}
              </p>
            </div>
          </div>

          {user.bio && (
            <>
              <div className="border border-slate-800" />
              <div className="px-1">
                <p className="text-[13px] text-gray-400">About</p>
                <p className="mt-1 break-words text-sm text-gray-300">{user.bio}</p>
              </div>
            </>
          )}

          <div className="flex flex-col justify-center gap-3 p-4">
            <div className="flex items-center gap-4">
              <Mail size={22} className="text-cyan-500" strokeWidth={2} />
              <div className="flex min-w-0 flex-col">
                <h3 className="text-[13px] text-gray-400">Email</h3>
                <p className="break-all text-sm text-gray-300">{user.email || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Phone size={22} className="text-cyan-500" strokeWidth={2} />
              <div className="flex min-w-0 flex-col">
                <h3 className="text-[13px] text-gray-400">Phone Number</h3>
                <p className="text-sm text-gray-300">{user.phoneNumber || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Calendar size={22} className="text-cyan-500" strokeWidth={2} />
              <div className="flex flex-col">
                <h3 className="text-[13px] text-gray-400">Connected Since</h3>
                <p className="text-sm text-gray-300">{formatConnectedDate(user.connectedSince)}</p>
              </div>
            </div>
          </div>

          <div className="border border-slate-800" />
          <div className="flex flex-col justify-center">
            <button
              type="button"
              onClick={() => setShowGallery(true)}
              className="group flex items-center justify-between gap-4 rounded-lg px-4 py-3 text-left transition hover:bg-white/10"
            >
              <span className="flex min-w-0 items-center gap-4">
                <Folders size={22} className="shrink-0 text-indigo-500 group-hover:text-indigo-400" strokeWidth={2} />
                <span className="truncate text-sm text-gray-300 group-hover:text-white">Media, Docs and Links</span>
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <span className="text-sm text-gray-400 group-hover:text-white">{totalSharedItems}</span>
                <ChevronRight size={20} className="text-indigo-500 group-hover:text-indigo-400" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowStarred(true)}
              className="group flex cursor-pointer items-center justify-between gap-4 rounded-lg px-4 py-3 hover:bg-white/10"
            >
              <span className="flex min-w-0 items-center gap-4">
                <Star size={22} className="shrink-0 text-indigo-500 group-hover:text-indigo-400" strokeWidth={2} />
                <span className="truncate text-sm text-gray-300 group-hover:text-white">Starred Messages</span>
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <span className="text-sm text-gray-400 group-hover:text-white">{starredCount ?? "0"}</span>
                <ChevronRight size={20} className="text-indigo-500 group-hover:text-indigo-400" />
              </span>
            </button>

            <div className="group flex cursor-pointer items-center justify-between gap-4 rounded-lg px-4 py-3 hover:bg-white/10">
              <span className="flex min-w-0 items-center gap-4">
                <Users size={22} className="shrink-0 text-indigo-500 group-hover:text-indigo-400" strokeWidth={2} />
                <span className="truncate text-sm text-gray-300 group-hover:text-white">Groups in common</span>
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <span className="text-sm text-gray-400 group-hover:text-white">{user.commonGroupsCount ?? "0"}</span>
                <ChevronRight size={20} className="text-indigo-500 group-hover:text-indigo-400" />
              </span>
            </div>
          </div>

          <div className="border border-slate-800" />
          <div className="flex flex-col justify-center pb-4">
            <div className="group flex cursor-pointer items-center gap-4 rounded-lg px-4 py-3 hover:bg-red-600">
              <CircleMinus size={22} className="text-red-600 group-hover:text-white" strokeWidth={2} />
              <p className="truncate text-sm text-red-600 group-hover:text-white">Clear Chat</p>
            </div>
            <div className="group flex cursor-pointer items-center gap-4 rounded-lg px-4 py-3 hover:bg-red-600">
              <Ban size={22} className="text-red-600 group-hover:text-white" strokeWidth={2} />
              <p className="truncate text-sm text-red-600 group-hover:text-white">Block {user.name}</p>
            </div>
            <div className="group flex cursor-pointer items-center gap-4 rounded-lg px-4 py-3 hover:bg-red-600">
              <Trash size={22} className="text-red-600 group-hover:text-white" strokeWidth={2} />
              <p className="truncate text-sm text-red-600 group-hover:text-white">Delete Contact</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};