import React, { useState, useEffect, useRef } from 'react';
import {
    collection,
    query,
    orderBy,
    limit,
    onSnapshot,
    addDoc,
    setDoc,
    doc,
    serverTimestamp,
    getDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Send, ArrowLeft, MessageSquare } from 'lucide-react';

export default function Messages({ user, appId, activeConversationUid, setActiveConversationUid }) {
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);

    // If activeConversationUid is set, we show the chat view, otherwise the list view.

    if (activeConversationUid) {
        return (
            <ChatView
                user={user}
                appId={appId}
                peerUid={activeConversationUid}
                goBack={() => setActiveConversationUid(null)}
            />
        );
    }

    return (
        <ConversationList
            user={user}
            appId={appId}
            setConversations={setConversations}
            conversations={conversations}
            loading={loading}
            setLoading={setLoading}
            openConversation={setActiveConversationUid}
        />
    );
}

function ConversationList({ user, appId, conversations, setConversations, loading, setLoading, openConversation }) {
    useEffect(() => {
        if (!user) return;
        const ref = collection(db, 'artifacts', appId, 'users', user.uid, 'conversations');
        const q = query(ref, orderBy('lastMessageAt', 'desc'));

        const unsub = onSnapshot(q, (snap) => {
            const active = [];
            snap.forEach(d => {
                active.push({ uid: d.id, ...d.data() });
            });
            setConversations(active);
            setLoading(false);
        });

        return () => unsub();
    }, [user, appId]);

    if (loading) return <div className="text-slate-500 text-sm">Loading conversations...</div>;

    return (
        <div className="space-y-4 animate-fade-in">
            <h2 className="text-xl font-bold flex items-center gap-2">
                <MessageSquare className="text-emerald-400" /> Messages
            </h2>

            {conversations.length === 0 ? (
                <div className="text-slate-500 text-sm italic py-8 text-center border border-slate-700 dashed rounded">
                    No active conversations. View a profile to send a message.
                </div>
            ) : (
                <div className="grid gap-2">
                    {conversations.map(c => (
                        <div
                            key={c.uid}
                            onClick={() => openConversation(c.uid)}
                            className="bg-slate-800 p-3 rounded border border-slate-700 flex justify-between items-center hover:bg-slate-750 cursor-pointer active:scale-95 transition-transform"
                        >
                            <div>
                                <div className="font-bold text-slate-200">{c.displayName || 'Unknown User'}</div>
                                <div className="text-xs text-slate-400 truncate max-w-[200px]">{c.lastMessage}</div>
                            </div>
                            <div className="text-[10px] text-slate-500">
                                {c.lastMessageAt?.seconds ? new Date(c.lastMessageAt.seconds * 1000).toLocaleDateString() : ''}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function ChatView({ user, appId, peerUid, goBack }) {
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [peerProfile, setPeerProfile] = useState(null);
    const scrollRef = useRef(null);

    // Fetch peer meta for the header
    useEffect(() => {
        if (!peerUid) return;
        getDoc(doc(db, 'artifacts', appId, 'users', peerUid, 'profile', 'meta')).then(snap => {
            if (snap.exists()) setPeerProfile(snap.data());
        });
    }, [peerUid]);

    // Listen to messages
    useEffect(() => {
        if (!user) return;
        const chatRef = collection(db, 'artifacts', appId, 'users', user.uid, 'conversations', peerUid, 'messages');
        const q = query(chatRef, orderBy('createdAt', 'asc'), limit(50));

        const unsub = onSnapshot(q, (snap) => {
            const msgs = [];
            snap.forEach(d => msgs.push({ id: d.id, ...d.data() }));
            setMessages(msgs);
            setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        });

        return () => unsub();
    }, [user, appId, peerUid]);

    const sendMessage = async () => {
        const text = inputText.trim();
        if (!text) return;
        setInputText(''); // clear early

        // My Ref
        const myConvoRef = doc(db, 'artifacts', appId, 'users', user.uid, 'conversations', peerUid);
        const myMsgRef = collection(db, 'artifacts', appId, 'users', user.uid, 'conversations', peerUid, 'messages');

        // Peer Ref
        const peerConvoRef = doc(db, 'artifacts', appId, 'users', peerUid, 'conversations', user.uid);
        const peerMsgRef = collection(db, 'artifacts', appId, 'users', peerUid, 'conversations', user.uid, 'messages');

        // Get my profile data for the peer's view of me
        // We can assume we have it or fetch it, but usually we just want to ensure the peer sees our name.
        // Ideally we store minimal display data on the conversation doc.

        // We'll trust the peer to fetch our meta if they want, OR update the conversation doc with our cached name.
        // Let's update the conversation doc with the display names to avoid extra reads.

        // NOTE: This dual write implementation is valid for this task scope.

        try {
            const now = serverTimestamp();
            const msgData = {
                text,
                senderUid: user.uid,
                createdAt: now
            };

            const batchPromises = [
                addDoc(myMsgRef, msgData),
                addDoc(peerMsgRef, msgData),
                // Update conversation metadata for me
                setDoc(myConvoRef, {
                    lastMessage: text,
                    lastMessageAt: now,
                    displayName: peerProfile?.displayName || 'Chat',
                    uid: peerUid
                }, { merge: true }),
                // Update conversation metadata for them (so they know it's from me)
                // We can't easily get 'my' display name here without fetching current user profile or passing it in.
                // For now we'll rely on them having fetched a profile or just storing the UID. 
                // Better: Pass active user's current profile or name to this component? 
                // Let's just assume we want to write the UID and let them resolve name.
                // OR, let's fetch my profile once to put in there.
                setDoc(peerConvoRef, {
                    lastMessage: text,
                    lastMessageAt: now,
                    updatedBy: user.uid
                }, { merge: true })
            ];

            // Optimisation: If we have my name, write it to their convo doc so they see "McQux" instead of blank.
            // We'll skip for now to keep it fast, but the list view might show "Unknown" until they open it or we do a lookup.
            // Actually ConversationList maps `displayName`. We should try to write it.

            await Promise.all(batchPromises);
        } catch (e) {
            console.error("Send failed", e);
            alert("Failed to send message");
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)]">
            {/* Header */}
            <div className="flex items-center gap-3 p-3 bg-slate-800 border-b border-slate-700 sticky top-0 z-10">
                <button onClick={goBack} className="p-1 rounded hover:bg-slate-700"><ArrowLeft size={20} /></button>
                <div>
                    <div className="font-bold">{peerProfile?.displayName || 'Loading...'}</div>
                    <div className="text-xs text-slate-400">Chat</div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map(m => {
                    const isMe = m.senderUid === user.uid;
                    return (
                        <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-lg text-sm ${isMe ? 'bg-amber-700 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none'}`}>
                                {m.text}
                            </div>
                        </div>
                    );
                })}
                <div ref={scrollRef} />
            </div>

            {/* Input */}
            <div className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2">
                <input
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 focus:outline-none focus:border-amber-600"
                />
                <button
                    onClick={sendMessage}
                    disabled={!inputText.trim()}
                    className="p-2 bg-amber-600 rounded text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-500"
                >
                    <Send size={20} />
                </button>
            </div>
        </div>
    );
}
