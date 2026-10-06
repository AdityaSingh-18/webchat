"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { toast } from "react-hot-toast";
import { useChatStore } from "@/lib/store/chatStore";
import { supabase } from "@/lib/supabase/supabaseClient";

import {
  ArrowLeft,
  Edit,
  Edit2,
  FileText,
  Loader2,
  Trash2,
  User,
  X,
} from "lucide-react";

import { DeleteAvatarModal } from "@/components/DeleteAvatarModal";

export const Settings = () => {
  const bioRef = useRef<HTMLTextAreaElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const setActiveTab = useChatStore((state) => state.setActiveTab);
  const currentUser = useChatStore((state) => state.currentUser);
  const setCurrentUser = useChatStore((state) => state.setCurrentUser);

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");

  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);

  useEffect(() => {
    setFullName(currentUser?.full_name ?? "");
    setBio(currentUser?.bio ?? "");
  }, [currentUser]);

  useEffect(() => {
    if (isEditingBio && bioRef.current) {
      requestAnimationFrame(() => {
        const textarea = bioRef.current;

        if (!textarea) return;

        textarea.focus();

        const length = textarea.value.length;
        textarea.setSelectionRange(length, length);
      });
    }
  }, [isEditingBio]);

  const handleCancelName = () => {
    setFullName(currentUser?.full_name ?? "");
    setIsEditingName(false);
  };

  const handleCancelBio = () => {
    setBio(currentUser?.bio ?? "");
    setIsEditingBio(false);
  };

  const handleSave = async () => {
    if (!currentUser?.id || !fullName.trim()) {
      return;
    }

    setIsSaving(true);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          bio: bio.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentUser.id)
        .select(
          "id, full_name, username, email, phone_number, avatar_url, bio, created_at, updated_at",
        )
        .single();

      if (error) {
        throw error;
      }

      setCurrentUser(data);
      setIsEditingName(false);
      setIsEditingBio(false);

      toast.success("Profile updated successfully.");
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error("Failed to save profile changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const getAvatarPath = (avatarUrl: string | null) => {
    if (!avatarUrl) {
      return null;
    }

    const marker = "/storage/v1/object/public/avatars/";
    const markerIndex = avatarUrl.indexOf(marker);

    if (markerIndex === -1) {
      return null;
    }

    return decodeURIComponent(avatarUrl.substring(markerIndex + marker.length));
  };

  const handleAvatarClick = () => {
    if (isUploadingAvatar || isRemovingAvatar) {
      return;
    }

    avatarInputRef.current?.click();
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file || !currentUser?.id) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      toast.error("Image size must be less than 5 MB.");
      return;
    }

    setIsUploadingAvatar(true);

    const oldAvatarPath = getAvatarPath(currentUser.avatar_url);

    try {
      const fileExtension = file.name.split(".").pop()?.toLowerCase() || "jpg";

      const filePath = `${currentUser.id}/avatar-${Date.now()}.${fileExtension}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const avatarUrl = publicUrlData.publicUrl;

      const { data, error: updateError } = await supabase
        .from("profiles")
        .update({
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentUser.id)
        .select(
          "id, full_name, username, email, phone_number, avatar_url, bio, created_at, updated_at",
        )
        .single();

      if (updateError) {
        await supabase.storage.from("avatars").remove([filePath]);
        throw updateError;
      }

      setCurrentUser(data);

      if (oldAvatarPath && oldAvatarPath !== filePath) {
        const { error: deleteError } = await supabase.storage
          .from("avatars")
          .remove([oldAvatarPath]);

        if (deleteError) {
          console.error("Failed to delete previous avatar:", deleteError);
        }
      }

      toast.success("Profile photo updated.");
    } catch (error) {
      console.error("Failed to upload avatar:", error);
      toast.error("Failed to update profile photo. Please try again.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!currentUser?.id || !currentUser.avatar_url) {
      return;
    }

    setIsRemoveModalOpen(false);
    setIsRemovingAvatar(true);

    const avatarPath = getAvatarPath(currentUser.avatar_url);

    try {
      const { data, error: updateError } = await supabase
        .from("profiles")
        .update({
          avatar_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentUser.id)
        .select(
          "id, full_name, username, email, phone_number, avatar_url, bio, created_at, updated_at",
        )
        .single();

      if (updateError) {
        throw updateError;
      }

      setCurrentUser(data);

      if (avatarPath) {
        const { error: deleteError } = await supabase.storage
          .from("avatars")
          .remove([avatarPath]);

        if (deleteError) {
          console.error("Failed to delete removed avatar:", deleteError);
        }
      }

      toast.success("Profile photo removed.");
    } catch (error) {
      console.error("Failed to remove avatar:", error);
      toast.error("Failed to remove profile photo. Please try again.");
    } finally {
      setIsRemovingAvatar(false);
    }
  };

  const initials =
    currentUser?.full_name
      ?.split(" ")
      .map((name) => name[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  return (
    <>
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
            <p className="text-xl text-white font-semibold">Edit Profile</p>

            <p className="text-[12px] text-gray-300">
              Manage your personal information
            </p>
          </div>
        </div>

        <div className="border border-slate-800" />

        <div
          className="flex-1 overflow-y-auto flex flex-col gap-4 px-4
          [&::-webkit-scrollbar]:w-[6px]
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-thumb]:[background:linear-gradient(to_bottom,#9f20e3,#3B82F6,#00D2D3)]"
        >
          <div className="flex flex-col items-center justify-center">
            <div className="relative">
              {currentUser?.avatar_url ? (
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser.full_name || "Profile Photo"}
                  className="h-28 w-28 rounded-full object-cover ring-4 ring-emerald-500/20 border-3 border-emerald-500 p-1"
                />
              ) : (
                <div className="h-28 w-28 ring-4 ring-emerald-500/20 border-3 border-emerald-500 rounded-full bg-slate-800 flex items-center justify-center text-3xl font-semibold text-white">
                  {initials}
                </div>
              )}

              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />

              <button
                type="button"
                onClick={handleAvatarClick}
                disabled={isUploadingAvatar || isRemovingAvatar}
                className="text-white absolute z-10 bottom-0 right-0 p-1.5 rounded-full bg-slate-800 border border-slate-700 hover:bg-slate-700 transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUploadingAvatar ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Edit size={18} />
                )}
              </button>
            </div>

            {currentUser?.avatar_url && (
              <button
                type="button"
                onClick={() => setIsRemoveModalOpen(true)}
                disabled={isUploadingAvatar || isRemovingAvatar}
                className="mt-3 flex items-center gap-1.5 text-xs text-red-600 hover:text-red-500 transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRemovingAvatar ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}

                {isRemovingAvatar ? "Removing..." : "Remove"}
              </button>
            )}
          </div>

          <div className="flex gap-4 mt-2 p-4 items-center justify-between border border-slate-800 rounded-lg">
            <div className="flex gap-2 items-center flex-1 min-w-0">
              <User
                size={28}
                className="text-cyan-500 cursor-pointer shrink-0"
              />

              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <h3 className="text-[13px] text-gray-400">Full Name</h3>

                {isEditingName ? (
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoFocus
                    className="w-full outline-none text-white bg-transparent"
                  />
                ) : (
                  <p className="text-gray-300 truncate">
                    {currentUser?.full_name || "Not set"}
                  </p>
                )}
              </div>
            </div>

            {isEditingName ? (
              <button
                type="button"
                onClick={handleCancelName}
                className="shrink-0"
              >
                <X size={22} className="text-cyan-500 cursor-pointer" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingName(true)}
                className="shrink-0"
              >
                <Edit2 size={22} className="text-cyan-500 cursor-pointer" />
              </button>
            )}
          </div>

          <div className="flex gap-4 p-4 items-start justify-between border border-slate-800 rounded-lg">
            <div className="flex gap-2 items-start flex-1 min-w-0">
              <FileText
                size={28}
                className="text-cyan-500 cursor-pointer shrink-0"
              />

              <div className="flex flex-col gap-1 flex-1 min-w-0 text-sm">
                <h3 className="text-[13px] text-gray-400">Bio</h3>

                {isEditingBio ? (
                  <>
                    <textarea
                      ref={bioRef}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      maxLength={100}
                      rows={4}
                      placeholder="Tell people a little about yourself"
                      className="w-full resize-none outline-none text-white bg-transparent placeholder:text-gray-600"
                    />

                    <p className="text-[11px] text-gray-400 text-right">
                      {bio.length}/100
                    </p>
                  </>
                ) : (
                  <p className="text-gray-300 break-words">
                    {currentUser?.bio || "Add a bio"}
                  </p>
                )}
              </div>
            </div>

            {isEditingBio ? (
              <button
                type="button"
                onClick={handleCancelBio}
                className="shrink-0"
              >
                <X size={22} className="text-cyan-500 cursor-pointer" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingBio(true)}
                className="shrink-0"
              >
                <Edit2 size={22} className="text-cyan-500 cursor-pointer" />
              </button>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-800">
          <button
            type="button"
            onClick={handleSave}
            disabled={
              !fullName.trim() ||
              (!isEditingName && !isEditingBio) ||
              isSaving ||
              isUploadingAvatar ||
              isRemovingAvatar
            }
            className="w-full flex items-center justify-center gap-2 text-white cursor-pointer font-semibold bg-gradient-to-br
              from-[#9f20e3] via-[#3B82F6] to-[#00D2D3] px-3 py-2.5 rounded-lg disabled:cursor-not-allowed disabled:opacity-80"
          >
            {isSaving && <Loader2 size={18} className="animate-spin" />}

            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <DeleteAvatarModal
        isOpen={isRemoveModalOpen}
        isRemoving={isRemovingAvatar}
        onClose={() => setIsRemoveModalOpen(false)}
        onConfirm={handleRemoveAvatar}
      />
    </>
  );
};