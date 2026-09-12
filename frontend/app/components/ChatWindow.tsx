"use client";

import { useState } from "react";
import { Calendar, Plus } from "lucide-react";

const UserData = {
  id: "2",
  name: "Aditya Singh",
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

  const handleSendMessage = () => {
    if (!messageInput.trim())  return;

    setMessageInput("");
  };

  return (
    <div className="flex-1 h-screen flex flex-col">
      <div className="w-full h-20 px-4 flex flex-row items-center justify-center gap-3 shrink-0 bg-[#0a1220] border-b-2 border-gray-800">
        <div>
          <img src={UserData.img} alt={UserData.name} className="shrink-0 h-12 w-12 object-cover rounded-full"/>
        </div>
        <div className="w-full flex flex-col justify-center">
          <div className="flex flex-row items-center justify-between gap-1">
            <p className="font-semibold text-[18px] text-gray-100">
              {UserData.name}
            </p>
          </div>
          <div className="flex gap-1 items-center">
            <div className="relative h-2 w-2 rounded-full bg-green-400" />
            <div className="absolute animate-[ping_2s_ease-in-out_infinite] h-2 w-2 rounded-full bg-green-400" />
            <p className="w-full text-sm truncate text-green-400">
              {UserData.online ? "Online" : ""}
            </p>
          </div>
        </div>
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
  )
}