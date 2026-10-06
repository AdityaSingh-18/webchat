"use client";

import { useState, useEffect, useCallback } from "react";
import { useChatStore } from "@/lib/store/chatStore";
import {
  ArrowLeft,
  Check,
  Inbox,
  Send,
  TriangleAlert,
  UserPlus,
  X,
} from "lucide-react";

type Tab = "received" | "sent";
type Action = "accept" | "reject" | "cancel";

type RequestItem = {
  id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
};

const GRADIENT = "bg-gradient-to-br from-[#9f20e3] via-[#3B82F6] to-[#00D2D3]";

const timeAgo = (date: string) => {
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(date).getTime()) / 1000),
  );
  const units: [string, number][] = [
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["min", 60],
  ];
  for (const [label, size] of units) {
    const n = Math.floor(seconds / size);
    if (n >= 1)
      return `${n} ${label}${n > 1 && label !== "min" ? "s" : ""} ago`;
  }
  return "just now";
};

export const RequestList = () => {
  const [activeRequestTab, setActiveRequestTab] = useState<Tab>("received");
  const [requests, setRequests] = useState<Record<Tab, RequestItem[]>>({
    received: [],
    sent: [],
  });
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const setActiveTab = useChatStore((state) => state.setActiveTab);
  const setOpenNewChat = useChatStore((state) => state.setOpenNewChat);

  const loadRequests = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await fetch("/api/connections/requests", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error();
      setRequests(await res.json());
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleAction = async (id: string, action: Action) => {
    setBusyId(id);
    setActionError(null);

    try {
      const res = await fetch(`/api/connections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        throw new Error(data.error ?? "Something went wrong");
      }
      
      const key: Tab = action === "cancel" ? "sent" : "received";
      setRequests((prev) => ({
        ...prev,
        [key]: prev[key].filter((r) => r.id !== id),
      }));
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const list = requests[activeRequestTab];

  const state =
    status === "error"
      ? {
          icon: <TriangleAlert size={26} />,
          title: "Couldn't load requests",
          text: "Check your connection and try again.",
          retry: true,
        }
      : status === "success" && list.length === 0
        ? activeRequestTab === "received"
          ? {
              icon: <Inbox size={26} />,
              title: "No received requests",
              text: "Request sent to you will show up here.",
              retry: false,
            }
          : {
              icon: <Send size={26} />,
              title: "No pending requests",
              text: "Requests sent by you show up here.",
              retry: false,
            }
        : null;

  return (
    <div className="w-80 h-screen flex flex-col gap-4 shrink-0 pt-4 bg-[#0d1927] border-x-2 border-gray-800">
      <div className="flex items-center gap-2 px-2">
        <div className="group relative">
          <div
            onClick={() => setActiveTab("chat")}
            className="hover:bg-white/5 text-gray-300 hover:text-white p-2 cursor-pointer rounded-full"
          >
            <ArrowLeft size={22} />
          </div>
          <span
            className="pointer-events-none absolute z-10 top-full -right-1/2 mt-2 whitespace-nowrap rounded-md 
            bg-black px-3 py-1 text-sm text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          >
            Back
          </span>
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-xl text-white font-semibold">Requests</p>
          <p className="text-[12px] text-gray-300">Manage the connections you send and receive</p>
        </div>
      </div>
      <div className="border border-slate-800" />
      <div className="flex items-center justify-between gap-2 p-1 bg-slate-800 border border-gray-700 text-white rounded-full mx-3">
        {(["received", "sent"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveRequestTab(tab)}
            className={`flex gap-2 items-center justify-center w-full rounded-full px-2 py-1.5 cursor-pointer ${activeRequestTab === tab ? GRADIENT : ""}`}
          >
            <div className="font-semibold text-sm capitalize">{tab}</div>
            {status === "success" && (
              <div className="rounded-full px-2 py-1 text-xs bg-white/20">
                {requests[tab].length}
              </div>
            )}
          </button>
        ))}
      </div>
      {status === "loading" && (
        <div className="px-3 flex flex-col gap-2" aria-busy="true">
          {Array.from({ length: 3 }, (_, i) => (
            <div
              key={i}
              className="rounded-xl bg-slate-800 p-3 flex flex-col gap-3 animate-pulse"
            >
              <div className="flex gap-3">
                <div className="h-12 w-12 rounded-full bg-gray-700/60" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3 w-1/2 rounded bg-gray-700/60" />
                  <div className="h-3 w-3/4 rounded bg-gray-700/40" />
                </div>
              </div>
              <div className="h-7 w-full rounded-md bg-gray-700/40" />
            </div>
          ))}
        </div>
      )}
      {state && (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 px-8 pb-16">
          <div className="h-14 w-14 rounded-full bg-white/5 flex items-center justify-center text-gray-300">
            {state.icon}
          </div>
          <div>
            <p className="text-white font-semibold">{state.title}</p>
            <p className="text-[13px] text-gray-400 mt-1">{state.text}</p>
          </div>
          {state.retry ? (
            <button
              onClick={loadRequests}
              className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-white/10 hover:bg-white/15 cursor-pointer transition-colors"
            >
              Try again
            </button>
          ) : activeRequestTab === "sent" ? (
            <button
              onClick={() => {
                setOpenNewChat(true);
                setActiveTab("chat");
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white cursor-pointer hover:scale-105 active:scale-95 transition-transform ${GRADIENT}`}
            >
              <UserPlus size={16} />
              Find people
            </button>
          ) : null}
        </div>
      )}
      {status === "success" && list.length > 0 && (
        <div
          className="flex-1 min-h-0 px-3 py-2 overflow-y-auto
          [&::-webkit-scrollbar]:w-[8px]
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:border-[2px]
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-thumb]:[background:linear-gradient(to_bottom,#9f20e3,#3B82F6,#00D2D3)]"
        >
          {actionError && (
            <p className="mb-2 rounded-lg bg-red-500/10 px-3 py-2 text-[13px] text-red-300">
              {actionError}
            </p>
          )}
          <div className="flex flex-col gap-2 justify-center">
            {list.map((r) => (
              <div
                key={r.id}
                className="rounded-xl bg-slate-800 p-3 text-white flex flex-col gap-3"
              >
                <div className="flex gap-3 justify-between">
                  <div className="flex gap-3 min-w-0">
                    {r.avatar_url ? (
                      <img
                        src={r.avatar_url}
                        alt={r.name}
                        className="shrink-0 h-12 w-12 object-cover rounded-full"
                      />
                    ) : (
                      <div className={`shrink-0 h-12 w-12 rounded-full flex items-center justify-center text-white font-semibold ${GRADIENT}`}>
                        {r.name.trim().charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex flex-col justify-center">
                      <p className="truncate">{r.name}</p>
                      {r.username && (
                        <p className="truncate text-gray-300 text-sm">
                          @{r.username}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col gap-2 items-end">
                    <div className="text-cyan-500 text-[11px]">
                      {timeAgo(r.created_at)}
                    </div>
                    {activeRequestTab === "sent" && (
                      <button
                        onClick={() => handleAction(r.id, "cancel")}
                        disabled={busyId === r.id}
                        className="flex gap-1 items-center justify-center text-[13px] w-full rounded-md px-2 py-1 bg-white/10 hover:bg-red-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/10"
                      >
                        <X size={16} strokeWidth={2} />
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
                {activeRequestTab === "received" && (
                  <div className="w-full flex gap-3 items-center">
                    <button
                      onClick={() => handleAction(r.id, "accept")}
                      disabled={busyId === r.id}
                      className={`flex gap-1 items-center justify-center text-sm w-full rounded-md px-2 py-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${GRADIENT}`}
                    >
                      <Check size={18} strokeWidth={2} />
                      Accept
                    </button>
                    <button
                      onClick={() => handleAction(r.id, "reject")}
                      disabled={busyId === r.id}
                      className="flex gap-1 items-center justify-center text-sm w-full rounded-md px-2 py-1 bg-white/10 hover:bg-red-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/10"
                    >
                      <X size={18} strokeWidth={2} />
                      Decline
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};