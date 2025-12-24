import React, { useEffect, useRef, useState } from "react";
import { FiMessageSquare } from "react-icons/fi";
import { IoSend } from "react-icons/io5";
import socket from "../socket";

const ChatSidebar = () => {
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("chat");
    const [msgs, setMsgs] = useState([]);
    const [text, setText] = useState("");
    const [users, setUsers] = useState([]);
    const [username, setUsername] = useState(localStorage.getItem("studentName") || "Student");
    const bottomRef = useRef(null);

    const scrollDown = () => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        setUsername(localStorage.getItem("studentName") || "Student");

        socket.emit("get-all-messages");
        socket.emit("request-participants");

        socket.on("chat:messages", data => {
            setMsgs(data);
            scrollDown();
        });

        socket.on("chat:message", msg => {
            setMsgs(prev => [...prev, msg]);
            scrollDown();
        });

        socket.on("participants:update", list => {
            setUsers(list);
        });

        socket.on("registration:success", () => {
            setUsername(localStorage.getItem("studentName") || "Student");
        });

        return () => {
            socket.off("chat:messages");
            socket.off("chat:message");
            socket.off("participants:update");
            socket.off("registration:success");
        };
    }, []);

    const sendMessage = () => {
        if (!text.trim()) return;

        const role = localStorage.getItem("userRole") || "student";
        const name = role === "teacher"
            ? "Teacher"
            : localStorage.getItem("studentName") || username || "Student";

        socket.emit("chat:message", { sender: name, text: text.trim() });
        setText("");
    };

    const kickUser = (name) => {
        if (localStorage.getItem("userRole") !== "teacher") return;
        if (!name || name === "Teacher") return;
        socket.emit("kick-student", { name });
    };

    return (
        <>
            <div className="fixed bottom-6 right-6 z-50">
                <button
                    onClick={() => setOpen(v => !v)}
                    className="bg-purple-600 text-white p-3 rounded-full shadow-lg hover:bg-purple-700 transition"
                >
                    <FiMessageSquare size={24} />
                </button>
            </div>

            {open && (
                <div className="fixed bottom-20 right-6 w-80 md:w-96 h-[80vh] md:h-[600px] bg-white border rounded-xl shadow-2xl z-40 flex flex-col animate-slide-in">
                    <div className="flex border-b">
                        {["chat", "participants"].map(t => (
                            <button
                                key={t}
                                onClick={() => setActiveTab(t)}
                                className={`flex-1 py-2 text-sm font-medium ${
                                    activeTab === t
                                        ? "bg-purple-100 text-purple-700"
                                        : "text-gray-500 hover:bg-gray-100"
                                }`}
                            >
                                {t === "chat" ? "Chat" : "Participants"}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 p-4 overflow-hidden">
                        {activeTab === "chat" ? (
                            <div className="flex flex-col h-full">
                                <div className="flex-1 overflow-y-auto space-y-2 pb-24">
                                    {msgs.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                                            No messages yet.
                                        </div>
                                    ) : (
                                        msgs.map((m, i) => {
                                            const teacher = m.sender === "Teacher";
                                            return (
                                                <div key={i} className={`flex ${teacher ? "justify-end" : "justify-start"}`}>
                                                    <div className={`max-w-[75%] px-4 py-3 rounded-xl shadow text-sm ${
                                                        teacher
                                                            ? "bg-purple-600 text-white rounded-br-none mr-2"
                                                            : "bg-purple-100 text-purple-700 rounded-bl-none ml-2"
                                                    }`}>
                                                        <div className="font-semibold text-xs mb-1">
                                                            {m.sender}
                                                        </div>
                                                        <div className="break-words">{m.text}</div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                    <div ref={bottomRef} />
                                </div>

                                <div className="flex gap-2 p-3 border-t bg-white">
                                    <input
                                        value={text}
                                        onChange={e => setText(e.target.value)}
                                        onKeyDown={e => e.key === "Enter" && sendMessage()}
                                        placeholder="Type a message..."
                                        className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                    <button
                                        onClick={sendMessage}
                                        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                                    >
                                        <IoSend size={18} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="overflow-y-auto text-sm">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b font-semibold">
                                            <th className="py-2 text-left">Name</th>
                                            {localStorage.getItem("userRole") === "teacher" && (
                                                <th className="py-2 text-right">Action</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map((u, i) => (
                                            <tr key={i} className="border-b">
                                                <td className="py-2">{u}</td>
                                                {localStorage.getItem("userRole") === "teacher" && (
                                                    <td className="py-2 text-right">
                                                        <button
                                                            onClick={() => {
                                                                if (window.confirm(`Kick ${u}?`)) kickUser(u);
                                                            }}
                                                            className="text-red-500 hover:underline"
                                                        >
                                                            Kick
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                .animate-slide-in {
                    animation: slide-in .3s ease-out;
                }
                @keyframes slide-in {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </>
    );
};

export default ChatSidebar;
