"use client";

import { Loader2, Trash2, X } from "lucide-react";

type DeleteAvatarModalProps = {
  isOpen: boolean;
  isRemoving: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export const DeleteAvatarModal = ({
  isOpen,
  isRemoving,
  onClose,
  onConfirm,
}: DeleteAvatarModalProps) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-700/80
        bg-[#101d2d]/95 shadow-[0_0_40px_rgba(0,0,0,0.45)]"
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
              <Trash2 size={17} className="text-red-400" />
            </div>

            <h3 className="text-[15px] font-semibold text-white">
              Remove profile photo
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isRemoving}
            className="rounded-full p-1.5 text-gray-400 hover:bg-white/5 hover:text-white transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-5">
          <p className="text-sm leading-5 text-gray-400">
            Are you sure you want to remove your profile photo?
            Your initials will be shown instead.
          </p>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isRemoving}
              className="px-4 py-2 rounded-lg border border-slate-700 text-sm font-medium text-gray-300 hover:bg-white/5
                hover:text-white transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={isRemoving}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-500/90 text-sm font-semibold text-white
                hover:bg-red-500 transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRemoving && (
                <Loader2 size={16} className="animate-spin" />
              )}

              {isRemoving ? "Removing..." : "Remove Photo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};