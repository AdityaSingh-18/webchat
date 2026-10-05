"use client";

import { useChatStore } from "@/lib/store/chatStore";
import { ArrowLeft, Mail, Phone, Calendar, AtSign } from "lucide-react";

export const Profile = () => {
  const setActiveTab = useChatStore((state) => state.setActiveTab);
  const currentUser = useChatStore((state) => state.currentUser);

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
          <span className="pointer-events-none absolute z-10 top-full -right-1/2 mt-2 whitespace-nowrap rounded-md 
            bg-black px-3 py-1 text-sm text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          >
            Back
          </span>
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-xl text-white font-semibold">My Profile</p>
          <p className="text-[12px] text-gray-300">Your personal information</p>
        </div>
      </div>

      <div className="border border-slate-800" />

      <div className="flex-1 overflow-y-auto flex flex-col gap-4 px-6
        [&::-webkit-scrollbar]:w-[6px]
        [&::-webkit-scrollbar-track]:bg-transparent
        [&::-webkit-scrollbar-thumb]:rounded-full
        [&::-webkit-scrollbar-thumb]:[background:linear-gradient(to_bottom,#9f20e3,#3B82F6,#00D2D3)]"
      >
        <div className="flex flex-col items-center justify-center px-4">
          <div className="relative">
            <img 
              src={currentUser?.avatar_url || "./post1.jpg"} 
              alt={currentUser?.full_name || "Profile Photo"} 
              className="h-32 w-32 rounded-full object-cover ring-4 ring-emerald-500/20 border-3 border-emerald-500 p-1" 
            />
              <div className="absolute bottom-2.5 right-2.5 h-5 w-5 bg-emerald-500 rounded-full border-4 border-[#0d1927]\"></div>
          </div>
          <h2 className="text-[22px] text-white font-semibold my-2 tracking-wide">{currentUser?.full_name}</h2>
        </div>

        <div>
          <h3 className="text-[11px] font-bold text-gray-500 tracking-widest mb-4 uppercase">Personal Info</h3>
          
          <div className="flex flex-col justify-center gap-3">
            <div className="flex gap-4 items-center">
              <Mail size={22} className="text-cyan-500" strokeWidth={2} />
              <div className="flex flex-col">
                <h3 className="text-[13px] text-gray-400">Email</h3>
                <p className="text-sm text-gray-300">{currentUser?.email}</p>
              </div>
            </div>
            <div className="flex gap-4 items-center">
              <Phone size={22} className="text-cyan-500" strokeWidth={2} />
              <div className="flex flex-col">
                <h3 className="text-[13px] text-gray-400">Phone Number</h3>
                <p className="text-sm text-gray-300">{currentUser?.phone_number}</p>
              </div>
            </div>
            <div className="flex gap-4 items-center">
              <Calendar size={22} className="text-cyan-500" strokeWidth={2} />
              <div className="flex flex-col">
                <h3 className="text-[13px] text-gray-400">Connected Since</h3>
                <p className="text-sm text-gray-300">
                  {new Date(currentUser!.created_at).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-slate-800">
        <button 
          onClick={() => setActiveTab("settings")}
          className="w-full text-white cursor-pointer font-semibold bg-gradient-to-br from-[#9f20e3] via-[#3B82F6] to-[#00D2D3] px-3 py-2.5 rounded-lg"
        >
          Edit Profile
        </button>
      </div>
    </div>
  );
};