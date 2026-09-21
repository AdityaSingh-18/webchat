"use client";

import { useChatStore } from "@/lib/store/chatStore";
import { ArrowLeft, Edit, Edit2, User, X } from "lucide-react";
import { useState } from "react";

const UserData = {
  id: "2",
  name: "Aditya Singh",
  email: "adityasingh@gmail.com",
  phoneNumber: "1234567890",
  connectDate: "02 September, 2026",
  mediaCount: "3",
  starredCount: "4",
  commonGroupsCount: "1",
  img: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=461&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  lastChat: "10:00 AM",
  message: "Hello bro kaise ho?",
  messageCount: "2",
  online: true,
};

export const Settings = () => {
  const [fullName, setFullName] = useState(UserData.name);
  const [isEditing, setIsEditing] = useState(false);
  const setActiveTab = useChatStore((state) => state.setActiveTab);

  const handleCancel = () => {
    setFullName(UserData.name);
    setIsEditing(false);
  };

  const handleSave = () => {
    UserData.name = fullName;
    setIsEditing(false);
  };

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
          <p className="text-xl text-white font-semibold">Edit Profile</p>
          <p className="text-[12px] text-gray-300">Manage your personal information</p>
        </div>
      </div>

      <div className="border border-slate-800" />
      
      <div className="flex-1 overflow-y-auto flex flex-col gap-4 px-4
        [&::-webkit-scrollbar]:w-[6px]
        [&::-webkit-scrollbar-track]:bg-transparent
        [&::-webkit-scrollbar-thumb]:rounded-full
        [&::-webkit-scrollbar-thumb]:[background:linear-gradient(to_bottom,#9f20e3,#3B82F6,#00D2D3)]"
      >
        <div className="flex flex-col items-center justify-center">
          <div className="relative">
            <img src={UserData.img} alt={UserData.name} className="h-30 w-30 object-cover rounded-full" />
            <div className="text-white absolute z-10 bottom-0 right-0 p-1.5 rounded-full bg-slate-800 cursor-pointer">
              <Edit size={18}/>
            </div>
          </div>
        </div>

        <div className="flex gap-4 p-4 mt-4 items-center justify-between border border-slate-800 rounded-lg">
          <div className="flex gap-2 items-center flex-1 min-w-0">
            <User size={28} className="text-cyan-500 cursor-pointer shrink-0" />
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <h3 className="text-[13px] text-gray-400">Full Name</h3>
              {isEditing 
                ? <input 
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoFocus 
                    className="w-full outline-none text-white" 
                  />
                : <p className="text-gray-300 truncate">{UserData.name}</p>
              }
            </div>
          </div>
          {isEditing 
            ? <X onClick={handleCancel} size={22} className="text-cyan-500 cursor-pointer shrink-0" /> 
            : <Edit2 onClick={() => setIsEditing(true)} size={22} className="text-cyan-500 cursor-pointer" />
          }
        </div>

        <button 
          onClick={handleSave}
          disabled={!fullName || !isEditing}
          className="text-white cursor-pointer font-semibold bg-gradient-to-br from-[#9f20e3] via-[#3B82F6] to-[#00D2D3] p-3 rounded-xl disabled:cursor-not-allowed disabled:opacity-90">
          Save Changes
        </button>
      </div>
    </div>
  );
};