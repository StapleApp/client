import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Send, Hash, Smile, Pencil, Trash2, Check, X, ChevronDown, Reply, Menu, Pin, PinOff, Search, Loader2, Users } from "lucide-react";
import toast from "react-hot-toast";
import EmojiPicker from "emoji-picker-react";
import { useAuth } from "../../context/AuthContext";
import { useMobileMenu } from "../../context/MobileMenuContext";
import {
  sendMessage,
  listenMessages,
  editMessage,
  deleteMessage,
  setMessagePinned,
  getPinnedMessages,
  toggleReaction,
  searchMessages,
  markChannelRead,
  getChannelLastRead,
} from "../../services/messageService";
import { getServerMemberProfiles } from "../../services/serverService";
import MessageContent from "./MessageContent";
import GifPicker from "./GifPicker";
import ProfilePanel from "../layout/ProfilePanel";
import { getUser } from "../../services/userService";
import { createNotification } from "../../services/notificationService";
import { socket } from "../../config/socket";

const formatTime = (createdAt) => {
  if (!createdAt?.seconds) return "";
  return new Date(createdAt.seconds * 1000).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Mesaj gönderildikten sonra düzenleme yalnızca ilk 10 dakika içinde yapılabilir.
// createdAt bilinmiyorsa (henüz sunucudan dönmemiş yeni mesaj) iyimser davran.
const EDIT_WINDOW_MS = 10 * 60 * 1000;
const canStillEdit = (createdAt) => {
  const ms = (createdAt?.seconds || 0) * 1000;
  if (!ms) return true;
  return Date.now() - ms < EDIT_WINDOW_MS;
};

const isSameDay = (a, b) => {
  if (!a?.seconds || !b?.seconds) return false;
  const da = new Date(a.seconds * 1000);
  const db = new Date(b.seconds * 1000);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
};

// Gün ayracı etiketi: Bugün / Dün / tam tarih
const dayLabel = (createdAt) => {
  if (!createdAt?.seconds) return "";
  const d = new Date(createdAt.seconds * 1000);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const secToDay = { seconds: createdAt.seconds };
  if (isSameDay(secToDay, { seconds: Math.floor(today.getTime() / 1000) }))
    return "Bugün";
  if (isSameDay(secToDay, { seconds: Math.floor(yesterday.getTime() / 1000) }))
    return "Dün";
  return d.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

/**
 * Unified chat panel used by both DMs and server channels.
 *
 * Props:
 *   context      - { serverId, channelId } OR { groupId }
 *   channelName  - display name for the header
 *   headerIcon   - optional React node for the header (e.g. avatar img)
 *   headerUserId - optional user id; makes the header icon/name open the profile card
 *   showHeader   - whether to show the header bar (default true)
 */
const ChatPanel = ({ context, channelName, headerIcon, headerUserId, showHeader = true, memberColors, canModerate = false, jumpToMessageId = null, serverData, showMembers, onToggleMembers }) => {
  const { userData } = useAuth();
  const mobileMenu = useMobileMenu();
  const isMobile = mobileMenu?.isMobile ?? false;
  const setIsOpen = mobileMenu?.setIsOpen ?? (() => {});
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [contextMenu, setContextMenu] = useState(null); // { x, y, message }
  const [pinnedMessages, setPinnedMessages] = useState([]); // en yeni → en eski
  const [pinIndex, setPinIndex] = useState(0); // üst çubukta sıradaki sabit mesaj

  // Kanal içi arama
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState(null); // null = arama yapılmadı
  const [searching, setSearching] = useState(false);

  // @bahsetme: sunucu üyeleri + aktif sorgu (null = popup kapalı)
  const [members, setMembers] = useState([]);
  const [mentionQuery, setMentionQuery] = useState(null);

  // Okunmamış "Yeni" ayracı: kanal başına bir kez hesaplanır
  const [lastReadAt, setLastReadAt] = useState(undefined); // undefined = yükleniyor
  const [unreadMarkerId, setUnreadMarkerId] = useState(null);
  const unreadDoneRef = useRef(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null); // { id, senderName, content, type }
  const [highlightId, setHighlightId] = useState(null); // kısa vurgu için

  // Profile card popup state
  const [selectedUser, setSelectedUser] = useState(null);
  const [isProfileCardExpanded, setIsProfileCardExpanded] = useState(false);
  const [profileCardPosition, setProfileCardPosition] = useState({ top: 0, left: 0 });

  const messagesEndRef = useRef(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const listenerRef = useRef(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const isInitialLoad = useRef(true);

  // "Yazıyor..." durumu (socket üzerinden, DB'den bağımsız)
  const [typingUsers, setTypingUsers] = useState({}); // userId -> nickName
  const typingExpireRef = useRef({});
  const myStopRef = useRef(null);
  const channelId = context?.channelId || context?.groupId;

  useEffect(() => {
    if (!channelId || !userData?.userID) return;
    if (!socket.connected) socket.connect();
    socket.emit("chat:join", { channelId });

    const onTyping = ({ userId, nickName, isTyping }) => {
      if (!userId || userId === userData.userID) return;
      setTypingUsers((prev) => {
        const next = { ...prev };
        if (isTyping) next[userId] = nickName || "Biri";
        else delete next[userId];
        return next;
      });
      if (isTyping) {
        clearTimeout(typingExpireRef.current[userId]);
        typingExpireRef.current[userId] = setTimeout(() => {
          setTypingUsers((prev) => {
            const n = { ...prev };
            delete n[userId];
            return n;
          });
        }, 5000);
      }
    };
    socket.on("chat:typing", onTyping);

    const expireRef = typingExpireRef.current;
    return () => {
      socket.emit("chat:typing", {
        channelId,
        userId: userData.userID,
        nickName: userData.nickName,
        isTyping: false,
      });
      socket.emit("chat:leave", { channelId });
      socket.off("chat:typing", onTyping);
      clearTimeout(myStopRef.current);
      Object.values(expireRef).forEach(clearTimeout);
      typingExpireRef.current = {};
      setTypingUsers({});
    };
  }, [channelId, userData?.userID, userData?.nickName]);

  const emitTyping = () => {
    if (!channelId || !userData?.userID) return;
    if (!socket.connected) socket.connect();
    socket.emit("chat:typing", {
      channelId,
      userId: userData.userID,
      nickName: userData.nickName,
      isTyping: true,
    });
    clearTimeout(myStopRef.current);
    myStopRef.current = setTimeout(() => {
      socket.emit("chat:typing", {
        channelId,
        userId: userData.userID,
        nickName: userData.nickName,
        isTyping: false,
      });
    }, 2500);
  };

  // Yanıt/alıntı için kısa içerik özeti
  const previewText = (msg) => {
    if (!msg) return "";
    if (msg.type === "gif") return "GIF";
    const t = (msg.content || "").replace(/\n/g, " ");
    return t.length > 60 ? t.slice(0, 60) + "…" : t;
  };

  const startReply = (message) => {
    setEditingId(null);
    setConfirmDeleteId(null);
    setReplyingTo({
      id: message.id,
      senderId: message.senderId, // yanıt bildirimi için
      senderName: message.senderName,
      content: message.content,
      type: message.type,
    });
    inputRef.current?.focus();
  };

  // Alıntıya tıklayınca yanıtlanan mesaja kaydır + kısa vurgula
  const scrollToMessage = async (id) => {
    let el = document.getElementById(`msg-${id}`);
    if (!el && listenerRef.current?.loadUntilMessage) {
      // Mesaj listede yoksa, veritabanından hedef mesaja kadar olan aralığı yükle
      toast.loading("Eski mesajlar yükleniyor...", { id: "jump-loading" });
      const success = await listenerRef.current.loadUntilMessage(id);
      toast.dismiss("jump-loading");
      if (success) {
        // DOM'un render edilip elementin eklenmesini bekleyen döngü
        for (let i = 0; i < 20; i++) {
          await new Promise((resolve) => setTimeout(resolve, 50));
          el = document.getElementById(`msg-${id}`);
          if (el) break;
        }
      } else {
        toast.error("Orijinal mesaj silinmiş veya bulunamadı.");
        return;
      }
    }

    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightId(id);
      setTimeout(() => setHighlightId((cur) => (cur === id ? null : cur)), 1500);
    } else {
      toast.error("Mesaj yüklenemedi.");
    }
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
    el.style.overflowY = el.scrollHeight > 160 ? "auto" : "hidden";
    detectMention(e.target.value, el.selectionStart);
    emitTyping();
  };

  const handleInputKeyDown = (e) => {
    // Mention popup açıkken: Tab/Enter ilk adayı seçer, Escape kapatır
    if (mentionQuery !== null && mentionMatches.length > 0) {
      if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        insertMention(mentionMatches[0]);
        return;
      }
      if (e.key === "Escape") {
        setMentionQuery(null);
        return;
      }
    }
    // Enter gönderir, Shift+Enter yeni satır
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Escape yanıtı iptal eder (metin boşken)
    if (e.key === "Escape" && replyingTo && !newMessage) {
      setReplyingTo(null);
    }
  };

  const handleAvatarClick = async (e, senderId) => {
    e.stopPropagation();
    if (!senderId) return;

    // Find the message row container and locate the avatar image to use as the absolute anchor
    const messageRow = e.currentTarget.closest(".group");
    const avatarImg = messageRow ? messageRow.querySelector("img") : null;
    const anchorElement = avatarImg || e.currentTarget;
    const rect = anchorElement.getBoundingClientRect();

    // Fetch detailed profile
    const profile = await getUser(senderId);
    if (!profile) return;

    setProfileCardPosition({
      top: rect.top,
      left: rect.right,
    });

    setSelectedUser(profile);
    setIsProfileCardExpanded(true);
  };

  // Kaydırma dibe yakın mı? (auto-scroll ve buton görünürlüğü için)
  const isNearBottom = () => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  const scrollToBottom = (behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const loadOlderMessages = async () => {
    if (!listenerRef.current || loadingOlder || !hasMore) return;

    setLoadingOlder(true);

    const container = scrollRef.current;
    const previousScrollHeight = container ? container.scrollHeight : 0;
    const previousScrollTop = container ? container.scrollTop : 0;

    try {
      const loadedCount = await listenerRef.current.loadMore();
      if (loadedCount < 50) {
        setHasMore(false);
      }

      // Scroll sabitleme (Scroll Anchoring):
      // DOM güncellendikten sonra scroll konumunu koru
      requestAnimationFrame(() => {
        if (container) {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop = previousScrollTop + (newScrollHeight - previousScrollHeight);
        }
      });
    } catch (e) {
      console.error("Error loading older messages:", e);
    } finally {
      setLoadingOlder(false);
    }
  };

  // Listen to messages in real time
  useEffect(() => {
    setMessages([]);
    setEditingId(null);
    setConfirmDeleteId(null);
    setHasMore(true);
    setLoadingOlder(false);
    isInitialLoad.current = true; // reset initial load flag
    if (!context) return;
    const hasServer = context.serverId && context.channelId;
    const hasGroup = context.groupId;
    if (!hasServer && !hasGroup) return;

    const listener = listenMessages(context, (msgs, hasMoreMsgs) => {
      setMessages(msgs);
      if (hasMoreMsgs !== undefined) {
        setHasMore(hasMoreMsgs);
      }
    });
    listenerRef.current = listener;
    return () => {
      if (listener) listener.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context?.serverId, context?.channelId, context?.groupId]);

  // Yeni mesajda veya ilk yüklemede otomatik kaydır
  useEffect(() => {
    if (isInitialLoad.current) {
      if (messages.length > 0) {
        setTimeout(() => {
          scrollToBottom("auto");
          isInitialLoad.current = false;
        }, 50);
      }
    } else {
      if (isNearBottom()) scrollToBottom();
    }
  }, [messages]);

  const handleScroll = () => {
    setShowScrollBtn(!isNearBottom());
    if (isProfileCardExpanded) setIsProfileCardExpanded(false);

    // En üste yakınsa ve daha fazla mesaj varsa yükle
    const el = scrollRef.current;
    if (el && el.scrollTop < 15 && hasMore && !loadingOlder) {
      loadOlderMessages();
    }
  };

  // DM ise alıcıya kalıcı "message" bildirimi oluştur (sunucu kanallarında headerUserId yok).
  const notifyDMRecipient = (content, type) => {
    if (!headerUserId || !userData) return;
    const preview =
      type === "gif" ? "GIF gönderdi"
      : type === "image" ? "Görsel gönderdi"
      : content.length > 40 ? content.slice(0, 40) + "…" : content;
    createNotification(headerUserId, {
      type: "message",
      from_user_id: userData.userID,
      data: {
        type: "message",
        user: userData.nickName || "Kullanıcı",
        fromUid: userData.userID,
        photo: userData.photoURL || "",
        message: preview,
      },
    });
  };

  // Sunucu kanalında mesajıma yanıt geldiyse orijinal yazara bildirim gönder.
  // (DM'lerde notifyDMRecipient zaten bildiriyor; kendine yanıtta bildirim yok.)
  const notifyReplyTarget = (reply, newMessageId, content, type) => {
    if (!context?.serverId || !reply?.senderId || !userData) return;
    if (reply.senderId === userData.userID) return;
    const preview =
      type === "gif" ? "GIF ile yanıtladı"
      : content.length > 40 ? content.slice(0, 40) + "…" : content;
    createNotification(reply.senderId, {
      type: "reply",
      from_user_id: userData.userID,
      data: {
        type: "reply",
        user: userData.nickName || "Kullanıcı",
        fromUid: userData.userID,
        photo: userData.photoURL || "",
        message: preview,
        serverId: context.serverId,
        channelId: context.channelId,
        messageId: typeof newMessageId === "string" ? newMessageId : null,
      },
    });
  };

  const handleGifSelect = async (gif) => {
    const formats = gif.media_formats || gif.media || {};
    const gifUrl = formats.gif?.url || formats.tinygif?.url || formats.mediumgif?.url || gif.url;
    if (!gifUrl || !userData) return;

    const reply = replyingTo;
    const newId = await sendMessage(context, {
      senderId: userData.userID,
      content: gifUrl,
      type: "gif",
      replyTo: reply?.id || null,
    });
    notifyDMRecipient(gifUrl, "gif");
    if (newId) notifyReplyTarget(reply, newId, gifUrl, "gif");
    setReplyingTo(null);
    setShowGifPicker(false);
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    const content = newMessage.trim();
    if (!content || !userData) return;
    setNewMessage("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.overflowY = "hidden";
    }
    // Yazıyor durumunu hemen kapat
    clearTimeout(myStopRef.current);
    if (channelId) {
      socket.emit("chat:typing", {
        channelId,
        userId: userData.userID,
        nickName: userData.nickName,
        isTyping: false,
      });
    }
    const reply = replyingTo;
    const newId = await sendMessage(context, {
      senderId: userData.userID,
      content,
      replyTo: reply?.id || null,
    });
    notifyDMRecipient(content, "text");
    if (newId) {
      notifyReplyTarget(reply, newId, content, "text");
      notifyMentions(content, newId, reply?.senderId || null);
    }
    setReplyingTo(null);
    setMentionQuery(null);
    scrollToBottom();
  };

  const handleEmojiClick = (emojiData) => {
    setNewMessage((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const startEdit = (message) => {
    if (!canStillEdit(message.createdAt)) {
      toast.error("Düzenleme süresi doldu (10 dakika)");
      return;
    }
    setConfirmDeleteId(null);
    setEditingId(message.id);
    setEditText(message.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const saveEdit = async (message) => {
    const text = editText.trim();
    if (!text || text === message.content) {
      cancelEdit();
      return;
    }
    // Düzenleme başladıktan sonra pencere kapanmış olabilir → son bir kontrol
    if (!canStillEdit(message.createdAt)) {
      cancelEdit();
      toast.error("Düzenleme süresi doldu (10 dakika)");
      return;
    }
    cancelEdit();
    await editMessage(message.id, userData.userID, text);
  };

  const confirmDelete = async (message) => {
    setConfirmDeleteId(null);
    const isOwnMsg = message.senderId === userData?.userID;
    await deleteMessage(message.id, userData.userID, { moderate: !isOwnMsg });
  };

  // Sunucu kanalında sabitleme MANAGE_MESSAGES ister; DM/grupta herkes yapabilir.
  const isServerChannel = !!context?.serverId;
  const canPin = canModerate || !isServerChannel;

  const openContextMenu = (e, message) => {
    e.preventDefault();
    e.stopPropagation(); // aynı sağ-tık'ın window kapatıcısını tetiklemesini önle
    // Menü genişlik/yüksekliğini ekran dışına taşmayacak şekilde konumla
    const MENU_W = 190;
    const MENU_H = 250; // hızlı tepki satırı dahil
    const x = Math.min(e.clientX, window.innerWidth - MENU_W - 8);
    const y = Math.min(e.clientY, window.innerHeight - MENU_H - 8);
    setEditingId(null);
    setContextMenu({ x, y, message });
  };

  const handleTogglePin = async (message) => {
    setContextMenu(null);
    await setMessagePinned(message.id, !message.pinned);
  };

  // Context menü açıkken: dışarı tıkla / Escape / kaydırma → kapat
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const onKey = (e) => e.key === "Escape" && close();
    window.addEventListener("click", close);
    window.addEventListener("contextmenu", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("contextmenu", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [contextMenu]);

  // Bildirimden gelindiyse hedef mesaja bir kez atla (mesajlar yüklendikten sonra)
  const jumpDoneRef = useRef(null);
  useEffect(() => {
    if (!jumpToMessageId || messages.length === 0) return;
    if (jumpDoneRef.current === jumpToMessageId) return;
    jumpDoneRef.current = jumpToMessageId;
    // scroll-to-bottom ilk yerleşimini bekle, sonra hedefe git
    const t = setTimeout(() => scrollToMessage(jumpToMessageId), 300);
    return () => clearTimeout(t);
  }, [jumpToMessageId, messages.length]);

  // Kanal değişince arama/mention/ayraç durumunu sıfırla + son okuma zamanını çek
  useEffect(() => {
    setSearchOpen(false);
    setSearchTerm("");
    setSearchResults(null);
    setMentionQuery(null);
    setUnreadMarkerId(null);
    setLastReadAt(undefined);
    unreadDoneRef.current = null;
    if (!channelId || !userData?.userID) return;
    getChannelLastRead(channelId, userData.userID).then(setLastReadAt);
  }, [channelId, userData?.userID]);

  // Mesajlar + son okuma zamanı hazır olunca ilk okunmamışı BİR KEZ işaretle;
  // kanal görüntülendiği sürece okundu kaydını tazele.
  useEffect(() => {
    if (!channelId || !userData?.userID || messages.length === 0) return;
    if (lastReadAt !== undefined && unreadDoneRef.current !== channelId) {
      unreadDoneRef.current = channelId;
      if (lastReadAt) {
        const t = new Date(lastReadAt).getTime();
        const firstUnread = messages.find(
          (m) =>
            m.senderId !== userData.userID &&
            (m.createdAt?.seconds || 0) * 1000 > t
        );
        setUnreadMarkerId(firstUnread?.id || null);
      }
      // lastReadAt null (ilk ziyaret) → ayraç yok
    }
    markChannelRead(channelId, userData.userID);
  }, [channelId, messages, lastReadAt, userData?.userID]);

  // Sunucu kanalıysa üye profillerini çek (mention otomatik tamamlama)
  useEffect(() => {
    if (!context?.serverId) {
      setMembers([]);
      return;
    }
    let cancelled = false;
    getServerMemberProfiles(context.serverId).then((list) => {
      if (!cancelled) setMembers(list);
    });
    return () => {
      cancelled = true;
    };
  }, [context?.serverId]);

  // Arama: Enter ile çalışır
  const runSearch = async (e) => {
    if (e) e.preventDefault();
    const q = searchTerm.trim();
    if (q.length < 2) return;
    setSearching(true);
    const res = await searchMessages(channelId, q);
    setSearching(false);
    setSearchResults(res);
  };

  // Tepki ekle/kaldır
  const handleReact = async (message, emoji) => {
    setContextMenu(null);
    if (!userData?.userID) return;
    const hasReacted = (message.reactions || []).some(
      (r) => r.userId === userData.userID && r.emoji === emoji
    );
    await toggleReaction(message.id, userData.userID, emoji, hasReacted);
  };

  // Mention popup: imleçten geriye "@token" ara
  const detectMention = (value, caret) => {
    const before = value.slice(0, caret ?? value.length);
    const m = before.match(/(^|\s)@([\p{L}\p{N}_]*)$/u);
    setMentionQuery(m ? m[2].toLowerCase() : null);
  };

  const mentionMatches =
    mentionQuery === null
      ? []
      : members
          .filter(
            (u) =>
              u.userID !== userData?.userID &&
              u.nickName.toLowerCase().includes(mentionQuery)
          )
          .slice(0, 6);

  const insertMention = (user) => {
    const el = inputRef.current;
    const caret = el?.selectionStart ?? newMessage.length;
    const before = newMessage
      .slice(0, caret)
      .replace(/@([\p{L}\p{N}_]*)$/u, `@${user.nickName} `);
    setNewMessage(before + newMessage.slice(caret));
    setMentionQuery(null);
    el?.focus();
  };

  // İçerikte @Nick geçen üyelere bildirim (yanıt hedefi hariç — o zaten reply alır)
  const notifyMentions = (content, newMessageId, replyTargetId) => {
    if (!context?.serverId || !members.length || !userData) return;
    const preview = content.length > 40 ? content.slice(0, 40) + "…" : content;
    const seen = new Set();
    members.forEach((u) => {
      if (u.userID === userData.userID || u.userID === replyTargetId) return;
      if (seen.has(u.userID)) return;
      if (!content.includes(`@${u.nickName}`)) return;
      seen.add(u.userID);
      createNotification(u.userID, {
        type: "mention",
        from_user_id: userData.userID,
        data: {
          type: "mention",
          user: userData.nickName || "Kullanıcı",
          fromUid: userData.userID,
          photo: userData.photoURL || "",
          message: preview,
          serverId: context.serverId,
          channelId: context.channelId,
          messageId: typeof newMessageId === "string" ? newMessageId : null,
        },
      });
    });
  };

  // Sabitli mesajlar: kanal değişince ve yüklü mesajların pin durumu değişince yenile
  const pinnedSig = messages
    .filter((m) => m.pinned)
    .map((m) => m.id)
    .sort()
    .join(",");
  useEffect(() => {
    let cancelled = false;
    getPinnedMessages(channelId).then((list) => {
      if (cancelled) return;
      setPinnedMessages(list);
      setPinIndex(0);
    });
    return () => {
      cancelled = true;
    };
  }, [channelId, pinnedSig]);

  const currentPin = pinnedMessages.length
    ? pinnedMessages[pinIndex % pinnedMessages.length]
    : null;

  const handlePinBarClick = () => {
    if (!currentPin) return;
    scrollToMessage(currentPin.id);
    // Sonraki sabit mesaja geç (en yeni → en eski, döngüsel)
    setPinIndex((i) => (i + 1) % pinnedMessages.length);
  };

  return (
    <div className="relative flex flex-col h-full bg-[var(--secondary-bg)] text-[var(--secondary-text)]">
      {/* Header */}
      {showHeader && (
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[var(--primary-border)]/30 bg-[var(--primary-bg)]/80 backdrop-blur-md z-10 shrink-0">
          {isMobile && (
            <button
              onClick={() => setIsOpen(true)}
              className="p-1.5 rounded-lg hover:bg-[var(--secondary-bg)] transition-colors mr-1 text-[var(--secondary-text)]"
              aria-label="Menüyü Aç"
            >
              <Menu size={20} />
            </button>
          )}
          {headerUserId ? (
            <span
              className="flex items-center gap-2 cursor-pointer hover:opacity-85 transition-opacity"
              onClick={(e) => handleAvatarClick(e, headerUserId)}
            >
              {headerIcon || (
                <Hash className="w-5 h-5 text-[var(--quaternary-text)]" />
              )}
              <h2 className="text-lg font-bold text-[var(--secondary-text)] hover:underline">
                {channelName}
              </h2>
            </span>
          ) : (
            <>
              {headerIcon || (
                <Hash className="w-5 h-5 text-[var(--quaternary-text)]" />
              )}
              <h2 className="text-lg font-bold text-[var(--secondary-text)]">
                {channelName}
              </h2>
            </>
          )}
          <button
            onClick={() => {
              setSearchOpen((v) => !v);
              setSearchResults(null);
              setSearchTerm("");
            }}
            title="Mesajlarda ara"
            aria-label="Mesajlarda ara"
            className={`ml-auto p-1.5 rounded-lg transition-colors ${
              searchOpen
                ? "bg-[var(--tertiary-bg)] text-[var(--tertiary-text)]"
                : "text-[var(--primary-text)] hover:text-[var(--secondary-text)] hover:bg-[var(--secondary-bg)]"
            }`}
          >
            <Search size={18} />
          </button>

          {context?.serverId && onToggleMembers && (
            <button
              onClick={onToggleMembers}
              title={showMembers ? "Üyeleri Gizle" : "Üyeleri Göster"}
              aria-label={showMembers ? "Üyeleri Gizle" : "Üyeleri Göster"}
              className={`p-1.5 rounded-lg transition-colors ml-2 ${
                showMembers
                  ? "bg-[var(--tertiary-bg)] text-[var(--tertiary-text)]"
                  : "text-[var(--primary-text)] hover:text-[var(--secondary-text)] hover:bg-[var(--secondary-bg)]"
              }`}
            >
              <Users size={18} />
            </button>
          )}
        </div>
      )}

      {/* Kanal içi arama paneli */}
      {searchOpen && (
        <div className="border-b-2 border-[var(--primary-border)] bg-[var(--primary-bg)] px-4 py-2">
          <form onSubmit={runSearch} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--primary-text)]"
              />
              <input
                autoFocus
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setSearchOpen(false)}
                placeholder="Bu kanalda ara... (Enter)"
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[var(--secondary-bg)] text-[var(--secondary-text)] border border-[var(--primary-border)] focus:outline-none focus:border-[var(--tertiary-border)] text-sm placeholder:text-[var(--primary-text)]"
              />
            </div>
            <button
              type="submit"
              disabled={searching || searchTerm.trim().length < 2}
              className="px-3 py-1.5 rounded-lg bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] text-xs font-semibold hover:bg-[var(--quaternary-bg)] disabled:opacity-50 transition-colors"
            >
              {searching ? <Loader2 size={14} className="animate-spin" /> : "Ara"}
            </button>
          </form>
          {searchResults !== null && (
            <div className="custom-scrollbar mt-2 max-h-56 overflow-y-auto flex flex-col gap-0.5">
              {searchResults.length === 0 ? (
                <p className="text-xs text-[var(--primary-text)] py-2 px-1">
                  Sonuç bulunamadı.
                </p>
              ) : (
                searchResults.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => scrollToMessage(r.id)}
                    className="flex items-baseline gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-[var(--secondary-bg)] transition-colors"
                  >
                    <span className="text-xs font-semibold text-[var(--quaternary-text)] shrink-0">
                      {r.senderName}
                    </span>
                    <span className="text-xs text-[var(--secondary-text)] truncate flex-1">
                      {r.type === "gif" ? "GIF" : r.content}
                    </span>
                    <span className="text-[10px] text-[var(--primary-text)] shrink-0">
                      {r.createdAt
                        ? new Date(r.createdAt).toLocaleDateString("tr-TR")
                        : ""}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Sabitli mesaj çubuğu (WhatsApp tarzı) — header altında */}
      {currentPin && (
        <button
          onClick={handlePinBarClick}
          className="flex items-center gap-2.5 w-full px-4 py-2 bg-[var(--primary-bg)] border-b-2 border-[var(--primary-border)] hover:bg-[var(--primary-bg)]/70 transition-colors text-left"
          title="Sabitlenen mesaja git"
        >
          <Pin size={15} className="shrink-0 text-[var(--secondary-text)]" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--secondary-text)]">
                Sabitlenen mesaj
              </span>
              {pinnedMessages.length > 1 && (
                <span className="text-[10px] text-[var(--primary-text)]">
                  {(pinIndex % pinnedMessages.length) + 1}/{pinnedMessages.length}
                </span>
              )}
            </div>
            <div className="text-xs text-[var(--primary-text)] truncate">
              <span className="font-semibold text-[var(--secondary-text)]">
                {currentPin.senderName}:
              </span>{" "}
              {previewText(currentPin)}
            </div>
          </div>
          {pinnedMessages.length > 1 && (
            <ChevronDown size={15} className="shrink-0 text-[var(--primary-text)] -rotate-90" />
          )}
        </button>
      )}

      {/* Messages — Discord tarzı: sola hizalı, baloncuksuz, gruplanmış */}
      <div className="flex-1 overflow-y-auto py-4 relative" ref={scrollRef} onScroll={handleScroll}>
        {loadingOlder && (
          <div className="flex items-center justify-center py-2 text-xs text-[var(--primary-text)] gap-2">
            <span className="w-4 h-4 border-2 border-[var(--tertiary-bg)] border-t-transparent rounded-full animate-spin" />
            <span>Geçmiş mesajlar yükleniyor...</span>
          </div>
        )}
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[var(--primary-text)] text-sm gap-2">
            <Hash className="w-8 h-8 text-[var(--quaternary-text)]" />
            <span>İlk mesajı sen gönder!</span>
          </div>
        ) : (
          messages.map((message, index) => {
            const prev = messages[index - 1];
            const showDateDivider = !prev || !isSameDay(prev.createdAt, message.createdAt);
            const grouped =
              prev && prev.senderId === message.senderId && !showDateDivider;
            const isOwn = message.senderId === userData?.userID;
            const isEditing = editingId === message.id;
            return (
              <div key={message.id || `msg-${index}`}>
                {showDateDivider && message.createdAt && (
                  <div className="flex items-center gap-3 px-4 my-4 select-none">
                    <div className="flex-1 h-px bg-[var(--primary-border)]" />
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--primary-text)]">
                      {dayLabel(message.createdAt)}
                    </span>
                    <div className="flex-1 h-px bg-[var(--primary-border)]" />
                  </div>
                )}

                {/* Okunmamış "Yeni" ayracı */}
                {unreadMarkerId === message.id && (
                  <div className="flex items-center gap-2 px-4 my-1 select-none">
                    <div className="flex-1 h-px bg-red-500/70" />
                    <span className="text-[10px] font-bold uppercase tracking-wide text-red-400">
                      Yeni
                    </span>
                  </div>
                )}

                <div
                  id={`msg-${message.id}`}
                  data-is-own={isOwn}
                  onContextMenu={(e) => openContextMenu(e, message)}
                  className={`group relative flex items-start gap-3 px-4 transition-colors ${
                    message.pinned
                      ? "bg-[var(--tertiary-bg)]/10 border-l-2 border-[var(--tertiary-border)]"
                      : highlightId === message.id
                      ? "bg-[var(--tertiary-bg)]/30"
                      : "hover:bg-[var(--primary-bg)]/40"
                  } ${grouped ? "mt-0.5 py-0.5" : "mt-4 py-0.5"}`}
                >
                  {/* Avatar sütunu (sabit genişlik) */}
                  <div className="w-10 shrink-0 relative">
                    {!grouped ? (
                      <img
                        src={message.senderPhoto || "/defaults/avatars/1.png"}
                        alt=""
                        className="w-10 h-10 rounded-full mt-0.5 cursor-pointer hover:opacity-85 transition-opacity"
                        onClick={(e) => handleAvatarClick(e, message.senderId)}
                      />
                    ) : (
                      <span className="absolute right-1 top-0.5 hidden group-hover:block text-[10px] text-[var(--primary-text)] whitespace-nowrap">
                        {formatTime(message.createdAt)}
                      </span>
                    )}
                  </div>

                  {/* İçerik */}
                  <div className="min-w-0 flex-1 text-left">
                    {message.pinned && (
                      <div className="flex items-center gap-1 mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--secondary-text)]">
                        <Pin size={10} className="shrink-0" /> Sabitlendi
                      </div>
                    )}
                    {/* Yanıtlanan mesaj alıntısı */}
                    {message.replyPreview !== null &&
                      message.replyPreview !== undefined && (
                        <button
                          onClick={() => scrollToMessage(message.replyPreview.id)}
                          className="flex items-center gap-1.5 mb-0.5 max-w-full text-left group/reply"
                          title="Yanıtlanan mesaja git"
                        >
                          <Reply
                            size={12}
                            className="shrink-0 text-[var(--primary-text)] -scale-x-100"
                          />
                          <span className="text-xs font-semibold text-[var(--quaternary-text)] shrink-0">
                            {message.replyPreview.senderName}
                          </span>
                          <span className="text-xs text-[var(--primary-text)] truncate group-hover/reply:text-[var(--secondary-text)] transition-colors">
                            {previewText(message.replyPreview)}
                          </span>
                        </button>
                      )}
                    {message.replyTo && !message.replyPreview && (
                      <div className="flex items-center gap-1.5 mb-0.5 text-xs text-[var(--primary-text)] italic">
                        <Reply size={12} className="shrink-0 -scale-x-100" />
                        silinmiş mesaj
                      </div>
                    )}

                    {!grouped && (
                      <div className="flex items-baseline gap-2">
                        <span
                          className="text-sm font-semibold cursor-pointer hover:underline"
                          style={{
                            color:
                              memberColors?.[message.senderId] ||
                              "var(--secondary-text)",
                          }}
                          onClick={(e) => handleAvatarClick(e, message.senderId)}
                        >
                          {message.senderName}
                        </span>
                        <span className="text-xs text-[var(--primary-text)]">
                          {formatTime(message.createdAt)}
                        </span>
                      </div>
                    )}

                    {isEditing ? (
                      <div className="flex items-center gap-2 mt-0.5">
                        <input
                          autoFocus
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(message);
                            if (e.key === "Escape") cancelEdit();
                          }}
                          className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--primary-bg)] text-[var(--secondary-text)] border border-[var(--primary-border)] focus:outline-none focus:border-[var(--tertiary-border)] text-sm"
                        />
                        <button
                          onClick={() => saveEdit(message)}
                          className="p-1.5 rounded-lg bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] hover:bg-[var(--quaternary-bg)] transition-colors"
                          title="Kaydet"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-1.5 rounded-lg bg-[var(--primary-bg)] text-[var(--secondary-text)] hover:text-[var(--quaternary-text)] transition-colors"
                          title="İptal"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="text-sm text-[var(--secondary-text)] break-words">
                        <MessageContent content={message.content} />
                        {message.editedAt && (
                          <span className="ml-1.5 text-[10px] text-[var(--primary-text)] align-baseline">
                            (düzenlendi)
                          </span>
                        )}
                      </div>
                    )}

                    {/* Emoji tepkileri */}
                    {!isEditing && (message.reactions || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(
                          message.reactions.reduce((acc, r) => {
                            (acc[r.emoji] = acc[r.emoji] || []).push(r.userId);
                            return acc;
                          }, {})
                        ).map(([emoji, users]) => {
                          const mine = users.includes(userData?.userID);
                          return (
                            <button
                              key={emoji}
                              onClick={() => handleReact(message, emoji)}
                              title={mine ? "Tepkini kaldır" : "Tepki ver"}
                              className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${
                                mine
                                  ? "bg-[var(--tertiary-bg)]/25 border-[var(--tertiary-border)] text-[var(--secondary-text)]"
                                  : "bg-[var(--primary-bg)] border-[var(--primary-border)] text-[var(--primary-text)] hover:border-[var(--tertiary-border)]"
                              }`}
                            >
                              <span className="text-sm leading-none">{emoji}</span>
                              <span className="font-semibold">{users.length}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Hover aksiyonları: Yanıtla herkese, Düzenle/Sil sahibine */}
                  {!isEditing && (
                    <div className="absolute right-4 -top-3">
                      {confirmDeleteId === message.id ? (
                        <div className="flex items-center gap-1 rounded-lg border border-[var(--primary-border)] bg-[var(--primary-bg)] px-2 py-1 shadow-lg">
                          <span className="text-[11px] text-[var(--secondary-text)]">
                            Silinsin mi?
                          </span>
                          <button
                            onClick={() => confirmDelete(message)}
                            className="text-[11px] font-semibold text-red-400 hover:text-red-300 px-1"
                          >
                            Evet
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-[11px] text-[var(--primary-text)] hover:text-[var(--secondary-text)] px-1"
                          >
                            Hayır
                          </button>
                        </div>
                      ) : (
                        <div className="hidden group-hover:flex items-center gap-0.5 rounded-lg border border-[var(--primary-border)] bg-[var(--primary-bg)] px-1 py-0.5 shadow-lg">
                          <button
                            onClick={() => startReply(message)}
                            className="p-1 rounded text-[var(--secondary-text)] hover:text-[var(--quaternary-text)] transition-colors"
                            title="Yanıtla"
                          >
                            <Reply size={13} />
                          </button>
                          {isOwn && message.type !== "gif" && canStillEdit(message.createdAt) && (
                            <button
                              onClick={() => startEdit(message)}
                              className="p-1 rounded text-[var(--secondary-text)] hover:text-[var(--quaternary-text)] transition-colors"
                              title="Düzenle"
                            >
                              <Pencil size={13} />
                            </button>
                          )}
                          {(isOwn || canModerate) && (
                            <button
                              onClick={() => {
                                setEditingId(null);
                                setConfirmDeleteId(message.id);
                              }}
                              className="p-1 rounded text-red-400 hover:text-red-300 transition-colors"
                              title="Sil"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Aşağı kaydır butonu */}
      {showScrollBtn && (
        <button
          onClick={() => scrollToBottom()}
          className="absolute bottom-24 right-6 z-10 p-2 rounded-full bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] shadow-lg hover:bg-[var(--quaternary-bg)] transition-colors"
          title="En alta in"
        >
          <ChevronDown size={18} />
        </button>
      )}

      {/* "Yazıyor..." göstergesi */}
      {Object.keys(typingUsers).length > 0 && (
        <div className="px-5 py-1 text-xs text-[var(--primary-text)] italic bg-[var(--primary-bg)]">
          {Object.values(typingUsers).slice(0, 3).join(", ")}
          {Object.keys(typingUsers).length === 1 ? " yazıyor..." : " yazıyorlar..."}
        </div>
      )}

      {/* Yanıt barı — hangi mesaja cevap verildiğini gösterir */}
      {replyingTo && (
        <div className="flex items-center gap-2 px-5 py-2 border-t-2 border-[var(--primary-border)] bg-[var(--primary-bg)]">
          <Reply size={14} className="shrink-0 text-[var(--quaternary-text)] -scale-x-100" />
          <span className="text-xs text-[var(--primary-text)] min-w-0 truncate">
            <span className="font-semibold text-[var(--quaternary-text)]">
              {replyingTo.senderName}
            </span>{" "}
            kişisine yanıt: {previewText(replyingTo)}
          </span>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            title="Yanıtı iptal et"
            className="ml-auto shrink-0 p-1 rounded text-[var(--primary-text)] hover:text-[var(--secondary-text)] transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Send area */}
      <form
        onSubmit={handleSend}
        className={`p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-[var(--primary-bg)] flex gap-3 relative items-center ${
          replyingTo ? "" : "border-t-2 border-[var(--primary-border)]"
        }`}
      >
        <div className="flex-1 relative">
          {/* @bahsetme otomatik tamamlama */}
          {mentionQuery !== null && mentionMatches.length > 0 && (
            <div className="absolute bottom-full left-0 mb-1.5 w-64 max-h-52 overflow-y-auto custom-scrollbar z-50 py-1 rounded-xl border-2 border-[var(--primary-border)] bg-[var(--secondary-bg)] shadow-2xl">
              <p className="px-3 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--primary-text)]">
                Üyeler — Tab/Enter ile seç
              </p>
              {mentionMatches.map((u) => (
                <button
                  key={u.userID}
                  type="button"
                  onClick={() => insertMention(u)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left text-[var(--secondary-text)] hover:bg-[var(--tertiary-bg)] hover:text-[var(--tertiary-text)] transition-colors"
                >
                  <img
                    src={u.photoURL}
                    alt=""
                    className="w-6 h-6 rounded-full object-cover shrink-0"
                  />
                  <span className="truncate">{u.nickName}</span>
                </button>
              ))}
            </div>
          )}
          <textarea
            ref={inputRef}
            rows={1}
            value={newMessage}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            placeholder="Mesajınızı yazın..."
            style={{ maxHeight: "160px", overflowY: "hidden" }}
            className="w-full px-4 py-2.5 pr-20 rounded-xl bg-[var(--secondary-bg)] text-[var(--secondary-text)] border-2 border-[var(--primary-border)] focus:outline-none focus:border-[var(--tertiary-border)] placeholder:text-[var(--primary-text)] transition-colors resize-none leading-6 block"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <button
              type="button"
              className="text-[var(--secondary-text)] hover:text-[var(--primary-text)] font-bold text-xs px-1.5 py-0.5 rounded bg-[var(--primary-border)] hover:bg-[var(--tertiary-border)] transition-all select-none"
              onClick={() => {
                setShowGifPicker((v) => !v);
                setShowEmojiPicker(false);
              }}
            >
              GIF
            </button>
            <button
              type="button"
              className="text-[var(--secondary-text)] hover:text-[var(--primary-text)] transition-colors"
              onClick={() => {
                setShowEmojiPicker((v) => !v);
                setShowGifPicker(false);
              }}
            >
              <Smile className="w-5 h-5" />
            </button>
          </div>
          {showEmojiPicker && (
            <div
              style={{
                position: "absolute",
                bottom: "50px",
                right: "0",
                zIndex: 10,
              }}
            >
              <EmojiPicker onEmojiClick={handleEmojiClick} theme="dark" />
            </div>
          )}
          {showGifPicker && <GifPicker onSelect={handleGifSelect} />}
        </div>
        <button
          type="submit"
          disabled={!newMessage.trim()}
          className="px-4 py-2 bg-[var(--tertiary-bg)] text-[var(--tertiary-text)] font-semibold rounded-xl hover:bg-[var(--quaternary-bg)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {selectedUser && createPortal(
        (() => {
          const userMember = serverData?.Users?.find((u) => u.UserID === selectedUser?.userID);
          const userRole = userMember && serverData?.Roles?.find((r) => r.RoleID === userMember.RoleID);
          const roleName = userRole ? userRole.RoleName : null;
          const roleColor = userRole ? userRole.RoleColor : null;
          return (
            <ProfilePanel
              check={isProfileCardExpanded}
              setCheck={setIsProfileCardExpanded}
              posX={profileCardPosition.left + 188}
              posY={profileCardPosition.top}
              userName={selectedUser.nickName}
              photoURL={selectedUser.photoURL}
              userID={selectedUser.friendshipID}
              memberDate={selectedUser.createdDate}
              UID={selectedUser.userID}
              about={selectedUser.about}
              bannerURL={selectedUser.profileBannerUrl}
              roleName={roleName}
              roleColor={roleColor}
            />
          );
        })(),
        document.body
      )}

      {/* Sağ tık (context) menüsü */}
      {contextMenu &&
        createPortal(
          (() => {
            const m = contextMenu.message;
            const isOwnMsg = m.senderId === userData?.userID;
            const canEdit = isOwnMsg && m.type !== "gif" && canStillEdit(m.createdAt);
            const canDelete = isOwnMsg || canModerate;
            return (
              <div
                style={{ position: "fixed", top: contextMenu.y, left: contextMenu.x }}
                onClick={(e) => e.stopPropagation()}
                onContextMenu={(e) => e.preventDefault()}
                className="z-[9999] w-[190px] py-1 rounded-xl overflow-hidden border-2 border-[var(--primary-border)] bg-[var(--secondary-bg)] shadow-2xl"
              >
                {/* Hızlı emoji tepkileri */}
                <div className="flex items-center justify-between px-2 pb-1.5 pt-0.5 border-b border-[var(--primary-border)]">
                  {["👍", "❤️", "😂", "😮", "😢", "🔥"].map((e) => (
                    <button
                      key={e}
                      onClick={() => handleReact(m, e)}
                      className="p-1 text-lg leading-none rounded-lg hover:bg-[var(--primary-bg)] hover:scale-125 transition-transform"
                      title={`${e} tepkisi ver`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => {
                    startReply(m);
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--secondary-text)] hover:bg-[var(--primary-bg)] transition-colors"
                >
                  <Reply size={15} /> Yanıtla
                </button>

                {canEdit && (
                  <button
                    onClick={() => {
                      startEdit(m);
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--secondary-text)] hover:bg-[var(--primary-bg)] transition-colors"
                  >
                    <Pencil size={15} /> Düzenle
                  </button>
                )}

                {canPin && (
                  <button
                    onClick={() => handleTogglePin(m)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--secondary-text)] hover:bg-[var(--primary-bg)] transition-colors"
                  >
                    {m.pinned ? <PinOff size={15} /> : <Pin size={15} />}
                    {m.pinned ? "Sabiti Kaldır" : "Sabitle"}
                  </button>
                )}

                {canDelete && (
                  <button
                    onClick={() => {
                      setContextMenu(null);
                      setEditingId(null);
                      setConfirmDeleteId(m.id);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500 hover:text-white transition-colors border-t border-[var(--primary-border)] mt-1"
                  >
                    <Trash2 size={15} /> Sil
                  </button>
                )}
              </div>
            );
          })(),
          document.body
        )}
    </div>
  );
};

export default ChatPanel;
