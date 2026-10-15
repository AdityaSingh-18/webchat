"use client";

import {
  useEffect,
  useState,
  useRef,
  type ChangeEvent,
  type ReactNode,
} from "react";

import {
  useChatStore,
  type MessageAttachmentInput,
  type MessageRecord,
} from "@/lib/store/chatStore";

import { supabase } from "@/lib/supabase/supabaseClient";

import {UserDetails, type UserDetailsData} from "@/components/UserDetails";
import { getInitials } from "@/lib";

import {
  ArrowDown,
  Calendar,
  Check,
  CheckCheck,
  Info,
  Plus,
  ShieldCheck,
  EllipsisVertical,
  Trash2,
  FileText,
  Image as ImageIcon,
  Video,
  Camera,
  Music,
  Contact,
  Download,
  Star,
  CornerUpLeft,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

const ATTACHMENT_OPTIONS = [
  {
    label: "Document",
    icon: FileText,
    iconClass: "text-blue-400",
  },
  {
    label: "Photos",
    icon: ImageIcon,
    iconClass: "text-purple-400",
  },
  {
    label: "Videos",
    icon: Video,
    iconClass: "text-pink-400",
  },
  {
    label: "Camera",
    icon: Camera,
    iconClass: "text-red-400",
  },
  {
    label: "Audio",
    icon: Music,
    iconClass: "text-orange-400",
  },
  {
    label: "Contact",
    icon: Contact,
    iconClass: "text-green-400",
  },
] as const;

type AttachmentKind = "document" | "photo" | "video" | "audio";

type PendingAttachment = {
  id: string;
  file: File;
  kind: AttachmentKind;
  previewUrl: string;
};

type ChatWindowProps = {
  userId: string | null;
};

const EMPTY_MESSAGES: MessageRecord[] = [];
const MAX_ATTACHMENT_SIZE = 100 * 1024 * 1024;

const getDateKey = (date: Date) => {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

const formatDateSeparator = (value: string) => {
  const date = new Date(value);

  const today = new Date();

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (getDateKey(date) === getDateKey(today)) {
    return "Today";
  }

  if (getDateKey(date) === getDateKey(yesterday)) {
    return "Yesterday";
  }

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "2-digit",
    year: "numeric",
  });
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};


