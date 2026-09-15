"use client";

import { useState } from "react";
import { Ban, Calendar, CalendarIcon, ChevronRight, CircleMinus, Folders, Info, Mail, Phone, Plus, Star, StopCircle, Trash, Users, X } from "lucide-react";

const UserData = {
  id: "2",
  name: "Aditya Singh",
  email: "adityasingh@gmail.com",
  phoneNumber: "1234567890",
  connectDate: "02 Septemeber, 2026",
  mediaCount: "3",
  starredCount: "4",
  commonGroupsCount: "1",
  img: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=461&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  lastChat: "10:00 AM",
  message: "Hello bro kaise ho?",
  messageCount: "2",
  online: true,
};

interface Message {
  id: string;
  sender: string;
  message: string;
  time: string;
}

export const ChatWindow = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [showDetails, setShowDetails] = useState(false);

  const handleSendMessage = () => {
    if (!messageInput.trim())  return;

    setMessageInput("");
  };

  return (
    <>
      <div className="flex-1 h-screen flex flex-col">
        <div className="h-20 px-6 flex items-center justify-between gap-3 shrink-0 bg-[#0a1220] border-b-2 border-gray-800">
          <div className="flex items-center gap-3 shrink-0">
            <img src={UserData.img} alt={UserData.name} className="shrink-0 h-12 w-12 object-cover rounded-full"/>
            <div className="flex flex-col justify-center">
              <p className="font-semibold text-[18px] text-white">
                {UserData.name}
              </p>
              <div className="flex gap-1 items-center">
                <div className="relative h-2 w-2 rounded-full bg-green-400" />
                <div className="absolute animate-[ping_1.5s_ease-in-out_infinite] h-2 w-2 rounded-full bg-green-400" />
                <p className="text-sm truncate text-green-400">
                  {UserData.online ? "Online" : ""}
                </p>
              </div>
            </div>
          </div>
          <button onClick={() => setShowDetails(!showDetails)}>
            <Info className="text-cyan-600 stroke-[3] cursor-pointer hover:text-cyan-500" />
          </button>
        </div>
        <div className="
          flex-1 w-full min-h-0 overflow-y-auto bg-[#080f1c] 
          bg-[radial-gradient(circle_at_bottom_left,_rgba(6,100,130,0.35),_transparent_40%),radial-gradient(circle_at_top_right,_rgba(70,25,120,0.3),_transparent_40%)]
          [&::-webkit-scrollbar]:w-[10px]
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:border-[2px]
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-thumb]:[background:linear-gradient(to_bottom,#9f20e3,#3B82F6,#00D2D3)]"
        >
          <div className="flex items-center justify-center pt-4">
            <div className="px-3 py-1.5 rounded-xl flex gap-1.5 items-center text-gray-200 text-sm bg-gray-700 border border-gray-600">
              <Calendar size={16} /> Wednesday, September 08, 2026
            </div>
          </div>
          <div className="flex flex-col gap-2 px-12 py-4">
            {messages.map((data) => {
              return (
                <div key={data.id}>
                  <div className={`flex ${data.sender === "You" ? "justify-end" : "justify-start"}`}>
                    <div className={`w-fit min-w-50 px-4 py-3 text-white
                      ${data.sender === "You"
                        ? "rounded-tl-xl rounded-bl-xl bg-gradient-to-r from-cyan-500/80 to-transparent"
                        : "rounded-tr-xl rounded-br-xl bg-gradient-to-l from-purple-500/50 to-transparent"
                      }`}
                    >
                      {data.message}
                    </div>
                  </div>
                  <div className={`mt-1.5 text-gray-300 text-[10px] flex ${data.sender === "You" ? "justify-end" : "justify-start"}`}>
                    {data.time}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="shrink-0 flex gap-3 p-4 bg-[#0a1220] border-t-2 border-gray-800">
          <button className="rounded-full flex items-center justify-center px-2 shadow-lg text-gray-400 cursor-pointer 
            bg-[#0d1927] hover:bg-gray-800 border border-gray-800 hover:shadow-[0_0_10px_2px_rgba(255,255,255,0.4)]">
            <Plus />
          </button>
          <input 
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSendMessage();
              }
            }}
            className="flex-1 px-3 py-2 placeholder:text-gray-400 text-white bg-[#0d1927] focus:bg-gray-800 outline-none border border-gray-800 rounded-2xl"
            placeholder="Write a message..."
          />
          <button onClick={handleSendMessage} className="flex items-center justify-center shrink-0 px-2.5 py-1.5
            rounded-full cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 
            bg-gradient-to-br from-[#9f20e3] via-[#3B82F6] to-[#00D2D3] hover:shadow-[0_0_10px_2px_rgba(255,255,255,0.4)]">
            <img src="./send-icon.svg" alt="send icon" className="h-6 w-6 invert"/>
          </button>
        </div>
      </div>
      {showDetails && 
        <div className="w-80 h-screen overflow-y-auto flex flex-col gap-4 px-4 shrink-0 text-white bg-slate-900 border-l-2 border-gray-800
          [&::-webkit-scrollbar]:w-[6px]
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-thumb]:[background:linear-gradient(to_bottom,#9f20e3,#3B82F6,#00D2D3)]"
        >
          <div className="flex items-center justify-between gap-4 py-4 border-b border-gray-800">
            <p className="text-xl">
              User Info
            </p>
            <button onClick={() => setShowDetails(false)} className="hover:text-cyan-500 cursor-pointer">
              <X size={22} strokeWidth={2}/>
            </button>
          </div>
          <div className="flex flex-col items-center justify-center">
            <img src={UserData.img} alt={UserData.name} className="h-24 w-24 rounded-full" />
            <p className="font-semibold text-lg text-white mt-2">
              {UserData.name}
            </p>
            <p className="text-sm truncate text-green-400">
              {UserData.online ? "Online" : ""}
            </p>
          </div>
          <div className="flex flex-col justify-center gap-3 p-4">
            <div className="flex gap-4 items-center">
              <Mail size={22} className="text-cyan-500" strokeWidth={2} />
              <div className="flex flex-col">
                <h3 className="text-[13px] text-gray-400">Email</h3>
                <p className="text-sm text-gray-300">{UserData.email}</p>
              </div>
            </div>
            <div className="flex gap-4 items-center">
              <Phone size={22} className="text-cyan-500" strokeWidth={2} />
              <div className="flex flex-col">
                <h3 className="text-[13px] text-gray-400">Phone Number</h3>
                <p className="text-sm text-gray-300">{UserData.phoneNumber}</p>
              </div>
            </div>
            <div className="flex gap-4 items-center">
              <CalendarIcon size={22} className="text-cyan-500" strokeWidth={2} />
              <div className="flex flex-col">
                <h3 className="text-[13px] text-gray-400">Connected Since</h3>
                <p className="text-sm text-gray-300">{UserData.connectDate}</p>
              </div>
            </div>
          </div>
          <div className="border border-slate-800" />
          <div className="flex flex-col justify-center">
            <div className="flex gap-4 items-center justify-between p-4 hover:bg-white/10 rounded-xl cursor-pointer">
              <div className="flex gap-4 items-center">
                <Folders size={22} className="text-indigo-500" strokeWidth={2} />
                <p className="text-gray-300 text-sm truncate">
                  Media, Docs and Links
                </p>
              </div>
              <div className="flex gap-1 items-center">
                <p className="text-sm text-gray-300">{UserData.mediaCount}</p>
                <ChevronRight size={20} className="text-indigo-500"/>
              </div>
            </div>
            <div className="flex gap-4 items-center justify-between p-4 hover:bg-white/10 rounded-xl cursor-pointer">
              <div className="flex gap-4 items-center">
                <Star size={22} className="text-indigo-500" strokeWidth={2} />
                <p className="text-gray-300 text-sm truncate">
                  Starrd Messages
                </p>
              </div>
              <div className="flex gap-1 items-center">
                <p className="text-sm text-gray-300">{UserData.starredCount}</p>
                <ChevronRight size={22} className="text-indigo-500"/>
              </div>
            </div>
            <div className="flex gap-4 items-center justify-between p-4 hover:bg-white/10 rounded-xl cursor-pointer">
              <div className="flex gap-4 items-center">
                <Users size={22} className="text-indigo-500" strokeWidth={2} />
                <p className="text-gray-300 text-sm truncate">
                  Groups in common
                </p>
              </div>
              <div className="flex gap-1 items-center">
                <p className="text-sm text-gray-300">{UserData.commonGroupsCount}</p>
                <ChevronRight size={22} className="text-indigo-500"/>
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
                Block {UserData.name}
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
      }
    </>
  )
}