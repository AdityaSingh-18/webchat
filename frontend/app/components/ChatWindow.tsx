"use client";

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

const messages = [
  {
    id: "1",
    sender: "Parm",
    message: "Hello bhai",
    time: "10:06 AM",
  },
  {
    id: "2",
    sender: "You",
    message: "Hello",
    time: "10:07 AM",
  },
  {
    id: "3",
    sender: "Parm",
    message: "kya haal",
    time: "10:11 AM",
  },
  {
    id: "4",
    sender: "Parm",
    message: "Hello bhai",
    time: "10:06 AM",
  },
  {
    id: "5",
    sender: "You",
    message: "Hello",
    time: "10:07 AM",
  },
  {
    id: "6",
    sender: "Parm",
    message: "kya haal",
    time: "10:11 AM",
  },
  {
    id: "7",
    sender: "Parm",
    message: "Hello bhai",
    time: "10:06 AM",
  },
  {
    id: "8",
    sender: "You",
    message: "Hello",
    time: "10:07 AM",
  },
  {
    id: "9",
    sender: "Parm",
    message: "kya haal",
    time: "10:11 AM",
  },
]

export const ChatWindow = () => {
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
          <p className="w-full text-[14px] truncate text-green-300">
            {UserData.online ? "Online" : ""}
          </p>
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
          <div className="px-4 py-2 rounded-xl flex gap-1.5 items-center text-gray-300 text-sm bg-gray-800 border border-gray-700">
            <Calendar size={16} /> Wednesday, September 08, 2026
          </div>
        </div>
        <div className="flex flex-col gap-2 px-12 py-4">
          {messages.map((data) => {
            return (
              <div key={data.id}>
                <div className={`flex ${data.sender === "You" ? "justify-end" : "justify-start"}`}>
                  <div className={`w-fit min-w-40 px-4 py-3 text-white
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
        <button className="rounded-full flex items-center justify-center px-2 shadow-lg text-gray-400 cursor-pointer bg-[#0d1927] hover:bg-gray-800 border border-gray-800 hover:shadow-[0_0_10px_2px_rgba(255,255,255,0.4)]">
          <Plus />
        </button>
        <input 
          type="text"
          className="flex-1 px-3 py-2 placeholder:text-gray-400 text-white bg-[#0d1927] focus:bg-gray-800 outline-none border border-gray-800 rounded-2xl"
          placeholder="Write a message..."
        />
        <button className="rounded-full shrink-0 px-2.5 py-1.5 cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center bg-gradient-to-br from-[#9f20e3] via-[#3B82F6] to-[#00D2D3] hover:shadow-[0_0_10px_2px_rgba(255,255,255,0.4)]">
          <img src="./send-icon.svg" alt="send icon" className="h-6 w-6 invert"/>
        </button>
      </div>
    </div>
  )
}