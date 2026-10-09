"use client";

import { getInitials } from "@/lib";
import {
  Ban,
  Calendar,
  ChevronRight,
  CircleMinus,
  Folders,
  Mail,
  Phone,
  Star,
  Trash,
  Users,
  X,
} from "lucide-react";

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

const formatConnectedDate = (value: string | null) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

export const UserDetails = ({
  user,
  onClose,
}: UserDetailsProps) => {
  return (
    <div className="w-80 h-screen flex flex-col shrink-0 text-white bg-slate-900 border-l-2 border-gray-800">
      <div className="flex items-center justify-between gap-4 shrink-0 p-4 border-b border-gray-800">
        <p className="text-xl">
          User Info
        </p>

        <button
          onClick={onClose}
          className="hover:text-cyan-500 cursor-pointer"
          aria-label="Close user details"
        >
          <X size={22} strokeWidth={2} />
        </button>
      </div>

      <div
        className="
          flex-1 overflow-y-auto flex flex-col gap-4 p-4
          [&::-webkit-scrollbar]:w-[6px]
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-thumb]:[background:linear-gradient(to_bottom,#9f20e3,#3B82F6,#00D2D3)]
        "
      >
        <div className="flex flex-col items-center justify-center">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="h-24 w-24 object-cover rounded-full"
            />
          ) : (
            <div className="h-24 w-24 rounded-full flex items-center justify-center text-3xl font-semibold text-white
              bg-gradient-to-br from-[#9f20e3] via-[#3B82F6] to-[#00D2D3]"
            >
              {getInitials(user.name)}
            </div>
          )}

          <p className="font-semibold text-lg text-white mt-2">
            {user.name}
          </p>

          {user.username && <p className="text-sm text-gray-400">@{user.username}</p>}

          <div className="flex gap-2 items-center mt-1">
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
              <p className="text-[13px] text-gray-400">
                About
              </p>

              <p className="text-sm text-gray-300 mt-1 break-words">
                {user.bio}
              </p>
            </div>
          </>
        )}

        <div className="flex flex-col justify-center gap-3 p-4">
          <div className="flex gap-4 items-center">
            <Mail size={22} className="text-cyan-500" strokeWidth={2} />

            <div className="flex flex-col min-w-0">
              <h3 className="text-[13px] text-gray-400">
                Email
              </h3>

              <p className="text-sm text-gray-300 break-all">
                {user.email || "—"}
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-center">
            <Phone size={22} className="text-cyan-500" strokeWidth={2} />

            <div className="flex flex-col min-w-0">
              <h3 className="text-[13px] text-gray-400">
                Phone Number
              </h3>

              <p className="text-sm text-gray-300">
                {user.phoneNumber || "—"}
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-center">
            <Calendar size={22} className="text-cyan-500" strokeWidth={2} />

            <div className="flex flex-col">
              <h3 className="text-[13px] text-gray-400">
                Connected Since
              </h3>

              <p className="text-sm text-gray-300">
                {formatConnectedDate(user.connectedSince)}
              </p>
            </div>
          </div>
        </div>

        <div className="border border-slate-800" />

        <div className="flex flex-col justify-center">
          <div className="flex gap-4 items-center justify-between p-4 hover:bg-white/10 rounded-xl cursor-pointer">
            <div className="flex gap-4 items-center min-w-0">
              <Folders size={22} className="text-indigo-500 shrink-0" strokeWidth={2} />

              <p className="text-gray-300 text-sm truncate">
                Media, Docs and Links
              </p>
            </div>

            <div className="flex gap-1 items-center shrink-0">
              <p className="text-sm text-gray-400">
                {user.mediaCount ?? "0"}
              </p>

              <ChevronRight size={20} className="text-indigo-500" />
            </div>
          </div>

          <div className="flex gap-4 items-center justify-between p-4 hover:bg-white/10 rounded-xl cursor-pointer">
            <div className="flex gap-4 items-center min-w-0">
              <Star size={22} className="text-indigo-500 shrink-0" strokeWidth={2} />

              <p className="text-gray-300 text-sm truncate">
                Starred Messages
              </p>
            </div>

            <div className="flex gap-1 items-center shrink-0">
              <p className="text-sm text-gray-400">
                {user.starredCount ?? "0"}
              </p>

              <ChevronRight size={22} className="text-indigo-500" />
            </div>
          </div>

          <div className="flex gap-4 items-center justify-between p-4 hover:bg-white/10 rounded-xl cursor-pointer">
            <div className="flex gap-4 items-center min-w-0">
              <Users size={22} className="text-indigo-500 shrink-0" strokeWidth={2} />

              <p className="text-gray-300 text-sm truncate">
                Groups in common
              </p>
            </div>

            <div className="flex gap-1 items-center shrink-0">
              <p className="text-sm text-gray-400">
                {user.commonGroupsCount ?? "0"}
              </p>

              <ChevronRight size={22} className="text-indigo-500" />
            </div>
          </div>
        </div>

        <div className="border border-slate-800" />

        <div className="flex flex-col justify-center pb-4">
          <div className="flex gap-4 items-center p-4 hover:bg-red-400/10 rounded-xl cursor-pointer">
            <CircleMinus size={22} className="text-red-600" strokeWidth={2} />

            <p className="text-red-600 text-sm truncate">
              Clear Chat
            </p>
          </div>

          <div className="flex gap-4 items-center p-4 hover:bg-red-400/10 rounded-xl cursor-pointer">
            <Ban size={22} className="text-red-600" strokeWidth={2} />

            <p className="text-red-600 text-sm truncate">
              Block {user.name}
            </p>
          </div>

          <div className="flex gap-4 items-center p-4 hover:bg-red-400/10 rounded-xl cursor-pointer">
            <Trash size={22} className="text-red-600" strokeWidth={2} />

            <p className="text-red-600 text-sm truncate">
              Delete Contact
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};