const URL_PATTERN =
  /https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|(?<![\w@])(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(?::\d{1,5})?(?:\/[^\s<>"']*)?/gi;

const renderMessageContent = (content: string): ReactNode[] => {
  const elements: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  URL_PATTERN.lastIndex = 0;

  while ((match = URL_PATTERN.exec(content)) !== null) {
    const matchedUrl = match[0];

    const trailingPunctuation = matchedUrl.match(/[.,!?;:)\]}]+$/)?.[0] ?? "";

    const urlText = trailingPunctuation
      ? matchedUrl.slice(0, -trailingPunctuation.length)
      : matchedUrl;

    if (!urlText) {
      continue;
    }

    if (match.index > cursor) {
      elements.push(content.slice(cursor, match.index));
    }

    const href = /^https?:\/\//i.test(urlText)
      ? urlText
      : `https://${urlText}`;

    let isSafeUrl = false;

    try {
      const parsedUrl = new URL(href);

      isSafeUrl =
        parsedUrl.protocol === "http:" ||
        parsedUrl.protocol === "https:";
    } catch {
      isSafeUrl = false;
    }

    if (isSafeUrl) {
      elements.push(
        <a
          key={`link-${match.index}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="break-all text-gray-200 underline decoration-gray-200 underline-offset-2 transition-colors hover:text-cyan-200 hover:decoration-cyan-200"
        >
          {urlText}
        </a>,
      );
    } else {
      elements.push(urlText);
    }

    if (trailingPunctuation) {
      elements.push(trailingPunctuation);
    }

    cursor = match.index + matchedUrl.length;
  }

  if (cursor < content.length) {
    elements.push(content.slice(cursor));
  }

  return elements;
};

export const ChatWindow = ({
  userId,
}: ChatWindowProps) => {
  const [messageInput, setMessageInput] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [replyingTo, setReplyingTo] = useState<MessageRecord | null>(null);

  const [starOverrides, setStarOverrides] = useState<Record<string, boolean>>({});
  const [starLoadingIds, setStarLoadingIds] = useState<Record<string, boolean>>({});
  
  const [user, setUser] = useState<UserDetailsData | null>(null);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState("");

  const [historyLoading, setHistoryLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [isSending, setIsSending] = useState(false);

  const [showChatOptions, setShowChatOptions] = useState(false);
  const [showClearChatConfirmation, setShowClearChatConfirmation] = useState(false);
  const [isClearingChat, setIsClearingChat] = useState(false);

  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [selectedAttachments, setSelectedAttachments] = useState<PendingAttachment[]>([]);
  const [activeAttachmentId, setActiveAttachmentId] = useState<string | null>(null);

  const [messageAttachmentUrls, setMessageAttachmentUrls] = useState<Record<string, string>>({});
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<string | null>(null);
  
  const [historyReadyUserId, setHistoryReadyUserId] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const currentUser = useChatStore((state) => state.currentUser);
  
  const messages = useChatStore((state) => userId ? state.messages[userId] ?? EMPTY_MESSAGES : EMPTY_MESSAGES);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const prepareAttachmentUpload = useChatStore((state) => state.prepareAttachmentUpload);
  const prependMessages = useChatStore((state) => state.prependMessages);
  const markMessagesRead = useChatStore((state) => state.markMessagesRead);

  const pendingStarredMessageJump = useChatStore((state) => state.pendingStarredMessageJump);
  const clearStarredMessageJump = useChatStore((state) => state.clearStarredMessageJump);

  const startTyping = useChatStore((state) => state.startTyping);
  const stopTyping = useChatStore((state) => state.stopTyping);
  const isOtherUserTyping = useChatStore((state) => userId ? state.typingUsers[userId] ?? false : false);
  const isOtherUserOnline = useChatStore((state) => userId ? state.onlineUsers[userId] ?? false : false);
  
  const clearConversationMessages = useChatStore((state) => state.clearConversationMessages);

  const isTypingRef = useRef(false);
  const isSendingRef = useRef(false);
  
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const previousScrollHeightRef = useRef<number | null>(null);
  const initialLoadRef = useRef(true);

  const lastMessageIdRef = useRef<string | null>(null);
  const activeChatUserIdRef = useRef<string | null>(null);
  const isNearBottomRef = useRef(true);
  
  const attachmentMenuRef = useRef<HTMLDivElement | null>(null);
  const documentInputRef = useRef<HTMLInputElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  const attachmentPreviewUrlsRef = useRef<Set<string>>(new Set());
  const attachmentUrlRequestsRef = useRef(new Set<string>());

  const nextCursorRef = useRef<string | null>(null);
  const hasMoreMessagesRef = useRef(true);
  const runningStarredJumpRef = useRef<number | null>(null);

  const BOTTOM_THRESHOLD = 120;

  const loadMessages = async (before?: string) => {
    if (!userId) {
      return;
    }

    if (before) {
      if (loadingOlder || !hasMoreMessages) {
        return;
      }
      setLoadingOlder(true);
    } else {
      setHistoryLoading(true);
    }

    try {
      const params = new URLSearchParams({
        userId,
        limit: "30",
      });

      if (before) {
        params.set("before", before);
      }

      const response = await fetch(`/api/messages?${params.toString()}`,
        {
          cache: "no-store",
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load messages.");
      }

      prependMessages(userId, data.messages);

      setHasMoreMessages(data.hasMore);
      setNextCursor(data.nextCursor);
      hasMoreMessagesRef.current = Boolean(data.hasMore);
      nextCursorRef.current = data.nextCursor ?? null;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load messages.");
    } finally {
      if (!before) {
        setHistoryReadyUserId(userId);
      }
      
      setHistoryLoading(false);
      setLoadingOlder(false);
    }
  };

  const stopTypingForCurrentChat = () => {
    if (userId && isTypingRef.current) {
      stopTyping(userId);
    }

    isTypingRef.current = false;
  };

  const handleMessageInputChange = (value: string) => {
    setMessageInput(value);

    if (!userId) {
      return;
    }

    if (!value.trim()) {
      stopTypingForCurrentChat();
      return;
    }

    if (!isTypingRef.current) {
      startTyping(userId);
      isTypingRef.current = true;
    }
  };

  const handleSendMessage = async () => {
    if (isSendingRef.current || !userId) {
      return;
    }

    const inputAtSend = messageInput;
    const content = inputAtSend.trim();
    const attachmentsToSend = [...selectedAttachments];
    const replyAtSend = replyingTo;

    if (!content && attachmentsToSend.length === 0) {
      return;
    }

    isSendingRef.current = true;
    setIsSending(true);
    stopTypingForCurrentChat();

    const uploadedStoragePaths: string[] = [];
    const sentAttachmentIds = new Set(attachmentsToSend.map((attachment) => attachment.id));

    try {
      const attachmentMetadata: MessageAttachmentInput[] = [];

      if (attachmentsToSend.length > 0) {
        const conversationId = await prepareAttachmentUpload(userId);

        for (const attachment of attachmentsToSend) {
          const safeFileName = attachment.file.name
            .normalize("NFKC")
            .replace(/[^a-zA-Z0-9._-]/g, "_")
            .slice(0, 150) || "attachment";

          const storagePath = `${conversationId}/${crypto.randomUUID()}-${safeFileName}`;
          const mimeType = attachment.file.type || "application/octet-stream";

          const { error: uploadError } = await supabase.storage
            .from("chat-media")
            .upload(storagePath, attachment.file, {
              contentType: mimeType,
              upsert: false,
            });

          if (uploadError) {
            throw new Error(
              `Failed to upload ${attachment.file.name}: ${uploadError.message}`,
            );
          }

          uploadedStoragePaths.push(storagePath);

          attachmentMetadata.push({
            storagePath,
            fileName: attachment.file.name.slice(0, 255),
            mimeType,
            sizeBytes: attachment.file.size,
          });
        }
      }

      await sendMessage(
        userId,
        content,
        attachmentMetadata,
        replyAtSend?.id,
      );

      setReplyingTo((current) =>
        current?.id === replyAtSend?.id ? null : current,
      );

      setMessageInput((currentInput) =>
        currentInput === inputAtSend ? "" : currentInput,
      );

      for (const attachment of attachmentsToSend) {
        URL.revokeObjectURL(attachment.previewUrl);
        attachmentPreviewUrlsRef.current.delete(attachment.previewUrl);
      }

      setSelectedAttachments((current) =>
        current.filter((attachment) => !sentAttachmentIds.has(attachment.id)),
      );

      setActiveAttachmentId((currentId) =>
        currentId && !sentAttachmentIds.has(currentId) ? currentId : null,
      );
    } catch (error) {
      if (uploadedStoragePaths.length > 0) {
        try {
          const { error: cleanupError } = await supabase.storage
            .from("chat-media")
            .remove(uploadedStoragePaths);

          if (cleanupError) {
            console.error(
              "Failed to clean up uploaded attachments:",
              cleanupError,
            );
          }
        } catch (cleanupError) {
          console.error(
            "Failed to clean up uploaded attachments:",
            cleanupError,
          );
        }
      }

      toast.error(error instanceof Error
        ? error.message
        : "Failed to send message.",
      );
    } finally {
      isSendingRef.current = false;
      setIsSending(false);
    }
  };

  const handleMessagesScroll = () => {
    const container = messagesContainerRef.current;

    if (!container) {
      return;
    }

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const isNearBottom = distanceFromBottom <= BOTTOM_THRESHOLD;
    isNearBottomRef.current = isNearBottom;
    
    if (isNearBottom) {
      setShowScrollToBottom(false);
      setNewMessageCount(0);
    }

    if (!nextCursor || !hasMoreMessages || loadingOlder) {
      return;
    }

    if (container.scrollTop > 100) {
      return;
    }

    previousScrollHeightRef.current = container.scrollHeight;
    void loadMessages(nextCursor);
  };

  const handleAttachmentOptionClick = (
    label: (typeof ATTACHMENT_OPTIONS)[number]["label"],
  ) => {
    setShowAttachmentMenu(false);

    switch (label) {
      case "Document":
        documentInputRef.current?.click();
        break;

      case "Photos":
        photoInputRef.current?.click();
        break;

      case "Videos":
        videoInputRef.current?.click();
        break;

      case "Audio":
        audioInputRef.current?.click();
        break;

      case "Camera":
      case "Contact":
        break;
    }
  };

  const handleFilesSelected = (
    event: ChangeEvent<HTMLInputElement>,
    kind: AttachmentKind,
  ) => {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);

    input.value = "";

    if (files.length === 0 || isSendingRef.current) {
      return;
    }

    const currentSize = selectedAttachments.reduce(
      (total, attachment) => total + attachment.file.size,
      0,
    );

    const incomingSize = files.reduce(
      (total, file) => total + file.size,
      0,
    );

    if (currentSize + incomingSize > MAX_ATTACHMENT_SIZE) {
      toast.error(
        "Attachments cannot exceed 100 MB in total.",
      );
      return;
    }

    const newAttachments: PendingAttachment[] = files.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      attachmentPreviewUrlsRef.current.add(previewUrl);

      return {
        id: crypto.randomUUID(),
        file,
        kind,
        previewUrl,
      };
    });

    setSelectedAttachments((current) => [
      ...current,
      ...newAttachments,
    ]);

    setActiveAttachmentId((current) => current ?? newAttachments[0]?.id ?? null);

    toast.success(`${files.length} ${files.length === 1 ? "file" : "files"} selected.`);
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    if (isSendingRef.current) {
      return;
    }

    const attachment = selectedAttachments.find(
      (item) => item.id === attachmentId,
    );

    if (!attachment) {
      return;
    }

    URL.revokeObjectURL(attachment.previewUrl);
    attachmentPreviewUrlsRef.current.delete(attachment.previewUrl);

    const remainingAttachments = selectedAttachments.filter(
      (item) => item.id !== attachmentId,
    );

    setSelectedAttachments(remainingAttachments);

    if (activeAttachmentId === attachmentId) {
      setActiveAttachmentId(
        remainingAttachments[0]?.id ?? null,
      );
    }
  };

  const handleDownloadMessageAttachment = async (
    attachment: NonNullable<MessageRecord["attachments"]>[number],
  ) => {
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
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to download attachment.",
      );
    } finally {
      setDownloadingAttachmentId(null);
    }
  };

  const handleToggleStar = async (message: MessageRecord) => {
    const wasStarred = starOverrides[message.id] ?? message.is_starred ?? false;
    const nextStarred = !wasStarred;

    setStarOverrides((current) => ({
      ...current,
      [message.id]: nextStarred,
    }));

    setStarLoadingIds((current) => ({
      ...current,
      [message.id]: true,
    }));

    try {
      const response = await fetch("/api/messages/star", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messageId: message.id,
          starred: nextStarred,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Failed to update starred message.");
      }

      window.dispatchEvent(new Event("webchat:starred-changed"));

      toast.success(nextStarred ? "Message starred." : "Message unstarred.");
    } catch (error) {
      setStarOverrides((current) => ({
        ...current,
        [message.id]: wasStarred,
      }));

      toast.error(error instanceof Error ? error.message : "Failed to update starred message.");
    } finally {
      setStarLoadingIds((current) => ({
        ...current,
        [message.id]: false,
      }));
    }
  };

  const handleClearChat = async () => {
    if (!userId || isClearingChat) {
      return;
    }

    setIsClearingChat(true);

    try {
      const response = await fetch("/api/chats/clear", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to clear chat.");
      }

      clearConversationMessages(userId);

      setNextCursor(null);
      setHasMoreMessages(true);
      setNewMessageCount(0);
      setShowScrollToBottom(false);

      previousScrollHeightRef.current = null;
      lastMessageIdRef.current = null;
      isNearBottomRef.current = true;

      setShowClearChatConfirmation(false);
      setShowChatOptions(false);

      window.dispatchEvent(new Event("webchat:chat-cleared"));

      toast.success("Chat cleared.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to clear chat.",
      );
    } finally {
      setIsClearingChat(false);
    }
  };

  useEffect(() => {
    const container = messagesContainerRef.current;

    if (!container || !userId) {
      return;
    }

    const latestMessage = messages.length > 0 ? messages[messages.length - 1] : null;

    if (activeChatUserIdRef.current !== userId) {
      activeChatUserIdRef.current = userId;
      initialLoadRef.current = true;
      previousScrollHeightRef.current = null;
      lastMessageIdRef.current = null;
      isNearBottomRef.current = true;

      setShowScrollToBottom(false);
      setNewMessageCount(0);
    }

    if (initialLoadRef.current) {
      if (historyLoading) {
        return;
      }

      container.scrollTop = container.scrollHeight;

      initialLoadRef.current = false;
      previousScrollHeightRef.current = null;
      lastMessageIdRef.current = latestMessage?.id ?? null;
      isNearBottomRef.current = true;

      setShowScrollToBottom(false);
      setNewMessageCount(0);

      return;
    }

    const previousScrollHeight = previousScrollHeightRef.current;
    if (previousScrollHeight !== null) {
      container.scrollTop = container.scrollHeight - previousScrollHeight;
      previousScrollHeightRef.current = null;
      lastMessageIdRef.current = latestMessage?.id ?? null;

      return;
    }

    const hasNewLatestMessage = latestMessage !== null && latestMessage.id !== lastMessageIdRef.current;
    if (hasNewLatestMessage && latestMessage) {
      const isMyMessage = latestMessage.sender_id === currentUser?.id;

      if (isMyMessage || isNearBottomRef.current) {
        container.scrollTo({top: container.scrollHeight, behavior: "smooth"});
        isNearBottomRef.current = true;

        setShowScrollToBottom(false);
        setNewMessageCount(0);
      } else {
        setNewMessageCount((count) => count + 1);
        setShowScrollToBottom(true);
      }
    }

    lastMessageIdRef.current = latestMessage?.id ?? null;
  }, [messages, userId, historyLoading, currentUser?.id]);

  useEffect(() => {
    setShowDetails(false);

    if (!userId) {
      setUser(null);
      setUserError("");
      return;
    }

    const controller = new AbortController();

    const loadUser = async () => {
      setUserLoading(true);
      setUserError("");

      try {
        const response = await fetch(`/api/users/${userId}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to load user.");
        }

        setUser({
          ...data,
          online: false,
          mediaCount: null,
          starredCount: null,
          commonGroupsCount: null,
        });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        setUser(null);
        setUserError(error instanceof Error ? error.message : "Failed to load user.");
      } finally {
        setUserLoading(false);
      }
    };

    loadUser();
    return () => {
      controller.abort();
    };
  }, [userId]);

  useEffect(() => {
    setHasMoreMessages(true);
    setNextCursor(null);
    setHistoryReadyUserId(null);
    initialLoadRef.current = true;
    nextCursorRef.current = null;
    hasMoreMessagesRef.current = true;
    
    if (!userId) {
      return;
    }

    void loadMessages();
  }, [userId]);

  useEffect(() => {
    const target = pendingStarredMessageJump;

    if (
      !target ||
      target.userId !== userId ||
      historyReadyUserId !== userId ||
      historyLoading ||
      loadingOlder
    ) {
      return;
    }

    if (runningStarredJumpRef.current === target.requestId) {
      return;
    }

    runningStarredJumpRef.current = target.requestId;

    let cancelled = false;

    const jumpToMessage = async () => {
      try {
        let cursor = nextCursorRef.current;
        let hasMore = hasMoreMessagesRef.current;
        let pagesLoaded = 0;

        const isTargetLoaded = () =>
          (
            useChatStore.getState().messages[target.userId] ?? []
          ).some((message) => message.id === target.messageId);

        while (
          !isTargetLoaded() &&
          hasMore &&
          cursor &&
          pagesLoaded < 100
        ) {
          const params = new URLSearchParams({
            userId: target.userId,
            limit: "30",
            before: cursor,
          });

          const response = await fetch(`/api/messages?${params.toString()}`, {
            cache: "no-store",
          });

          const data = await response.json();

          if (!response.ok || !data.success) {
            throw new Error(
              data.error ?? "Failed to find the starred message.",
            );
          }

          const batch = Array.isArray(data.messages) ? data.messages : [];

          if (batch.length === 0) {
            cursor = null;
            hasMore = false;
            break;
          }

          previousScrollHeightRef.current =
            messagesContainerRef.current?.scrollHeight ?? null;

          prependMessages(target.userId, batch);

          cursor = data.nextCursor ?? null;
          hasMore = Boolean(data.hasMore) && Boolean(cursor);
          pagesLoaded += 1;

          nextCursorRef.current = cursor;
          hasMoreMessagesRef.current = hasMore;

          setNextCursor(cursor);
          setHasMoreMessages(hasMore);
        }

        if (cancelled) return;

        if (!isTargetLoaded()) {
          throw new Error(
            "This starred message could not be found in the available history.",
          );
        }

        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve());
          });
        });

        if (cancelled) return;

        const container = messagesContainerRef.current;

        const targetElement = container
          ? Array.from(
              container.querySelectorAll<HTMLElement>("[data-message-id]"),
            ).find(
              (element) => element.dataset.messageId === target.messageId,
            )
          : null;

        if (!targetElement) {
          throw new Error("The starred message could not be displayed.");
        }

        targetElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

        setHighlightedMessageId(target.messageId);

        window.setTimeout(() => {
          setHighlightedMessageId((current) =>
            current === target.messageId ? null : current,
          );
        }, 1500);
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to open the starred message.",
          );
        }
      } finally {
        if (!cancelled) {
          clearStarredMessageJump(target.requestId);
        }
      }
    };

    void jumpToMessage();

    return () => {
      cancelled = true;

      if (runningStarredJumpRef.current === target.requestId) {
        runningStarredJumpRef.current = null;
      }
    };
  }, [
    pendingStarredMessageJump,
    userId,
    historyReadyUserId,
    historyLoading,
    loadingOlder,
    prependMessages,
    clearStarredMessageJump,
  ]);

  useEffect(() => {
    if (!userId || historyLoading || messages.length === 0) {
      return;
    }

    void markMessagesRead(userId);
  }, [userId, historyLoading, messages, markMessagesRead]);

  useEffect(() => {
    return () => {
      if (userId && isTypingRef.current) {
        stopTyping(userId);
      }

      isTypingRef.current = false;
    };
  }, [userId, stopTyping]);

  useEffect(() => {
    if (!isOtherUserTyping || !isNearBottomRef.current) {
      return;
    }

    const container = messagesContainerRef.current;

    container?.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, [isOtherUserTyping]);

  useEffect(() => {
    if (!showAttachmentMenu) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (
        attachmentMenuRef.current &&
        !attachmentMenuRef.current.contains(event.target as Node)
      ) {
        setShowAttachmentMenu(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowAttachmentMenu(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showAttachmentMenu]);

  useEffect(() => {
    return () => {
      attachmentPreviewUrlsRef.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });

      attachmentPreviewUrlsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    setReplyingTo(null);
  }, [userId]);

  useEffect(() => {
    const attachments = messages.flatMap(
      (message) => message.attachments ?? [],
    );

    for (const attachment of attachments) {
      if (attachmentUrlRequestsRef.current.has(attachment.id)) {
        continue;
      }

      attachmentUrlRequestsRef.current.add(attachment.id);

      void (async () => {
        try {
          const { data, error } = await supabase.storage
            .from("chat-media")
            .createSignedUrl(attachment.storage_path, 60 * 60);

          if (error || !data?.signedUrl) {
            attachmentUrlRequestsRef.current.delete(attachment.id);
            console.error("Create attachment preview URL error:", error);
            return;
          }

          setMessageAttachmentUrls((current) => ({
            ...current,
            [attachment.id]: data.signedUrl,
          }));
        } catch (error) {
          attachmentUrlRequestsRef.current.delete(attachment.id);
          console.error("Create attachment preview URL error:", error);
        }
      })();
    }
  }, [messages]);

  const activeAttachment = selectedAttachments.find(
    (attachment) => attachment.id === activeAttachmentId) ??
      selectedAttachments[0] ?? null;

  return (
    <>
      {!userId ?
        <div className="flex-1 h-screen flex flex-col items-center justify-center relative overflow-hidden bg-[#080f1c]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(6,100,130,0.25),_transparent_40%),radial-gradient(circle_at_top_right,_rgba(70,25,120,0.25),_transparent_40%)]" />

          <div className="relative z-10 flex flex-col items-center text-center px-8">
            <img
              src="/Logo.svg"
              alt="WebChat"
              className="h-24 w-24 mb-4 drop-shadow-[0_0_20px_#c568f5]"
            />

            <h1 className="text-4xl font-semibold bg-gradient-to-br from-[#c568f5] via-[#68a8ff] to-[#4ee7e8] bg-clip-text text-transparent">
              WebChat
            </h1>

            <p className="text-xl text-gray-200 mt-3">
              Select a chat to start messaging
            </p>

            <p className="max-w-md text-sm text-gray-400 mt-2 leading-6">
              Choose a chat to start your conversation.
            </p>

            <div className="mt-8 flex items-center gap-1 text-xs text-gray-500">
              <ShieldCheck
                size={20}
                strokeWidth={2}
                className="shrink-0 text-cyan-400"
              />
              <span>
                Your messages are private and secure.
              </span>
            </div>
          </div>
        </div>
      :
        <>
          <div className="flex-1 h-screen flex flex-col">
            <div className="h-20 px-6 flex items-center justify-between gap-3 shrink-0 bg-[#0a1220] border-b-2 border-gray-800">
              <div className="flex items-center gap-3 shrink-0 min-w-0">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="shrink-0 h-12 w-12 object-cover rounded-full"
                  />
                ) : (
                  <div className="shrink-0 h-12 w-12 text-lg rounded-full flex items-center justify-center text-white font-semibold
                    bg-gradient-to-br from-[#9f20e3] via-[#3B82F6] to-[#00D2D3]"
                  >
                    {getInitials(user?.name ?? "?")}
                  </div>
                )}

                <div className="flex flex-col justify-center min-w-0">
                  <p className="font-semibold text-[18px] text-white truncate">
                    {userLoading ? "Loading..." : user?.name || "Select a chat"}
                  </p>

                  {user && (
                    <div className="flex items-center gap-1">
                      <div className={`h-2 w-2 rounded-full ${isOtherUserOnline ? "bg-green-400" : "bg-gray-500"}`} />
                      {isOtherUserOnline && <div className="absolute animate-[ping_1.5s_ease-in-out_infinite] h-2 w-2 rounded-full bg-green-400" />}

                      <p className={`text-sm truncate ${isOtherUserOnline ? "text-green-400" : "text-gray-400"}`}>
                        {isOtherUserOnline ? "Online" : "Offline"}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {user && (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowChatOptions((value) => !value)}
                      aria-label="Chat options"
                      aria-expanded={showChatOptions}
                      className="text-white cursor-pointer p-2 rounded-full hover:bg-white/5 hover:text-white transition"
                    >
                      <EllipsisVertical size={22} />
                    </button>

                    {showChatOptions && (
                      <div className="absolute right-0 top-full z-50 w-40 rounded-xl bg-[#162235] border border-gray-700 shadow-lg shadow-white/5 p-1 mt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowChatOptions(false);
                            setShowClearChatConfirmation(true);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-red-600 transition-colors cursor-pointer"
                        >
                          <Trash2 size={16} />
                          Clear chat
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowDetails((value) => !value)}
                    aria-label="Show user details"
                  >
                    <Info className="cursor-pointer text-cyan-600 stroke-[3] hover:text-cyan-500" />
                  </button>
                </div>
              )}
            </div>
            <div className="relative flex-1 w-full min-h-0">
              <div
                ref={messagesContainerRef}
                onScroll={handleMessagesScroll} 
                className="h-full w-full overflow-y-auto bg-[#080f1c] 
                  bg-[radial-gradient(circle_at_bottom_left,_rgba(6,100,130,0.35),_transparent_40%),radial-gradient(circle_at_top_right,_rgba(70,25,120,0.3),_transparent_40%)]
                  [&::-webkit-scrollbar]:w-[10px]
                  [&::-webkit-scrollbar-track]:bg-transparent
                  [&::-webkit-scrollbar-thumb]:border-[2px]
                  [&::-webkit-scrollbar-thumb]:rounded-full
                  [&::-webkit-scrollbar-thumb]:[background:linear-gradient(to_bottom,#9f20e3,#3B82F6,#00D2D3)]"
              >
                {loadingOlder && (
                  <div className="flex justify-center py-3">
                    <span className="text-xs text-gray-400">
                      Loading older messages...
                    </span>
                  </div>
                )}
                {historyLoading ? (
                  <div className="flex justify-center py-6">
                    <span className="text-sm text-gray-400">
                      Loading messages...
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-2 px-12 py-4">
                      {messages.map((data, index) => {
                        const me = data.sender_id === currentUser?.id;
                        const isStarred = starOverrides[data.id] ?? data.is_starred ?? false;
                        const isStarLoading = Boolean(starLoadingIds[data.id]);
                        const currentDateKey = getDateKey(new Date(data.created_at));

                        const previousDateKey = index > 0
                          ? getDateKey(new Date(messages[index - 1].created_at))
                          : null;
                        const showDateSeparator = currentDateKey !== previousDateKey;

                        return (
                          <div key={data.id}>
                            {showDateSeparator && (() => {
                              const dateLabel = formatDateSeparator(data.created_at);
                              const showCalendar = dateLabel !== "Today" && dateLabel !== "Yesterday";

                              return (
                                <div className="flex items-center justify-center py-2">
                                  <div className="px-3 py-1.5 rounded-xl flex gap-1.5 items-center text-gray-200 text-sm bg-gray-700 border border-gray-600">
                                    {showCalendar && <Calendar size={16} />}
                                    {dateLabel}
                                  </div>
                                </div>
                              );
                            })()}
                            <div
                              data-message-id={data.id}
                              className={`flex ${me ? "justify-end" : "justify-start"} ${highlightedMessageId === data.id
                                ? "rounded-md bg-cyan-400/5"
                                : ""}
                              `} 
                            >
                              <div
                                data-message-id={data.id}
                                className={`w-fit min-w-50 px-4 py-3 text-white ${
                                  me
                                    ? "rounded-tl-xl rounded-bl-xl bg-gradient-to-r from-cyan-500/80 to-transparent"
                                    : "rounded-tr-xl rounded-br-xl bg-gradient-to-l from-purple-500/50 to-transparent"
                                }`}
                              >
                                {data.reply_to_message && (
                                  <div className="mb-2 rounded-lg border-l-2 border-cyan-300 bg-black/20 px-3 py-2">
                                    <p className="text-[11px] font-semibold text-cyan-200">
                                      {data.reply_to_message.sender_id === currentUser?.id
                                        ? "You"
                                        : user?.username || "Contact"}
                                    </p>

                                    <p className="mt-1 break-words text-xs text-gray-300">
                                      {data.reply_to_message.content?.trim() ||
                                        data.reply_to_message.attachments?.[0]?.file_name ||
                                        (data.reply_to_message.attachments?.length
                                          ? `${data.reply_to_message.attachments.length} attachments`
                                          : "Message unavailable")}
                                    </p>
                                  </div>
                                )}

                                {data.content && (
                                  <p className="whitespace-pre-wrap break-words">
                                    {renderMessageContent(data.content)}
                                  </p>
                                )}

                                {(data.attachments ?? []).map((attachment) => {
                                  const previewUrl = messageAttachmentUrls[attachment.id];
                                  const mimeType = attachment.mime_type.toLowerCase();

                                  const isImage = mimeType.startsWith("image/");
                                  const isVideo = mimeType.startsWith("video/");
                                  const isAudio = mimeType.startsWith("audio/");

                                  return (
                                    <div key={attachment.id} className="mt-3 min-w-0">
                                      {isImage &&
                                        (previewUrl ? (
                                          <img
                                            src={previewUrl}
                                            alt={attachment.file_name}
                                            loading="lazy"
                                            className="max-h-[180px] max-w-full rounded-lg object-contain"
                                          />
                                        ) : (
                                          <p className="text-xs text-gray-400">
                                            Loading image preview...
                                          </p>
                                        ))}

                                      {isVideo &&
                                        (previewUrl ? (
                                          <video
                                            src={previewUrl}
                                            controls
                                            playsInline
                                            preload="metadata"
                                            className="max-h-[180px] max-w-full rounded-lg"
                                          />
                                        ) : (
                                          <p className="text-xs text-gray-400">
                                            Loading video preview...
                                          </p>
                                        ))}

                                      {isAudio &&
                                        (previewUrl ? (
                                          <audio
                                            src={previewUrl}
                                            controls
                                            preload="metadata"
                                            className="w-full max-w-[200px]"
                                          />
                                        ) : (
                                          <p className="text-xs text-gray-400">
                                            Loading audio preview...
                                          </p>
                                        ))}

                                      <div className="mt-2 flex min-w-0 items-center gap-3 rounded-lg border border-white/10 bg-black/10 p-2">
                                        <div className="flex min-w-0 flex-1 items-center gap-2">
                                          {isImage ? (
                                            <ImageIcon size={22} className="shrink-0 text-purple-400" />
                                          ) : isVideo ? (
                                            <Video size={22} className="shrink-0 text-pink-400" />
                                          ) : isAudio ? (
                                            <Music size={22} className="shrink-0 text-orange-400" />
                                          ) : (
                                            <FileText size={22} className="shrink-0 text-blue-400" />
                                          )}

                                          <div className="min-w-0">
                                            <p
                                              className="break-all text-xs font-medium text-white"
                                              title={attachment.file_name}
                                            >
                                              {attachment.file_name}
                                            </p>
                                            <p className="mt-1 text-[10px] text-gray-400">
                                              {formatFileSize(attachment.size_bytes)}
                                            </p>
                                          </div>
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() => void handleDownloadMessageAttachment(attachment)}
                                          disabled={downloadingAttachmentId === attachment.id}
                                          aria-label={`Download ${attachment.file_name}`}
                                          title="Download file"
                                          className="shrink-0 rounded-full p-2 text-gray-300 transition hover:bg-white/10 hover:text-cyan-300 disabled:cursor-wait disabled:opacity-50"
                                        >
                                          <Download size={18} />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            <div className={`mt-1.5 text-gray-300 text-[10px] flex items-center gap-1.5 
                              ${me ? "justify-end" : "justify-start"}`}
                            >
                              <span>
                                {new Date(data.created_at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>

                              <button
                                type="button"
                                onClick={() => void handleToggleStar(data)}
                                disabled={isStarLoading}
                                aria-label={isStarred ? "Unstar message" : "Star message"}
                                aria-pressed={isStarred}
                                title={isStarred ? "Unstar message" : "Star message"}
                                className={`cursor-pointer rounded p-0.5 transition-colors disabled:cursor-wait disabled:opacity-50 ${
                                  isStarred
                                    ? "text-yellow-300"
                                    : "text-gray-300 hover:text-yellow-300"
                                }`}
                              >
                                <Star size={14} fill={isStarred ? "currentColor" : "none"} />
                              </button>

                              <button
                                type="button"
                                onClick={() => setReplyingTo(data)}
                                aria-label="Reply to message"
                                title="Reply to message"
                                className="cursor-pointer rounded p-0.5 text-gray-300 transition-colors hover:text-cyan-300"
                              >
                                <CornerUpLeft size={14} />
                              </button>

                              {me && (
                                <span title={data.read_at || data.is_read
                                  ? "Read"
                                  : data.delivered_at
                                    ? "Delivered"
                                    : "Sent"
                                  }
                                  aria-label={data.read_at || data.is_read
                                    ? "Message read"
                                    : data.delivered_at
                                      ? "Message delivered"
                                      : "Message sent"
                                  }
                                  className={data.read_at || data.is_read
                                    ? "text-cyan-300"
                                    : data.delivered_at
                                      ? "text-gray-300"
                                      : "text-gray-500"
                                  }
                                >
                                  {data.read_at || data.is_read ? (
                                    <CheckCheck size={14} />
                                  ) : data.delivered_at ? (
                                    <CheckCheck size={14} />
                                  ) : (
                                    <Check size={14} />
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    {isOtherUserTyping && (
                      <div
                        className="flex items-end gap-2"
                        role="status"
                        aria-label={`${user?.name ?? "Contact"} is typing`}
                      >
                        {user?.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.name}
                            className="h-12 w-12 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#9f20e3] via-[#3B82F6] to-[#00D2D3] text-sm font-semibold text-white">
                            {getInitials(user?.name ?? "?")}
                          </div>
                        )}

                        <div className="flex w-fit items-center gap-1.5 rounded-xl rounded-bl-none border border-gray-600 bg-gray-800 px-4 py-2.5">
                          {[0, 150, 300].map((delay) => (
                            <span
                              key={delay}
                              className="h-1.5 w-1.5 animate-bounce rounded-full bg-white"
                              style={{ animationDelay: `${delay}ms` }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    </div>
                  </>
                )}
              </div>
              
              {activeAttachment && (
                <div className="absolute inset-0 z-30 flex min-h-0 flex-col bg-[#080f1c]">
                  <div className="flex h-12 shrink-0 items-center justify-end gap-2 px-4">
                    <button
                      type="button"
                      onClick={() => documentInputRef.current?.click()}
                      aria-label="Add more attachments"
                      title="Add attachments"
                      className="flex items-center justify-center shrink-0 rounded-full text-gray-300 p-2 cursor-pointer transition hover:bg-white/10 hover:text-white"
                    >
                      <Plus size={22} />
                    </button>

                    <a
                      href={activeAttachment.previewUrl}
                      download={activeAttachment.file.name}
                      aria-label={`Download ${activeAttachment.file.name}`}
                      title="Download"
                      className="flex items-center justify-center shrink-0 rounded-full text-gray-300 p-2 cursor-pointer transition hover:bg-white/10 hover:text-white"
                    >
                      <Download size={22} />
                    </a>

                    <button
                      type="button"
                      onClick={() =>
                        handleRemoveAttachment(activeAttachment.id)
                      }
                      aria-label="Remove selected attachment"
                      title="Remove attachment"
                      className="flex items-center justify-center shrink-0 rounded-full text-gray-300 p-2 cursor-pointer transition hover:bg-white/10 hover:text-red-400"
                    >
                      <X size={22} />
                    </button>
                  </div>

                  <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#080f1c] p-2 sm:px-4">
                    {activeAttachment.file.type.startsWith("image/") ? (
                      <img
                        key={activeAttachment.id}
                        src={activeAttachment.previewUrl}
                        alt={activeAttachment.file.name}
                        className="max-h-full max-w-full select-none object-contain"
                      />
                    ) : activeAttachment.file.type.startsWith("video/") ? (
                      <video
                        key={activeAttachment.id}
                        src={activeAttachment.previewUrl}
                        controls
                        playsInline
                        className="max-h-full max-w-full"
                      />
                    ) : activeAttachment.file.type.startsWith("audio/") ? (
                      <div className="flex w-full max-w-lg flex-col items-center gap-4">
                        <Music size={64} className="text-orange-400" />

                        <p className="max-w-full break-all text-center text-sm text-white">
                          {activeAttachment.file.name}
                        </p>

                        <audio
                          key={activeAttachment.id}
                          src={activeAttachment.previewUrl}
                          controls
                          className="w-full"
                        />
                      </div>
                    ) : (
                      <div className="flex max-w-md flex-col items-center gap-4 text-center">
                        <FileText size={64} className="text-blue-400" />

                        <p className="break-all text-sm font-medium text-white">
                          {activeAttachment.file.name}
                        </p>

                        <p className="text-xs text-gray-400">
                          {formatFileSize(activeAttachment.file.size)}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center justify-center px-4 sm:px-6 py-3">
                    <div className="flex min-w-0 items-center gap-2 overflow-x-auto
                      [&::-webkit-scrollbar]:h-1.5
                      [&::-webkit-scrollbar-thumb]:rounded-full
                      [&::-webkit-scrollbar-thumb]:bg-gray-600"
                    >
                      {selectedAttachments.map((attachment) => {
                        const isActive = attachment.id === activeAttachment.id;

                        return (
                          <button
                            key={attachment.id}
                            type="button"
                            onClick={() =>
                              setActiveAttachmentId(attachment.id)
                            }
                            aria-label={`Preview ${attachment.file.name}`}
                            aria-pressed={isActive}
                            title={attachment.file.name}
                            className={`relative flex w-full h-12 w-18 cursor-pointer shrink-0 items-center justify-center overflow-hidden rounded-md border-2 transition sm:h-16 sm:w-24 ${
                              isActive
                                ? "border-cyan-400"
                                : "border-gray-700 hover:border-gray-500"
                            }`}
                          >
                            {attachment.file.type.startsWith("image/") ? (
                              <img
                                src={attachment.previewUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : attachment.file.type.startsWith("video/") ? (
                              <Video size={24} className="text-pink-400" />
                            ) : attachment.file.type.startsWith("audio/") ? (
                              <Music size={24} className="text-orange-400" />
                            ) : (
                              <FileText size={24} className="text-blue-400" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {showScrollToBottom && (
                <button
                  type="button"
                  onClick={() => {
                    const container = messagesContainerRef.current;

                    if (!container) {
                      return;
                    }

                    container.scrollTo({
                      top: container.scrollHeight,
                      behavior: "smooth",
                    });

                    isNearBottomRef.current = true;

                    setShowScrollToBottom(false);
                    setNewMessageCount(0);
                  }}
                  aria-label={`${newMessageCount} new messages.`}
                  className="absolute bottom-5 right-6 z-20 flex items-center gap-2 rounded-full border border-gray-700 bg-[#0d1927]/95
                    px-4 py-2 text-sm text-white shadow-lg transition-colors hover:bg-gray-800"
                >
                  <span>
                    {newMessageCount} new{" "}
                    {newMessageCount === 1 ? "message" : "messages"}
                  </span>

                  <ArrowDown size={18} />
                </button>
              )}
            </div>
            
            {replyingTo && (
              <div className="shrink-0 border-t border-gray-800 bg-[#0a1220] px-4 pt-3">
                <div className="flex items-start justify-between gap-3 rounded-xl border-l-2 border-cyan-400 bg-[#0d1927] px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-cyan-300">
                      Replying to{" "}
                      {replyingTo.sender_id === currentUser?.id
                        ? "yourself"
                        : user?.username || "Contact"}
                    </p>

                    <p className="mt-1 line-clamp-2 break-words text-sm text-gray-200">
                      {replyingTo.content?.trim() ||
                        replyingTo.attachments?.[0]?.file_name ||
                        (replyingTo.attachments?.length
                          ? `${replyingTo.attachments.length} attachments`
                          : "Message unavailable")}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    aria-label="Cancel reply"
                    title="Cancel reply"
                    className="shrink-0 rounded-full cursor-pointer p-1 text-gray-300 transition hover:bg-white/10 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}

            <div className="shrink-0 flex gap-3 p-4 bg-[#0a1220] border-t-2 border-gray-800">
              <div className="relative shrink-0" ref={attachmentMenuRef}>
                <input
                  ref={documentInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(event) =>
                    handleFilesSelected(event, "document")
                  }
                />

                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(event) => handleFilesSelected(event, "photo")}
                />

                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  multiple
                  className="hidden"
                  onChange={(event) => handleFilesSelected(event, "video")}
                />

                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*"
                  multiple
                  className="hidden"
                  onChange={(event) => handleFilesSelected(event, "audio")}
                />
                
                <div
                  id="attachment-menu"
                  role="menu"
                  aria-label="Attach files"
                  aria-hidden={!showAttachmentMenu}
                  className={`absolute bottom-full -left-1/2 z-50 mb-2 w-40 origin-bottom rounded-2xl border border-gray-700
                    bg-[#162235] p-1 shadow-2xl shadow-black/40 backdrop-blur-xl transition-all duration-200 ease-out
                    ${showAttachmentMenu
                      ? "visible translate-y-0 scale-100 opacity-100"
                      : "invisible pointer-events-none translate-y-3 scale-95 opacity-0"
                    }`}
                >
                  {ATTACHMENT_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.label}
                        type="button"
                        role="menuitem"
                        onClick={() => handleAttachmentOptionClick(option.label)}
                        className="flex w-full items-center gap-3 rounded-lg p-2.5 text-left text-sm text-gray-200
                          transition-colors hover:bg-white/5 hover:text-white cursor-pointer"
                      >
                        <Icon size={20} className={option.iconClass} />
                        <span className="font-medium">{option.label}</span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowAttachmentMenu((value) => !value)
                  }
                  aria-label={showAttachmentMenu
                    ? "Close attachments menu"
                    : "Open attachments menu"
                  }
                  aria-expanded={showAttachmentMenu}
                  aria-controls="attachment-menu"
                  className="flex cursor-pointer items-center justify-cente rounded-full border border-gray-800 bg-[#0d1927]
                    px-2 py-2 text-gray-400 shadow-lg transition-all duration-200 hover:bg-gray-800 hover:text-white"
                >
                  <Plus className={`transition-transform duration-200 ${showAttachmentMenu ? "rotate-45 text-cyan-300" : ""}`} />
                </button>
              </div>

              <input 
                type="text"
                value={messageInput}
                onChange={(e) => handleMessageInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter" || e.nativeEvent.isComposing) {
                    return;
                  }

                  e.preventDefault();
                  if (!e.repeat) {
                    void handleSendMessage();
                  }
                }}
                className="flex-1 px-3 py-2 placeholder:text-gray-300 text-white bg-[#0d1927] focus:bg-gray-800 outline-none border border-gray-800 rounded-2xl"
                placeholder="Write a message..."
              />

              <button 
                onClick={handleSendMessage}
                disabled={isSending} 
                className="flex items-center justify-center shrink-0 px-2.5 py-1.5
                  rounded-full cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 
                  bg-gradient-to-br from-[#9f20e3] via-[#3B82F6] to-[#00D2D3] hover:shadow-[0_0_10px_2px_rgba(255,255,255,0.4)]
                  disabled:opacity-80 disabled:cursor-not-allowed"
              >
                <img src="./send-icon.svg" alt="send icon" className="h-6 w-6 invert"/>
              </button>
            </div>
          </div>
          {showDetails && user && (
            <UserDetails
              user={user}
              onClose={() => setShowDetails(false)}
            />
          )}
          {showClearChatConfirmation && user && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="clear-chat-title"
                className="w-full max-w-sm rounded-xl border border-gray-700 bg-[#101d2d] p-6 shadow-2xl"
              >
                <h2
                  id="clear-chat-title"
                  className="text-lg font-semibold text-white"
                >
                  Clear this chat?
                </h2>

                <p className="mt-2 text-sm leading-6 text-gray-400">
                  Messages will be cleared from your view only. The other
                  person will keep their message history, and new messages
                  can still arrive.
                </p>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    disabled={isClearingChat}
                    onClick={() => setShowClearChatConfirmation(false)}
                    className="rounded-lg px-4 py-2 text-sm text-white transition hover:bg-white/5 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={isClearingChat}
                    onClick={() => void handleClearChat()}
                    className="rounded-lg bg-red-500 cursor-pointer px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isClearingChat ? "Clearing..." : "Clear chat"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      }
    </>
  );
}